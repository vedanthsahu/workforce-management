"""Service-layer booking workflows for day-based seat reservations."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

import psycopg2
from fastapi import BackgroundTasks, HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection
from backend.core.logging import LOGGER_NAME
from backend.repositories.booking_repository import (
    fetch_available_seats,
    fetch_available_seats_by_range,
    fetch_past_bookings_for_user,
    fetch_current_bookings_for_user,
    fetch_cancelled_bookings_for_user,
    fetch_future_bookings_for_user,
    fetch_seat_for_booking,
    has_active_booking_conflict,
    insert_booking,
    cancel_booking,
    fetch_booking_by_id_for_update,
    fetch_booking_by_id,
    user_has_active_booking_in_range,
    user_has_active_booking_on_date,
)
from backend.repositories.user_repository import fetch_user_by_id
from backend.schemas.booking import (
    AvailableSeatResponse,
    BookingResponse,
    CreateBookingRequest,
    ModifyBookingRequest,
)
from backend.services.notification_service import (
    queue_booking_cancelled_notification,
    queue_booking_created_notification,
    queue_booking_modified_notification,
)

logger = logging.getLogger(f"{LOGGER_NAME}.bookings")

ELEVATED_BOOKING_ROLES = {
    "MANAGER",
    "TENANT_ADMIN",
    "PRODUCT_ADMIN",
    "OFFICE_ADMIN",
    "SUPPORT_ADMIN",
}


def _current_user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("user_id") or current_user.get("id") or "")


def _user_role(user: dict[str, Any]) -> str:
    return str(user.get("role_name") or user.get("role") or "").strip().upper()


def _can_book_for_user(
    *,
    current_user: dict[str, Any],
    booking_user: dict[str, Any],
) -> bool:
    current_user_id = _current_user_id(current_user)

    if current_user_id == str(booking_user["user_id"]):
        return True

    if str(booking_user.get("manager_user_id") or "") == current_user_id:
        return True

    return _user_role(current_user) in ELEVATED_BOOKING_ROLES


def _can_manage_booking(
    *,
    current_user: dict[str, Any],
    booking_user: dict[str, Any],
) -> bool:
    """Return whether current user can mutate target user's bookings."""
    return _can_book_for_user(
        current_user=current_user,
        booking_user=booking_user,
    )


def _resolve_booked_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    current_user: dict[str, Any],
    booked_for_user_id: str,
    forbidden_message: str,
) -> dict[str, Any]:
    target_user = fetch_user_by_id(
        conn,
        tenant_id=tenant_id,
        user_id=booked_for_user_id,
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "booking_user_not_found",
                "message": "The booking user was not found in this tenant.",
            },
        )

    if target_user.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "booking_user_inactive",
                "message": "Bookings can only be created for ACTIVE users.",
            },
        )

    if not _can_book_for_user(
        current_user=current_user,
        booking_user=target_user,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "booking_forbidden",
                "message": forbidden_message,
            },
        )

    return target_user


def _raise_user_booking_conflict(
    message: str = "The booking owner already has an active booking for that day.",
) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "booking_user_conflict",
            "message": message,
        },
    )


def _booking_conflict_detail(constraint_name: str | None) -> dict[str, str]:
    if constraint_name == "uq_bookings_tenant_user_date_active":
        return {
            "code": "booking_user_conflict",
            "message": "The booking owner already has an active booking for that day.",
        }

    return {
        "code": "booking_conflict",
        "message": "The requested seat already has an active booking for that day.",
    }


