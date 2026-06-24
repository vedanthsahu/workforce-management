"""Business workflows for guest profiles, visits, and guest bookings."""

from __future__ import annotations

import logging
from datetime import date, datetime
from enum import Enum
from typing import Any

import psycopg2
from fastapi import BackgroundTasks, HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection

from backend.repositories.guest_visit_repository import (
    fetch_guest_visits,
    fetch_guest_visit_summary,
    check_in_guest_visit,
    check_out_guest_visit,
    update_guest_visit,
    sync_booking_from_guest_visit,
    recalculate_guest_visit_requires_seat,
    fetch_guest_visit_integrity_findings,
)

from backend.schemas.guest import (
    GuestVisitListItem,
    GuestVisitListResponse,
    AttachSeatToGuestVisitRequest,
    ModifyGuestVisitRequest,
    GuestVisitStatusUpdateResponse,
)
from backend.core.logging import LOGGER_NAME
from backend.repositories.booking_repository import (
    cancel_booking,
    fetch_booking_by_id,
    fetch_booking_by_id_for_update,
    fetch_guest_bookings,
    fetch_seat_for_booking,
    guest_has_active_booking_on_date,
    has_active_booking_conflict,
    insert_guest_booking,
)
from backend.repositories.guest_repository import (
    create_guest,
    fetch_guest_by_email,
    fetch_guest_by_id,
    fetch_guest_by_phone,
    search_guests,
)
from backend.repositories.guest_visit_repository import (
    insert_guest_visit,
    update_guest_visit_booking_details,
    fetch_guest_visit_by_id,
    guest_visit_has_active_booking,
    fetch_guest_visit_status,
    update_guest_visit_requires_seat,
    cancel_guest_visit,
    fetch_active_booking_by_guest_visit,
    fetch_active_booking_for_guest_visit,
    fetch_guest_visit_by_id_for_update,
    mark_guest_visit_modified,
)
from backend.repositories.location_repository import (
    fetch_building_by_id,
    fetch_floor_by_id,
    fetch_site_by_id,
)
from backend.repositories.user_repository import fetch_user_by_id
from backend.schemas.booking import BookingResponse, ModifyBookingRequest
from backend.schemas.guest import (
    CreateGuestBookingRequest,
    CreateGuestRequest,
    CreateGuestVisitRequest,
    GuestResponse,
    GuestVisitResponse,
    GuestWorkflowAction,
    GuestWorkflowRequest,
    GuestWorkflowResponse,
)
from backend.services.booking_service import _normalize_cancellation_reason
from backend.services.notification_service import (
    queue_booking_cancelled_notification,
    queue_booking_created_notification,
    queue_booking_modified_notification,
)

logger = logging.getLogger(f"{LOGGER_NAME}.guests")

GUEST_OPERATION_ROLES = {"TALENT", "TENANT_ADMIN", "SECURITY"}
BOOKING_STATUSES = {
    "CONFIRMED",
    "CANCELLED",
    "CHECKED_IN",
    "COMPLETED",
    "MODIFIED",
    "NO_SHOW",
}


def _current_user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("user_id") or current_user.get("id") or "")


def _require_guest_operator(current_user: dict[str, Any]) -> None:
    role = str(
        current_user.get("role_name")
        or current_user.get("role")
        or ""
    ).strip().upper()
    if role not in GUEST_OPERATION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "guest_operation_not_allowed",
                "message": (
                    "Guest operations require the TALENT, TENANT_ADMIN, "
                    "or SECURITY role."
                ),
            },
        )


def _enum_value(value: Any) -> Any:
    return value.value if isinstance(value, Enum) else value


def _clean_optional(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _validate_visit_times(start_time: Any, end_time: Any) -> None:
    if start_time is not None and end_time is not None and start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_visit_time_range",
                "message": "start_time must be earlier than end_time.",
            },
        )


def _resolve_guest(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    require_active: bool,
) -> dict[str, Any]:
    guest = fetch_guest_by_id(
        conn,
        tenant_id=tenant_id,
        guest_id=guest_id,
    )
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_not_found",
                "message": "Guest was not found in this tenant.",
            },
        )
    if require_active and guest.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_inactive",
                "message": "Only ACTIVE guests can receive bookings or visits.",
            },
        )
    return guest


def _resolve_host(
    conn: PGConnection,
    *,
    tenant_id: str,
    host_user_id: str,
) -> dict[str, Any]:
    host = fetch_user_by_id(
        conn,
        tenant_id=tenant_id,
        user_id=host_user_id,
    )
    if host is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "host_not_found",
                "message": "Host user was not found in this tenant.",
            },
        )
    if host.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "host_inactive",
                "message": "Guest visits require an ACTIVE host.",
            },
        )
    return host


