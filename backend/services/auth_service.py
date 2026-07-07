"""Authentication service orchestration for SSO-backed sessions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Any
from uuid import uuid4

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import TRANSACTION_STATUS_IDLE
from psycopg2.extensions import connection as PGConnection

from backend.core.config import get_settings
from backend.core.security import (
    TokenError,
    build_jwt_payload,
    create_scoped_refresh_token,
    hash_token,
    parse_refresh_token,
    sign_jwt,
)
from backend.core.sso import (
    GraphAPIError,
    check_graph_group_membership,
    exchange_client_credentials_for_graph_token,
    fetch_graph_group_member_ids,
)
from backend.repositories.permission_repository import fetch_permissions_for_role
from backend.repositories.token_repository import (
    create_user_session,
    fetch_session_by_refresh_token,
    record_auth_event,
    revoke_all_user_sessions,
    revoke_user_session,
    rotate_refresh_token,
)
from backend.repositories.user_repository import fetch_tenant_name_by_id, fetch_user_by_id
from backend.repositories.user_repository import (
    fetch_active_tenant_ids,
    fetch_graph_managed_role_users,
    update_user_role,
)
from backend.schemas.auth import UserResponse


@dataclass(frozen=True)
class AuthTokens:
    """Access and refresh tokens issued together for one authenticated session."""

    access_token: str
    refresh_token: str


GRAPH_MANAGED_ROLES = {"EMPLOYEE", "FACILITATOR"}
GRAPH_PROTECTED_ROLES = {
    "SECURITY",
    "MANAGER",
    "TENANT_ADMIN",
    "PRODUCT_ADMIN",
}


@dataclass(frozen=True)
class GraphRoleSyncResult:
    """Summary returned by the Graph managed-role sync service."""

    enabled: bool
    graph_group_id: str | None
    scanned_users: int = 0
    changed_users: int = 0
    promoted_users: int = 0
    demoted_users: int = 0


def _rollback_if_needed(conn: PGConnection) -> None:
    if conn.closed:
        return
    if conn.get_transaction_status() != TRANSACTION_STATUS_IDLE:
        conn.rollback()


def _build_access_token_for_user(user: dict[str, Any], *, session_id: str) -> str:
    extra_claims: dict[str, Any] = {
        "user_id": str(user["user_id"]),
        "tenant_id": str(user["tenant_id"]),
        "session_id": session_id,
    }

    role = str(user.get("role_name") or user.get("role") or "").strip()
    if role:
        extra_claims["role"] = role

    payload = build_jwt_payload(user, extra_claims=extra_claims)
    return sign_jwt(payload)


def determine_graph_onboarding_role(
    *,
    access_token: str,
    microsoft_object_id: str,
) -> str:
    """Return EMPLOYEE or FACILITATOR for first-time SSO provisioning."""
    settings = get_settings()
    graph_group_id = settings.graph_facilitator_group_id
    if not graph_group_id:
        return "EMPLOYEE"

    attempts = settings.graph_role_lookup_retries + 1
    last_error: GraphAPIError | None = None
    for attempt in range(attempts):
        try:
            is_facilitator = check_graph_group_membership(
                access_token,
                group_id=graph_group_id,
                microsoft_object_id=microsoft_object_id,
            )
            return "FACILITATOR" if is_facilitator else "EMPLOYEE"
        except GraphAPIError as exc:
            last_error = exc
            if attempt < attempts - 1 and settings.graph_role_lookup_backoff_seconds:
                time.sleep(settings.graph_role_lookup_backoff_seconds)

    assert last_error is not None
    raise GraphAPIError(
        status_code=last_error.status_code,
        code="graph_role_lookup_failed",
        message="Microsoft Graph role lookup failed after configured retries.",
        details={
            "graph_group_id": graph_group_id,
            "provider_error": last_error.code,
        },
    ) from last_error


def sync_graph_managed_roles(
    conn: PGConnection,
    *,
    tenant_id: str | None = None,
    access_token: str | None = None,
    commit: bool = True,
) -> GraphRoleSyncResult:
    """Synchronize EMPLOYEE/FACILITATOR roles from Microsoft Graph group membership."""
    settings = get_settings()
    if not settings.graph_role_sync_enabled:
        return GraphRoleSyncResult(
            enabled=False,
            graph_group_id=settings.graph_facilitator_group_id,
        )
    if not settings.graph_facilitator_group_id:
        return GraphRoleSyncResult(
            enabled=True,
            graph_group_id=None,
        )

    graph_group_id = settings.graph_facilitator_group_id
    graph_access_token = access_token or exchange_client_credentials_for_graph_token()
    graph_member_ids = {
        member_id.lower()
        for member_id in fetch_graph_group_member_ids(
            graph_access_token,
            group_id=graph_group_id,
        )
    }

    scanned = 0
    changed = 0
    promoted = 0
    demoted = 0
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        tenant_ids = [tenant_id] if tenant_id is not None else fetch_active_tenant_ids(conn)
        for scoped_tenant_id in tenant_ids:
            users = fetch_graph_managed_role_users(conn, tenant_id=str(scoped_tenant_id))
            for user in users:
                scanned += 1
                old_role = str(user.get("role_name") or user.get("role") or "").strip().upper()
                if old_role not in GRAPH_MANAGED_ROLES:
                    continue

                object_id = str(user.get("microsoft_object_id") or "").strip().lower()
                new_role = "FACILITATOR" if object_id in graph_member_ids else "EMPLOYEE"
                if old_role == new_role:
                    continue

                updated = update_user_role(
                    conn,
                    tenant_id=str(scoped_tenant_id),
                    user_id=str(user["user_id"]),
                    role_name=new_role,
                )
                if updated is None:
                    raise LookupError("Graph role sync target user could not be updated.")

                revoked_sessions = revoke_all_user_sessions(
                    conn,
                    tenant_id=str(scoped_tenant_id),
                    user_id=str(user["user_id"]),
                )
                event_metadata = {
                    "old_role": old_role,
                    "new_role": new_role,
                    "graph_group_id": graph_group_id,
                    "timestamp": timestamp,
                    "revoked_sessions": revoked_sessions,
                }
                event_type = (
                    "GRAPH_ROLE_PROMOTED"
                    if old_role == "EMPLOYEE" and new_role == "FACILITATOR"
                    else "GRAPH_ROLE_DEMOTED"
                )
                record_auth_event(
                    conn,
                    tenant_id=str(scoped_tenant_id),
                    user_id=str(user["user_id"]),
                    event_type=event_type,
                    metadata=event_metadata,
                )
                record_auth_event(
                    conn,
                    tenant_id=str(scoped_tenant_id),
                    user_id=str(user["user_id"]),
                    event_type="GRAPH_ROLE_SYNC",
                    metadata=event_metadata,
                )

                changed += 1
                if new_role == "FACILITATOR":
                    promoted += 1
                else:
                    demoted += 1

        if commit:
            conn.commit()
    except Exception:
        if commit:
            _rollback_if_needed(conn)
        raise

    return GraphRoleSyncResult(
        enabled=True,
        graph_group_id=graph_group_id,
        scanned_users=scanned,
        changed_users=changed,
        promoted_users=promoted,
        demoted_users=demoted,
    )


def attach_permissions_to_user(
    conn: PGConnection,
    user: dict[str, Any],
) -> dict[str, Any]:
    """Attach tenant-scoped database permissions to a loaded user record."""
    role_name = str(user.get("role_name") or user.get("role") or "").strip()

    user["role_name"] = role_name
    user["permissions"] = (
        fetch_permissions_for_role(
            conn,
            tenant_id=str(user["tenant_id"]),
            role_name=role_name,
        )
        if role_name
        else []
    )

    return user


def get_auth_me_payload(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> UserResponse:
    """Return the authenticated user while preserving legacy auth fields."""
    tenant_id = str(current_user["tenant_id"])
    try:
        tenant_name = current_user.get("tenant_name") or fetch_tenant_name_by_id(
            conn,
            tenant_id=tenant_id,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "tenant_lookup_failed",
                "message": "Failed to load tenant context.",
            },
        ) from exc

    role = current_user.get("role") or current_user.get("role_name")
    payload = dict(current_user)
    payload.update(
        {
            "user_id": str(current_user["user_id"]),
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "role": role,
            "role_name": current_user.get("role_name") or role,
            "permissions": current_user.get("permissions", []),
        }
    )
    return UserResponse(**payload)


def issue_tokens_for_user(
    conn: PGConnection,
    user: dict[str, Any],
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
    commit: bool = True,
) -> AuthTokens:
    """Create one DB-backed session and issue the corresponding token pair."""
    session_id = str(uuid4())
    refresh_data = create_scoped_refresh_token(
        tenant_id=str(user["tenant_id"]),
        user_id=str(user["user_id"]),
        session_id=session_id,
    )

    try:
        create_user_session(
            conn,
            session_id=session_id,
            tenant_id=str(user["tenant_id"]),
            user_id=str(user["user_id"]),
            refresh_token_hash=refresh_data["token_hash"],
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=refresh_data["expires_at"],
        )
        record_auth_event(
            conn,
            tenant_id=str(user["tenant_id"]),
            user_id=str(user["user_id"]),
            session_id=session_id,
            event_type="LOGIN",
        )
        access_token = _build_access_token_for_user(user, session_id=session_id)
        if commit:
            conn.commit()
        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_data["token"],
        )
       
    except HTTPException:
        if commit:
            _rollback_if_needed(conn)
        raise
    except psycopg2.Error as exc:
        if commit:
            _rollback_if_needed(conn)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "token_issue_failed",
                "message": "Failed to issue authentication tokens.",
            },
        ) from exc


def refresh_auth_tokens(
    conn: PGConnection,
    refresh_token: str,
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
    commit: bool = True,
) -> AuthTokens:
    """Rotate the refresh token for one existing user_session row."""
    try:
        refresh_scope = parse_refresh_token(refresh_token)
        token_hash = hash_token(refresh_token)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_refresh_token",
                "message": str(exc),
            },
        ) from exc

    try:
        session = fetch_session_by_refresh_token(
            conn,
            tenant_id=refresh_scope["tenant_id"],
            user_id=refresh_scope["user_id"],
            session_id=refresh_scope["session_id"],
            refresh_token_hash=token_hash,
        )
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "invalid_refresh_token",
                    "message": "Refresh token is invalid.",
                },
            )
        if session["is_revoked"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "revoked_refresh_token",
                    "message": "Refresh token has already been revoked.",
                },
            )

        expires_at = session["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            revoke_user_session(
                conn,
                tenant_id=refresh_scope["tenant_id"],
                user_id=refresh_scope["user_id"],
                session_id=refresh_scope["session_id"],
                refresh_token_hash=token_hash,
            )
            if commit:
                conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "expired_refresh_token",
                    "message": "Refresh token has expired.",
                },
            )

        user = fetch_user_by_id(
            conn,
            tenant_id=refresh_scope["tenant_id"],
            user_id=refresh_scope["user_id"],
        )
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "user_not_found",
                    "message": "User not found for refresh token.",
                },
            )

        if user["status"] != "ACTIVE":
            revoke_user_session(
                conn,
                tenant_id=refresh_scope["tenant_id"],
                user_id=refresh_scope["user_id"],
                session_id=refresh_scope["session_id"],
            )

            if commit:
                conn.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "inactive_user",
                    "message": "User account is inactive.",
                },
            )

        rotated_refresh = create_scoped_refresh_token(
            tenant_id=refresh_scope["tenant_id"],
            user_id=refresh_scope["user_id"],
            session_id=refresh_scope["session_id"],
        )
        rotated_session = rotate_refresh_token(
            conn,
            tenant_id=refresh_scope["tenant_id"],
            user_id=refresh_scope["user_id"],
            session_id=refresh_scope["session_id"],
            current_refresh_token_hash=token_hash,
            new_refresh_token_hash=rotated_refresh["token_hash"],
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=rotated_refresh["expires_at"],
        )
        if rotated_session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "refresh_token_rotation_failed",
                    "message": "Refresh token could not be rotated because the session is no longer active.",
                },
            )

        record_auth_event(
            conn,
            tenant_id=refresh_scope["tenant_id"],
            user_id=refresh_scope["user_id"],
            session_id=refresh_scope["session_id"],
            event_type="REFRESH",
        )
        access_token = _build_access_token_for_user(
            user,
            session_id=refresh_scope["session_id"],
        )
        
        if commit:
            conn.commit()
        return AuthTokens(
            access_token=access_token,
            refresh_token=rotated_refresh["token"],
        )
    except HTTPException:
        if commit:
            _rollback_if_needed(conn)
        raise
    except psycopg2.Error as exc:
        if commit:
            _rollback_if_needed(conn)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "refresh_failed",
                "message": "Failed to refresh authentication tokens.",
            },
        ) from exc


def logout_user_session(
    conn: PGConnection,
    refresh_token: str,
    *,
    commit: bool = True,
) -> None:
    try:
        refresh_scope = parse_refresh_token(refresh_token)
        token_hash = hash_token(refresh_token)

        revoked = revoke_user_session(
            conn,
            tenant_id=refresh_scope["tenant_id"],
            user_id=refresh_scope["user_id"],
            session_id=refresh_scope["session_id"],
            refresh_token_hash=token_hash,
        )

        if revoked:
            record_auth_event(
                conn,
                tenant_id=refresh_scope["tenant_id"],
                user_id=refresh_scope["user_id"],
                session_id=refresh_scope["session_id"],
                event_type="LOGOUT",
            )

        if commit:
            conn.commit()

    except TokenError:
        if commit:
            _rollback_if_needed(conn)

    except psycopg2.Error as exc:
        if commit:
            _rollback_if_needed(conn)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "logout_failed",
                "message": "Failed to logout user session.",
            },
        ) from exc
