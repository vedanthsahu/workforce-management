from __future__ import annotations

"""services/booking_service.py Service-layer booking workflows for day-based seat reservations."""

import logging
import math
from datetime import date, datetime
from typing import Any

import psycopg2
from fastapi import BackgroundTasks, HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection

from backend.schemas.booking import (
BookingEligibilityRequest,
BookingEligibilityResponse,
)

from backend.repositories.guest_repository import fetch_guest_by_id
from backend.repositories.guest_visit_repository import (
    fetch_cancelled_guest_visits,
    insert_guest_visit,
)
from backend.core.app_logging import LOGGER_NAME
from backend.repositories.booking_repository import (
    fetch_available_seats,
    fetch_available_seats_by_range,
    fetch_past_bookings_for_user,
    fetch_current_bookings_for_user,
    fetch_past_delegated_bookings,
    fetch_cancelled_delegated_bookings,
    fetch_future_delegated_guest_visits_without_booking,
    fetch_current_delegated_guest_visits_without_booking,
    fetch_past_delegated_guest_visits_without_booking,
    fetch_current_delegated_bookings,
    fetch_future_delegated_bookings,
    fetch_cancelled_bookings_for_user,
    fetch_future_bookings_for_user,
    fetch_seat_for_booking,
    has_active_booking_conflict,
    insert_booking,
    insert_guest_booking,
    cancel_booking,
    fetch_booking_by_id_for_update,
    fetch_booking_by_id,
    user_has_active_booking_in_range,
    user_has_active_booking_on_date,
    guest_has_active_booking_in_range,
    guest_has_active_visit_in_range,
)
from backend.repositories.user_repository import fetch_user_by_id
from backend.schemas.booking import (
    AvailableSeatResponse,
    AvailableSeatListResponse,
    AvailableSeatListSummary,
    BookingResponse,
    CreateBookingRequest,
    ModifyBookingRequest,
    PaginatedBookingResponse,
)
from backend.schemas.pagination import PaginationMetadata
from backend.services.notification_service import (
    booking_notification_details,
    queue_booking_cancelled_notification,
    queue_booking_created_notification,
    queue_booking_modified_notification,
)

logger = logging.getLogger(f"{LOGGER_NAME}.bookings")

# Shared with guest_service.py so the guest-operator role set is defined once.
GUEST_OPERATION_ROLES = {
    "TENANT_ADMIN",
    "FACILITATOR",
    "SECURITY",
}

def _can_book_guest(current_user: dict[str, Any]) -> bool:
    return _user_role(current_user) in GUEST_OPERATION_ROLES

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

    role = _user_role(current_user)
    if role in {"TENANT_ADMIN", "FACILITATOR"}:
        return True

    return (
        role == "MANAGER"
        and str(booking_user.get("manager_user_id") or "") == current_user_id
    )
    return (
        role == "MANAGER"
        and str(booking_user.get("manager_user_id") or "") == current_user_id
    )


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


def _normalize_cancellation_reason(cancellation_reason: str | None) -> str:
    normalized = str(cancellation_reason or "").strip()
    if not normalized:
        return "USER_CANCELLED"
    if normalized.upper() in {"MODIFIED", "REPLACED", "SUPERSEDED"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_cancellation_reason",
                "message": "That cancellation reason is reserved for internal use.",
            },
        )
    return normalized


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
                **booking_notification_details(booking),
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
                "cancellation_reason": _display_cancellation_reason(booking),
                **booking_notification_details(booking),
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
                "old_booking": booking_notification_details(old_booking),
                "new_booking": booking_notification_details(new_booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=booking_modified old_booking_id=%s new_booking_id=%s",
            old_booking.get("booking_id"),
            new_booking.get("booking_id"),
        )



def _display_cancellation_reason(booking: dict[str, Any]) -> str:
    """Reason for cancellation emails; the USER_CANCELLED default marker means
    "no reason given" and renders as nothing rather than an internal code."""
    reason = str(booking.get("cancellation_reason") or "").strip()
    if reason.upper() == "USER_CANCELLED":
        return ""
    return reason


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


