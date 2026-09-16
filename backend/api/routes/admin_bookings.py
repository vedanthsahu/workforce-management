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
    AdminVisitStatus,
)
from backend.services.booking_service import get_admin_bookings

router = APIRouter(prefix="/admin", tags=["admin-bookings"])


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
