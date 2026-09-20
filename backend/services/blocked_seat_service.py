"""Business logic for blocked-seat administration."""

from __future__ import annotations

import math
from datetime import date
from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection

from backend.core.audit_actions import (
    SEAT_BLOCK_CANCELLED,
    SEAT_BLOCK_CREATED,
    SEAT_BLOCK_UPDATED,
)
from backend.repositories.audit_repository import safe_write_audit_log
from backend.repositories.blocked_seat_repository import (
    cancel_blocked_seat,
    fetch_blockable_floor_layout,
    fetch_blocked_seat_history,
    fetch_blocked_seat_summary,
    fetch_blocked_seats,
    fetch_blocked_seats_by_ids,
    fetch_conflicting_booking_seat_codes,
    fetch_seats_for_block,
    insert_blocked_seats,
    update_blocked_seat,
)
from backend.schemas.blocked_seat import (
    BlockableFloorLayoutResponse,
    BlockableResourceResponse,
    BlockedSeatActorResponse,
    BlockedSeatHistoryItemResponse,
    BlockedSeatHistoryResponse,
    BlockedSeatListQuery,
    BlockedSeatListResponse,
    BlockedSeatResponse,
    BlockedSeatSummaryResponse,
    CancelBlockedSeatResponse,
    CreateBlockedSeatsRequest,
    CreateBlockedSeatsResponse,
    FloorLayoutScheduleItemResponse,
    FloorLayoutScheduleResponse,
    UpdateBlockedSeatRequest,
)
from backend.schemas.pagination import PaginationMetadata


def _response(row: dict[str, Any]) -> BlockedSeatResponse:
    return BlockedSeatResponse(
        block_id=str(row["block_id"]),
        seat_id=str(row["seat_id"]),
        seat_code=row["seat_code"],
        site_id=str(row["site_id"]),
        site_name=row["site_name"],
        building_id=str(row["building_id"]),
        building_name=row["building_name"],
        floor_id=str(row["floor_id"]),
        floor_name=row["floor_name"],
        blocked_from=row["blocked_from"],
        blocked_to=row["blocked_to"],
        block_type=row["block_type"],
        reason=row["reason"],
        display_status=row["display_status"],
        blocked_by=BlockedSeatActorResponse(
            user_id=row.get("blocked_by_user_id"),
            name=row.get("blocked_by_name"),
        ),
        created_at=row["created_at"],
    )


def get_blocked_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    query: BlockedSeatListQuery,
    page: int,
    limit: int,
    include_summary: bool = True,
) -> BlockedSeatListResponse:
    reference_date = date.today()
    try:
        rows, total = fetch_blocked_seats(
            conn,
            tenant_id=tenant_id,
            query=query,
            reference_date=reference_date,
            page=page,
            limit=limit,
        )
        summary = {}
        if include_summary:
            # Summary cards represent tenant-wide totals. Search and location/type/date
            # filters apply only to the result table and its pagination.
            summary = fetch_blocked_seat_summary(
                conn,
                tenant_id=tenant_id,
                query=BlockedSeatListQuery(category=query.category),
                reference_date=reference_date,
            )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "blocked_seat_list_failed",
                "message": "Failed to fetch blocked seats.",
            },
        ) from exc
    return BlockedSeatListResponse(
        items=[_response(row) for row in rows],
        summary=BlockedSeatSummaryResponse(**summary),
        pagination=PaginationMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total else 0,
        ),
    )


def get_blocked_seat_summary(
    conn: PGConnection, *, tenant_id: str
) -> BlockedSeatSummaryResponse:
    try:
        summary = fetch_blocked_seat_summary(
            conn,
            tenant_id=tenant_id,
            query=BlockedSeatListQuery(),
            reference_date=date.today(),
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "blocked_seat_summary_failed",
                "message": "Failed to fetch blocked-seat summary.",
            },
        ) from exc
    return BlockedSeatSummaryResponse(**summary)


