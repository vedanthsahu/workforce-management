"""
Service layer for admin dashboard analytics.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Any, Literal

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.dashboard_repository import (
    fetch_admin_booking_list,
    fetch_admin_dashboard_summary,
    fetch_building_scope,
    fetch_date_range_occupancy,
    fetch_floor_scope,
    fetch_hierarchy_occupancy,
    fetch_site_scope,
)
from backend.schemas.admin_dashboard import (
    AdminBookingListItemResponse,
    AdminBookingListResponse,
    AdminBookingStatus,
    AdminBookingUserResponse,
    AdminDateOccupancyResponse,
    AdminDashboardSummaryResponse,
    AdminHierarchyOccupancyResponse,
)

HierarchyGroupLevel = Literal["site", "building", "floor"]

ADMIN_BOOKING_STATUSES = {
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "MODIFIED",
    "NO_SHOW",
}

MAX_OCCUPANCY_RANGE_DAYS = 90


def get_admin_dashboard_summary(
    conn: PGConnection,
    *,
    tenant_id: str,
    selected_date: date,
    site_id: str | None = None,
    floor_id: str | None = None,
) -> AdminDashboardSummaryResponse:
    """
    Return aggregated admin dashboard metrics.
    """

    try:
        summary = fetch_admin_dashboard_summary(
            conn,
            tenant_id=tenant_id,
            selected_date=selected_date,
            site_id=site_id,
            floor_id=floor_id,
        )

    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "admin_dashboard_summary_failed",
                "message": "Failed to fetch admin dashboard summary.",
            },
        ) from exc

    return AdminDashboardSummaryResponse(**summary)


def get_booking_list(
    conn: PGConnection,
    *,
    tenant_id: str,
    selected_date: date,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
    booking_status: AdminBookingStatus | None = None,
    page: int = 1,
    limit: int = 50,
) -> AdminBookingListResponse:
    """
    Return paginated admin booking rows for one tenant and booking date.
    """

    if booking_status is not None and booking_status not in ADMIN_BOOKING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_booking_status",
                "message": "bookingStatus is not supported.",
            },
        )

    try:
        _validate_hierarchy_filters(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
            active_only=False,
        )
        result = fetch_admin_booking_list(
            conn,
            tenant_id=tenant_id,
            booking_date=selected_date,
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
            booking_status=booking_status,
            page=page,
            limit=limit,
        )
    except HTTPException:
        raise
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "admin_booking_list_failed",
                "message": "Failed to fetch admin booking list.",
            },
        ) from exc

    total = int(result.get("total") or 0)
    total_pages = math.ceil(total / limit) if total else 0
    items = [
        _build_booking_item(row)
        for row in result.get("items", [])
    ]

    return AdminBookingListResponse(
        items=items,
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages,
    )


def get_date_range_occupancy(
    conn: PGConnection,
    *,
    tenant_id: str,
    start_date: date,
    end_date: date,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
) -> list[AdminDateOccupancyResponse]:
    """
    Return occupancy metrics for each date in the requested range.
    """

    _validate_occupancy_date_range(start_date=start_date, end_date=end_date)

    try:
        _validate_hierarchy_filters(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
            active_only=False,
        )
        rows = fetch_date_range_occupancy(
            conn,
            tenant_id=tenant_id,
            start_date=start_date,
            end_date=end_date,
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
        )
    except HTTPException:
        raise
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "date_range_occupancy_failed",
                "message": "Failed to fetch date range occupancy.",
            },
        ) from exc

    return [
        AdminDateOccupancyResponse(**row)
        for row in rows
    ]


def get_hierarchy_occupancy(
    conn: PGConnection,
    *,
    tenant_id: str,
    selected_date: date,
    site_id: str | None = None,
    building_id: str | None = None,
) -> list[AdminHierarchyOccupancyResponse]:
    """
    Return occupancy drilldown grouped by site, building, or floor.
    """

    if building_id is not None and site_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_hierarchy_combination",
                "message": "siteId is required when buildingId is provided.",
            },
        )

    group_level: HierarchyGroupLevel = "site"
    if site_id is not None:
        group_level = "building"
    if building_id is not None:
        group_level = "floor"

    try:
        _validate_hierarchy_filters(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            building_id=building_id,
            floor_id=None,
            active_only=True,
        )
        rows = fetch_hierarchy_occupancy(
            conn,
            tenant_id=tenant_id,
            selected_date=selected_date,
            group_level=group_level,
            site_id=site_id,
            building_id=building_id,
        )
    except HTTPException:
        raise
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "hierarchy_occupancy_failed",
                "message": "Failed to fetch hierarchy occupancy.",
            },
        ) from exc

    return [
        AdminHierarchyOccupancyResponse(
            **_build_hierarchy_row(row, group_level),
        )
        for row in rows
    ]


def _validate_occupancy_date_range(*, start_date: date, end_date: date) -> None:
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "endDate must be greater than or equal to startDate.",
            },
        )

    requested_days = (end_date - start_date).days + 1
    if requested_days > MAX_OCCUPANCY_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "date_range_too_large",
                "message": f"Maximum allowed range is {MAX_OCCUPANCY_RANGE_DAYS} days.",
            },
        )


def _validate_hierarchy_filters(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str | None,
    building_id: str | None,
    floor_id: str | None,
    active_only: bool,
) -> None:
    if site_id is not None:
        site = fetch_site_scope(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            active_only=active_only,
        )
        if site is None:
            _raise_location_not_found("site")

    building: dict[str, Any] | None = None
    if building_id is not None:
        building = fetch_building_scope(
            conn,
            tenant_id=tenant_id,
            building_id=building_id,
            active_only=active_only,
        )
        if building is None:
            _raise_location_not_found("building")
        if site_id is not None and str(building["site_id"]) != site_id:
            _raise_invalid_hierarchy(
                "buildingId does not belong to the supplied siteId.",
            )

    if floor_id is None:
        return

    floor = fetch_floor_scope(
        conn,
        tenant_id=tenant_id,
        floor_id=floor_id,
        active_only=active_only,
    )
    if floor is None:
        _raise_location_not_found("floor")

    if site_id is not None and str(floor["site_id"]) != site_id:
        _raise_invalid_hierarchy(
            "floorId does not belong to the supplied siteId.",
        )
    if building_id is not None and str(floor["building_id"]) != building_id:
        _raise_invalid_hierarchy(
            "floorId does not belong to the supplied buildingId.",
        )
    if building is not None and str(floor["site_id"]) != str(building["site_id"]):
        _raise_invalid_hierarchy(
            "buildingId and floorId do not belong to the same site.",
        )


def _raise_location_not_found(location_type: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": f"{location_type}_not_found",
            "message": (
                f"The requested {location_type} was not found for the "
                "authenticated tenant."
            ),
        },
    )


def _raise_invalid_hierarchy(message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "invalid_hierarchy_combination",
            "message": message,
        },
    )


def _build_booking_item(row: dict[str, Any]) -> AdminBookingListItemResponse:
    return AdminBookingListItemResponse(
        booking_id=str(row["booking_id"]),
        booking_date=row["booking_date"],
        booking_status=row["booking_status"],
        source_channel=row.get("source_channel"),
        user=_build_user(row, prefix="user"),
        booked_for_user=_build_user(row, prefix="booked_for_user"),
        seat={
            "seat_id": str(row["seat_id"]),
            "seat_code": row.get("seat_code"),
            "seat_type": row.get("seat_type"),
            "seat_neighborhood": row.get("seat_neighborhood"),
        },
        site={
            "site_id": str(row["site_id"]),
            "site_code": row.get("site_code"),
            "site_name": row.get("site_name"),
        },
        building={
            "building_id": str(row["building_id"]),
            "building_code": row.get("building_code"),
            "building_name": row.get("building_name"),
        },
        floor={
            "floor_id": str(row["floor_id"]),
            "floor_code": row.get("floor_code"),
            "floor_name": row.get("floor_name"),
        },
        check_in_at=row.get("check_in_at"),
        checked_out_at=row.get("checked_out_at"),
        created_at=row.get("created_at"),
    )


def _build_user(
    row: dict[str, Any],
    *,
    prefix: str,
) -> AdminBookingUserResponse | None:
    user_id = row.get(f"{prefix}_id")
    if user_id is None:
        return None

    return AdminBookingUserResponse(
        user_id=str(user_id),
        email=row.get(f"{prefix}_email"),
        full_name=row.get(f"{prefix}_full_name"),
        role_name=row.get(f"{prefix}_role_name"),
        department=row.get(f"{prefix}_department"),
        job_title=row.get(f"{prefix}_job_title"),
    )


def _build_hierarchy_row(
    row: dict[str, Any],
    group_level: HierarchyGroupLevel,
) -> dict[str, Any]:
    result = {
        "total_seats": row["total_seats"],
        "blocked_seats": row["blocked_seats"],
        "available_seats": row["available_seats"],
        "booked_seats": row["booked_seats"],
        "occupancy_rate": row["occupancy_rate"],
    }

    if group_level == "site":
        result["site_id"] = str(row["group_id"])
        result["site_name"] = row["group_name"]
    elif group_level == "building":
        result["building_id"] = str(row["group_id"])
        result["building_name"] = row["group_name"]
    else:
        result["floor_id"] = str(row["group_id"])
        result["floor_name"] = row["group_name"]

    return result
