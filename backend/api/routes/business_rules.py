"""
Routes exposing resolved business-rule policy values, and letting an
admin change them per tenant.

Frontend previously hardcoded these (booking advance-day limits, the
layout-scheduling buffer, layout list-visibility thresholds) as constants
duplicated from the backend's own hardcoded checks. Both sides are now
driven by business_rules/tenant_business_rules; the GET endpoints are the
read path for a UI that wants the current tenant's actual values instead
of hardcoding a guess, and the PATCH endpoints are the write path behind
the admin Configuration page.

GET has no permission dependency -- any authenticated user can read these
(they're not sensitive, and several apply to the plain booking flow every
employee uses), matching get_current_user-only routes elsewhere (e.g.
dashboard.py). PATCH requires admin_dashboard:view -- already granted to
TENANT_ADMIN in every tenant seen so far, and require_any_permission's
built-in TENANT_ADMIN/PRODUCT_ADMIN bypass covers the rest regardless, so
this doesn't depend on a brand-new permission key being seeded anywhere.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user, require_any_permission
from backend.db.connection import get_db
from backend.schemas.business_rule import (
    BlockedSeatPolicyResponse,
    BookingPolicyResponse,
    LayoutPolicyResponse,
    LayoutVisibilityDaysResponse,
    UpdateBlockedSeatPolicyRequest,
    UpdateBookingPolicyRequest,
    UpdateLayoutPolicyRequest,
)
from backend.services.business_rule_service import (
    resolve_blocked_seat_days,
    resolve_booking_advance_days,
    resolve_layout_scheduling_gap,
    resolve_layout_visibility_days,
    update_blocked_seat_days,
    update_employee_max_advance_days,
    update_guest_max_advance_days,
    update_layout_scheduling_buffer_days,
    update_layout_visibility_days,
)

router = APIRouter(prefix="/business-rules", tags=["business-rules"])


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


def _blocked_seat_policy_response(policy: dict[str, int]) -> BlockedSeatPolicyResponse:
    return BlockedSeatPolicyResponse(
        upcoming_days=policy["UPCOMING"],
        expiring_soon_days=policy["EXPIRING_SOON"],
        expired_window_days=policy["EXPIRED_WINDOW"],
    )


@router.get("/blocked-seat-policy", response_model=BlockedSeatPolicyResponse)
def blocked_seat_policy(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockedSeatPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    return _blocked_seat_policy_response(resolve_blocked_seat_days(conn, tenant_id=tenant_id))


@router.patch("/blocked-seat-policy", response_model=BlockedSeatPolicyResponse)
def update_blocked_seat_policy(
    payload: UpdateBlockedSeatPolicyRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockedSeatPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    fields = {
        "UPCOMING": payload.upcoming_days,
        "EXPIRING_SOON": payload.expiring_soon_days,
        "EXPIRED_WINDOW": payload.expired_window_days,
    }
    for setting_key, new_value in fields.items():
        if new_value is not None:
            update_blocked_seat_days(
                conn, tenant_id=tenant_id,
                setting_key=setting_key,
                new_value=new_value,
                updated_by_user_id=user_id,
            )

    return _blocked_seat_policy_response(resolve_blocked_seat_days(conn, tenant_id=tenant_id))


@router.patch("/booking-policy", response_model=BookingPolicyResponse)
def update_booking_policy(
    payload: UpdateBookingPolicyRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    if payload.employee_max_advance_days is not None:
        update_employee_max_advance_days(
            conn, tenant_id=tenant_id,
            new_value=payload.employee_max_advance_days,
            updated_by_user_id=user_id,
        )
    if payload.guest_max_advance_days is not None:
        update_guest_max_advance_days(
            conn, tenant_id=tenant_id,
            new_value=payload.guest_max_advance_days,
            updated_by_user_id=user_id,
        )

    return BookingPolicyResponse(
        **resolve_booking_advance_days(conn, tenant_id=tenant_id),
    )


@router.patch("/layout-policy", response_model=LayoutPolicyResponse)
def update_layout_policy(
    payload: UpdateLayoutPolicyRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> LayoutPolicyResponse:
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    if payload.buffer_days is not None:
        update_layout_scheduling_buffer_days(
            conn, tenant_id=tenant_id,
            new_value=payload.buffer_days,
            updated_by_user_id=user_id,
        )

    if payload.visibility_days is not None:
        visibility_fields = {
            "DRAFT": payload.visibility_days.draft,
            "ARCHIVED": payload.visibility_days.archived,
            "DELETED": payload.visibility_days.deleted,
        }
        for status_key, new_value in visibility_fields.items():
            if new_value is not None:
                update_layout_visibility_days(
                    conn, tenant_id=tenant_id,
                    status_key=status_key,
                    new_value=new_value,
                    updated_by_user_id=user_id,
                )

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