def _booking_list_response(
    rows: list[dict[str, Any]],
    *,
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
    if page is None and limit is None:
        return [BookingResponse(**row) for row in rows]

    effective_page = page or 1
    effective_limit = limit or 100
    total = len(rows)
    start = (effective_page - 1) * effective_limit
    paged_rows = rows[start:start + effective_limit]
    return PaginatedBookingResponse(
        items=[BookingResponse(**row) for row in paged_rows],
        pagination=PaginationMetadata(
            total=total,
            page=effective_page,
            limit=effective_limit,
            total_pages=math.ceil(total / effective_limit) if total else 0,
        ),
    )



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
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
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

    return _booking_list_response(bookings, page=page, limit=limit)


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
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
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

    return _booking_list_response(bookings, page=page, limit=limit)


def get_user_future_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
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

    return _booking_list_response(bookings, page=page, limit=limit)


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

        if booking.get("booking_type") != "EMPLOYEE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_type_mismatch",
                    "message": "Guest bookings must be cancelled through /guest-bookings.",
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
            "MODIFIED",
            "NO_SHOW",
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_not_mutable",
                    "message": "This booking can no longer be modified.",
                },
            )

        booked_for_user_id = booking.get("booked_for_user_id")
        if booked_for_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "invalid_employee_booking",
                    "message": "Employee booking is missing its owner.",
                },
            )

        booking_user = fetch_user_by_id(
            conn,
            tenant_id=tenant_id,
            user_id=str(booked_for_user_id),
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
            cancellation_reason=_normalize_cancellation_reason(
                cancellation_reason,
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
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "booking_not_found",
                "message": str(exc),
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

        if booking.get("booking_type") != "EMPLOYEE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_type_mismatch",
                    "message": "Guest bookings must be modified through /guest-bookings.",
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
            "MODIFIED",
            "NO_SHOW",
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_not_mutable",
                    "message": "This booking can no longer be modified.",
                },
            )
 
        booked_for_user_id = booking.get("booked_for_user_id")
        if booked_for_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "invalid_employee_booking",
                    "message": "Employee booking is missing its owner.",
                },
            )

        booking_user = fetch_user_by_id(
            conn,
            tenant_id=tenant_id,
            user_id=str(booked_for_user_id),
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
            booked_for_user_id=str(booked_for_user_id),
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
            booking_status="MODIFIED",

        )
 
        new_booking = insert_booking(
            conn,
            tenant_id=tenant_id,
            booked_for_user_id=str(booked_for_user_id),
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
    booked_for_guest_id: str | None = None,
    is_guest_booking: bool = False,
    exclude_booking_id: str | None = None,
    calendar_mode: bool = False,
) -> AvailableSeatListResponse:
    """
    Fetch seat availability across a date range.
    """

    normalized_amenity_ids = sorted(set(amenity_ids or []))

    try:
        # calendar_mode: caller only wants raw seat status (no booking-eligibility checks)
        if not calendar_mode:
            if is_guest_booking:
                if booked_for_guest_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "code": "guest_id_required",
                            "message": "booked_for_guest_id is required.",
                        },
                    )

                if guest_has_active_booking_in_range(
                    conn,
                    tenant_id=tenant_id,
                    booked_for_guest_id=booked_for_guest_id,
                    start_date=start_date,
                    end_date=end_date,
                    exclude_booking_id=exclude_booking_id,
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail={
                            "code": "booking_guest_conflict",
                            "message": (
                                "The guest already has an active booking "
                                "in the requested date range."
                            ),
                        },
                    )

            elif booked_for_user_id is not None:

                if current_user is None:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "code": "booking_forbidden",
                            "message": (
                                "Authenticated user context is required "
                                "for delegated availability checks."
                            ),
                        },
                    )

                _resolve_booked_for_user(
                    conn,
                    tenant_id=tenant_id,
                    current_user=current_user,
                    booked_for_user_id=booked_for_user_id,
                    forbidden_message=(
                        "You are not allowed to check "
                        "availability for this user."
                    ),
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

    items = [
        AvailableSeatResponse(**seat)
        for seat in seats
    ]

    available_count = sum(
            1
            for seat in items
            if seat.availability.total_available_days > 0
        )

    if available_count == 0 and not calendar_mode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "no_available_seats",
                "message": (
                    "No seats are available for booking on the selected "
                    "floor for the requested dates."
                ),                                                                                                                       
            },
        )

    return AvailableSeatListResponse(
            summary=AvailableSeatListSummary(
                available_seats=available_count,
            ),
            items=items,
        )


def book_guest_seat(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:

    tenant_id = str(current_user["tenant_id"])
    booked_by_user_id = _current_user_id(current_user)

    if not _can_book_guest(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "guest_booking_not_allowed",
                "message": (
                    "Only FACILITATOR and Tenant Admin users "
                    "can create guest bookings."
                ),
            },
        )

    try:

        guest = fetch_guest_by_id(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
        )

        if guest is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "guest_not_found",
                    "message": "Guest does not exist.",
                },
            )

        host_user = fetch_user_by_id(
            conn,
            tenant_id=tenant_id,
            user_id=str(payload.host_user_id),
        )

        if host_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "host_not_found",
                    "message": "Host user does not exist.",
                },
            )

        if str(host_user.get("status", "")).upper() != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "host_inactive",
                    "message": "Host user is not active.",
                },
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
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "seat_not_found",
                    "message": "Seat does not exist.",
                },
            )

        if seat.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_seat_inactive",
                    "message": "Bookings can only target ACTIVE seats.",
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

        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=payload.visit_date,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "booking_conflict",
                    "message": "The requested seat already has an active booking.",
                },
            )

        visit = insert_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
            host_user_id=str(payload.host_user_id),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            visit_date=payload.visit_date,
            guest_type=payload.guest_type,
            purpose_of_visit=payload.purpose_of_visit,
            start_time=payload.start_time,
            end_time=payload.end_time,
            notes=payload.notes,
            requires_seat=True,
            created_by_user_id=booked_by_user_id,
        )

        booking = insert_guest_booking(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
            guest_visit_id=str(
                visit["guest_visit_id"]
            ),
            booked_by_user_id=booked_by_user_id,
            seat=seat,
            booking_date=payload.visit_date,
        )

        conn.commit()

        return BookingResponse(**booking)

    except HTTPException:
        conn.rollback()
        raise

    except ValueError as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest_booking",
                "message": str(exc),
            },
        ) from exc

    except LookupError as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "guest_booking_failed",
                "message": str(exc),
            },
        ) from exc

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "guest_booking_failed",
                "message": "Failed to create guest booking.",
            },
        ) from exc
