"""Service layer for the admin Audit Logs endpoints."""

from __future__ import annotations

import math
from datetime import date

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.audit_repository import (
    fetch_audit_log_by_id,
    fetch_audit_logs,
    fetch_audit_logs_summary,
)
from backend.schemas.audit import (
    AuditLogDetailResponse,
    AuditLogListItemResponse,
    AuditLogListResponse,
    AuditLogSummary,
)


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
    search: str | None = None,
    sort_by: str = "occurred_at",
    sort_dir: str = "desc",
    page: int = 1,
    limit: int = 10,
) -> AuditLogListResponse:
    """Tenant-scoped, filtered, sorted, paginated audit_logs listing plus a
    summary of counts over the same filtered set, for the admin Audit Logs
    page (table + summary cards)."""
    if start_date is not None and end_date is not None and start_date > end_date:
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
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "audit_log_lookup_failed",
                "message": "Failed to fetch audit logs.",
            },
        ) from exc

    return AuditLogListResponse(
        items=[AuditLogListItemResponse(**row) for row in rows],
        summary=AuditLogSummary(**summary_row),
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

    return AuditLogDetailResponse(**row)
