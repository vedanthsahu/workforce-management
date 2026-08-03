"""HTTP routes for authenticated employee booking operations."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Query,
)
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.booking import (
    BookingEligibilityRequest,
    BookingEligibilityResponse,
    BookingResponse,
    CancelBookingRequest,
    CreateBookingRequest,
    ModifyBookingRequest,
    PaginatedBookingResponse,
)
from backend.services.booking_service import (
    book_seat,
    cancel_booking_by_id,
    check_booking_eligibility,
    get_delegated_cancelled_bookings,
    get_delegated_current_bookings,
    get_delegated_future_bookings,
    get_delegated_past_bookings,
    get_user_cancelled_bookings,
    get_user_current_bookings,
    get_user_future_bookings,
    get_user_past_bookings,
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


@router.get("/me/past", response_model=list[BookingResponse] | PaginatedBookingResponse)
def fetch_my_past_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
    return get_user_past_bookings(
        conn,
        current_user=current_user,
        page=page,
        limit=limit,
    )


@router.get("/me/current", response_model=list[BookingResponse])
def fetch_my_current_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_current_bookings(conn, current_user=current_user)


@router.get("/me/cancelled", response_model=list[BookingResponse] | PaginatedBookingResponse)
def fetch_my_cancelled_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
    return get_user_cancelled_bookings(
        conn,
        current_user=current_user,
        page=page,
        limit=limit,
    )


@router.get("/me/future", response_model=list[BookingResponse] | PaginatedBookingResponse)
def fetch_my_future_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
    return get_user_future_bookings(
        conn,
        current_user=current_user,
        page=page,
        limit=limit,
    )


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

@router.get("/delegated/past", response_model=list[BookingResponse] | PaginatedBookingResponse)
def fetch_delegated_past(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[BookingResponse] | PaginatedBookingResponse:

    return get_delegated_past_bookings(
        conn,
        current_user=current_user,
        page=page,
        limit=limit,
    )

@router.get("/delegated/current", response_model=list[BookingResponse])
def fetch_delegated_current(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:

    return get_delegated_current_bookings(
        conn,
        current_user=current_user,
    )

@router.get("/delegated/future", response_model=list[BookingResponse] | PaginatedBookingResponse)
def fetch_delegated_future(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[BookingResponse] | PaginatedBookingResponse:

    return get_delegated_future_bookings(
        conn,
        current_user=current_user,
        page=page,
        limit=limit,
    )

@router.get(
    "/delegated/cancelled",
    response_model=list[BookingResponse] | PaginatedBookingResponse,
)
def fetch_delegated_cancelled(
    current_user: Annotated[    
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
):
    return get_delegated_cancelled_bookings(
        conn,
        current_user=current_user,
        page=page,
        limit=limit,
    )