def _queue_booking_created_email(
    background_tasks: BackgroundTasks | None,
    *,
    booking: dict[str, Any],
    booked_for_user: dict[str, Any],
) -> None:
    if background_tasks is None:
        return

    try:
        queue_booking_created_notification(
            background_tasks,
            to_emails=_user_email_list(booked_for_user),
            context={
                "user_name": _user_display_name(booked_for_user),
                **_booking_email_details(booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=booking_created booking_id=%s",
            booking.get("booking_id"),
        )


def _queue_booking_cancelled_email(
    background_tasks: BackgroundTasks | None,
    *,
    booking: dict[str, Any],
    booked_for_user: dict[str, Any],
) -> None:
    if background_tasks is None:
        return

    try:
        queue_booking_cancelled_notification(
            background_tasks,
            to_emails=_user_email_list(booked_for_user),
            context={
                "user_name": _user_display_name(booked_for_user),
                "cancellation_reason": booking.get("cancellation_reason") or "Cancelled",
                **_booking_email_details(booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=booking_cancelled booking_id=%s",
            booking.get("booking_id"),
        )


def _queue_booking_modified_email(
    background_tasks: BackgroundTasks | None,
    *,
    old_booking: dict[str, Any],
    new_booking: dict[str, Any],
    booked_for_user: dict[str, Any],
) -> None:
    if background_tasks is None:
        return

    try:
        queue_booking_modified_notification(
            background_tasks,
            to_emails=_user_email_list(booked_for_user),
            context={
                "user_name": _user_display_name(booked_for_user),
                "old_booking": _booking_email_details(old_booking),
                "new_booking": _booking_email_details(new_booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=booking_modified old_booking_id=%s new_booking_id=%s",
            old_booking.get("booking_id"),
            new_booking.get("booking_id"),
        )


def _booking_email_details(booking: dict[str, Any]) -> dict[str, str]:
    return {
        "seat_name": str(booking.get("seat_code") or booking.get("seat_id") or "Not available"),
        "booking_date": _format_template_value(booking.get("booking_date")),
        "location": _format_booking_location(booking),
    }


def _format_booking_location(booking: dict[str, Any]) -> str:
    parts = [
        booking.get("floor_name"),
        booking.get("building_name"),
        booking.get("site_name"),
    ]
    location = ", ".join(str(part) for part in parts if part)
    return location or "Not available"


def _format_template_value(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    if value is None:
        return "Not available"
    return str(value)


def _user_display_name(user: dict[str, Any]) -> str:
    return str(
        user.get("full_name")
        or user.get("display_name")
        or user.get("email")
        or "there"
    )


def _user_email_list(user: dict[str, Any]) -> list[str]:
    email = str(user.get("email") or "").strip()
    return [email] if email else []



def book_seat(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateBookingRequest,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    """Create one tenant-scoped booking and handle DB constraint failures."""
    tenant_id = str(current_user["tenant_id"])
    booked_by_user_id = _current_user_id(current_user)
    effective_booked_for_user_id = (
            payload.booked_for_user_id
            if payload.booked_for_user_id is not None
            else current_user["user_id"]
        )

    booked_for_user_id = str(effective_booked_for_user_id)

    try:
        booked_for_user = _resolve_booked_for_user(
            conn,
            tenant_id=tenant_id,
            current_user=current_user,
            booked_for_user_id=booked_for_user_id,
            forbidden_message="You are not allowed to create bookings for this user.",
        )

        seat = fetch_seat_for_booking(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_id=str(payload.seat_id),
        )
        if seat is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_hierarchy_invalid",
                    "message": "The requested seat does not match the submitted site, building, floor, and tenant hierarchy.",
                },
            )
        if str(seat["tenant_id"]) != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "booking_seat_tenant_mismatch",
                    "message": "The requested seat does not belong to the authenticated tenant.",
                },
            )
        if seat.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_seat_inactive",
                    "message": "Bookings can only be created for ACTIVE seats.",
                },
            )
        if seat.get("is_bookable") is not True:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_seat_not_bookable",
                    "message": "The requested seat is not bookable.",
                },
            )
        if user_has_active_booking_on_date(
            conn,
            tenant_id=tenant_id,
            booked_for_user_id=booked_for_user_id,
            booking_date=payload.booking_date,
        ):
            _raise_user_booking_conflict()
        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=payload.booking_date,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "booking_conflict",
                    "message": "The requested seat already has an active booking for that day.",
                },
            )

        booking = insert_booking(
            conn,
            tenant_id=tenant_id,
            booked_for_user_id=booked_for_user_id,
            booked_by_user_id=booked_by_user_id,
            seat=seat,
            booking_date=payload.booking_date,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_booking_value",
                "message": str(exc),
            },
        ) from exc
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_create_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        if exc.pgcode in {errorcodes.UNIQUE_VIOLATION, errorcodes.EXCLUSION_VIOLATION}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_booking_conflict_detail(
                    getattr(exc.diag, "constraint_name", None),
                ),
            ) from exc
        if exc.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "booking_reference_not_found",
                    "message": "Seat or user reference was not found for this tenant.",
                },
            ) from exc
        if exc.pgcode == errorcodes.CHECK_VIOLATION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_booking_target",
                    "message": "Booking status or source channel violates the schema checks.",
                },
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_create_failed",
                "message": "Failed to create booking.",
            },
        ) from exc

    _queue_booking_created_email(
        background_tasks,
        booking=booking,
        booked_for_user=booked_for_user,
    )

    return BookingResponse(**booking)
 


def get_user_past_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> list[BookingResponse]:
    """List bookings visible to the authenticated user."""
    try:
        bookings = fetch_past_bookings_for_user(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_lookup_failed",
                "message": "Failed to fetch bookings.",
            },
        ) from exc

    return [BookingResponse(**booking) for booking in bookings]