def _validate_visit_location(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str | None,
) -> None:
    site = fetch_site_by_id(conn, tenant_id=tenant_id, site_id=site_id)
    building = fetch_building_by_id(
        conn,
        tenant_id=tenant_id,
        building_id=building_id,
    )
    floor = (
        fetch_floor_by_id(conn, tenant_id=tenant_id, floor_id=floor_id)
        if floor_id is not None
        else None
    )

    if site is None or building is None or (floor_id is not None and floor is None):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_visit_location_not_found",
                "message": "The requested guest visit location was not found.",
            },
        )
    if building["site_id"] != site_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_visit_hierarchy_invalid",
                "message": "building_id does not belong to site_id.",
            },
        )
    if floor is not None and (
        floor["site_id"] != site_id
        or floor["building_id"] != building_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_visit_hierarchy_invalid",
                "message": "floor_id does not belong to the supplied hierarchy.",
            },
        )
    if site.get("status") != "ACTIVE" or building.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_visit_location_inactive",
                "message": "Guest visits require an ACTIVE site and building.",
            },
        )
    if floor is not None and floor.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_visit_location_inactive",
                "message": "Guest visits require an ACTIVE floor.",
            },
        )


def _resolve_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    seat_id: str,
) -> dict[str, Any]:
    seat = fetch_seat_for_booking(
        conn,
        tenant_id=tenant_id,
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
        seat_id=seat_id,
    )
    if seat is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "booking_hierarchy_invalid",
                "message": "The seat does not match the supplied hierarchy.",
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
    return seat


def _raise_guest_booking_conflict() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "booking_guest_conflict",
            "message": "The guest already has an active booking for that day.",
        },
    )


def _raise_seat_booking_conflict() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "booking_conflict",
            "message": "The requested seat already has an active booking for that day.",
        },
    )


def _translate_guest_db_error(exc: psycopg2.Error, *, action: str) -> None:
    constraint_name = getattr(getattr(exc, "diag", None), "constraint_name", None)
    if exc.pgcode in {errorcodes.UNIQUE_VIOLATION, errorcodes.EXCLUSION_VIOLATION}:
        if constraint_name == "uq_bookings_tenant_guest_date_active":
            _raise_guest_booking_conflict()
        if constraint_name == "uq_bookings_tenant_seat_date":
            _raise_seat_booking_conflict()
        if constraint_name == "uq_guests_tenant_email_active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "guest_email_exists",
                    "message": "An ACTIVE guest already uses this email.",
                },
            ) from exc
    if exc.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_reference_not_found",
                "message": "A referenced guest, host, location, visit, or seat was not found.",
            },
        ) from exc
    if exc.pgcode == errorcodes.CHECK_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest_booking",
                "message": "The guest operation violates a database constraint.",
            },
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "code": f"guest_{action}_failed",
            "message": f"Failed to {action.replace('_', ' ')}.",
        },
    ) from exc


def create_guest_profile(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateGuestRequest,
) -> GuestResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])
    email = _clean_optional(payload.email)
    phone = _clean_optional(payload.phone)

    try:
        if email and fetch_guest_by_email(conn, tenant_id=tenant_id, email=email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "guest_email_exists",
                    "message": "An ACTIVE guest already uses this email.",
                },
            )
        if phone and fetch_guest_by_phone(conn, tenant_id=tenant_id, phone=phone):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "guest_phone_exists",
                    "message": "An ACTIVE guest already uses this phone number.",
                },
            )

        guest = create_guest(
            conn,
            tenant_id=tenant_id,
            full_name=payload.full_name.strip(),
            email=email,
            phone=phone,
            organization=_clean_optional(payload.organization),
            created_by_user_id=_current_user_id(current_user),
        )
        conn.commit()
        return GuestResponse(**guest)
    except HTTPException:
        conn.rollback()
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(exc, action="create")


def get_guest_profile(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_id: str,
) -> GuestResponse:
    _require_guest_operator(current_user)
    guest = _resolve_guest(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        guest_id=guest_id,
        require_active=False,
    )
    return GuestResponse(**guest)



def search_guest_profiles(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    include_inactive: bool = False,
    search_text: str,
    limit: int,
) -> list[GuestResponse]:
    _require_guest_operator(current_user)
    normalized_search = search_text.strip()
    if not normalized_search:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_search_required",
                "message": "A name, email, or phone search value is required.",
            },
        )
    rows = search_guests(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        search_text=normalized_search,
        include_inactive=include_inactive,
        limit=limit,
    )
    return [GuestResponse(**row) for row in rows]

 


