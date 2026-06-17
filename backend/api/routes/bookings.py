"""HTTP routes for authenticated employee booking operations."""
"""HTTP routes for authenticated employee booking operations."""

from __future__ import annotations

from typing import Any, Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
)
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
)
from psycopg2.extensions import connection as PGConnection

from backend.schemas.booking import (
BookingEligibilityRequest,
BookingEligibilityResponse,
)

from backend.services.booking_service import (
check_booking_eligibility,
)

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.booking import (
    BookingResponse,
    CancelBookingRequest,
    CreateBookingRequest,
    ModifyBookingRequest,
)
from backend.services.booking_service import (
    book_seat,
    cancel_booking_by_id,
    get_user_past_bookings,
    get_user_current_bookings,
    get_user_cancelled_bookings,
    get_user_future_bookings,
    modify_booking,
)


router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=201)
def create_booking(
    payload: CreateBookingRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return book_seat(
        conn,
        current_user=current_user,
        payload=payload,
        background_tasks=background_tasks,
    )


@router.get("/me/past", response_model=list[BookingResponse])
def fetch_my_past_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_past_bookings(conn, current_user=current_user)


@router.get("/me/current", response_model=list[BookingResponse])
def fetch_my_current_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_current_bookings(conn, current_user=current_user)


@router.get("/me/cancelled", response_model=list[BookingResponse])
def fetch_my_cancelled_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_cancelled_bookings(conn, current_user=current_user)


@router.get("/me/future", response_model=list[BookingResponse])
def fetch_my_future_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_future_bookings(conn, current_user=current_user)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking_route(
    booking_id: str,
    payload: CancelBookingRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return cancel_booking_by_id(
        conn,
        current_user=current_user,
        booking_id=booking_id,
        cancellation_reason=payload.cancellation_reason,
        background_tasks=background_tasks,
    )


@router.post("/{booking_id}/modify", response_model=BookingResponse)
def modify_booking_route(
    booking_id: str,
    payload: ModifyBookingRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> BookingResponse:
    return modify_booking(
        conn,
        current_user=current_user,
        booking_id=booking_id,
        payload=payload,
        background_tasks=background_tasks,
    )

@router.post("/eligibility",response_model=BookingEligibilityResponse,)
def booking_eligibility(
    payload: BookingEligibilityRequest,
    current_user: Annotated[
    dict[str, Any],
    Depends(get_current_user),
    ],
    conn: Annotated[
    PGConnection,
    Depends(get_db),
    ],
    ) -> BookingEligibilityResponse:

    return check_booking_eligibility(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        current_user=current_user,
        payload=payload,
    )
