"""Business workflows for guest profiles, visits, and guest bookings."""

from __future__ import annotations

import logging
import math
from datetime import date
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
    fetch_cancelled_guest_visits,
    recalculate_guest_visit_requires_seat,
    fetch_guest_visit_integrity_findings,
)

from backend.schemas.guest import (
    GuestVisitListItem,
    GuestVisitListResponse,
    CancelledGuestVisitResponse,
    CancelledGuestVisitItem,
    AttachSeatToGuestVisitRequest,
    ModifyGuestVisitRequest,
    GuestVisitStatusUpdateResponse,
)
from backend.core.app_logging import LOGGER_NAME
from backend.core.enums import BookingModificationReason
from backend.core.audit_actions import (
    GUEST_BOOKING_CANCELLED, GUEST_BOOKING_CREATED, GUEST_BOOKING_MODIFIED,
    GUEST_CREATED, GUEST_STATUS_UPDATED, GUEST_UPDATED,
    GUEST_VISIT_CANCELLED, GUEST_VISIT_CHECKED_IN, GUEST_VISIT_CHECKED_OUT,
    GUEST_VISIT_CREATED, GUEST_VISIT_MODIFIED, GUEST_VISIT_WORKFLOW_EXECUTED,
    GUEST_VISIT_BOOKING_ADDED, GUEST_VISIT_BOOKING_CANCELLED, GUEST_VISIT_AND_BOOKING_MODIFIED,
)
from backend.repositories.audit_repository import safe_write_audit_log
from backend.repositories.booking_repository import (
    cancel_booking,
    mark_booking_modified,
    count_guest_bookings,
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
    fetch_guest_by_email_excluding_guest,
    fetch_guest_by_phone_excluding_guest,
    search_guests,
    update_guest,
    update_guest_status as update_guest_status_repo,
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
    fetch_guest_visit_history,
    fetch_guest_visit_history_summary,
    cancel_future_guest_visits_for_guest,
    sync_booking_from_guest_visit,
)
from backend.repositories.booking_repository import (
    cancel_future_guest_bookings_for_guest,
)
from backend.repositories.location_repository import (
    fetch_building_by_id,
    fetch_floor_by_id,
    fetch_site_by_id,
)
from backend.repositories.user_repository import fetch_user_by_id
from backend.schemas.booking import BookingResponse, ModifyBookingRequest, PaginatedBookingResponse
from backend.schemas.pagination import PaginationMetadata
from backend.schemas.guest import (
    CreateGuestBookingRequest,
    CreateGuestRequest,
    CreateGuestVisitRequest,
    GuestResponse,
    GuestVisitResponse,
    GuestWorkflowAction,
    GuestWorkflowRequest,
    GuestWorkflowResponse,
    UpdateGuestRequest,
    UpdateGuestStatusRequest,
    GuestVisitHistoryResponse,
    GuestVisitHistorySummary,
    GuestVisitHistoryItem,
)
from backend.services.booking_service import (
    GUEST_OPERATION_ROLES,
    _apply_modified_display_status,
    _display_cancellation_reason,
    _normalize_cancellation_reason,
    _user_role,
)
from backend.services.notification_service import (
    booking_notification_details,
    format_notification_value,
    queue_email_notification,
    queue_booking_cancelled_notification,
    queue_booking_created_notification,
    queue_booking_modified_notification,
)

logger = logging.getLogger(f"{LOGGER_NAME}.guests")

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
    if _user_role(current_user) not in GUEST_OPERATION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "guest_operation_not_allowed",
                "message": (
                    "Guest operations require the FACILITATOR, TENANT_ADMIN, "
                    "or FRONT_OFFICE role."
                ),
            },
        )


def _enum_value(value: Any) -> Any:
    return value.value if isinstance(value, Enum) else value


def _booking_modification_reason(reason: Any) -> str | None:
    """Guest visit modification reasons (GuestVisitModificationReason) and
    booking modification reasons (BookingModificationReason) are validated
    against different DB CHECK constraints (chk_guest_visit_modification_reason
    vs chk_booking_modification_reason) that don't fully overlap. When a
    guest-visit-originated reason is also written to bookings.modification_reason,
    fall back to OTHER for any value the booking constraint doesn't accept."""
    value = _enum_value(reason)
    if value is None:
        return None
    if value in BookingModificationReason.__members__:
        return value
    return BookingModificationReason.OTHER.value


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
        safe_write_audit_log(
            conn,
            action=GUEST_CREATED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="guest",
            resource_id=str(guest.get("guest_id")),
            new_values={
                "full_name": guest.get("full_name"),
                "email": guest.get("email"),
                "organization": guest.get("organization"),
            },
        )
        return GuestResponse(**guest)
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=None,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=None,
            event_status="FAILURE", failure_code="invalid_guest", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=None,
            event_status="FAILURE", failure_code="guest_create_failed", failure_reason="Failed to create guest.",
        )
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