def create_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateGuestVisitRequest,
) -> GuestVisitResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])
    floor_id = str(payload.floor_id) if payload.floor_id is not None else None

    try:
        _validate_visit_times(payload.start_time, payload.end_time)
        _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
            require_active=True,
        )
        _resolve_host(
            conn,
            tenant_id=tenant_id,
            host_user_id=str(payload.host_user_id),
        )
        _validate_visit_location(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=floor_id,
        )

        visit = insert_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
            host_user_id=str(payload.host_user_id),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=floor_id,
            visit_date=payload.visit_date,
            guest_type=_enum_value(payload.guest_type),
            purpose_of_visit=_enum_value(payload.purpose_of_visit),
            start_time=payload.start_time,
            end_time=payload.end_time,
            notes=_clean_optional(payload.notes),
            requires_seat=False,
            created_by_user_id=_current_user_id(current_user),
        )
        conn.commit()
        return GuestVisitResponse(**visit)
    except HTTPException:
        conn.rollback()
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest_visit",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(exc, action="visit_create")


def create_guest_booking(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateGuestBookingRequest,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])
    guest_id = str(payload.guest_id)

    try:
        _validate_visit_times(payload.start_time, payload.end_time)
        guest = _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            require_active=True,
        )
        _resolve_host(
            conn,
            tenant_id=tenant_id,
            host_user_id=str(payload.host_user_id),
        )
        seat = _resolve_seat(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_id=str(payload.seat_id),
        )

        if guest_has_active_booking_on_date(
            conn,
            tenant_id=tenant_id,
            booked_for_guest_id=guest_id,
            booking_date=payload.visit_date,
        ):
            _raise_guest_booking_conflict()
        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=payload.visit_date,
        ):
            _raise_seat_booking_conflict()

        visit = insert_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            host_user_id=str(payload.host_user_id),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            visit_date=payload.visit_date,
            guest_type=_enum_value(payload.guest_type),
            purpose_of_visit=_enum_value(payload.purpose_of_visit),
            start_time=payload.start_time,
            end_time=payload.end_time,
            notes=_clean_optional(payload.notes),
            requires_seat=True,
            created_by_user_id=_current_user_id(current_user),
        )
        booking = insert_guest_booking(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            guest_visit_id=str(visit["guest_visit_id"]),
            booked_by_user_id=_current_user_id(current_user),
            seat=seat,
            booking_date=payload.visit_date,
        )
        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=str(visit["guest_visit_id"]),
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest_booking",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(exc, action="booking_create")

    _queue_guest_booking_created(background_tasks, booking=booking, guest=guest)
    return BookingResponse(**booking)


def list_guest_bookings(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_id: str | None = None,
    booking_date: date | None = None,
    booking_status: str | None = None,
    limit: int = 100,
) -> list[BookingResponse]:
    _require_guest_operator(current_user)
    normalized_status = (
        booking_status.strip().upper()
        if booking_status is not None
        else None
    )
    if normalized_status is not None and normalized_status not in BOOKING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_booking_status",
                "message": "booking_status is not supported.",
            },
        )
    rows = fetch_guest_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        guest_id=guest_id,
        booking_date=booking_date,
        booking_status=normalized_status,
        limit=limit,
    )
    return [BookingResponse(**row) for row in rows]


def get_guest_booking(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    booking_id: str,
) -> BookingResponse:
    _require_guest_operator(current_user)
    booking = fetch_booking_by_id(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        booking_id=booking_id,
    )
    if booking is None or booking.get("booking_type") != "GUEST":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_booking_not_found",
                "message": "Guest booking was not found.",
            },
        )
    return BookingResponse(**booking)


def cancel_guest_booking(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    booking_id: str,
    cancellation_reason: str | None,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])

    try:
        booking = fetch_booking_by_id_for_update(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )
        _validate_mutable_guest_booking(booking, action="cancel")
        guest = _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=str(booking["booked_for_guest_id"]),
            require_active=False,
        )
        cancel_booking(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
            cancellation_reason=_normalize_cancellation_reason(
                cancellation_reason,
            ),
        )
        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=str(
                booking["guest_visit_id"]
            ),
        )
        updated_booking = fetch_booking_by_id(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )
        if updated_booking is None:
            raise LookupError("Cancelled guest booking could not be reloaded.")
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_booking_not_found",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(exc, action="booking_cancel")

    _queue_guest_booking_cancelled(
        background_tasks,
        booking=updated_booking,
        guest=guest,
    )
    return BookingResponse(**updated_booking)


