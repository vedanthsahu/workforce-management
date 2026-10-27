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


def get_audit_logs(
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
        "event_status": event_status,
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
        summary_row = fetch_audit_logs_summary(conn, **filters)
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

    return AuditLogDetailResponse(**_prepare_audit_row(row, detail=True))