def update_guest_profile(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_id: str,
    payload: UpdateGuestRequest,
) -> GuestResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])
    fields_set = payload.model_fields_set

    try:
        guest = _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            require_active=False,
        )

        updates: dict[str, Any] = {}

        if "full_name" in fields_set:
            full_name = str(payload.full_name or "").strip()
            if not full_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "invalid_guest_full_name",
                        "message": "full_name cannot be empty.",
                    },
                )
            updates["full_name"] = full_name

        if "email" in fields_set:
            email = payload.email
            if email is None or not email.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "invalid_guest_email",
                        "message": "email cannot be null or empty.",
                    },
                )
            email = email.strip()
            if fetch_guest_by_email_excluding_guest(
                conn,
                tenant_id=tenant_id,
                email=email,
                exclude_guest_id=guest_id,
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "guest_email_exists",
                        "message": "A guest already exists with this email address.",
                    },
                )
            updates["email"] = email

        if "phone" in fields_set:
            phone = payload.phone
            if phone is None or not phone.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "invalid_guest_phone",
                        "message": "phone cannot be null or empty.",
                    },
                )
            phone = phone.strip()
            if fetch_guest_by_phone_excluding_guest(
                conn,
                tenant_id=tenant_id,
                phone=phone,
                exclude_guest_id=guest_id,
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "guest_phone_exists",
                        "message": "A guest already exists with this phone number.",
                    },
                )
            updates["phone"] = phone

        if "organization" in fields_set:
            updates["organization"] = _clean_optional(payload.organization)

        if not updates:
            return GuestResponse(**guest)

        updated = update_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            updates=updates,
        )
        conn.commit()
        safe_write_audit_log(
            conn,
            action=GUEST_UPDATED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="guest",
            resource_id=str(guest_id),
            old_values={k: guest.get(k) for k in updates},
            new_values=updates,
            changed_fields=[k for k in updates if guest.get(k) != updates[k]] or None,
        )
        return GuestResponse(**updated)
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_UPDATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=str(guest_id),
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_UPDATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=str(guest_id),
            event_status="FAILURE", failure_code="invalid_guest", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_UPDATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=str(guest_id),
            event_status="FAILURE", failure_code="guest_update_failed", failure_reason="Failed to update guest.",
        )
        _translate_guest_db_error(exc, action="update")


def update_guest_status(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_id: str,
    payload: UpdateGuestStatusRequest,
) -> GuestResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])

    try:
        guest_before = _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            require_active=False,
        )

        updated = update_guest_status_repo(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            status=payload.status,
        )

        if payload.status == "INACTIVE" and payload.cancel_future_bookings:
            cancel_future_guest_bookings_for_guest(
                conn,
                tenant_id=tenant_id,
                guest_id=guest_id,
                cancellation_reason="Guest deactivated",
            )
            cancel_future_guest_visits_for_guest(
                conn,
                tenant_id=tenant_id,
                guest_id=guest_id,
                cancellation_reason="Guest deactivated",
            )

        conn.commit()
        safe_write_audit_log(
            conn,
            action=GUEST_STATUS_UPDATED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="guest",
            resource_id=str(guest_id),
            old_values={"status": guest_before.get("status")},
            new_values={"status": payload.status},
            changed_fields=["status"] if guest_before.get("status") != payload.status else None,
            metadata={"cancel_future_bookings": payload.cancel_future_bookings},
        )
        return GuestResponse(**updated)
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_STATUS_UPDATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=str(guest_id),
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_STATUS_UPDATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=str(guest_id),
            event_status="FAILURE", failure_code="invalid_guest_status_update", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest_status_update", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_STATUS_UPDATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest", resource_id=str(guest_id),
            event_status="FAILURE", failure_code="guest_status_update_failed", failure_reason="Failed to update guest status.",
        )
        _translate_guest_db_error(exc, action="status_update")


def get_guest_visit_history(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_id: str,
    page: int = 1,
    limit: int = 20,
    include_cancelled: bool = False,
) -> GuestVisitHistoryResponse:
    _require_guest_operator(current_user)
    tenant_id = str(current_user["tenant_id"])

    guest = _resolve_guest(
        conn,
        tenant_id=tenant_id,
        guest_id=guest_id,
        require_active=False,
    )

    summary = fetch_guest_visit_history_summary(
        conn,
        tenant_id=tenant_id,
        guest_id=guest_id,
    )

    total = int(summary.get("total_visits") or 0)
    if not include_cancelled:
        total -= int(summary.get("cancelled") or 0)

    offset = (page - 1) * limit
    rows = fetch_guest_visit_history(
        conn,
        tenant_id=tenant_id,
        guest_id=guest_id,
        include_cancelled=include_cancelled,
        limit=limit,
        offset=offset,
    )

    return GuestVisitHistoryResponse(
        guest=GuestResponse(**guest),
        summary=GuestVisitHistorySummary(**summary),
        items=[GuestVisitHistoryItem(**row) for row in rows],
        pagination=PaginationMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total else 0,
        ),
    )


def create_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateGuestVisitRequest,
    background_tasks: BackgroundTasks | None = None,
) -> GuestVisitResponse:
    _require_guest_operator(current_user)
    if payload.visit_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "visit_date_in_past",
                "message": "Guest visits cannot be created for a past date.",
            },
        )
    tenant_id = str(current_user["tenant_id"])
    floor_id = str(payload.floor_id) if payload.floor_id is not None else None

    try:
        _validate_visit_times(payload.start_time, payload.end_time)
        guest = _resolve_guest(
            conn,
            tenant_id=tenant_id,
            guest_id=str(payload.guest_id),
            require_active=True,
        )
        host = _resolve_host(
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
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit",
            resource_id=str(visit["guest_visit_id"]),
            new_values={
                "guest_id": str(payload.guest_id),
                "host_user_id": str(payload.host_user_id),
                "visit_date": str(payload.visit_date),
                "site_id": str(payload.site_id),
                "building_id": str(payload.building_id),
                "floor_id": floor_id,
                "guest_type": _enum_value(payload.guest_type),
                "purpose_of_visit": _enum_value(payload.purpose_of_visit),
                "start_time": str(payload.start_time) if payload.start_time is not None else None,
                "end_time": str(payload.end_time) if payload.end_time is not None else None,
                "notes": _clean_optional(payload.notes),
            },
        )
        email_visit = (
            fetch_guest_visit_by_id(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=str(visit["guest_visit_id"]),
            )
            or visit
        )
        _queue_guest_visit_notification_fanout(
            background_tasks,
            event="created",
            visit=email_visit,
            guest=guest,
            host=host,
            creator=current_user,
        )
        return GuestVisitResponse(**visit)
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=None,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=None,
            event_status="FAILURE", failure_code="invalid_guest_visit", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest_visit", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=None,
            event_status="FAILURE", failure_code="guest_visit_create_failed", failure_reason="Failed to create guest visit.",
        )
        _translate_guest_db_error(exc, action="visit_create")


