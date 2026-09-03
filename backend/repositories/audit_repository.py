"""Repository for writing structured audit events to the audit_logs table."""

from __future__ import annotations

import json
import logging
from typing import Any

import structlog
from psycopg2.extensions import connection as PGConnection
from structlog.contextvars import get_contextvars

from backend.core.app_logging import LOGGER_NAME

logger = logging.getLogger(f"{LOGGER_NAME}.audit")
_audit_log = structlog.get_logger("audit")

# Maps the leading segment of an action name to the module column value.
_ACTION_PREFIX_TO_MODULE: dict[str, str] = {
    "user": "AUTH",
    "booking": "BOOKING",
    "guest_booking": "GUEST",
    "guest_visit": "GUEST",
    "guest": "GUEST",
    "site": "LOCATION",
    "building": "LOCATION",
    "floor": "LOCATION",
    "floor_layout": "LOCATION",
    "seat": "LOCATION",
    "amenity_category": "AMENITY",
    "amenity": "AMENITY",
    "group": "GROUP_ADMINISTRATION",
    "role_group": "GROUP_ADMINISTRATION",
}


def _module_for_action(action: str) -> str:
    prefix = action.split(".")[0]
    return _ACTION_PREFIX_TO_MODULE.get(prefix, prefix.upper())


def actor_from_user(user: dict[str, Any]) -> dict[str, Any]:
    """Extract actor fields from a current_user dict."""
    return {
        "actor_user_id": user.get("user_id"),
        "actor_email": user.get("email"),
        "actor_role": str(user.get("role_name") or user.get("role") or "").strip().upper() or None,
    }


def write_audit_log(
    conn: PGConnection,
    *,
    tenant_id: int | str,
    action: str,
    actor_user_id: int | str | None = None,
    actor_email: str | None = None,
    actor_role: str | None = None,
    # "resource_type" / "resource_id" are our internal names; the table uses
    # entity_type / entity_id — mapped in the INSERT below.
    resource_type: str | None = None,
    resource_id: str | None = None,
    # target_* are not table columns; fold into metadata if provided.
    target_user_id: int | str | None = None,
    target_email: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    request_id: str | None = None,
    status: str = "SUCCESS",
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    changed_fields_override: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    failure_code: str | None = None,
    failure_reason: str | None = None,
) -> None:
    """Insert one row into audit_logs and emit a structured JSON log to CloudWatch.

    Does NOT commit — caller must commit.
    """
    # Emit structured JSON event to stdout → CloudWatch Insights
    try:
        _audit_log.info(
            action,
            tenant_id=int(tenant_id),
            actor_user_id=int(actor_user_id) if actor_user_id is not None else None,
            actor_email=actor_email,
            actor_role=actor_role,
            resource_type=resource_type,
            resource_id=resource_id,
            target_user_id=int(target_user_id) if target_user_id is not None else None,
            status=status,
        )
    except Exception:
        pass  # never let structlog break the DB write

    # Pull per-request context bound by the HTTP middleware via structlog
    # contextvars — populated automatically for every HTTP request, zero
    # per-call effort needed at the call sites.
    ctx = get_contextvars()
    effective_request_id = request_id or ctx.get("request_id")
    effective_ip_address = ip_address or ctx.get("ip_address")
    effective_user_agent = user_agent or ctx.get("user_agent")
    request_method = ctx.get("request_method")
    request_path = ctx.get("request_path")
    source_channel = ctx.get("source_channel")
    correlation_id = ctx.get("correlation_id")

    # Fold target_* into metadata since they have no dedicated columns.
    effective_metadata: dict[str, Any] = dict(metadata or {})
    if target_user_id is not None:
        effective_metadata["target_user_id"] = str(target_user_id)
    if target_email is not None:
        effective_metadata["target_email"] = target_email

    module = _module_for_action(action)

    # Use the caller-supplied list if provided; otherwise auto-derive.
    # changed_fields only makes sense for updates (both old and new exist).
    # For creates (no old_values) or deletes (no new_values), leave it null.
    if changed_fields_override is not None:
        changed_fields: list[str] | None = sorted(changed_fields_override)
    elif old_values is not None and new_values is not None:
        changed_fields = sorted(new_values.keys())
    else:
        changed_fields = None

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_logs (
                tenant_id, actor_user_id, actor_email, actor_role,
                action, module, entity_type, entity_id,
                request_method, request_path, request_id, correlation_id,
                ip_address, user_agent, source_channel,
                event_status, old_values, new_values, changed_fields, metadata,
                failure_code, failure_reason
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s
            )
            """,
            (
                int(tenant_id),
                int(actor_user_id) if actor_user_id is not None else None,
                actor_email,
                actor_role,
                action,
                module,
                resource_type,
                str(resource_id) if resource_id is not None else None,
                request_method,
                request_path,
                effective_request_id,
                correlation_id,
                effective_ip_address,
                effective_user_agent,
                source_channel,
                status,
                json.dumps(old_values) if old_values is not None else None,
                json.dumps(new_values) if new_values is not None else None,
                json.dumps(changed_fields) if changed_fields is not None else None,
                json.dumps(effective_metadata) if effective_metadata else None,
                failure_code,
                failure_reason,
            ),
        )


def safe_write_audit_log(
    conn: PGConnection,
    *,
    action: str,
    tenant_id: int | str,
    event_status: str = "SUCCESS",
    failure_code: str | None = None,
    failure_reason: str | None = None,
    current_user: dict[str, Any] | None = None,
    actor_user_id: int | str | None = None,
    actor_email: str | None = None,
    actor_role: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    target_user_id: int | str | None = None,
    target_email: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    changed_fields: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Best-effort audit write + commit. Never raises.

    Pass ``current_user`` for the common case (booking/guest/user services).
    Pass ``actor_user_id`` / ``actor_email`` / ``actor_role`` directly when
    ``current_user`` is not available (e.g. auth service login/logout).

    ``event_status`` should be one of SUCCESS / FAILURE / DENIED.
    ``failure_code`` and ``failure_reason`` are stored in dedicated columns and
    emitted to CloudWatch so failed/denied actions are queryable alongside
    successes.
    """
    try:
        if current_user is not None:
            actor = actor_from_user(current_user)
        else:
            actor = {
                "actor_user_id": actor_user_id,
                "actor_email": actor_email,
                "actor_role": actor_role,
            }
        write_audit_log(
            conn,
            tenant_id=tenant_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            target_user_id=target_user_id,
            target_email=target_email,
            ip_address=ip_address,
            user_agent=user_agent,
            old_values=old_values,
            new_values=new_values,
            changed_fields_override=changed_fields,
            metadata=metadata,
            status=event_status,
            failure_code=failure_code,
            failure_reason=failure_reason,
            **actor,
        )
        conn.commit()
    except Exception:
        logger.exception("audit.write_failed action=%s resource_id=%s", action, resource_id)
        try:
            conn.rollback()
        except Exception:
            pass