def modify_guest_booking(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    booking_id: str,
    payload: ModifyBookingRequest,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])

    try:
        booking = fetch_booking_by_id_for_update(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )
        _validate_mutable_guest_booking(booking, action="modify")
        guest_id = str(booking["booked_for_guest_id"])
        guest_visit_id = str(booking["guest_visit_id"])
        guest = _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            require_active=True,
        )

        if (
            str(booking["seat_id"]) == str(payload.seat_id)
            and booking["booking_date"] == payload.booking_date
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "booking_no_effect",
                    "message": "Modification does not change the booking.",
                },
            )

        target_seat = _resolve_seat(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_id=str(payload.seat_id),
        )
        if guest_has_active_booking_on_date(
            conn,
            tenant_id=tenant_id,
            booked_for_guest_id=guest_id,
            booking_date=payload.booking_date,
            exclude_booking_id=booking_id,
        ):
            _raise_guest_booking_conflict()
        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=payload.booking_date,
            exclude_booking_id=booking_id,
        ):
            _raise_seat_booking_conflict()

        old_booking = fetch_booking_by_id(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        ) or booking
        update_guest_visit_booking_details(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            visit_date=payload.booking_date,
        )
        cancel_booking(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
            cancellation_reason=(
                f"Booking ID: {booking_id}. Replaced by guest booking modification."
            ),
            booking_status="MODIFIED",
        )
        new_booking = insert_guest_booking(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            guest_visit_id=guest_visit_id,
            booked_by_user_id=_current_user_id(current_user),
            seat=target_seat,
            booking_date=payload.booking_date,
        )
        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_booking_modify_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(exc, action="booking_modify")

    _queue_guest_booking_modified(
        background_tasks,
        old_booking=old_booking,
        new_booking=new_booking,
        guest=guest,
    )
    return BookingResponse(**new_booking)


def _validate_mutable_guest_booking(
    booking: dict[str, Any] | None,
    *,
    action: str,
) -> None:
    if booking is None or booking.get("booking_type") != "GUEST":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_booking_not_found",
                "message": "Guest booking was not found.",
            },
        )
    if booking.get("booked_for_guest_id") is None or booking.get("guest_visit_id") is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "invalid_guest_booking",
                "message": "Guest booking is missing its guest or visit reference.",
            },
        )
    if booking["booking_date"] <= date.today():
        action_phrase = "cancelled" if action == "cancel" else "modified"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "booking_not_mutable",
                "message": f"Only future guest bookings can be {action_phrase}.",
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
                "message": "This guest booking can no longer be changed.",
            },
        )


def _booking_email_details(booking: dict[str, Any]) -> dict[str, str]:
    location = ", ".join(
        str(value)
        for value in (
            booking.get("floor_name"),
            booking.get("building_name"),
            booking.get("site_name"),
        )
        if value
    )
    booking_date = booking.get("booking_date")
    return {
        "seat_name": str(booking.get("seat_code") or booking.get("seat_id")),
        "booking_date": (
            booking_date.isoformat()
            if isinstance(booking_date, (date, datetime))
            else str(booking_date)
        ),
        "location": location or "Not available",
    }


def _guest_recipients(guest: dict[str, Any]) -> list[str]:
    email = str(guest.get("email") or "").strip()
    return [email] if email else []


