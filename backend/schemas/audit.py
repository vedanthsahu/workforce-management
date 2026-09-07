"""Pydantic schemas for the admin Audit Logs endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from backend.schemas.pagination import PaginationMetadata

# The real values written by safe_write_audit_log across the codebase (see
# its docstring in backend/repositories/audit_repository.py) -- NOT "FAILED".
AuditEventStatus = Literal["SUCCESS", "FAILURE", "DENIED"]

AuditSortBy = Literal["occurred_at", "action", "module", "status", "actor"]
AuditSortDir = Literal["asc", "desc"]


class AuditLogListItemResponse(BaseModel):
    """One row of the paginated audit_logs table -- deliberately excludes the
    heavier columns (old/new values, user agent, metadata, ...), which only
    GET /admin/audit/{id} returns."""

    id: str
    actor_user_id: str | None = None
    actor_name: str | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    action: str
    module: str
    entity_type: str | None = None
    entity_id: str | None = None
    event_status: AuditEventStatus
    request_method: str | None = None
    source_channel: str | None = None
    occurred_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "22",
                "actor_user_id": "7",
                "actor_name": "Ankitha Kulal",
                "actor_email": "ankitha.kulal@solugenix.com",
                "actor_role": "TENANT_ADMIN",
                "action": "building.created",
                "module": "LOCATION",
                "entity_type": "building",
                "entity_id": "84",
                "event_status": "SUCCESS",
                "request_method": "POST",
                "source_channel": "WEB",
                "occurred_at": "2026-07-21T09:16:01.072861Z",
            }
        }
    )


class AuditLogSummary(BaseModel):
    """Aggregate counts over the filtered (not paginated) dataset, for the
    admin Audit Logs summary cards."""

    total_events: int = 0
    successful_events: int = 0
    failed_events: int = 0
    unique_users: int = 0


class AuditLogFilterOption(BaseModel):
    """One (module, entity_type, action) combination that actually exists in
    this tenant's audit_logs, for the filter bar's cascading Module -> Entity
    -> Action dropdowns. A flat array of these -- not a nested
    module -> entity -> action object -- so the frontend derives each
    dropdown's options by filtering/mapping one array."""

    module: str
    entity_type: str | None = None
    action: str

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"module": "AUTH", "entity_type": "session", "action": "user.login"},
                {"module": "AUTH", "entity_type": "session", "action": "user.logout"},
                {"module": "AUTH", "entity_type": "user", "action": "user.access_updated"},
                {"module": "BOOKING", "entity_type": "booking", "action": "booking.created"},
                {"module": "BOOKING", "entity_type": "booking", "action": "booking.cancel"},
                {"module": "LOCATION", "entity_type": "site", "action": "site.created"},
                {"module": "LOCATION", "entity_type": "building", "action": "building.created"},
            ]
        }
    )


class AuditLogListResponse(BaseModel):
    items: list[AuditLogListItemResponse]
    summary: AuditLogSummary
    filter_options: list[AuditLogFilterOption]
    pagination: PaginationMetadata

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [AuditLogListItemResponse.model_config["json_schema_extra"]["example"]],
                "summary": {
                    "total_events": 828,
                    "successful_events": 713,
                    "failed_events": 115,
                    "unique_users": 21,
                },
                "filter_options": [
                    {"module": "AUTH", "entity_type": "session", "action": "user.login"},
                    {"module": "AUTH", "entity_type": "user", "action": "user.access_updated"},
                    {"module": "LOCATION", "entity_type": "building", "action": "building.created"},
                ],
                "pagination": {"total": 828, "page": 1, "limit": 10, "total_pages": 83},
            }
        }
    )


class AuditLogDetailResponse(BaseModel):
    """Full audit_logs row, including the JSON old/new-values diff, for the
    admin Audit Logs detail drawer."""

    id: str
    actor_user_id: str | None = None
    actor_name: str | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    action: str
    module: str
    entity_type: str | None = None
    entity_id: str | None = None
    event_status: AuditEventStatus
    request_method: str | None = None
    request_path: str | None = None
    request_id: str | None = None
    correlation_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    source_channel: str | None = None
    old_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    changed_fields: list[str] | None = None
    metadata: dict[str, Any] | None = None
    failure_code: str | None = None
    failure_reason: str | None = None
    occurred_at: datetime
    created_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "22",
                "actor_user_id": "7",
                "actor_name": "Ankitha Kulal",
                "actor_email": "ankitha.kulal@solugenix.com",
                "actor_role": "TENANT_ADMIN",
                "action": "building.created",
                "module": "LOCATION",
                "entity_type": "building",
                "entity_id": "84",
                "event_status": "SUCCESS",
                "request_method": "POST",
                "request_path": "/buildings",
                "request_id": "51c9abcc",
                "correlation_id": None,
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
                "source_channel": "WEB",
                "old_values": None,
                "new_values": {
                    "status": "ACTIVE",
                    "site_id": "54",
                    "site_name": "Test office1",
                    "building_code": "TEST BUILDING",
                    "building_name": "TEST BUILDING",
                },
                "changed_fields": None,
                "metadata": None,
                "failure_code": None,
                "failure_reason": None,
                "occurred_at": "2026-07-21T09:16:01.072861Z",
                "created_at": "2026-07-21T09:16:01.072861Z",
            }
        }
    )
