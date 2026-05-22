"""
HTTP routes for admin dashboard analytics.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Annotated

from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import (
    require_any_permission,
)
from backend.db.connection import get_db
from backend.schemas.admin_dashboard import (
    AdminBookingListResponse,
    AdminBookingListQuery,
    AdminBookingStatus,
    AdminDateOccupancyResponse,
    AdminDashboardSummaryResponse,
    AdminHierarchyOccupancyQuery,
    AdminHierarchyOccupancyResponse,
    AdminOccupancyDateRangeQuery,
)
from backend.services.admin_dashboard_service import (
    get_admin_dashboard_summary,
    get_booking_list,
    get_date_range_occupancy,
    get_hierarchy_occupancy,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin-dashboard"],
)


@router.get(
    "/dashboard/summary",
    response_model=AdminDashboardSummaryResponse,
    summary="Get admin dashboard summary",
)
def admin_dashboard_summary(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    selected_date: Annotated[
        date | None,
        Query(alias="date"),
    ] = None,
    site_id: Annotated[
        int | None,
        Query(gt=0),
    ] = None,
    floor_id: Annotated[
        int | None,
        Query(gt=0),
    ] = None,
) -> AdminDashboardSummaryResponse:
    """
    Return aggregated admin dashboard summary metrics.
    """

    if selected_date is None:
        selected_date = date.today()

    return get_admin_dashboard_summary(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        selected_date=selected_date,
        site_id=str(site_id) if site_id is not None else None,
        floor_id=str(floor_id) if floor_id is not None else None,
    )


@router.get(
    "/bookings",
    response_model=AdminBookingListResponse,
    summary="List admin dashboard bookings",
    description=(
        "Return paginated tenant-scoped bookings for the selected date. "
        "Requires admin_dashboard:view or booking:view_all, or an admin role."
    ),
    responses={
        400: {
            "description": "Invalid filters or hierarchy combination.",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "invalid_hierarchy_combination",
                            "message": "floorId does not belong to the supplied buildingId.",
                        }
                    }
                }
            },
        },
        401: {"description": "Missing or invalid access token."},
        403: {"description": "Insufficient permissions."},
    },
)
def admin_booking_list(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view", "booking:view_all"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    selected_date: Annotated[
        date | None,
        Query(
            alias="date",
            description="Booking date to list. Defaults to current date.",
        ),
    ] = None,
    site_id: Annotated[
        int | None,
        Query(alias="siteId", gt=0, description="Optional site filter."),
    ] = None,
    building_id: Annotated[
        int | None,
        Query(alias="buildingId", gt=0, description="Optional building filter."),
    ] = None,
    floor_id: Annotated[
        int | None,
        Query(alias="floorId", gt=0, description="Optional floor filter."),
    ] = None,
    booking_status: Annotated[
        AdminBookingStatus | None,
        Query(
            alias="bookingStatus",
            description="Optional booking status filter.",
        ),
    ] = None,
    page: Annotated[int, Query(ge=1, description="Page number.")] = 1,
    limit: Annotated[
        int,
        Query(ge=1, le=200, description="Page size."),
    ] = 50,
) -> AdminBookingListResponse:
    if selected_date is None:
        selected_date = date.today()

    query = AdminBookingListQuery(
        date=selected_date,
        siteId=site_id,
        buildingId=building_id,
        floorId=floor_id,
        bookingStatus=booking_status,
        page=page,
        limit=limit,
    )

    return get_booking_list(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        selected_date=query.date,
        site_id=_optional_str(query.site_id),
        building_id=_optional_str(query.building_id),
        floor_id=_optional_str(query.floor_id),
        booking_status=query.booking_status,
        page=query.page,
        limit=query.limit,
    )


@router.get(
    "/occupancy/date-range",
    response_model=list[AdminDateOccupancyResponse],
    summary="Get date range occupancy",
    description=(
        "Return tenant-scoped occupancy metrics for every date in a range. "
        "Requires admin_dashboard:view or occupancy:view, or an admin role."
    ),
    responses={
        400: {
            "description": "Invalid date range or hierarchy combination.",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "date_range_too_large",
                            "message": "Maximum allowed range is 90 days.",
                        }
                    }
                }
            },
        },
        401: {"description": "Missing or invalid access token."},
        403: {"description": "Insufficient permissions."},
    },
)
def admin_date_range_occupancy(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view", "occupancy:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    start_date: Annotated[
        date,
        Query(alias="startDate", description="Inclusive range start date."),
    ],
    end_date: Annotated[
        date,
        Query(alias="endDate", description="Inclusive range end date."),
    ],
    site_id: Annotated[
        int | None,
        Query(alias="siteId", gt=0, description="Optional site filter."),
    ] = None,
    building_id: Annotated[
        int | None,
        Query(alias="buildingId", gt=0, description="Optional building filter."),
    ] = None,
    floor_id: Annotated[
        int | None,
        Query(alias="floorId", gt=0, description="Optional floor filter."),
    ] = None,
) -> list[AdminDateOccupancyResponse]:
    query = AdminOccupancyDateRangeQuery(
        startDate=start_date,
        endDate=end_date,
        siteId=site_id,
        buildingId=building_id,
        floorId=floor_id,
    )

    return get_date_range_occupancy(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        start_date=query.start_date,
        end_date=query.end_date,
        site_id=_optional_str(query.site_id),
        building_id=_optional_str(query.building_id),
        floor_id=_optional_str(query.floor_id),
    )


@router.get(
    "/occupancy/hierarchy",
    response_model=list[AdminHierarchyOccupancyResponse],
    response_model_exclude_none=True,
    summary="Get hierarchy occupancy drilldown",
    description=(
        "Return tenant-scoped occupancy grouped by sites, buildings, or floors. "
        "No filters groups by site; siteId groups by building; siteId and "
        "buildingId groups by floor."
    ),
    responses={
        400: {
            "description": "Invalid hierarchy combination.",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "invalid_hierarchy_combination",
                            "message": "siteId is required when buildingId is provided.",
                        }
                    }
                }
            },
        },
        401: {"description": "Missing or invalid access token."},
        403: {"description": "Insufficient permissions."},
    },
)
def admin_hierarchy_occupancy(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view", "occupancy:view"])),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    selected_date: Annotated[
        date | None,
        Query(alias="date", description="Occupancy date. Defaults to current date."),
    ] = None,
    site_id: Annotated[
        int | None,
        Query(alias="siteId", gt=0, description="Optional site drilldown filter."),
    ] = None,
    building_id: Annotated[
        int | None,
        Query(alias="buildingId", gt=0, description="Optional building drilldown filter."),
    ] = None,
) -> list[AdminHierarchyOccupancyResponse]:
    if selected_date is None:
        selected_date = date.today()

    query = AdminHierarchyOccupancyQuery(
        date=selected_date,
        siteId=site_id,
        buildingId=building_id,
    )

    return get_hierarchy_occupancy(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        selected_date=query.date,
        site_id=_optional_str(query.site_id),
        building_id=_optional_str(query.building_id),
    )


def _optional_str(value: int | None) -> str | None:
    return str(value) if value is not None else None
