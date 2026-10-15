"""Repository for writing structured audit events to, and reading them back
from, the audit_logs table."""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from typing import Any

import structlog
from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor
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


# ─── Reading audit_logs (admin Audit Logs page) ────────────────────────────

# Lightweight columns for the paginated table — excludes the heavier
# JSON/free-text columns (old/new values, user agent, metadata, ...) that
# only the single-record detail view needs, so a page of results stays small.
AUDIT_LIST_SELECT_FIELDS = """
    al.id::text AS id,
    al.actor_user_id::text AS actor_user_id,
    COALESCE(au.display_name, au.full_name) AS actor_name,
    al.actor_email,
    al.actor_role,
    al.action,
    al.module,
    al.entity_type,
    al.entity_id,
    al.event_status,
    al.request_method,
    al.source_channel,
    al.occurred_at
"""

# Full column set for GET /admin/audit/{id} — everything the detail drawer
# renders, including the JSON old/new-values diff.
AUDIT_DETAIL_SELECT_FIELDS = """
    al.id::text AS id,
    al.actor_user_id::text AS actor_user_id,
    COALESCE(au.display_name, au.full_name) AS actor_name,
    al.actor_email,
    al.actor_role,
    al.action,
    al.module,
    al.entity_type,
    al.entity_id,
    al.event_status,
    al.request_method,
    al.request_path,
    al.request_id,
    al.correlation_id,
    al.ip_address,
    al.user_agent,
    al.source_channel,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.metadata,
    al.failure_code,
    al.failure_reason,
    al.occurred_at,
    al.created_at
"""

AUDIT_SELECT_FROM = """
    FROM audit_logs AS al
    LEFT JOIN app_users AS au
        ON au.id = al.actor_user_id
       AND au.tenant_id = al.tenant_id
"""

# Maps the client-facing `sortBy` value to the SQL expression to order by.
# Allow-listed on purpose -- never interpolate a caller-supplied column name
# directly into the ORDER BY clause.
_AUDIT_SORT_COLUMNS: dict[str, str] = {
    "occurred_at": "al.occurred_at",
    "action": "al.action",
    "module": "al.module",
    "status": "al.event_status",
    "actor": "COALESCE(au.display_name, au.full_name, al.actor_email)",
}

_JSON_FIELDS = ("old_values", "new_values", "changed_fields", "metadata")


def _parse_json_fields(row: dict[str, Any]) -> dict[str, Any]:
    """Defensively json.loads() the JSON-ish columns.

    psycopg2 already returns native dict/list for jsonb/json columns, but if
    the column ever turns out to be plain text this keeps the API response
    shape correct instead of handing the caller a raw JSON string.
    """
    for field in _JSON_FIELDS:
        value = row.get(field)
        if isinstance(value, str):
            try:
                row[field] = json.loads(value)
            except (TypeError, ValueError):
                pass
    return row


def _build_audit_log_filters(
    *,
    tenant_id: str,
    action: str | None = None,
    module: str | None = None,
    entity_type: str | None = None,
    event_status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    last_seconds: int | None = None,
    search: str | None = None,
) -> tuple[str, list[Any]]:
    conditions = ["al.tenant_id = %s"]
    params: list[Any] = [tenant_id]

    if action is not None:
        conditions.append("al.action = %s")
        params.append(action)
    if module is not None:
        conditions.append("al.module = %s")
        params.append(module)
    if entity_type is not None:
        conditions.append("al.entity_type = %s")
        params.append(entity_type)
    if event_status is not None:
        conditions.append("al.event_status = %s")
        params.append(event_status)

    # The admin UI toggles between an explicit Date Range and a relative
    # "Last N seconds/minutes/hours" quick filter -- only one is ever active
    # at a time there, but if a caller somehow sends both, last_seconds wins
    # and the explicit date range is ignored, rather than silently ANDing
    # two different time-window filters together.
    if last_seconds is not None:
        conditions.append("al.occurred_at >= NOW() - make_interval(secs => %s)")
        params.append(last_seconds)
    else:
        if start_date is not None:
            conditions.append("al.occurred_at >= %s")
            params.append(start_date)
        if end_date is not None:
            # occurred_at is a timestamp -- compare against the start of the
            # *next* day so the whole end_date calendar day is included.
            conditions.append("al.occurred_at < %s")
            params.append(end_date + timedelta(days=1))

    if search is not None:
        # Name-only, to match the type-ahead "search as you go" pattern the
        # admin Audit Logs filter bar uses (same as the Book for Someone
        # employee search) -- not action/module/entity, those have their own
        # dedicated dropdown filters.
        conditions.append("COALESCE(au.display_name, au.full_name) ILIKE %s")
        params.append(f"%{search}%")

    return " AND ".join(conditions), params


