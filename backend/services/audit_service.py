"""Service layer for the admin Audit Logs endpoints."""

from __future__ import annotations

import math
from datetime import date

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.audit_repository import (
    fetch_audit_log_by_id,
    fetch_audit_log_filter_options,
    fetch_audit_logs,
    fetch_audit_logs_summary,
    fetch_audit_value_display_names,
)
from backend.schemas.audit import (
    AuditLogDetailResponse,
    AuditLogFilterOption,
    AuditLogListItemResponse,
    AuditLogListResponse,
    AuditLogSummary,
)


_SENSITIVE_FIELD_MARKERS = (
    "api_key",
    "apikey",
    "authorization",
    "cookie",
    "credential",
    "password",
    "private_key",
    "secret",
    "session_id",
    "token",
)

_ENTITY_DISPLAY_FIELDS = {
    "site": "site_id",
    "building": "building_id",
    "floor": "floor_id",
    "seat": "seat_id",
    "amenity": "amenity_id",
    "amenity_category": "category_id",
    "user": "user_id",
    "guest": "guest_id",
    "booking": "booking_id",
    "guest_booking": "booking_id",
    "guest_visit": "guest_visit_id",
    "floor_layout": "floor_layout_id",
}


def _redact_sensitive_values(value: object) -> object:
    """Keep business before/after data useful without returning credentials."""
    if isinstance(value, dict):
        return {
            key: (
                "[REDACTED]"
                if any(marker in key.lower() for marker in _SENSITIVE_FIELD_MARKERS)
                else _redact_sensitive_values(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_sensitive_values(item) for item in value]
    return value


def _prepare_audit_row(row: dict, *, detail: bool = False) -> dict:
    """Build the non-sensitive admin representation of a stored audit row."""
    prepared = dict(row)
    # These remain stored for technical investigation and existing logging,
    # but are intentionally not part of the normal administrator response.
    prepared.pop("failure_code", None)
    prepared.pop("failure_reason", None)
    prepared.pop("metadata", None)
    status_value = prepared.get("event_status")
    prepared["failure_summary"] = (
        "Access to this action was denied."
        if status_value == "DENIED"
        else "The action could not be completed."
        if status_value == "FAILURE"
        else None
    )
    if detail:
        prepared["old_values"] = _redact_sensitive_values(prepared.get("old_values"))
        prepared["new_values"] = _redact_sensitive_values(prepared.get("new_values"))
    return prepared


def _apply_audit_display_names(
    values: dict | None,
    display_names: dict[str, dict[str, str]],
) -> dict | None:
    if values is None:
        return None
    enriched = dict(values)
    for field, names_by_id in display_names.items():
        raw_value = enriched.get(field)
        if isinstance(raw_value, list):
            enriched[field] = [names_by_id.get(str(value), value) for value in raw_value]
        elif raw_value is not None:
            enriched[field] = names_by_id.get(str(raw_value), raw_value)
    return enriched


def get_audit_logs(
    conn: PGConnection,
    *,
    tenant_id: str,
    action: str | None = None,
    module: str | None = None,
    entity_type: str | None = None,
    category: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    last_seconds: int | None = None,
    search: str | None = None,
    sort_by: str = "occurred_at",
    sort_dir: str = "desc",
    page: int = 1,
    limit: int = 10,
) -> AuditLogListResponse:
    """Tenant-scoped, filtered, sorted, paginated audit_logs listing plus a
    summary of counts over the same filtered set, for the admin Audit Logs
    page (table + summary cards).

    `last_seconds` is the relative "Last N minutes/hours" quick filter --
    when set it takes precedence over start_date/end_date at the repository
    layer (see _build_audit_log_filters), so the date-range validation below
    only applies to the explicit-range path.
    """
    if last_seconds is None and start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "start_date must be earlier than end_date.",
            },
        )

    filters = {
        "tenant_id": tenant_id,
        "action": action,
        "module": module,
        "entity_type": entity_type,
        "category": category,
        # The admin activity view intentionally contains successful business
        # actions only. Failure and denial records remain stored and logged.
        "event_status": "SUCCESS",
        "start_date": start_date,
        "end_date": end_date,
        "last_seconds": last_seconds,
        "search": search.strip() if search else None,
    }

    try:
        rows, total = fetch_audit_logs(
            conn,
            **filters,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            limit=limit,
        )
        # Card counts describe the full currently filtered collection, not
        # just the selected card, so admins can switch categories directly.
        summary_filters = {key: value for key, value in filters.items() if key != "category"}
        summary_row = fetch_audit_logs_summary(conn, **summary_filters)
        # Deliberately tenant-scoped only, not narrowed by the filters above --
        # see fetch_audit_log_filter_options's docstring.
        filter_option_rows = fetch_audit_log_filter_options(conn, tenant_id=tenant_id)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "audit_log_lookup_failed",
                "message": "Failed to fetch audit logs.",
            },
        ) from exc

    return AuditLogListResponse(
        items=[AuditLogListItemResponse(**_prepare_audit_row(row)) for row in rows],
        summary=AuditLogSummary(**summary_row),
        filter_options=[AuditLogFilterOption(**row) for row in filter_option_rows],
        pagination={
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if total else 0,
        },
    )


def get_audit_log_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    audit_id: str,
) -> AuditLogDetailResponse:
    """Fetch one audit_logs row's full detail, for the admin Audit Logs
    detail drawer."""
    try:
        row = fetch_audit_log_by_id(conn, tenant_id=tenant_id, audit_id=audit_id)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "audit_log_lookup_failed",
                "message": "Failed to fetch the audit log entry.",
            },
        ) from exc

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "audit_log_not_found",
                "message": "Audit log entry does not exist.",
            },
        )

    entity_field = _ENTITY_DISPLAY_FIELDS.get(str(row.get("entity_type") or "").lower())
    lookup_new_values = dict(row.get("new_values") or {})
    if entity_field and row.get("entity_id") is not None:
        lookup_new_values[entity_field] = row["entity_id"]

    try:
        display_names = fetch_audit_value_display_names(
            conn,
            tenant_id=tenant_id,
            old_values=row.get("old_values"),
            new_values=lookup_new_values,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "audit_log_lookup_failed",
                "message": "Failed to resolve audit log display values.",
            },
        ) from exc
    if entity_field and row.get("entity_id") is not None:
        row["entity_display_name"] = display_names.get(entity_field, {}).get(
            str(row["entity_id"])
        )
    if str(row.get("entity_type") or "").lower() in {"booking", "guest_booking"}:
        # Prefer the seat code captured with the event. It is the historical
        # seat that was booked/cancelled even if the booking is later changed.
        captured_seat = (row.get("new_values") or {}).get("seat_code") or (
            row.get("old_values") or {}
        ).get("seat_code")
        if captured_seat:
            row["entity_display_name"] = str(captured_seat)
    row["old_values"] = _apply_audit_display_names(row.get("old_values"), display_names)
    row["new_values"] = _apply_audit_display_names(row.get("new_values"), display_names)

    return AuditLogDetailResponse(**_prepare_audit_row(row, detail=True))
