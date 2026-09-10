"""
Read-only routes exposing resolved business-rule policy values.

Frontend previously hardcoded these (booking advance-day limits, the
layout-scheduling buffer, layout list-visibility thresholds) as constants
duplicated from the backend's own hardcoded checks. Both sides are now
driven by business_rules/tenant_business_rules; these two endpoints are
the read path for a UI that wants the current tenant's actual values
instead of hardcoding a guess.

No permission dependency -- any authenticated user can read these
(they're not sensitive, and several apply to the plain booking flow every
employee uses), matching get_current_user-only routes elsewhere (e.g.
dashboard.py).
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.business_rule import (
    BookingPolicyResponse,
    LayoutPolicyResponse,
    LayoutVisibilityDaysResponse,
)
from backend.services.business_rule_service import (
    resolve_booking_advance_days,
    resolve_layout_scheduling_gap,
    resolve_layout_visibility_days,
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