def create_guest_booking(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateGuestBookingRequest,
    background_tasks: BackgroundTasks | None = None,
) -> BookingResponse:
    _require_guest_operator(current_user)
    if payload.visit_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "visit_date_in_past",
                "message": "Guest bookings cannot be created for a past date.",
            },
        )
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
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=None,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=None,
            event_status="FAILURE", failure_code="invalid_guest_booking", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest_booking", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=None,
            event_status="FAILURE", failure_code="guest_booking_create_failed", failure_reason="Failed to create guest booking.",
        )
        _translate_guest_db_error(exc, action="booking_create")

    safe_write_audit_log(
        conn, action=GUEST_BOOKING_CREATED, tenant_id=tenant_id,
        current_user=current_user, resource_type="guest_booking",
        resource_id=str(booking.get("booking_id")),
        new_values={
            "guest_id": guest_id,
            "host_user_id": str(payload.host_user_id),
            "guest_visit_id": str(visit["guest_visit_id"]),
            "visit_date": str(payload.visit_date),
            "guest_type": _enum_value(payload.guest_type),
            "purpose_of_visit": _enum_value(payload.purpose_of_visit),
            "start_time": str(payload.start_time) if payload.start_time is not None else None,
            "end_time": str(payload.end_time) if payload.end_time is not None else None,
            "notes": _clean_optional(payload.notes),
            "seat_id": booking.get("seat_id"),
            "seat_code": booking.get("seat_code"),
            "site_id": booking.get("site_id"),
            "site_name": booking.get("site_name"),
            "building_id": booking.get("building_id"),
            "building_name": booking.get("building_name"),
            "floor_id": booking.get("floor_id"),
            "floor_name": booking.get("floor_name"),
        },
    )
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
    page: int | None = None,
) -> list[BookingResponse] | PaginatedBookingResponse:
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
    offset = (page - 1) * limit if page is not None else None
    rows = fetch_guest_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        guest_id=guest_id,
        booking_date=booking_date,
        booking_status=normalized_status,
        limit=limit,
        offset=offset,
    )
    rows = _apply_modified_display_status(rows)
    if page is None:
        return [BookingResponse(**row) for row in rows]

    total = count_guest_bookings(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        guest_id=guest_id,
        booking_date=booking_date,
        booking_status=normalized_status,
    )
    return PaginatedBookingResponse(
        items=[BookingResponse(**row) for row in rows],
        pagination=PaginationMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total else 0,
        ),
    )


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
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=booking_id,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except LookupError as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=booking_id,
            event_status="FAILURE", failure_code="guest_booking_not_found", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "guest_booking_not_found", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=booking_id,
            event_status="FAILURE", failure_code="guest_booking_cancel_failed", failure_reason="Failed to cancel guest booking.",
        )
        _translate_guest_db_error(exc, action="booking_cancel")

    _bc_context = {
        "guest_id": str(booking.get("booked_for_guest_id")),
        "guest_email": guest.get("email") if guest else None,
        "seat_id": booking.get("seat_id"),
        "seat_code": booking.get("seat_code"),
        "site_id": booking.get("site_id"),
        "site_name": booking.get("site_name"),
        "building_id": booking.get("building_id"),
        "building_name": booking.get("building_name"),
        "floor_id": booking.get("floor_id"),
        "floor_name": booking.get("floor_name"),
    }
    _bc_old = {
        "booking_date": str(booking.get("booking_date")),
        "booking_status": booking.get("booking_status"),
        "cancellation_reason": booking.get("cancellation_reason"),
        **_bc_context,
    }
    _bc_new = {
        "booking_date": str(booking.get("booking_date")),
        "booking_status": "CANCELLED",
        "cancellation_reason": updated_booking.get("cancellation_reason"),
        **_bc_context,
    }
    safe_write_audit_log(
        conn, action=GUEST_BOOKING_CANCELLED, tenant_id=tenant_id,
        current_user=current_user, resource_type="guest_booking",
        resource_id=booking_id,
        old_values=_bc_old,
        new_values=_bc_new,
        changed_fields=[k for k in _bc_new if _bc_old.get(k) != _bc_new[k]] or None,
    )
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
        mark_booking_modified(
            conn,
            tenant_id=tenant_id,
            booking_id=booking_id,
            modification_reason=(
                payload.modification_reason.value
                if payload.modification_reason is not None
                else "USER_REQUEST"
            ),
        )
        new_booking = insert_guest_booking(
            conn,
            tenant_id=tenant_id,
            guest_id=guest_id,
            guest_visit_id=guest_visit_id,
            booked_by_user_id=_current_user_id(current_user),
            seat=target_seat,
            booking_date=payload.booking_date,
            modified_from_booking_id=booking_id,
        )
        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )
        conn.commit()
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_MODIFIED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=booking_id,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_MODIFIED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=booking_id,
            event_status="FAILURE", failure_code="guest_booking_modify_failed", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "guest_booking_modify_failed", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_BOOKING_MODIFIED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_booking", resource_id=booking_id,
            event_status="FAILURE", failure_code="guest_booking_modify_failed", failure_reason="Failed to modify guest booking.",
        )
        _translate_guest_db_error(exc, action="booking_modify")

    _visit_context = fetch_guest_visit_by_id(
        conn, tenant_id=tenant_id, guest_visit_id=guest_visit_id,
    )
    _bm_visit_fields = {
        "host_user_id": _visit_context.get("host_user_id") if _visit_context else None,
        "guest_type": _enum_value(_visit_context.get("guest_type")) if _visit_context else None,
        "purpose_of_visit": _enum_value(_visit_context.get("purpose_of_visit")) if _visit_context else None,
        "start_time": str(_visit_context.get("start_time")) if _visit_context and _visit_context.get("start_time") is not None else None,
        "end_time": str(_visit_context.get("end_time")) if _visit_context and _visit_context.get("end_time") is not None else None,
        "notes": _visit_context.get("notes") if _visit_context else None,
    }
    _bm_fields = ("booking_date", "seat_id", "seat_code", "site_id", "building_id", "floor_id")
    _bm_old = {
        "booking_id": booking_id,
        "booking_date": str(old_booking.get("booking_date")),
        "seat_id": old_booking.get("seat_id"),
        "seat_code": old_booking.get("seat_code"),
        "site_id": old_booking.get("site_id"),
        "site_name": old_booking.get("site_name"),
        "building_id": old_booking.get("building_id"),
        "building_name": old_booking.get("building_name"),
        "floor_id": old_booking.get("floor_id"),
        "floor_name": old_booking.get("floor_name"),
        **_bm_visit_fields,
    }
    _bm_new = {
        "booking_id": str(new_booking.get("booking_id")),
        "booking_date": str(new_booking.get("booking_date")),
        "seat_id": new_booking.get("seat_id"),
        "seat_code": new_booking.get("seat_code"),
        "site_id": new_booking.get("site_id"),
        "site_name": new_booking.get("site_name"),
        "building_id": new_booking.get("building_id"),
        "building_name": new_booking.get("building_name"),
        "floor_id": new_booking.get("floor_id"),
        "floor_name": new_booking.get("floor_name"),
        **_bm_visit_fields,
    }
    _bm_changed = [k for k in _bm_fields if str(_bm_old.get(k) or "") != str(_bm_new.get(k) or "")]
    safe_write_audit_log(
        conn, action=GUEST_BOOKING_MODIFIED, tenant_id=tenant_id,
        current_user=current_user, resource_type="guest_booking",
        resource_id=str(new_booking.get("booking_id")),
        old_values=_bm_old,
        new_values=_bm_new,
        changed_fields=_bm_changed or None,
    )
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
                **booking_notification_details(booking),
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
                "cancellation_reason": _display_cancellation_reason(booking),
                **booking_notification_details(booking),
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
                "old_booking": booking_notification_details(old_booking),
                "new_booking": booking_notification_details(new_booking),
            },
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=guest_booking_modified booking_id=%s",
            new_booking.get("booking_id"),
        )


