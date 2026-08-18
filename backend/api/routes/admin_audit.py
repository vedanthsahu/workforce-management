"""HTTP routes for the admin Audit Logs page."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_any_permission
from backend.db.connection import get_db
from backend.schemas.audit import (
    AuditLogDetailResponse,
    AuditLogListResponse,
    AuditSortBy,
    AuditSortDir,
)
from backend.services.audit_service import get_audit_log_by_id, get_audit_logs

router = APIRouter(prefix="/admin", tags=["admin-audit"])


@router.get(
    "/audit",
    response_model=AuditLogListResponse,
    summary="Search the tenant-wide audit log",
    description=(
        "Admin Audit Logs listing: tenant-scoped audit_logs rows with optional "
        "action, module, entity type, status, date range and free-text search "
        "filters, plus sorting and pagination -- all applied server-side -- and "
        "a summary of counts (total/successful/failed events, unique actors) "
        "over the filtered dataset for the page's summary cards. "
        "Requires admin_dashboard:view or an admin role."
    ),
    responses={
        400: {
            "description": "Invalid date range.",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "invalid_date_range",
                            "message": "start_date must be earlier than end_date.",
                        }
                    }
                }
            },
        },
        401: {"description": "Missing or invalid access token."},
        403: {"description": "Insufficient permissions."},
    },
)
def admin_audit_logs(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    action: Annotated[
        str | None,
        Query(min_length=1, description="Exact match on audit_logs.action, e.g. 'building.created'."),
    ] = None,
    module: Annotated[
        str | None,
        Query(description="Exact match on audit_logs.module, e.g. 'LOCATION'."),
    ] = None,
    entity: Annotated[
        str | None,
        Query(description="Exact match on audit_logs.entity_type, e.g. 'building'."),
    ] = None,
    event_status: Annotated[
        str | None,
        Query(alias="status", description="Exact match on audit_logs.event_status: SUCCESS, FAILURE, or DENIED."),
    ] = None,
    start_date: Annotated[
        date | None,
        Query(alias="startDate", description="Inclusive occurred_at date range start."),
    ] = None,
    end_date: Annotated[
        date | None,
        Query(alias="endDate", description="Inclusive occurred_at date range end."),
    ] = None,
    search: Annotated[
        str | None,
        Query(min_length=1, description="Partial, case-insensitive match on actor name/email, action, module, or entity."),
    ] = None,
    sort_by: Annotated[
        AuditSortBy,
        Query(alias="sortBy", description="Column to sort by."),
    ] = "occurred_at",
    sort_dir: Annotated[
        AuditSortDir,
        Query(alias="sortDir"),
    ] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> AuditLogListResponse:
    return get_audit_logs(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        action=action,
        module=module,
        entity_type=entity,
        event_status=event_status,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit,
    )


@router.get(
    "/audit/{audit_id}",
    response_model=AuditLogDetailResponse,
    summary="Get one audit log entry",
    description=(
        "Return the full detail of a single tenant-scoped audit_logs row -- "
        "including the old/new-values JSON diff, request metadata, IP address "
        "and user agent -- for the admin Audit Logs detail drawer. "
        "Requires admin_dashboard:view or an admin role."
    ),
    responses={
        401: {"description": "Missing or invalid access token."},
        403: {"description": "Insufficient permissions."},
        404: {
            "description": "Audit log entry does not exist.",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "audit_log_not_found",
                            "message": "Audit log entry does not exist.",
                        }
                    }
                }
            },
        },
    },
)
def admin_audit_log_detail(
    audit_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AuditLogDetailResponse:
    return get_audit_log_by_id(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        audit_id=str(audit_id),
    )