def get_user_current_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> list[BookingResponse]:
    """List bookings visible to the authenticated user."""
    try:
        bookings = fetch_current_bookings_for_user(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_lookup_failed",
                "message": "Failed to fetch bookings.",
            },
        ) from exc

    return [BookingResponse(**booking) for booking in bookings]

def get_user_cancelled_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> list[BookingResponse]:
    """List bookings visible to the authenticated user."""
    try:
        bookings = fetch_cancelled_bookings_for_user(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_lookup_failed",
                "message": "Failed to fetch bookings.",
            },
        ) from exc

    return [BookingResponse(**booking) for booking in bookings]


def get_user_future_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> list[BookingResponse]:
    """List bookings visible to the authenticated user."""
    try:
        bookings = fetch_future_bookings_for_user(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_lookup_failed",
                "message": "Failed to fetch bookings.",
            },
        ) from exc

    return [BookingResponse(**booking) for booking in bookings]


def get_available_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    booking_date: date,
    amenity_ids: list[int] | None = None,
    current_user: dict[str, Any] | None = None,
    booked_for_user_id: str | None = None,
) -> list[AvailableSeatResponse]:
    """List seats available on one floor for one booking date."""
    normalized_amenity_ids = sorted(set(amenity_ids or []))

    try:
        if booked_for_user_id is not None:
            if current_user is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "booking_forbidden",
                        "message": "Authenticated user context is required for delegated availability checks.",
                    },
                )
            _resolve_booked_for_user(
                conn,
                tenant_id=tenant_id,
                current_user=current_user,
                booked_for_user_id=booked_for_user_id,
                forbidden_message="You are not allowed to check availability for this user.",
            )
            if user_has_active_booking_on_date(
                conn,
                tenant_id=tenant_id,
                booked_for_user_id=booked_for_user_id,
                booking_date=booking_date,
            ):
                _raise_user_booking_conflict()

        seats = fetch_available_seats(
            conn,
            tenant_id=tenant_id,
            floor_id=floor_id,
            booking_date=booking_date,
            amenity_ids=normalized_amenity_ids,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "available_seats_lookup_failed",
                "message": "Failed to fetch available seats.",
            },
        ) from exc

    return [AvailableSeatResponse(**seat) for seat in seats]


def cancel_booking_by_id(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    booking_id: str,
    cancellation_reason: str | None,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    """Cancel one future booking using soft-cancellation."""
    tenant_id = str(current_user["tenant_id"])

    try:
        booking = fetch_booking_by_id_for_update(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )

        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "booking_not_found",
                    "message": "Booking was not found.",
                },
            )

        if booking["booking_date"] <= date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_not_mutable",
                    "message": "Only future bookings can be cancelled.",
                },
            )

        if booking["booking_status"] in {
            "CANCELLED",
            "COMPLETED",
            "NO_SHOW",
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_not_mutable",
                    "message": "This booking can no longer be modified.",
                },
            )

        booking_user = fetch_user_by_id(
            conn,
            tenant_id=tenant_id,
            user_id=str(booking["booked_for_user_id"]),
        )

        if booking_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "booking_user_not_found",
                    "message": "Booking owner was not found.",
                },
            )

        if not _can_manage_booking(
            current_user=current_user,
            booking_user=booking_user,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "booking_forbidden",
                    "message": "You are not allowed to cancel this booking.",
                },
            )

        cancel_booking(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
            cancellation_reason=(
                cancellation_reason.strip()
                if cancellation_reason and cancellation_reason.strip()
                else "USER_CANCELLED"
            ),
        )

        conn.commit()

        updated_booking = fetch_booking_by_id(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )

        if updated_booking is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "booking_reload_failed",
                    "message": "Failed to reload cancelled booking.",
                },
            )

        _queue_booking_cancelled_email(
            background_tasks,
            booking=updated_booking,
            booked_for_user=booking_user,
        )

        return BookingResponse(**updated_booking)

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_cancel_failed",
                "message": "Failed to cancel booking.",
            },
        ) from exc
    