def _queue_guest_booking_created(
    background_tasks: BackgroundTasks | None,
    *,
    booking: dict[str, Any],
    guest: dict[str, Any],
) -> None:
    if background_tasks is None:
        return
    try:
        queue_booking_created_notification(
            background_tasks,
            to_emails=_guest_recipients(guest),
            context={
                "user_name": guest.get("full_name") or "Guest",
                **_booking_email_details(booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=guest_booking_created booking_id=%s",
            booking.get("booking_id"),
        )


def _queue_guest_booking_cancelled(
    background_tasks: BackgroundTasks | None,
    *,
    booking: dict[str, Any],
    guest: dict[str, Any],
) -> None:
    if background_tasks is None:
        return
    try:
        queue_booking_cancelled_notification(
            background_tasks,
            to_emails=_guest_recipients(guest),
            context={
                "user_name": guest.get("full_name") or "Guest",
                "cancellation_reason": (
                    booking.get("cancellation_reason") or "Cancelled"
                ),
                **_booking_email_details(booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=guest_booking_cancelled booking_id=%s",
            booking.get("booking_id"),
        )


def _queue_guest_booking_modified(
    background_tasks: BackgroundTasks | None,
    *,
    old_booking: dict[str, Any],
    new_booking: dict[str, Any],
    guest: dict[str, Any],
) -> None:
    if background_tasks is None:
        return
    try:
        queue_booking_modified_notification(
            background_tasks,
            to_emails=_guest_recipients(guest),
            context={
                "user_name": guest.get("full_name") or "Guest",
                "old_booking": _booking_email_details(old_booking),
                "new_booking": _booking_email_details(new_booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=guest_booking_modified booking_id=%s",
            new_booking.get("booking_id"),
        )

def list_guest_visits(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    visit_scope: str,
    site_id: str | None = None,
    visit_status: str | None = None,
    requires_seat: bool | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> GuestVisitListResponse:

    tenant_id = str(current_user["tenant_id"])

    role = (
        current_user.get("role_name")
        or current_user.get("role")
        or ""
    ).upper()

    if role == "SECURITY":

        home_site_id = current_user.get("home_site_id")

        if not home_site_id:
            raise HTTPException(
                status_code=403,
                detail="Security user does not have a home site configured.",
            )

        site_id = str(home_site_id)

        if visit_scope != "CURRENT":
            raise HTTPException(
                status_code=403,
                detail="Security can only access current visits.",
            )

    summary = fetch_guest_visit_summary(
        conn,
        tenant_id=tenant_id,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
    )

    rows = fetch_guest_visits(
        conn,
        tenant_id=tenant_id,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
        limit=limit,
        offset=offset,
    )

    return GuestVisitListResponse(
        summary=summary,
        items=[
            GuestVisitListItem(**row)
            for row in rows
        ]
    )


def get_guest_visit_details(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
) -> GuestVisitListItem:

    row = fetch_guest_visit_by_id(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        guest_visit_id=guest_visit_id,
    )


    return GuestVisitListItem(**row)


def guest_visit_check_in(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
) -> GuestVisitStatusUpdateResponse:

    tenant_id = str(current_user["tenant_id"])

    try:

        check_in_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()

        return GuestVisitStatusUpdateResponse(
            guest_visit_id=guest_visit_id,
            visit_status="CHECKED_IN",
        )

    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_visit_not_found",
                "message": str(exc),
            },
        ) from exc
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest_visit_transition",
                "message": str(exc),
            },
        ) from exc
    except Exception:
        conn.rollback()
        raise

def guest_visit_check_out(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
) -> GuestVisitStatusUpdateResponse:

    tenant_id = str(current_user["tenant_id"])

    try:

        check_out_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()

        return GuestVisitStatusUpdateResponse(
            guest_visit_id=guest_visit_id,
            visit_status="CHECKED_OUT",
        )

    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_visit_not_found",
                "message": str(exc),
            },
        ) from exc
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_guest_visit_transition",
                "message": str(exc),
            },
        ) from exc
    except Exception:
        conn.rollback()
        raise




def create_booking_for_existing_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
    payload: AttachSeatToGuestVisitRequest,
) -> BookingResponse:

    _require_guest_operator(current_user)

    tenant_id = str(current_user["tenant_id"])

    try:

        visit = fetch_guest_visit_by_id(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        if visit is None:
            raise LookupError(
                "Guest visit not found."
            )

        if visit["visit_status"] != "SCHEDULED":
            raise ValueError(
                "Only scheduled visits can receive seat bookings."
            )

        if guest_visit_has_active_booking(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        ):
            raise ValueError(
                "Guest visit already has a booking."
            )

        seat = _resolve_seat(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_id=str(payload.seat_id),
        )

        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=visit["visit_date"],
        ):
            _raise_seat_booking_conflict()

        booking = insert_guest_booking(
            conn,
            tenant_id=tenant_id,
            guest_id=str(visit["guest_id"]),
            guest_visit_id=guest_visit_id,
            booked_by_user_id=_current_user_id(current_user),
            seat=seat,
            booking_date=visit["visit_date"],
        )

        update_guest_visit_booking_details(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            visit_date=visit["visit_date"],
        )

        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()

        return BookingResponse(**booking)

    except Exception:
        conn.rollback()
        raise

def cancel_guest_visit_record(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
    cancellation_reason: str | None,
) -> GuestVisitStatusUpdateResponse:

    _require_guest_operator(current_user)

    tenant_id = str(current_user["tenant_id"])

    try:

        active_booking = (
            fetch_active_booking_by_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
        )

        cancel_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            cancellation_reason=cancellation_reason,
        )

        if active_booking:

            cancel_booking(
                conn,
                tenant_id=tenant_id,
                booking_id=str(
                    active_booking["booking_id"]
                ),
                cancellation_reason=(
                    cancellation_reason
                    or
                    "Guest visit cancelled."
                ),
                booking_status="CANCELLED",
            )

        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()

        status_row = fetch_guest_visit_status(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        return GuestVisitStatusUpdateResponse(
            **status_row,
        )

    except HTTPException:
        conn.rollback()
        raise

    except LookupError as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_visit_not_found",
                "message": str(exc),
            },
        ) from exc

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "guest_visit_cancel_failed",
                "message": "Failed to cancel guest visit.",
            },
        ) from exc
    


