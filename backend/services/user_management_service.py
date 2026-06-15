from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.token_repository import (
    record_auth_event,
    revoke_all_user_sessions,
)
from backend.repositories.user_repository import (
    admin_update_user_access,
    fetch_user_by_id,
    update_user_profile,
    search_users,
)
from backend.schemas.auth import UserResponse

ASSIGNABLE_ROLE_NAMES = {
    "EMPLOYEE",
    "MANAGER",
    "TALENT",
    "SECURITY",
}


def update_my_profile(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload,
) -> UserResponse:

    updated_user = update_user_profile(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
        full_name=payload.full_name,
        display_name=payload.display_name,
        mobile_phone=payload.mobile_phone,
        office_location=payload.office_location,
    )

    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "user_not_found",
                "message": "User not found.",
            },
        )

    conn.commit()

    return UserResponse(**updated_user)


def admin_update_user_access_service(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    target_user_id: str,
    payload,
) -> UserResponse:

    if str(current_user["user_id"]) == str(target_user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "self_modification_not_allowed",
                "message": "Users cannot modify their own access.",
            },
        )

    target_user = fetch_user_by_id(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "user_not_found",
                "message": "Target user not found.",
            },
        )

    if payload.role_name and payload.role_name not in ASSIGNABLE_ROLE_NAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "protected_role",
                "message": "Requested role cannot be assigned.",
            },
        )

    updated_user = admin_update_user_access(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
        role_name=payload.role_name,
        status=payload.status,
    )

    revoke_all_user_sessions(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
    )

    record_auth_event(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
        session_id="ALL",
        event_type="ACCESS_CHANGED",
    )

    conn.commit()

    return UserResponse(**updated_user)

def search_user_profiles(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    search_text: str,
    limit: int = 20,
) -> list[dict[str, Any]]:

    return search_users(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        search_text=search_text,
        limit=limit,
    )