def get_blocked_seat(
    conn: PGConnection, *, tenant_id: str, block_id: str
) -> BlockedSeatResponse:
    try:
        rows = fetch_blocked_seats_by_ids(
            conn,
            tenant_id=tenant_id,
            block_ids=[block_id],
            reference_date=date.today(),
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "blocked_seat_detail_failed",
                "message": "Failed to load the blocked seat.",
            },
        ) from exc
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "blocked_seat_not_found",
                "message": "Blocked seat was not found.",
            },
        )
    return _response(rows[0])


def get_blocked_seat_history(
    conn: PGConnection, *, tenant_id: str, block_id: str
) -> BlockedSeatHistoryResponse:
    # Keep history tenant-scoped and return 404 for inaccessible block IDs.
    get_blocked_seat(conn, tenant_id=tenant_id, block_id=block_id)
    try:
        rows = fetch_blocked_seat_history(
            conn, tenant_id=tenant_id, block_id=block_id
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "blocked_seat_history_failed",
                "message": "Failed to load blocked-seat history.",
            },
        ) from exc
    return BlockedSeatHistoryResponse(
        items=[BlockedSeatHistoryItemResponse(**row) for row in rows]
    )


def get_blockable_floor_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: int,
    blocked_from: date,
    blocked_to: date,
    view: str = "resources",
    page: int = 1,
    limit: int = 100,
    seat_ids: list[int] | None = None,
) -> BlockableFloorLayoutResponse | FloorLayoutScheduleResponse:
    if blocked_from < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "past_block_date",
                "message": "Seats cannot be blocked for a past date.",
            },
        )
    if blocked_to < blocked_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "Block To must be on or after Block From.",
            },
        )
    try:
        layout = fetch_blockable_floor_layout(
            conn,
            tenant_id=tenant_id,
            floor_id=floor_id,
            blocked_from=blocked_from,
            blocked_to=blocked_to,
            view=view,
            page=page,
            limit=limit,
            seat_ids=seat_ids,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "blockable_layout_lookup_failed",
                "message": "Failed to load the floor layout.",
            },
        ) from exc
    if layout is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "layout_effective_period_crossed",
                "message": (
                    "The selected period crosses a floor-layout effective-date boundary "
                    "or has no effective layout. Select dates within one layout period."
                ),
            },
        )
    if view == "schedule":
        return FloorLayoutScheduleResponse(
            layouts=[
                FloorLayoutScheduleItemResponse(**item)
                for item in layout.get("layouts", [])
            ]
        )
    return BlockableFloorLayoutResponse(
        layout_id=str(layout["layout_id"]),
        layout_name=layout["layout_name"],
        layout_file_url=layout["layout_file_url"],
        effective_from=layout.get("effective_from"),
        effective_till=layout.get("effective_till"),
        conflicts=layout.get("conflicts", []),
        has_more_conflicts=layout.get("has_more_conflicts", False),
        resources=[
            BlockableResourceResponse(**resource) for resource in layout["resources"]
        ],
    )


