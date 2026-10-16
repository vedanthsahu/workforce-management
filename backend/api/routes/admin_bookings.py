"""HTTP routes for admin booking management (employee + guest, tenant-wide)."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_any_permission
from backend.db.connection import get_db
from backend.schemas.booking import (
    AdminBookingListQuery,
    AdminBookingListResponse,
    AdminBookingStatus,
    AdminBookingType,
    AdminPersonSuggestion,
    AdminSeatSuggestion,
    AdminVisitStatus,
)
from backend.services.booking_service import (
    get_admin_bookings,
    get_admin_person_suggestions,
    get_admin_seat_suggestions,
)

router = APIRouter(prefix="/admin", tags=["admin-bookings"])

# Suggestion lists are preloaded by the page (empty `q`) and filtered in the
# browser as the user types, so the cap is generous; the page only falls back
# to per-keystroke server searches if a tenant's list is bigger than the cap.
SUGGESTION_LIMIT_DEFAULT = 200
SUGGESTION_LIMIT_MAX = 2000
_ADMIN_VIEW = ["booking:view_all", "admin_dashboard:view"]


@router.get(
    "/bookings",
    response_model=AdminBookingListResponse,
    summary="Search employee and guest bookings tenant-wide",
    description=(
        "Admin booking management listing: employee + guest bookings across "
        "the whole tenant with optional date range, site/building/floor, "
        "booking type, name/email search, seat code, booked-by, and status "
        "filters, plus a summary of counts over the filtered dataset. "
        "booking_status filters bookings.booking_status; visit_status "
        "filters guest_visits.visit_status for guest records. "
        "Requires booking:view_all or admin_dashboard:view."
    ),
)
def admin_bookings(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["booking:view_all", "admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    start_date: Annotated[
        date | None,
        Query(alias="startDate", description="Inclusive booking date range start."),
    ] = None,
    end_date: Annotated[
        date | None,
        Query(alias="endDate", description="Inclusive booking date range end."),
    ] = None,
    site_id: Annotated[int | None, Query(alias="siteId", gt=0)] = None,
    building_id: Annotated[int | None, Query(alias="buildingId", gt=0)] = None,
    floor_id: Annotated[int | None, Query(alias="floorId", gt=0)] = None,
    booking_type: Annotated[
        AdminBookingType | None,
        Query(alias="bookingType", description="EMPLOYEE or GUEST; omit for both."),
    ] = None,
    booking_status: Annotated[
        AdminBookingStatus | None,
        Query(alias="bookingStatus", description="Filters bookings.booking_status (employee + guest-with-seat rows)."),
    ] = None,
    visit_status: Annotated[
        AdminVisitStatus | None,
        Query(alias="visitStatus", description="Filters guest_visits.visit_status (guest rows only)."),
    ] = None,
    search: Annotated[
        str | None,
        Query(
            min_length=1,
            description="Partial, case-insensitive match on name/email.",
        ),
    ] = None,
    seat_code: Annotated[
        str | None,
        Query(alias="seatCode", min_length=1, description="Partial seat_code match."),
    ] = None,
    booked_by_user_id: Annotated[
        int | None,
        Query(alias="bookedByUserId", gt=0),
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AdminBookingListResponse:
    query = AdminBookingListQuery(
        start_date=start_date,
        end_date=end_date,
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
        booking_type=booking_type,
        booking_status=booking_status,
        visit_status=visit_status,
        search=search,
        seat_code=seat_code,
        booked_by_user_id=booked_by_user_id,
    )

    return get_admin_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        query=query,
        page=page,
        limit=limit,
    )


@router.get(
    "/bookings/suggest/people",
    response_model=list[AdminPersonSuggestion],
    summary="Search-as-you-type employee/guest names for the admin bookings filter",
    description=(
        "Distinct people with bookings matching the text on name or email "
        "(empty text lists everyone), ranked: name starts with the text, then a name word starts with it, "
        "then email starts with it, then any other match."
    ),
)
def admin_booking_person_suggestions(
    current_user: Annotated[dict[str, Any], Depends(require_any_permission(_ADMIN_VIEW))],
    conn: Annotated[PGConnection, Depends(get_db)],
    booking_type: Annotated[AdminBookingType, Query(alias="bookingType")],
    q: Annotated[str, Query(max_length=100)] = "",
    limit: Annotated[int, Query(ge=1, le=SUGGESTION_LIMIT_MAX)] = SUGGESTION_LIMIT_DEFAULT,
) -> list[dict[str, Any]]:
    return get_admin_person_suggestions(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        text=q.strip(),
        booking_type=booking_type,
        limit=limit,
    )


@router.get(
    "/bookings/suggest/seats",
    response_model=list[AdminSeatSuggestion],
    summary="Search-as-you-type seat codes for the admin bookings filter",
    description=(
        "Distinct booked seat codes matching the text, ranked: code starts "
        "with the text, then a code segment starts with it, then any other match."
    ),
)
def admin_booking_seat_suggestions(
    current_user: Annotated[dict[str, Any], Depends(require_any_permission(_ADMIN_VIEW))],
    conn: Annotated[PGConnection, Depends(get_db)],
    q: Annotated[str, Query(max_length=100)] = "",
    limit: Annotated[int, Query(ge=1, le=SUGGESTION_LIMIT_MAX)] = SUGGESTION_LIMIT_DEFAULT,
) -> list[dict[str, Any]]:
    return get_admin_seat_suggestions(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        text=q.strip(),
        limit=limit,
    )