def modify_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
    payload: ModifyGuestVisitRequest,
) -> GuestVisitResponse:

    _require_guest_operator(current_user)

    tenant_id = str(current_user["tenant_id"])

    floor_id = (
        str(payload.floor_id)
        if payload.floor_id is not None
        else None
    )

    try:

        visit = fetch_guest_visit_by_id(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        if visit is None:
            raise LookupError(
                "Guest visit not found."
            )

        if visit["visit_status"] != "SCHEDULED":
            raise ValueError(
                "Only scheduled guest visits can be modified."
            )

        _validate_visit_times(
            payload.start_time,
            payload.end_time,
        )

        _resolve_host(
            conn,
            tenant_id=tenant_id,
            host_user_id=str(payload.host_user_id),
        )

        _validate_visit_location(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=floor_id,
        )

        update_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            host_user_id=str(payload.host_user_id),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=floor_id,
            visit_date=payload.visit_date,
            guest_type=_enum_value(payload.guest_type),
            purpose_of_visit=_enum_value(
                payload.purpose_of_visit
            ),
            start_time=payload.start_time,
            end_time=payload.end_time,
            notes=_clean_optional(payload.notes),
        )

        sync_booking_from_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=floor_id,
            booking_date=payload.visit_date,
        )

        conn.commit()

        updated = fetch_guest_visit_by_id(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        return GuestVisitResponse(**updated)

    except HTTPException:
        conn.rollback()
        raise

    except (LookupError, ValueError) as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_visit_modify_failed",
                "message": str(exc),
            },
        ) from exc


def attach_seat_to_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
    payload: AttachSeatToGuestVisitRequest,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:

    _require_guest_operator(current_user)

    tenant_id = str(current_user["tenant_id"])

    try:

        visit = fetch_guest_visit_by_id(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        if visit is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "guest_visit_not_found",
                    "message": "Guest visit not found.",
                },
            )

        if visit["visit_status"] == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "guest_visit_cancelled",
                    "message": "Cannot attach seat to a cancelled visit.",
                },
            )

        if guest_visit_has_active_booking(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "booking_already_exists",
                    "message": "Guest visit already has an active booking.",
                },
            )

        seat = _resolve_seat(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_id=str(payload.seat_id),
        )

        if has_active_booking_conflict(
            conn,
            tenant_id=tenant_id,
            seat_id=str(payload.seat_id),
            booking_date=visit["visit_date"],
        ):
            _raise_seat_booking_conflict()

        booking = insert_guest_booking(
            conn,
            tenant_id=tenant_id,
            guest_id=str(visit["guest_id"]),
            guest_visit_id=guest_visit_id,
            booked_by_user_id=_current_user_id(current_user),
            seat=seat,
            booking_date=visit["visit_date"],
        )

        update_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            requires_seat=True,
        )

        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()

    except HTTPException:
        conn.rollback()
        raise

    except (LookupError, ValueError) as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "attach_seat_failed",
                "message": str(exc),
            },
        ) from exc

    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(
            exc,
            action="attach_seat",
        )

    return BookingResponse(**booking)


def _require_workflow_visit(
    visit: dict[str, Any] | None,
    *,
    require_scheduled: bool,
) -> dict[str, Any]:
    if visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "guest_visit_not_found",
                "message": "Guest visit not found.",
            },
        )
    if require_scheduled and visit.get("visit_status") != "SCHEDULED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_visit_not_mutable",
                "message": "Only scheduled guest visits can be changed.",
            },
        )
    return visit


def _required_workflow_seat_id(payload: GuestWorkflowRequest) -> str:
    if payload.seat_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "workflow_seat_required",
                "message": f"seat_id is required for {payload.action.value}.",
            },
        )
    return str(payload.seat_id)


def _build_guest_workflow_response(
    conn: PGConnection,
    *,
    tenant_id: str,
    action: GuestWorkflowAction,
    message: str,
    guest_visit_id: str,
    booking_id: str | None = None,
) -> GuestWorkflowResponse:
    """Reload and serialize the final workflow state before committing."""
    guest_visit = fetch_guest_visit_by_id_for_update(
        conn,
        tenant_id=tenant_id,
        guest_visit_id=guest_visit_id,
    )
    if guest_visit is None:
        raise LookupError("Workflow guest visit could not be reloaded.")

    booking = None
    if booking_id is not None:
        booking = fetch_booking_by_id(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
        )
        if booking is None:
            raise LookupError("Workflow booking could not be reloaded.")

    return GuestWorkflowResponse(
        success=True,
        action=action.value,
        message=message,
        guest_visit=GuestVisitResponse(**guest_visit),
        booking=BookingResponse(**booking) if booking is not None else None,
    )


