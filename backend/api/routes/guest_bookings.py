"""Administrative guest seat booking routes."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.booking import (
    BookingResponse,
    CancelBookingRequest,
    ModifyBookingRequest,
    PaginatedBookingResponse,
)
from backend.schemas.guest import CreateGuestBookingRequest
from backend.services.guest_service import (
    cancel_guest_booking,
    create_guest_booking,
    get_guest_booking,
    list_guest_bookings,
    modify_guest_booking,
)

router = APIRouter(prefix="/guest-bookings", tags=["guest-bookings"])


@router.get("", response_model=list[BookingResponse] | PaginatedBookingResponse)
def fetch_guest_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    guest_id: Annotated[int | None, Query(gt=0)] = None,
    booking_date: date | None = None,
    booking_status: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    page: Annotated[int | None, Query(ge=1)] = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
    return list_guest_bookings(
        conn,
        current_user=current_user,
        guest_id=str(guest_id) if guest_id is not None else None,
        booking_date=booking_date,
        booking_status=booking_status,
        limit=limit,
        page=page,
    )


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest_booking_record(
    payload: CreateGuestBookingRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return create_guest_booking(
        conn,
        current_user=current_user,
        payload=payload,
        background_tasks=background_tasks,
    )


@router.get("/{booking_id}", response_model=BookingResponse)
def fetch_guest_booking(
    booking_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return get_guest_booking(
        conn,
        current_user=current_user,
        booking_id=str(booking_id),
    )


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_guest_booking_record(
    booking_id: Annotated[int, Path(gt=0)],
    payload: CancelBookingRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return cancel_guest_booking(
        conn,
        current_user=current_user,
        booking_id=str(booking_id),
        cancellation_reason=payload.cancellation_reason,
        background_tasks=background_tasks,
    )


@router.post("/{booking_id}/modify", response_model=BookingResponse)
def modify_guest_booking_record(
    booking_id: Annotated[int, Path(gt=0)],
    payload: ModifyBookingRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return modify_guest_booking(
        conn,
        current_user=current_user,
        booking_id=str(booking_id),
        payload=payload,
        background_tasks=background_tasks,
    )