def _queue_guest_visit_notification_fanout(
    background_tasks: BackgroundTasks | None,
    *,
    event: str,
    visit: dict[str, Any],
    guest: dict[str, Any] | None,
    host: dict[str, Any] | None,
    creator: dict[str, Any],
    cancellation_reason: str | None = None,
) -> None:
    if background_tasks is None:
        return

    template_by_recipient = {
        "guest": f"guest_visit_{event}_guest.html",
        "host": f"guest_visit_{event}_host.html",
        "creator": f"guest_visit_{event}_creator.html",
    }
    subject_by_event = {
        "created": "Guest visit scheduled",
        "modified": "Guest visit updated",
        "cancelled": "Guest visit cancelled",
    }
    subject = subject_by_event.get(event, "Guest visit notification")
    context = _guest_visit_email_context(
        visit,
        guest=guest,
        host=host,
        creator=creator,
        cancellation_reason=cancellation_reason,
    )

    recipients = (
        ("guest", context["guest_email"], context["guest_name"]),
        ("host", context["host_email"], context["host_name"]),
        ("creator", context["creator_email"], context["creator_name"]),
    )
    for recipient_role, recipient_email, recipient_name in recipients:
        if not recipient_email:
            continue
        try:
            queue_email_notification(
                background_tasks,
                to_emails=[recipient_email],
                subject=subject,
                template_name=template_by_recipient[recipient_role],
                context={
                    **context,
                    "recipient_role": recipient_role,
                    "recipient_name": recipient_name or "there",
                },
            )
        except Exception:
            logger.exception(
                "notification.queue_failed event=guest_visit_%s recipient_role=%s guest_visit_id=%s",
                event,
                recipient_role,
                visit.get("guest_visit_id"),
            )


