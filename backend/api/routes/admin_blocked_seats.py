"""HTTP routes for blocked-seat administration."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_any_permission, require_permission
from backend.db.connection import get_db
from backend.schemas.blocked_seat import (
    BlockableFloorLayoutResponse,
    BlockedSeatCategory,
    BlockedSeatListQuery,
    BlockedSeatListResponse,
    BlockedSeatType,
    CancelBlockedSeatRequest,
    CancelBlockedSeatResponse,
    CreateBlockedSeatsRequest,
    CreateBlockedSeatsResponse,
)
from backend.services.blocked_seat_service import (
    cancel_seat_block,
    create_blocked_seats,
    get_blockable_floor_layout,
    get_blocked_seats,
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
    )


@router.get(
    "/blocked-seats/floors/{floor_id}/layout-resources",
    response_model=BlockableFloorLayoutResponse,
    summary="Get the blockable floor layout for an effective date range",
)
def blockable_floor_layout(
    floor_id: Annotated[int, Path(gt=0)],
    blocked_from: Annotated[date, Query(alias="blockedFrom")],
    blocked_to: Annotated[date, Query(alias="blockedTo")],
    current_user: Annotated[dict[str, Any], Depends(require_permission("seat:block"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BlockableFloorLayoutResponse:
    return get_blockable_floor_layout(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        floor_id=floor_id,
        blocked_from=blocked_from,
        blocked_to=blocked_to,
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