def modify_booking(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    booking_id: str,
    payload: ModifyBookingRequest,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    """Modify a future booking by cancelling old booking and creating a new one."""
    from datetime import date
    from fastapi import HTTPException, status
    import psycopg2
    from psycopg2 import errorcodes
 
    tenant_id = str(current_user["tenant_id"])
 
    try:
        booking = fetch_booking_by_id_for_update(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )
 
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "booking_not_found",
                    "message": "Booking was not found.",
                },
            )
 
        if booking["booking_date"] <= date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_not_mutable",
                    "message": "Only future bookings can be modified.",
                },
            )
 
        if booking["booking_status"] in {
            "CANCELLED",
            "CHECKED_IN",
            "COMPLETED",
            "NO_SHOW",
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_not_mutable",
                    "message": "This booking can no longer be modified.",
                },
            )
 
        booking_user = fetch_user_by_id(
            conn,
            tenant_id=tenant_id,
            user_id=str(booking["booked_for_user_id"]),
        )
 
        if booking_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "booking_user_not_found",
                    "message": "Booking owner was not found.",
                },
            )
 
        if not _can_manage_booking(
            current_user=current_user,
            booking_user=booking_user,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "booking_forbidden",
                    "message": "You are not allowed to modify this booking.",
                },
            )
 
        if (
            str(booking["seat_id"]) == str(payload.seat_id)
            and booking["booking_date"] == payload.booking_date
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_no_effect",
                    "message": "Modification request does not change booking details.",
                },
            )

        old_booking_for_email = fetch_booking_by_id(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        ) or booking

        target_seat = fetch_seat_for_booking(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_id=str(payload.seat_id),
        )
 
        if target_seat is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_hierarchy_invalid",
                    "message": "The requested seat does not match the submitted hierarchy.",
                },
            )
 
        if target_seat.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_seat_inactive",
                    "message": "Bookings can only target ACTIVE seats.",
                },
            )
 
        if target_seat.get("is_bookable") is not True:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_seat_not_bookable",
                    "message": "The requested seat is not bookable.",
                },
            )

        if user_has_active_booking_on_date(
            conn,
            tenant_id=tenant_id,
            booked_for_user_id=str(booking["booked_for_user_id"]),
            booking_date=payload.booking_date,
            exclude_booking_id=booking_id,
        ):
            _raise_user_booking_conflict()
        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=payload.booking_date,
            exclude_booking_id=booking_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "booking_conflict",
                    "message": "The requested seat already has an active booking.",
                },
            )
 
        cancel_booking(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
            cancellation_reason="Booking ID : " + booking_id + ". Is being modified",
            booking_status="NO_SHOW",

        )
 
        new_booking = insert_booking(
            conn,
            tenant_id=tenant_id,
            booked_for_user_id=str(booking["booked_for_user_id"]),
            booked_by_user_id=_current_user_id(current_user),
            seat=target_seat,
            booking_date=payload.booking_date,
        )
 
        conn.commit()

        _queue_booking_modified_email(
            background_tasks,
            old_booking=old_booking_for_email,
            new_booking=new_booking,
            booked_for_user=booking_user,
        )

        return BookingResponse(**new_booking)
 
    except HTTPException:
        conn.rollback()
        raise
 
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_booking_value",
                "message": str(exc),
            },
        ) from exc
 
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_modify_failed",
                "message": str(exc),
            },
        ) from exc
 
    except psycopg2.Error as exc:
        conn.rollback()
        if exc.pgcode in {
            errorcodes.UNIQUE_VIOLATION,
            errorcodes.EXCLUSION_VIOLATION,
        }:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_booking_conflict_detail(
                    getattr(exc.diag, "constraint_name", None),
                ),
            ) from exc
 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "booking_modify_failed",
                "message": "Failed to modify booking.",
            },
        ) from exc

def get_available_seats_by_range(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    start_date: date,
    end_date: date,
    amenity_ids: list[int] | None = None,
    current_user: dict[str, Any] | None = None,
    booked_for_user_id: str | None = None,
    exclude_booking_id: str | None = None,
) -> list[AvailableSeatResponse]:
    """
    Fetch seat availability across a date range.
    """

    normalized_amenity_ids = sorted(set(amenity_ids or []))

    try:
        if booked_for_user_id is not None:
            if current_user is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "booking_forbidden",
                        "message": "Authenticated user context is required for delegated availability checks.",
                    },
                )
            _resolve_booked_for_user(
                conn,
                tenant_id=tenant_id,
                current_user=current_user,
                booked_for_user_id=booked_for_user_id,
                forbidden_message="You are not allowed to check availability for this user.",
            )
            if user_has_active_booking_in_range(
                    conn,
                    tenant_id=tenant_id,
                    booked_for_user_id=booked_for_user_id,
                    start_date=start_date,
                    end_date=end_date,
                    exclude_booking_id=exclude_booking_id,
                ):
                _raise_user_booking_conflict(
                    "The booking owner already has an active booking in the requested date range.",
                )

        seats = fetch_available_seats_by_range(
                conn,
                tenant_id=tenant_id,
                floor_id=floor_id,
                start_date=start_date,
                end_date=end_date,
                amenity_ids=normalized_amenity_ids,
                exclude_booking_id=exclude_booking_id,
            )

    except psycopg2.Error as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "available_seats_lookup_failed",
                "message": "Failed to fetch available seats.",
            },
        ) from exc

    return [
        AvailableSeatResponse(**seat)
        for seat in seats
    ]