def fetch_audit_logs(
    conn: PGConnection,
    *,
    tenant_id: str,
    action: str | None = None,
    module: str | None = None,
    entity_type: str | None = None,
    event_status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    last_seconds: int | None = None,
    search: str | None = None,
    sort_by: str = "occurred_at",
    sort_dir: str = "desc",
    page: int = 1,
    limit: int = 10,
) -> tuple[list[dict[str, Any]], int]:
    """Tenant-scoped, filtered, sorted, paginated audit_logs listing for the
    admin Audit Logs table.

    Returns (items, total) -- total is the filtered (not paginated) row
    count, computed in the same query via COUNT(*) OVER() so no second
    round-trip is needed for pagination metadata.
    """
    where_clause, params = _build_audit_log_filters(
        tenant_id=tenant_id,
        action=action,
        module=module,
        entity_type=entity_type,
        event_status=event_status,
        start_date=start_date,
        end_date=end_date,
        last_seconds=last_seconds,
        search=search,
    )
    sort_column = _AUDIT_SORT_COLUMNS.get(sort_by, _AUDIT_SORT_COLUMNS["occurred_at"])
    sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"
    offset = (page - 1) * limit

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {AUDIT_LIST_SELECT_FIELDS},
                   COUNT(*) OVER()::integer AS _total_count
            {AUDIT_SELECT_FROM}
            WHERE {where_clause}
            ORDER BY {sort_column} {sort_direction}, al.id DESC
            LIMIT %s OFFSET %s
            """,
            [*params, limit, offset],
        )
        rows = [dict(row) for row in cur.fetchall()]

    total = rows[0].pop("_total_count") if rows else 0
    for row in rows:
        row.pop("_total_count", None)

    return rows, total


def fetch_audit_logs_summary(
    conn: PGConnection,
    *,
    tenant_id: str,
    action: str | None = None,
    module: str | None = None,
    entity_type: str | None = None,
    event_status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    last_seconds: int | None = None,
    search: str | None = None,
) -> dict[str, int]:
    """Aggregate counts over the same filtered dataset `fetch_audit_logs`
    would page through (no LIMIT/OFFSET), for the admin summary cards."""
    where_clause, params = _build_audit_log_filters(
        tenant_id=tenant_id,
        action=action,
        module=module,
        entity_type=entity_type,
        event_status=event_status,
        start_date=start_date,
        end_date=end_date,
        last_seconds=last_seconds,
        search=search,
    )

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                COUNT(*)::integer AS total_events,
                COUNT(*) FILTER (WHERE al.event_status = 'SUCCESS')::integer AS successful_events,
                -- "Failed" on the summary cards covers both FAILURE and DENIED
                -- outcomes -- anything that isn't a clean SUCCESS.
                COUNT(*) FILTER (WHERE al.event_status <> 'SUCCESS')::integer AS failed_events,
                COUNT(DISTINCT al.actor_user_id)::integer AS unique_users
            {AUDIT_SELECT_FROM}
            WHERE {where_clause}
            """,
            params,
        )
        row = cur.fetchone()

    return (
        dict(row)
        if row
        else {
            "total_events": 0,
            "successful_events": 0,
            "failed_events": 0,
            "unique_users": 0,
        }
    )


def fetch_audit_log_filter_options(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[dict[str, Any]]:
    """Every distinct (module, entity_type, action) triple that actually
    occurs in this tenant's audit_logs, for the admin Audit Logs filter bar's
    cascading Module -> Entity -> Action dropdowns.

    Deliberately tenant-scoped only -- NOT narrowed by whatever filters are
    currently applied (date range, status, search, ...), so the dropdowns
    always offer every real combination rather than shrinking as other
    filters are picked. A flat array of rows rather than a nested
    module -> entity -> action object: the frontend derives each dropdown's
    options by filtering/mapping this one array, which keeps the response
    shape simple and lets it double as the source for all three levels.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT DISTINCT module, entity_type, action
            FROM audit_logs
            WHERE tenant_id = %s
            ORDER BY module, entity_type, action
            """,
            (tenant_id,),
        )
        return [dict(row) for row in cur.fetchall()]


def fetch_audit_log_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    audit_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped audit_logs row with the full column set, for
    the admin Audit Logs detail drawer."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {AUDIT_DETAIL_SELECT_FIELDS}
            {AUDIT_SELECT_FROM}
            WHERE al.tenant_id = %s
              AND al.id = %s
            """,
            (tenant_id, audit_id),
        )
        row = cur.fetchone()

    if row is None:
        return None

    return _parse_json_fields(dict(row))