def _guest_visit_email_context(
    visit: dict[str, Any],
    *,
    guest: dict[str, Any] | None,
    host: dict[str, Any] | None,
    creator: dict[str, Any],
    cancellation_reason: str | None,
) -> dict[str, str]:
    return {
        "guest_visit_id": format_notification_value(visit.get("guest_visit_id")),
        "guest_name": _first_text(visit.get("guest_name"), guest.get("full_name") if guest else None),
        "guest_email": _first_text(visit.get("guest_email"), guest.get("email") if guest else None),
        "guest_phone": _first_text(visit.get("guest_phone"), guest.get("phone") if guest else None),
        "guest_organization": _first_text(
            visit.get("guest_organization"),
            guest.get("organization") if guest else None,
        ),
        "host_name": _first_text(visit.get("host_name"), host.get("full_name") if host else None),
        "host_email": _first_text(visit.get("host_email"), host.get("email") if host else None),
        "creator_name": _first_text(
            visit.get("created_by_name"),
            creator.get("full_name"),
            creator.get("display_name"),
            creator.get("email"),
        ),
        "creator_email": _first_text(visit.get("created_by_email"), creator.get("email")),
        "visit_date": format_notification_value(visit.get("visit_date")),
        "start_time": format_notification_value(visit.get("start_time")),
        "end_time": format_notification_value(visit.get("end_time")),
        "site": _first_text(visit.get("site_name")),
        "building": _first_text(visit.get("building_name")),
        "floor": _first_text(visit.get("floor_name")),
        "guest_type": format_notification_value(visit.get("guest_type")),
        "purpose_of_visit": format_notification_value(visit.get("purpose_of_visit")),
        "notes": format_notification_value(visit.get("notes")),
        "cancellation_reason": format_notification_value(cancellation_reason),
    }


def _first_text(*values: Any) -> str:
    for value in values:
        normalized = str(value or "").strip()
        if normalized:
            return normalized
    return ""


def _apply_modified_display_visit_status(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    for row in rows:
        if (
            row.get("modified_from_guest_visit_id") is not None
            and row.get("visit_status") == "SCHEDULED"
        ):
            row["visit_status"] = "MODIFIED"

    return rows


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
    page: int | None = None,
) -> GuestVisitListResponse:

    tenant_id = str(current_user["tenant_id"])

    summary = fetch_guest_visit_summary(
        conn,
        tenant_id=tenant_id,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
    )

    effective_offset = (page - 1) * limit if page is not None else offset
    rows = fetch_guest_visits(
        conn,
        tenant_id=tenant_id,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
        limit=limit,
        offset=effective_offset,
    )
    rows = _apply_modified_display_visit_status(rows)

    pagination = None
    if page is not None:
        total = int(summary.get("total") or 0)
        pagination = PaginationMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total else 0,
        )

    return GuestVisitListResponse(
        summary=summary,
        items=[
            GuestVisitListItem(**row)
            for row in rows
        ],
        pagination=pagination,
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

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest visit not found.",
        )

    return GuestVisitListItem(**row)


def _guest_visit_audit_context(visit: dict[str, Any] | None) -> dict[str, Any]:
    """Front-office context for check-in/check-out audit events: who was checked
    in/out, for which host, at which site — not derivable from visit_status alone."""
    if not visit:
        return {}
    return {
        "guest_name": visit.get("guest_name"),
        "guest_email": visit.get("guest_email"),
        "host_name": visit.get("host_name"),
        "host_email": visit.get("host_email"),
        "site_name": visit.get("site_name"),
        "building_name": visit.get("building_name"),
        "purpose_of_visit": visit.get("purpose_of_visit"),
        "visit_date": str(visit.get("visit_date")) if visit.get("visit_date") is not None else None,
    }


def guest_visit_check_in(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
) -> GuestVisitStatusUpdateResponse:

    tenant_id = str(current_user["tenant_id"])

    try:
        _visit_before_ci = fetch_guest_visit_by_id(
            conn, tenant_id=tenant_id, guest_visit_id=guest_visit_id,
        )
        check_in_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()
        _visit_after_ci = fetch_guest_visit_by_id(
            conn, tenant_id=tenant_id, guest_visit_id=guest_visit_id,
        )
        _ci_context = _guest_visit_audit_context(_visit_before_ci)
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CHECKED_IN, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit",
            resource_id=guest_visit_id,
            old_values={
                "visit_status": _visit_before_ci.get("visit_status") if _visit_before_ci else None,
                "checked_in_at": None,
                **_ci_context,
            },
            new_values={
                "visit_status": "CHECKED_IN",
                "checked_in_at": str(_visit_after_ci.get("checked_in_at")) if _visit_after_ci else None,
                **_ci_context,
            },
            changed_fields=["visit_status", "checked_in_at"],
        )
        return GuestVisitStatusUpdateResponse(
            guest_visit_id=guest_visit_id,
            visit_status="CHECKED_IN",
        )

    except LookupError as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CHECKED_IN, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_visit_not_found", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "guest_visit_not_found", "message": str(exc)},
        ) from exc
    except ValueError as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CHECKED_IN, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="invalid_guest_visit_transition", failure_reason=str(exc),
            old_values={
                "visit_status": _visit_before_ci.get("visit_status") if _visit_before_ci else None,
                **_guest_visit_audit_context(_visit_before_ci),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest_visit_transition", "message": str(exc)},
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
        _visit_before_co = fetch_guest_visit_by_id(
            conn, tenant_id=tenant_id, guest_visit_id=guest_visit_id,
        )
        check_out_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()
        _visit_after_co = fetch_guest_visit_by_id(
            conn, tenant_id=tenant_id, guest_visit_id=guest_visit_id,
        )
        _co_context = _guest_visit_audit_context(_visit_before_co)
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CHECKED_OUT, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit",
            resource_id=guest_visit_id,
            old_values={
                "visit_status": _visit_before_co.get("visit_status") if _visit_before_co else None,
                "checked_out_at": None,
                **_co_context,
            },
            new_values={
                "visit_status": "CHECKED_OUT",
                "checked_out_at": str(_visit_after_co.get("checked_out_at")) if _visit_after_co else None,
                **_co_context,
            },
            changed_fields=["visit_status", "checked_out_at"],
        )
        return GuestVisitStatusUpdateResponse(
            guest_visit_id=guest_visit_id,
            visit_status="CHECKED_OUT",
        )

    except LookupError as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CHECKED_OUT, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_visit_not_found", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "guest_visit_not_found", "message": str(exc)},
        ) from exc
    except ValueError as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CHECKED_OUT, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="invalid_guest_visit_transition", failure_reason=str(exc),
            old_values={
                "visit_status": _visit_before_co.get("visit_status") if _visit_before_co else None,
                **_guest_visit_audit_context(_visit_before_co),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_guest_visit_transition", "message": str(exc)},
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

        visit = fetch_guest_visit_by_id_for_update(
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
    background_tasks: BackgroundTasks | None = None,
) -> GuestVisitStatusUpdateResponse:

    _require_guest_operator(current_user)

    tenant_id = str(current_user["tenant_id"])

    try:
        visit_for_email = fetch_guest_visit_by_id(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

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
            )

        recalculate_guest_visit_requires_seat(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        conn.commit()
        _vc_context = {
            "guest_id": visit_for_email.get("guest_id") if visit_for_email else None,
            "host_user_id": visit_for_email.get("host_user_id") if visit_for_email else None,
            "site_id": visit_for_email.get("site_id") if visit_for_email else None,
            "building_id": visit_for_email.get("building_id") if visit_for_email else None,
            "floor_id": visit_for_email.get("floor_id") if visit_for_email else None,
            "seat_code": visit_for_email.get("seat_code") if visit_for_email else None,
            **_guest_visit_audit_context(visit_for_email),
        }
        _vc_old = {
            "visit_status": visit_for_email.get("visit_status") if visit_for_email else None,
            "cancellation_reason": None,
            **_vc_context,
        }
        _vc_new = {
            "visit_status": "CANCELLED",
            "cancellation_reason": cancellation_reason,
            **_vc_context,
        }
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit",
            resource_id=guest_visit_id,
            old_values=_vc_old,
            new_values=_vc_new,
            changed_fields=[k for k in _vc_new if _vc_old.get(k) != _vc_new[k]] or None,
        )
        status_row = fetch_guest_visit_status(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        if visit_for_email is not None:
            _queue_guest_visit_notification_fanout(
                background_tasks,
                event="cancelled",
                visit=visit_for_email,
                guest=None,
                host=None,
                creator=current_user,
                cancellation_reason=cancellation_reason,
            )

        return GuestVisitStatusUpdateResponse(
            **status_row,
        )

    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise

    except LookupError as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_visit_not_found", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "guest_visit_not_found", "message": str(exc)},
        ) from exc

    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_CANCELLED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_visit_cancel_failed", failure_reason="Failed to cancel guest visit.",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "guest_visit_cancel_failed", "message": "Failed to cancel guest visit."},
        ) from exc
    