def execute_guest_visit_workflow(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
    payload: GuestWorkflowRequest,
) -> GuestWorkflowResponse:
    """Execute one explicit guest visit/booking workflow atomically."""
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])

    try:
        if payload.action == GuestWorkflowAction.MODIFY_VISIT_ONLY:
            visit = _require_workflow_visit(
                fetch_guest_visit_by_id_for_update(
                    conn,
                    tenant_id=tenant_id,
                    guest_visit_id=guest_visit_id,
                ),
                require_scheduled=True,
            )
            _validate_visit_times(payload.start_time, payload.end_time)
            _resolve_host(
                conn,
                tenant_id=tenant_id,
                host_user_id=str(payload.host_user_id),
            )
            floor_id = (
                str(payload.floor_id)
                if payload.floor_id is not None
                else None
            )
            _validate_visit_location(
                conn,
                tenant_id=tenant_id,
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=floor_id,
            )
            mark_guest_visit_modified(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            new_visit = insert_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                host_user_id=str(payload.host_user_id),
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=floor_id,
                visit_date=payload.visit_date,
                guest_type=_enum_value(payload.guest_type),
                purpose_of_visit=_enum_value(payload.purpose_of_visit),
                start_time=payload.start_time,
                end_time=payload.end_time,
                notes=_clean_optional(payload.notes),
                requires_seat=bool(visit["requires_seat"]),
                created_by_user_id=_current_user_id(current_user),
            )
            result = _build_guest_workflow_response(
                conn,
                tenant_id=tenant_id,
                action=payload.action,
                guest_visit_id=str(new_visit["guest_visit_id"]),
                message=(
                    "Guest visit replaced without changing its booking; "
                    "the prior visit was retained."
                ),
            )

        elif payload.action == GuestWorkflowAction.MODIFY_VISIT_AND_BOOKING:
            visit = _require_workflow_visit(
                fetch_guest_visit_by_id_for_update(
                    conn,
                    tenant_id=tenant_id,
                    guest_visit_id=guest_visit_id,
                ),
                require_scheduled=True,
            )
            booking = fetch_active_booking_for_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            _validate_mutable_guest_booking(booking, action="modify")
            seat_id = _required_workflow_seat_id(payload)
            if payload.floor_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "workflow_floor_required",
                        "message": "floor_id is required when replacing a booking.",
                    },
                )

            _validate_visit_times(payload.start_time, payload.end_time)
            _resolve_guest(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                require_active=True,
            )
            _resolve_host(
                conn,
                tenant_id=tenant_id,
                host_user_id=str(payload.host_user_id),
            )
            _validate_visit_location(
                conn,
                tenant_id=tenant_id,
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=str(payload.floor_id),
            )
            seat = _resolve_seat(
                conn,
                tenant_id=tenant_id,
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=str(payload.floor_id),
                seat_id=seat_id,
            )
            if guest_has_active_booking_on_date(
                conn,
                tenant_id=tenant_id,
                booked_for_guest_id=str(visit["guest_id"]),
                booking_date=payload.visit_date,
                exclude_booking_id=str(booking["booking_id"]),
            ):
                _raise_guest_booking_conflict()
            if has_active_booking_conflict(
                conn,
                tenant_id=tenant_id,
                seat_id=seat_id,
                booking_date=payload.visit_date,
                exclude_booking_id=str(booking["booking_id"]),
            ):
                _raise_seat_booking_conflict()

            cancel_booking(
                conn,
                tenant_id=tenant_id,
                booking_id=str(booking["booking_id"]),
                cancellation_reason=(
                    f"Booking ID: {booking['booking_id']}. "
                    "Replaced by guest workflow modification."
                ),
                booking_status="MODIFIED",
            )
            mark_guest_visit_modified(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )

            # Future lineage columns can connect these historical and replacement rows.
            new_visit = insert_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                host_user_id=str(payload.host_user_id),
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=str(payload.floor_id),
                visit_date=payload.visit_date,
                guest_type=_enum_value(payload.guest_type),
                purpose_of_visit=_enum_value(payload.purpose_of_visit),
                start_time=payload.start_time,
                end_time=payload.end_time,
                notes=_clean_optional(payload.notes),
                requires_seat=True,
                created_by_user_id=_current_user_id(current_user),
            )
            new_visit_id = str(new_visit["guest_visit_id"])
            new_booking = insert_guest_booking(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                guest_visit_id=new_visit_id,
                booked_by_user_id=_current_user_id(current_user),
                seat=seat,
                booking_date=payload.visit_date,
            )
            recalculate_guest_visit_requires_seat(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=new_visit_id,
            )
            result = _build_guest_workflow_response(
                conn,
                tenant_id=tenant_id,
                action=payload.action,
                guest_visit_id=new_visit_id,
                booking_id=str(new_booking["booking_id"]),
                message="Guest visit and booking replaced; prior records retained.",
            )

        elif payload.action == GuestWorkflowAction.ADD_BOOKING:
            visit = _require_workflow_visit(
                fetch_guest_visit_by_id_for_update(
                    conn,
                    tenant_id=tenant_id,
                    guest_visit_id=guest_visit_id,
                ),
                require_scheduled=True,
            )
            if fetch_active_booking_for_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            ) is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "booking_already_exists",
                        "message": "Guest visit already has an active booking.",
                    },
                )
            seat_id = _required_workflow_seat_id(payload)
            if visit.get("floor_id") is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "guest_visit_floor_required",
                        "message": "Guest visit must have a floor before adding a seat.",
                    },
                )
            _resolve_guest(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                require_active=True,
            )
            seat = _resolve_seat(
                conn,
                tenant_id=tenant_id,
                site_id=str(visit["site_id"]),
                building_id=str(visit["building_id"]),
                floor_id=str(visit["floor_id"]),
                seat_id=seat_id,
            )
            if guest_has_active_booking_on_date(
                conn,
                tenant_id=tenant_id,
                booked_for_guest_id=str(visit["guest_id"]),
                booking_date=visit["visit_date"],
            ):
                _raise_guest_booking_conflict()
            if has_active_booking_conflict(
                conn,
                tenant_id=tenant_id,
                seat_id=seat_id,
                booking_date=visit["visit_date"],
            ):
                _raise_seat_booking_conflict()
            new_booking = insert_guest_booking(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                guest_visit_id=guest_visit_id,
                booked_by_user_id=_current_user_id(current_user),
                seat=seat,
                booking_date=visit["visit_date"],
            )
            recalculate_guest_visit_requires_seat(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            result = _build_guest_workflow_response(
                conn,
                tenant_id=tenant_id,
                action=payload.action,
                guest_visit_id=guest_visit_id,
                booking_id=str(new_booking["booking_id"]),
                message="Booking added to guest visit.",
            )

        elif payload.action == GuestWorkflowAction.CANCEL_BOOKING:
            _require_workflow_visit(
                fetch_guest_visit_by_id_for_update(
                    conn,
                    tenant_id=tenant_id,
                    guest_visit_id=guest_visit_id,
                ),
                require_scheduled=False,
            )
            booking = fetch_active_booking_for_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            _validate_mutable_guest_booking(booking, action="cancel")
            cancel_booking(
                conn,
                tenant_id=tenant_id,
                booking_id=str(booking["booking_id"]),
                cancellation_reason=_normalize_cancellation_reason(
                    payload.cancellation_reason,
                ),
                booking_status="CANCELLED",
            )
            recalculate_guest_visit_requires_seat(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            result = _build_guest_workflow_response(
                conn,
                tenant_id=tenant_id,
                action=payload.action,
                guest_visit_id=guest_visit_id,
                booking_id=str(booking["booking_id"]),
                message="Guest booking cancelled; guest visit remains active.",
            )

        elif payload.action == GuestWorkflowAction.CANCEL_VISIT:
            visit = _require_workflow_visit(
                fetch_guest_visit_by_id_for_update(
                    conn,
                    tenant_id=tenant_id,
                    guest_visit_id=guest_visit_id,
                ),
                require_scheduled=True,
            )
            booking = fetch_active_booking_for_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            cancellation_reason = _clean_optional(payload.cancellation_reason)
            if booking is not None:
                cancel_booking(
                    conn,
                    tenant_id=tenant_id,
                    booking_id=str(booking["booking_id"]),
                    cancellation_reason=(
                        cancellation_reason or "Guest visit cancelled."
                    ),
                    booking_status="CANCELLED",
                )
            cancel_guest_visit(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
                cancellation_reason=cancellation_reason,
            )
            recalculate_guest_visit_requires_seat(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
            )
            result = _build_guest_workflow_response(
                conn,
                tenant_id=tenant_id,
                action=payload.action,
                guest_visit_id=str(visit["guest_visit_id"]),
                booking_id=(
                    str(booking["booking_id"])
                    if booking is not None
                    else None
                ),
                message="Guest visit and any active booking cancelled.",
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_guest_workflow_action",
                    "message": "Unsupported guest workflow action.",
                },
            )

        conn.commit()
        return result
    except HTTPException:
        conn.rollback()
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "guest_workflow_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _translate_guest_db_error(exc, action="workflow")
    except Exception:
        conn.rollback()
        raise


def audit_guest_visit_integrity(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    limit: int = 100,
) -> list[dict[str, Any]]:
    _require_guest_operator(current_user)

    return fetch_guest_visit_integrity_findings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        limit=limit,
    )