def create_blocked_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateBlockedSeatsRequest,
    current_user: dict[str, Any],
) -> CreateBlockedSeatsResponse:
    if payload.blocked_from < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "past_block_date",
                "message": "Seats cannot be blocked for a past date.",
            },
        )
    seat_ids = payload.seat_ids
    resource_id = ",".join(str(value) for value in seat_ids)
    try:
        seats = fetch_seats_for_block(conn, tenant_id=tenant_id, seat_ids=seat_ids)
        found_ids = {int(seat["id"]) for seat in seats}
        missing_ids = [seat_id for seat_id in seat_ids if seat_id not in found_ids]
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "seat_not_found",
                    "message": f"Seats not found: {', '.join(map(str, missing_ids))}.",
                },
            )
        floor_ids = {int(seat["floor_id"]) for seat in seats}
        if len(floor_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "resources_must_share_floor",
                    "message": "All selected resources must belong to the same floor.",
                },
            )
        layout = fetch_blockable_floor_layout(
            conn,
            tenant_id=tenant_id,
            floor_id=next(iter(floor_ids)),
            blocked_from=payload.blocked_from,
            blocked_to=payload.blocked_to,
        )
        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "layout_effective_period_crossed",
                    "message": (
                        "The selected period crosses a floor-layout effective-date boundary "
                        "or has no effective layout. Select dates within one layout period."
                    ),
                },
            )
        layout_resource_ids = {
            int(resource["resource_id"]) for resource in layout["resources"]
        }
        if any(seat_id not in layout_resource_ids for seat_id in seat_ids):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "resource_not_in_effective_layout",
                    "message": "One or more resources are not part of the effective floor layout.",
                },
            )
        unavailable = [
            seat["seat_code"]
            for seat in seats
            if seat["status"] != "ACTIVE" or not seat["is_bookable"]
        ]
        if unavailable:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "seat_not_bookable",
                    "message": f"Seats are not active and bookable: {', '.join(unavailable)}.",
                },
            )
        booking_conflicts = fetch_conflicting_booking_seat_codes(
            conn,
            tenant_id=tenant_id,
            seat_ids=seat_ids,
            blocked_from=payload.blocked_from,
            blocked_to=payload.blocked_to,
        )
        if booking_conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "seat_has_existing_bookings",
                    "message": (
                        f"Seats already booked in this period: {', '.join(booking_conflicts)}. "
                        "Modify or cancel the existing booking before blocking."
                    ),
                },
            )
        block_ids = insert_blocked_seats(
            conn,
            tenant_id=tenant_id,
            seats=seats,
            block_type=payload.block_type,
            blocked_from=payload.blocked_from,
            blocked_to=payload.blocked_to,
            reason=payload.reason,
            blocked_by_user_id=str(current_user["user_id"]),
        )
        conn.commit()
    except HTTPException as exc:
        conn.rollback()
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        safe_write_audit_log(
            conn,
            action=SEAT_BLOCK_CREATED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="blocked_seat",
            resource_id=resource_id,
            event_status="FAILURE",
            failure_code=detail.get("code"),
            failure_reason=detail.get("message"),
        )
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        conflict = exc.pgcode == errorcodes.EXCLUSION_VIOLATION
        code = "seat_already_blocked" if conflict else "blocked_seat_create_failed"
        message = (
            "One or more seats already have an overlapping active block."
            if conflict
            else "Failed to block seats."
        )
        safe_write_audit_log(
            conn,
            action=SEAT_BLOCK_CREATED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="blocked_seat",
            resource_id=resource_id,
            event_status="FAILURE",
            failure_code=code,
            failure_reason=message,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT
            if conflict
            else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": code, "message": message},
        ) from exc

    rows = fetch_blocked_seats_by_ids(
        conn,
        tenant_id=tenant_id,
        block_ids=block_ids,
        reference_date=date.today(),
    )
    safe_write_audit_log(
        conn,
        action=SEAT_BLOCK_CREATED,
        tenant_id=tenant_id,
        current_user=current_user,
        resource_type="blocked_seat",
        resource_id=",".join(block_ids),
        new_values=payload.model_dump(mode="json"),
        metadata={"seat_ids": seat_ids, "block_ids": block_ids},
    )
    return CreateBlockedSeatsResponse(
        message=f"{len(rows)} seat{'s' if len(rows) != 1 else ''} blocked successfully.",
        created_count=len(rows),
        items=[_response(row) for row in rows],
    )


def cancel_seat_block(
    conn: PGConnection,
    *,
    tenant_id: str,
    block_id: str,
    reason: str,
    current_user: dict[str, Any],
) -> CancelBlockedSeatResponse:
    try:
        old = cancel_blocked_seat(conn, tenant_id=tenant_id, block_id=block_id)
        if old is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "blocked_seat_not_found",
                    "message": "Active blocked seat was not found.",
                },
            )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "blocked_seat_cancel_failed",
                "message": "Failed to cancel the seat block.",
            },
        ) from exc
    safe_write_audit_log(
        conn,
        action=SEAT_BLOCK_CANCELLED,
        tenant_id=tenant_id,
        current_user=current_user,
        resource_type="blocked_seat",
        resource_id=block_id,
        old_values={
            key: value.isoformat() if hasattr(value, "isoformat") else value
            for key, value in old.items()
        },
        new_values={"status": "CANCELLED", "reason": reason},
        changed_fields=["status"],
    )
    return CancelBlockedSeatResponse(
        message="Seat block cancelled successfully.",
        block_id=block_id,
        status="CANCELLED",
    )