def modify_guest_visit(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    guest_visit_id: str,
    payload: ModifyGuestVisitRequest,
    background_tasks: BackgroundTasks | None = None,
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

        active_booking = fetch_active_booking_for_guest_visit(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
        )

        if active_booking is not None:
            _validate_mutable_guest_booking(active_booking, action="modify")
            mark_booking_modified(
                conn,
                tenant_id=tenant_id,
                booking_id=str(active_booking["booking_id"]),
                modification_reason=_booking_modification_reason(
                    payload.modification_reason
                ),
            )

        mark_guest_visit_modified(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=guest_visit_id,
            modification_reason=_enum_value(payload.modification_reason),
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
            purpose_of_visit=_enum_value(
                payload.purpose_of_visit
            ),
            start_time=payload.start_time,
            end_time=payload.end_time,
            notes=_clean_optional(payload.notes),
            requires_seat=bool(visit["requires_seat"]),
            created_by_user_id=_current_user_id(current_user),
            modified_from_guest_visit_id=guest_visit_id,
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
        _vm_old = {
            "visit_date": str(visit.get("visit_date")),
            "site_id": str(visit.get("site_id")),
            "building_id": str(visit.get("building_id")),
            "floor_id": str(visit.get("floor_id")) if visit.get("floor_id") is not None else None,
            "host_user_id": str(visit.get("host_user_id")),
        }
        _vm_new = {
            "visit_date": str(payload.visit_date),
            "site_id": str(payload.site_id),
            "building_id": str(payload.building_id),
            "floor_id": floor_id,
            "host_user_id": str(payload.host_user_id),
        }
        safe_write_audit_log(
            conn, action=GUEST_VISIT_MODIFIED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit",
            resource_id=guest_visit_id,
            old_values=_vm_old,
            new_values=_vm_new,
            changed_fields=[k for k in _vm_new if _vm_old.get(k) != _vm_new[k]] or None,
        )
        updated = fetch_guest_visit_by_id(
            conn,
            tenant_id=tenant_id,
            guest_visit_id=str(new_visit["guest_visit_id"]),
        ) or new_visit

        conn.commit()

        if updated is not None:
            _queue_guest_visit_notification_fanout(
                background_tasks,
                event="modified",
                visit=updated,
                guest=None,
                host=None,
                creator=current_user,
            )

        return GuestVisitResponse(**updated)

    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_VISIT_MODIFIED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise

    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_MODIFIED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_visit_modify_failed", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "guest_visit_modify_failed", "message": str(exc)},
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

    safe_write_audit_log(
        conn, action=GUEST_BOOKING_CREATED, tenant_id=tenant_id,
        current_user=current_user, resource_type="guest_booking",
        resource_id=str(booking.get("booking_id")),
        new_values={
            "guest_visit_id": guest_visit_id,
            "host_user_id": visit.get("host_user_id"),
            "guest_type": _enum_value(visit.get("guest_type")),
            "purpose_of_visit": _enum_value(visit.get("purpose_of_visit")),
            "start_time": str(visit.get("start_time")) if visit.get("start_time") is not None else None,
            "end_time": str(visit.get("end_time")) if visit.get("end_time") is not None else None,
            "notes": visit.get("notes"),
            "booking_date": str(booking.get("booking_date")),
            "seat_id": booking.get("seat_id"),
            "seat_code": booking.get("seat_code"),
            "site_id": booking.get("site_id"),
            "site_name": booking.get("site_name"),
            "building_id": booking.get("building_id"),
            "building_name": booking.get("building_name"),
            "floor_id": booking.get("floor_id"),
            "floor_name": booking.get("floor_name"),
        },
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
    _iso = lambda v: v.isoformat() if v is not None else None
    _s = lambda v: str(v) if v is not None else None
    _aud_old: dict | None = None
    _aud_new: dict | None = None
    _aud_changed: list | None = None

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
                modification_reason=_enum_value(payload.modification_reason),
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
                modified_from_guest_visit_id=guest_visit_id,
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
            _aud_old = {
                "guest_id": visit.get("guest_id"),
                "visit_date": _iso(visit.get("visit_date")),
                "start_time": _iso(visit.get("start_time")),
                "end_time": _iso(visit.get("end_time")),
                "host_user_id": visit.get("host_user_id"),
                "site_id": visit.get("site_id"),
                "building_id": visit.get("building_id"),
                "floor_id": visit.get("floor_id"),
                "guest_type": visit.get("guest_type"),
                "purpose_of_visit": visit.get("purpose_of_visit"),
                "notes": visit.get("notes"),
            }
            _aud_new = {
                "guest_id": visit.get("guest_id"),
                "visit_date": _iso(payload.visit_date),
                "start_time": _iso(payload.start_time),
                "end_time": _iso(payload.end_time),
                "host_user_id": _s(payload.host_user_id),
                "site_id": _s(payload.site_id),
                "building_id": _s(payload.building_id),
                "floor_id": _s(payload.floor_id),
                "guest_type": _enum_value(payload.guest_type),
                "purpose_of_visit": _enum_value(payload.purpose_of_visit),
                "notes": _clean_optional(payload.notes),
            }
            _aud_changed = [k for k in _aud_new if _aud_old.get(k) != _aud_new[k]] or None

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
            guest = _resolve_guest(
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

            old_booking_id = str(booking["booking_id"])
            mark_booking_modified(
                conn,
                tenant_id=tenant_id,
                booking_id=old_booking_id,
                modification_reason=_booking_modification_reason(
                    payload.modification_reason
                ),
            )
            mark_guest_visit_modified(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
                modification_reason=_enum_value(payload.modification_reason),
            )

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
                modified_from_guest_visit_id=guest_visit_id,
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
                modified_from_booking_id=old_booking_id,
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
            _aud_old = {
                "guest_id": visit.get("guest_id"),
                "guest_email": guest.get("email") if guest else None,
                "visit_date": _iso(visit.get("visit_date")),
                "start_time": _iso(visit.get("start_time")),
                "end_time": _iso(visit.get("end_time")),
                "host_user_id": visit.get("host_user_id"),
                "site_id": visit.get("site_id"),
                "building_id": visit.get("building_id"),
                "floor_id": visit.get("floor_id"),
                "guest_type": visit.get("guest_type"),
                "purpose_of_visit": visit.get("purpose_of_visit"),
                "notes": visit.get("notes"),
                "seat_id": booking.get("seat_id"),
                "booking_date": _iso(booking.get("booking_date")),
            }
            _aud_new = {
                "guest_id": visit.get("guest_id"),
                "guest_email": guest.get("email") if guest else None,
                "visit_date": _iso(payload.visit_date),
                "start_time": _iso(payload.start_time),
                "end_time": _iso(payload.end_time),
                "host_user_id": _s(payload.host_user_id),
                "site_id": _s(payload.site_id),
                "site_name": seat.get("site_name"),
                "building_id": _s(payload.building_id),
                "building_name": seat.get("building_name"),
                "floor_id": _s(payload.floor_id),
                "floor_name": seat.get("floor_name"),
                "guest_type": _enum_value(payload.guest_type),
                "purpose_of_visit": _enum_value(payload.purpose_of_visit),
                "notes": _clean_optional(payload.notes),
                "seat_id": seat.get("seat_id"),
                "seat_code": seat.get("seat_code"),
                "booking_date": _iso(payload.visit_date),
            }
            _aud_changed = [k for k in _aud_new if _aud_old.get(k) != _aud_new[k]] or None

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
            _validate_visit_location(
                conn,
                tenant_id=tenant_id,
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=str(payload.floor_id),
            )
            guest = _resolve_guest(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                require_active=True,
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
            ):
                _raise_guest_booking_conflict()
            if has_active_booking_conflict(
                conn,
                tenant_id=tenant_id,
                seat_id=seat_id,
                booking_date=payload.visit_date,
            ):
                _raise_seat_booking_conflict()
            new_booking = insert_guest_booking(
                conn,
                tenant_id=tenant_id,
                guest_id=str(visit["guest_id"]),
                guest_visit_id=guest_visit_id,
                booked_by_user_id=_current_user_id(current_user),
                seat=seat,
                booking_date=payload.visit_date,
            )
            update_guest_visit_booking_details(
                conn,
                tenant_id=tenant_id,
                guest_visit_id=guest_visit_id,
                site_id=str(payload.site_id),
                building_id=str(payload.building_id),
                floor_id=str(payload.floor_id),
                visit_date=payload.visit_date,
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
            _aud_new = {
                "guest_id": visit.get("guest_id"),
                "guest_email": guest.get("email") if guest else None,
                "seat_id": seat.get("seat_id"),
                "seat_code": seat.get("seat_code"),
                "site_id": seat.get("site_id"),
                "site_name": seat.get("site_name"),
                "building_id": seat.get("building_id"),
                "building_name": seat.get("building_name"),
                "floor_id": seat.get("floor_id"),
                "floor_name": seat.get("floor_name"),
                "booking_date": _iso(payload.visit_date),
            }

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
            _booking_cancellation_reason = _normalize_cancellation_reason(
                payload.cancellation_reason,
            )
            cancel_booking(
                conn,
                tenant_id=tenant_id,
                booking_id=str(booking["booking_id"]),
                cancellation_reason=_booking_cancellation_reason,
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
            _aud_context = {
                "guest_id": booking.get("booked_for_guest_id"),
                "guest_email": result.booking.booked_for_email if result.booking else None,
                "seat_code": result.booking.seat_code if result.booking else None,
                "site_id": booking.get("site_id"),
                "site_name": result.booking.site_name if result.booking else None,
                "building_id": booking.get("building_id"),
                "building_name": result.booking.building_name if result.booking else None,
                "floor_id": booking.get("floor_id"),
                "floor_name": result.booking.floor_name if result.booking else None,
            }
            _aud_old = {
                "booking_id": booking.get("booking_id"),
                "seat_id": booking.get("seat_id"),
                "booking_date": _iso(booking.get("booking_date")),
                "booking_status": booking.get("booking_status"),
                "cancellation_reason": booking.get("cancellation_reason"),
                **_aud_context,
            }
            _aud_new = {
                "booking_id": booking.get("booking_id"),
                "seat_id": booking.get("seat_id"),
                "booking_date": _iso(booking.get("booking_date")),
                "booking_status": "CANCELLED",
                "cancellation_reason": _booking_cancellation_reason,
                **_aud_context,
            }
            _aud_changed = [k for k in _aud_new if _aud_old.get(k) != _aud_new[k]]

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
            _aud_context = {
                "guest_id": visit.get("guest_id"),
                "host_user_id": visit.get("host_user_id"),
                "site_id": visit.get("site_id"),
                "site_name": result.booking.site_name if result.booking else None,
                "building_id": visit.get("building_id"),
                "building_name": result.booking.building_name if result.booking else None,
                "floor_id": visit.get("floor_id"),
                "floor_name": result.booking.floor_name if result.booking else None,
                "seat_id": booking.get("seat_id") if booking is not None else None,
                "seat_code": result.booking.seat_code if result.booking else None,
            }
            _aud_old = {
                "visit_status": visit.get("visit_status"),
                "visit_date": _iso(visit.get("visit_date")),
                "booking_id": booking.get("booking_id") if booking is not None else None,
                "booking_status": booking.get("booking_status") if booking is not None else None,
                "cancellation_reason": None,
                **_aud_context,
            }
            _aud_new = {
                "visit_status": "CANCELLED",
                "visit_date": _iso(visit.get("visit_date")),
                "booking_id": booking.get("booking_id") if booking is not None else None,
                "booking_status": "CANCELLED" if booking is not None else None,
                "cancellation_reason": cancellation_reason,
                **_aud_context,
            }
            _aud_changed = [k for k in _aud_new if _aud_old.get(k) != _aud_new[k]]

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_guest_workflow_action",
                    "message": "Unsupported guest workflow action.",
                },
            )

        conn.commit()
        _WORKFLOW_AUDIT_ACTION = {
            GuestWorkflowAction.MODIFY_VISIT_ONLY: GUEST_VISIT_MODIFIED,
            GuestWorkflowAction.MODIFY_VISIT_AND_BOOKING: GUEST_VISIT_AND_BOOKING_MODIFIED,
            GuestWorkflowAction.ADD_BOOKING: GUEST_VISIT_BOOKING_ADDED,
            GuestWorkflowAction.CANCEL_BOOKING: GUEST_VISIT_BOOKING_CANCELLED,
            GuestWorkflowAction.CANCEL_VISIT: GUEST_VISIT_CANCELLED,
        }
        safe_write_audit_log(
            conn,
            action=_WORKFLOW_AUDIT_ACTION.get(payload.action, GUEST_VISIT_WORKFLOW_EXECUTED),
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="guest_visit",
            resource_id=guest_visit_id,
            old_values=_aud_old,
            new_values=_aud_new,
            changed_fields=_aud_changed or None,
        )
        return result
    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=GUEST_VISIT_WORKFLOW_EXECUTED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    except (LookupError, ValueError) as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_WORKFLOW_EXECUTED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_workflow_failed", failure_reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "guest_workflow_failed", "message": str(exc)},
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=GUEST_VISIT_WORKFLOW_EXECUTED, tenant_id=tenant_id,
            current_user=current_user, resource_type="guest_visit", resource_id=guest_visit_id,
            event_status="FAILURE", failure_code="guest_workflow_failed", failure_reason="Database error during guest workflow.",
        )
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

def list_cancelled_guest_visits(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> CancelledGuestVisitResponse:

    role = (
        current_user.get("role_name")
        or current_user.get("role")
        or ""
    ).upper()

    created_by_user_id = None

    if role != "TENANT_ADMIN":
        created_by_user_id = _current_user_id(current_user)

    rows = fetch_cancelled_guest_visits(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        created_by_user_id=created_by_user_id,
    )

    return CancelledGuestVisitResponse(
        items=[
            CancelledGuestVisitItem(**row)
            for row in rows
        ]
    )
