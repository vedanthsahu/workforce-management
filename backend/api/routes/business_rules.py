"""
Routes exposing resolved business-rule policy values, and letting an
admin change them per tenant.

Frontend previously hardcoded these (booking advance-day limits, the
layout-scheduling buffer, layout list-visibility thresholds) as constants
duplicated from the backend's own hardcoded checks. Both sides are now
driven by business_rules/tenant_business_rules; the GET endpoints are the
read path for a UI that wants the current tenant's actual values instead
of hardcoding a guess.

GET has no permission dependency -- any authenticated user can read these
(they're not sensitive, and several apply to the plain booking flow every
employee uses), matching get_current_user-only routes elsewhere (e.g.
dashboard.py). The GET endpoints stay separate (one per policy area)
rather than being combined into one, because each is read independently
by unrelated features (the chatbot-visibility gate checked on every page
load, blocked-seat window checks, the admin dashboard's row limit, ...);
combining them would make a cheap single-value check fetch every policy
area's data for no benefit.

Writes are different: every PATCH used to require its own route even
though they're all only ever called from one place (the admin
Configuration page), one policy area per save action. That's now one
POST /business-rules taking a batch of {id, value} settings (see
business_rule_service.BUSINESS_RULE_SETTERS for the id list), uniformly
admin-only -- no more special-casing chatbot's write gate separately
from the other four.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user, require_any_permission
from backend.db.connection import get_db
from backend.schemas.business_rule import (
    ActivityPolicyResponse,
    BlockedSeatPolicyResponse,
    BookingPolicyResponse,
    BusinessRulesResponse,
    ChatbotPolicyResponse,
    LayoutPolicyResponse,
    LayoutVisibilityDaysResponse,
    UpdateBusinessRulesRequest,
)
from backend.services.business_rule_service import (
    resolve_activity_record_count,
    resolve_blocked_seat_days,
    resolve_blocked_seat_max_advance_days,
    resolve_booking_advance_days,
    resolve_chatbot_employee_access,
    resolve_layout_scheduling_gap,
    resolve_layout_visibility_days,
    update_business_rules,
)

router = APIRouter(prefix="/business-rules", tags=["business-rules"])


@router.get("/chatbot-policy", response_model=ChatbotPolicyResponse)
def chatbot_policy(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> ChatbotPolicyResponse:
    return ChatbotPolicyResponse(
        employee_access_enabled=resolve_chatbot_employee_access(
            conn,
            tenant_id=str(current_user["tenant_id"]),
        ),
    )


@router.get("/booking-policy", response_model=BookingPolicyResponse)
def booking_policy(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingPolicyResponse:
    return BookingPolicyResponse(
        **resolve_booking_advance_days(conn, tenant_id=str(current_user["tenant_id"])),
    )


@router.get("/layout-policy", response_model=LayoutPolicyResponse)
def layout_policy(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> LayoutPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    gap = resolve_layout_scheduling_gap(conn, tenant_id=tenant_id)
    visibility_days = resolve_layout_visibility_days(conn, tenant_id=tenant_id)

    return LayoutPolicyResponse(
        employee_max_advance_days=gap["employee_max_advance_days"],
        buffer_days=gap["buffer_days"],
        min_advance_days=gap["min_advance_days"],
        visibility_days=LayoutVisibilityDaysResponse(
            draft=visibility_days["DRAFT"],
            archived=visibility_days["ARCHIVED"],
            deleted=visibility_days["DELETED"],
        ),
    )


@router.get("/activity-policy", response_model=ActivityPolicyResponse)
def activity_policy(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> ActivityPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    return ActivityPolicyResponse(
        record_count=resolve_activity_record_count(conn, tenant_id=tenant_id),
    )


@router.get("/blocked-seat-policy", response_model=BlockedSeatPolicyResponse)
def blocked_seat_policy(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockedSeatPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    policy = resolve_blocked_seat_days(conn, tenant_id=tenant_id)
    return BlockedSeatPolicyResponse(
        upcoming_days=policy["UPCOMING"],
        expiring_soon_days=policy["EXPIRING_SOON"],
        expired_window_days=policy["EXPIRED_WINDOW"],
        max_advance_days=resolve_blocked_seat_max_advance_days(conn, tenant_id=tenant_id),
    )


@router.post("", response_model=BusinessRulesResponse)
def update_business_rules_route(
    payload: UpdateBusinessRulesRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BusinessRulesResponse:
    result = update_business_rules(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        updates=[(item.id, item.value) for item in payload.updates],
        updated_by_user_id=str(current_user["user_id"]),
    )
    return BusinessRulesResponse(**result)