def update_seat_block(
    conn: PGConnection,
    *,
    tenant_id: str,
    block_id: str,
    payload: UpdateBlockedSeatRequest,
    current_user: dict[str, Any],
) -> BlockedSeatResponse:
    existing = get_blocked_seat(conn, tenant_id=tenant_id, block_id=block_id)
    if existing.display_status == "EXPIRED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "expired_block_read_only",
                "message": "Expired blocks cannot be edited. Re-block the seat instead.",
            },
        )

    blocked_from = payload.blocked_from or existing.blocked_from
    blocked_to = payload.blocked_to or existing.blocked_to
    block_type = payload.block_type or existing.block_type
    reason = payload.reason or existing.reason
    if blocked_to < blocked_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "Block To must be on or after Block From.",
            },
        )

    old_values = {
        "block_type": existing.block_type,
        "blocked_from": existing.blocked_from.isoformat(),
        "blocked_to": existing.blocked_to.isoformat(),
        "reason": existing.reason,
    }
    new_values = {
        "block_type": block_type,
        "blocked_from": blocked_from.isoformat(),
        "blocked_to": blocked_to.isoformat(),
        "reason": reason,
    }
    changed_fields = [
        key for key, value in new_values.items() if old_values[key] != value
    ]
    if not changed_fields:
        return existing

    try:
        layout = fetch_blockable_floor_layout(
            conn,
            tenant_id=tenant_id,
            floor_id=int(existing.floor_id),
            blocked_from=blocked_from,
            blocked_to=blocked_to,
        )
        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "layout_effective_period_crossed",
                    "message": (
                        "The selected period crosses a floor-layout effective-date "
                        "boundary or has no effective layout."
                    ),
                },
            )
        layout_resource_ids = {
            str(resource["resource_id"]) for resource in layout["resources"]
        }
        if existing.seat_id not in layout_resource_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "resource_not_in_effective_layout",
                    "message": "The seat is not part of the effective floor layout.",
                },
            )
        conflicts = fetch_conflicting_booking_seat_codes(
            conn,
            tenant_id=tenant_id,
            seat_ids=[int(existing.seat_id)],
            blocked_from=blocked_from,
            blocked_to=blocked_to,
        )
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "seat_has_existing_bookings",
                    "message": (
                        f"Seat already has bookings in this period: {', '.join(conflicts)}."
                    ),
                },
            )
        updated = update_blocked_seat(
            conn,
            tenant_id=tenant_id,
            block_id=block_id,
            block_type=block_type,
            blocked_from=blocked_from,
            blocked_to=blocked_to,
            reason=reason,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "blocked_seat_not_found",
                    "message": "Editable blocked seat was not found.",
                },
            )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        conflict = exc.pgcode == errorcodes.EXCLUSION_VIOLATION
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
                if conflict
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail={
                "code": (
                    "seat_already_blocked" if conflict else "blocked_seat_update_failed"
                ),
                "message": (
                    "The updated period overlaps another active block."
                    if conflict
                    else "Failed to update the seat block."
                ),
            },
        ) from exc

    safe_write_audit_log(
        conn,
        action=SEAT_BLOCK_UPDATED,
        tenant_id=tenant_id,
        current_user=current_user,
        resource_type="blocked_seat",
        resource_id=block_id,
        old_values=old_values,
        new_values=new_values,
        changed_fields=changed_fields,
    )
    return get_blocked_seat(conn, tenant_id=tenant_id, block_id=block_id)
