"""HTTP routes for blocked-seat administration."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_any_permission, require_permission
from backend.db.connection import get_db
from backend.schemas.blocked_seat import (
    BlockableFloorLayoutResponse,
    BlockedSeatCategory,
    BlockedSeatHistoryResponse,
    BlockedSeatListQuery,
    BlockedSeatListResponse,
    BlockedSeatResponse,
    BlockedSeatSummaryResponse,
    BlockedSeatType,
    CancelBlockedSeatRequest,
    CancelBlockedSeatResponse,
    CreateBlockedSeatsRequest,
    CreateBlockedSeatsResponse,
    FloorLayoutScheduleResponse,
    UpdateBlockedSeatRequest,
)
from backend.services.blocked_seat_service import (
    cancel_seat_block,
    create_blocked_seats,
    get_blockable_floor_layout,
    get_blocked_seat_history,
    get_blocked_seat_summary,
    get_blocked_seats,
    update_seat_block,
)

router = APIRouter(prefix="/admin", tags=["admin-blocked-seats"])


@router.get(
    "/blocked-seats",
    response_model=BlockedSeatListResponse,
    summary="Search blocked seats and summary counts",
)
def admin_blocked_seats(
    current_user: Annotated[
        dict[str, Any], Depends(require_any_permission(["seat:block", "seat:view_all"]))
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
    category: Annotated[BlockedSeatCategory, Query()] = "active",
    search: Annotated[str | None, Query(min_length=1)] = None,
    site_id: Annotated[int | None, Query(alias="siteId", gt=0)] = None,
    building_id: Annotated[int | None, Query(alias="buildingId", gt=0)] = None,
    floor_id: Annotated[int | None, Query(alias="floorId", gt=0)] = None,
    block_type: Annotated[BlockedSeatType | None, Query(alias="blockType")] = None,
    selected_date: Annotated[date | None, Query(alias="date")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    include_summary: Annotated[bool, Query(alias="includeSummary")] = True,
) -> BlockedSeatListResponse:
    query = BlockedSeatListQuery(
        category=category,
        search=search,
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
        block_type=block_type,
        selected_date=selected_date,
    )
    return get_blocked_seats(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        query=query,
        page=page,
        limit=limit,
        include_summary=include_summary,
    )


@router.get(
    "/blocked-seats/summary",
    response_model=BlockedSeatSummaryResponse,
    summary="Get blocked-seat summary counts",
)
def blocked_seat_summary(
    current_user: Annotated[
        dict[str, Any], Depends(require_any_permission(["seat:block", "seat:view_all"]))
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockedSeatSummaryResponse:
    return get_blocked_seat_summary(conn, tenant_id=str(current_user["tenant_id"]))


@router.get(
    "/blocked-seats/{block_id}/history",
    response_model=BlockedSeatHistoryResponse,
    summary="Get blocked-seat audit history",
)
def blocked_seat_history(
    block_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[
        dict[str, Any], Depends(require_any_permission(["seat:block", "seat:view_all"]))
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockedSeatHistoryResponse:
    return get_blocked_seat_history(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        block_id=str(block_id),
    )


@router.patch(
    "/blocked-seats/{block_id}",
    response_model=BlockedSeatResponse,
    summary="Update an active seat block",
)
def update_block(
    block_id: Annotated[int, Path(gt=0)],
    payload: UpdateBlockedSeatRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("seat:block"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockedSeatResponse:
    return update_seat_block(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        block_id=str(block_id),
        payload=payload,
        current_user=current_user,
    )


@router.get(
    "/blocked-seats/floors/{floor_id}/layout-resources",
    response_model=BlockableFloorLayoutResponse | FloorLayoutScheduleResponse,
    summary="Get the blockable floor layout for an effective date range",
)
def blockable_floor_layout(
    floor_id: Annotated[int, Path(gt=0)],
    blocked_from: Annotated[date, Query(alias="blockedFrom")],
    blocked_to: Annotated[date, Query(alias="blockedTo")],
    current_user: Annotated[dict[str, Any], Depends(require_permission("seat:block"))],
    conn: Annotated[PGConnection, Depends(get_db)],
    view: Annotated[
        Literal["resources", "metadata", "conflicts", "schedule"], Query()
    ] = "resources",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    seat_ids: Annotated[list[int] | None, Query(alias="seatId", max_length=200)] = None,
) -> BlockableFloorLayoutResponse | FloorLayoutScheduleResponse:
    # Preserve the permission boundary of the previous /admin/bookings lookup.
    if view == "conflicts" and not {"booking:view_all", "admin_dashboard:view"}.intersection(
        current_user.get("permissions", [])
    ):
        raise HTTPException(status_code=403, detail={
            "code": "insufficient_permissions",
            "message": "Booking-view permission is required to view conflict details.",
        })
    return get_blockable_floor_layout(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        floor_id=floor_id,
        blocked_from=blocked_from,
        blocked_to=blocked_to,
        view=view,
        page=page,
        limit=limit,
        seat_ids=seat_ids,
    )


@router.post(
    "/blocked-seats",
    response_model=CreateBlockedSeatsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Block multiple seats",
)
def block_seats(
    payload: CreateBlockedSeatsRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("seat:block"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> CreateBlockedSeatsResponse:
    return create_blocked_seats(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/blocked-seats/{block_id}/cancel",
    response_model=CancelBlockedSeatResponse,
    summary="Cancel an active seat block",
)
def cancel_block(
    block_id: Annotated[int, Path(gt=0)],
    payload: CancelBlockedSeatRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("seat:block"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> CancelBlockedSeatResponse:
    return cancel_seat_block(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        block_id=str(block_id),
        reason=payload.reason,
        current_user=current_user,
    )