def create_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload,
) -> dict[str, Any]:

    tenant_id = str(current_user["tenant_id"])

    created_by_user_id = _current_user_id(
        current_user
    )

    if not _can_book_guest(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "guest_visit_not_allowed",
                "message": (
                    "Only FACILITATOR and Tenant Admin users "
                    "can create guest visits."
                ),
            },
        )

    try:

        guest = fetch_guest_by_id(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
        )

        if guest is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "guest_not_found",
                    "message": "Guest does not exist.",
                },
            )

        host_user = fetch_user_by_id(
            conn,
            tenant_id=tenant_id,
            user_id=str(payload.host_user_id),
        )

        if host_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "host_not_found",
                    "message": "Host user does not exist.",
                },
            )

        visit = insert_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
            host_user_id=str(payload.host_user_id),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=(
                str(payload.floor_id)
                if payload.floor_id is not None
                else None
            ),
            visit_date=payload.visit_date,
            guest_type=payload.guest_type,
            purpose_of_visit=payload.purpose_of_visit,
            start_time=payload.start_time,
            end_time=payload.end_time,
            notes=payload.notes,
            requires_seat=False,
            created_by_user_id=created_by_user_id,
        )

        conn.commit()

        return visit

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "guest_visit_create_failed",
                "message": "Failed to create guest visit.",
            },
        ) from exc

def check_booking_eligibility(
conn: PGConnection,
*,
tenant_id: str,
current_user: dict[str, Any],
payload: BookingEligibilityRequest,
) -> BookingEligibilityResponse:
    if payload.start_date > payload.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_date_range",
                "message": "start_date must be earlier than end_date.",
            },
        )

    if payload.is_guest_booking:

        if payload.booked_for_guest_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "guest_id_required",
                    "message": "booked_for_guest_id is required.",
                },
            )

        if guest_has_active_visit_in_range(
                conn,
                tenant_id=tenant_id,
                guest_id=str(payload.booked_for_guest_id),
                start_date=payload.start_date,
                end_date=payload.end_date,
            ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "booking_guest_conflict",
                    "message": (
                        "Guest already has an active Visit "
                        "in requested date range."
                    ),
                },
            )

    else:

        effective_user_id = (
            str(payload.booked_for_user_id)
            if payload.booked_for_user_id is not None
            else str(current_user["user_id"])
        )

        _resolve_booked_for_user(
            conn,
            tenant_id=tenant_id,
            current_user=current_user,
            booked_for_user_id=effective_user_id,
            forbidden_message=(
                "You are not allowed to check "
                "availability for this user."
            ),
        )

        if user_has_active_booking_in_range(
            conn,
            tenant_id=tenant_id,
            booked_for_user_id=effective_user_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            exclude_booking_id=payload.exclude_booking_id,
        ):
            _raise_user_booking_conflict(
                "The booking owner already has an active booking in the requested date range.",
            )

    return BookingEligibilityResponse(
        eligible=True,
        message="Eligible for booking.",
    )


def get_delegated_future_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:

    bookings = fetch_future_delegated_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
    )

    guest_visits = (
        fetch_future_delegated_guest_visits_without_booking(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    )

    combined = bookings + guest_visits

    combined.sort(
        key=lambda row: (
            row.get("booking_date")
            or date.min
        ),
        reverse=True,
    )

    return _booking_list_response(combined, page=page, limit=limit)

def get_delegated_current_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> list[BookingResponse]:

    bookings = fetch_current_delegated_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
    )

    guest_visits = (
        fetch_current_delegated_guest_visits_without_booking(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    )

    combined = bookings + guest_visits

    combined.sort(
        key=lambda row: (
            row.get("booking_date")
            or date.min
        ),
        reverse=True,
    )

    return [
        BookingResponse(**row)
        for row in combined
    ]

def get_delegated_past_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:

    bookings = fetch_past_delegated_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
    )

    guest_visits = (
        fetch_past_delegated_guest_visits_without_booking(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            user_id=str(current_user["user_id"]),
        )
    )

    combined = bookings + guest_visits

    combined.sort(
        key=lambda row: (
            row.get("updated_at")
            or date.min
        ),
        reverse=True,
    )

    return _booking_list_response(combined, page=page, limit=limit)

def get_delegated_cancelled_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    page: int | None = None,
    limit: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:

    bookings = fetch_cancelled_delegated_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
    )

    guest_visits = fetch_cancelled_guest_visits(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        created_by_user_id=str(current_user["user_id"]),
    )

    combined = bookings + guest_visits

    combined.sort(
        key=lambda row: (
            row.get("updated_at")
            or datetime.min
        ),
        reverse=True,
    )

    return _booking_list_response(combined, page=page, limit=limit)
