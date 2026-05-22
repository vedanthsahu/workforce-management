"""HTTP routes for authenticated booking operations."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from psycopg2.extensions import connection as PGConnection
from datetime import timedelta

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.booking import BookingResponse, CreateBookingRequest, CancelBookingRequest, ModifyBookingRequest
from backend.services.booking_service import book_seat, get_user_past_bookings,get_user_current_bookings,get_user_cancelled_bookings,get_user_future_bookings, cancel_booking_by_id, modify_booking

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
def fetch_my_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_past_bookings(conn, current_user=current_user)

@router.get("/me/current", response_model=list[BookingResponse])
def fetch_my_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_current_bookings(conn, current_user=current_user)

@router.get("/me/cancelled", response_model=list[BookingResponse])
def fetch_my_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_cancelled_bookings(conn, current_user=current_user)

@router.get("/me/future", response_model=list[BookingResponse])
def fetch_my_bookings(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[BookingResponse]:
    return get_user_future_bookings(conn, current_user=current_user)


# @router.get(
#     "/available",
#     response_model=list[AvailableSeatResponse],
# )
# def available_seats(

#     floor_id: Annotated[int, Query(gt=0)],

#     start_date: date,

#     end_date: date,

#     current_user: Annotated[
#         dict[str, Any],
#         Depends(get_current_user),
#     ],

#     conn: Annotated[
#         PGConnection,
#         Depends(get_db),
#     ],

#     amenity_ids: Annotated[
#         list[int] | None,
#         Query(),
#     ] = None,

# ) -> list[AvailableSeatResponse]:

#     if start_date > end_date:

#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail={
#                 "code": "invalid_date_range",
#                 "message": "start_date must be earlier than end_date.",
#             },
#         )

#     if (end_date - start_date).days > 31:

#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail={
#                 "code": "date_range_too_large",
#                 "message": "Maximum allowed range is 31 days.",
#             },
#         )

#     return get_available_seats_by_range(
#         conn,
#         tenant_id=str(current_user["tenant_id"]),
#         floor_id=str(floor_id),
#         start_date=start_date,
#         end_date=end_date,
#         amenity_ids=amenity_ids,
#     )
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

def _resolve_booking_date(
    start_date: date,
    end_date: date
) -> date:
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "start_date must be earlier than end_date.",
            },
        )

    if (end_date - start_date).days > 31:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "date_range_too_large",
                "message": "Maximum allowed range is 31 days.",
            },
        )
    return start_time.date()
