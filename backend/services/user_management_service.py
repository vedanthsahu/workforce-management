from __future__ import annotations

from datetime import date
from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.booking_repository import (
    fetch_all_confirmed_bookings_for_user,
)
from backend.repositories.location_repository import fetch_seat_amenity_names
from backend.repositories.token_repository import (
    record_auth_event,
    revoke_all_user_sessions,
)
from backend.repositories.user_repository import (
    admin_update_user_access,
    fetch_admin_user_directory,
    fetch_user_by_id,
    fetch_user_details_by_id,
    update_user_profile,
    search_users,
)
from backend.schemas.auth import UserResponse
from backend.schemas.booking import BookingResponse
from backend.schemas.user_management import (
    AdminDirectoryRole,
    UserDetailsResponse,
    AdminDirectoryStatus,
    AdminUserDirectoryResponse,
    UserBookingHistoryResponse,
    UserBookingsSummary,
)

ASSIGNABLE_ROLE_NAMES = {
    "EMPLOYEE",
    "MANAGER",
    "FACILITATOR",
    "FRONT_OFFICE",
}

# Targets holding one of these roles cannot have their role/status changed via
# admin_update_user_access_service, regardless of who the caller is — otherwise
# any TENANT_ADMIN could silently demote or deactivate another admin.
PROTECTED_TARGET_ROLE_NAMES = {
    "TENANT_ADMIN",
    "PRODUCT_ADMIN",
}

ADMIN_DIRECTORY_ROLES = {
    "EMPLOYEE",
    "MANAGER",
    "FACILITATOR",
    "FRONT_OFFICE",
    "TENANT_ADMIN",
    "FACILITATOR_GUEST_COORDINATOR",
}

ADMIN_DIRECTORY_STATUSES = {"ACTIVE", "INACTIVE", "LOCKED"}


def _current_user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("user_id") or current_user.get("id") or "")


def _user_role(user: dict[str, Any]) -> str:
    return str(user.get("role_name") or user.get("role") or "").strip().upper()


def _can_view_user_resource(
    *,
    current_user: dict[str, Any],
    target_user: dict[str, Any],
) -> bool:
    """Same delegation rule used for dashboards/bookings: self, TENANT_ADMIN,
    FACILITATOR, or the target's own MANAGER."""
    current_user_id = _current_user_id(current_user)

    if current_user_id == str(target_user.get("id") or target_user.get("user_id") or ""):
        return True

    role = _user_role(current_user)
    if role in {"TENANT_ADMIN", "FACILITATOR"}:
        return True

    return (
        role == "MANAGER"
        and str(target_user.get("manager_user_id") or "") == current_user_id
    )


def update_my_profile(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload,
) -> UserResponse:

    updated_user = update_user_profile(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
        full_name=payload.full_name,
        display_name=payload.display_name,
        mobile_phone=payload.mobile_phone,
        office_location=payload.office_location,
    )

    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "user_not_found",
                "message": "User not found.",
            },
        )

    conn.commit()

    return UserResponse(**updated_user)


def admin_update_user_access_service(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    target_user_id: str,
    payload,
) -> UserResponse:

    if str(current_user["user_id"]) == str(target_user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "self_modification_not_allowed",
                "message": "Users cannot modify their own access.",
            },
        )

    target_user = fetch_user_by_id(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "user_not_found",
                "message": "Target user not found.",
            },
        )

    if _user_role(target_user) in PROTECTED_TARGET_ROLE_NAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "protected_target_role",
                "message": "This user's access cannot be changed through this endpoint.",
            },
        )

    if payload.role_name and payload.role_name not in ASSIGNABLE_ROLE_NAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "protected_role",
                "message": "Requested role cannot be assigned.",
            },
        )

    updated_user = admin_update_user_access(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
        role_name=payload.role_name,
        status=payload.status,
    )

    revoke_all_user_sessions(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
    )

    record_auth_event(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=target_user_id,
        event_type="ACCESS_CHANGED",
    )

    conn.commit()

    return UserResponse(**updated_user)


def search_user_profiles(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    search_text: str,
    include_inactive: bool = False,
    limit: int = 20,
) -> list[dict[str, Any]]:

    return search_users(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        search_text=search_text,
        include_inactive=include_inactive,
        limit=limit,
    )


def get_admin_user_directory(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    role_name: AdminDirectoryRole | None = None,
    role_names: list[str] | None = None,
    user_status: AdminDirectoryStatus | None = None,
    page: int | None = None,
    limit: int | None = None,
) -> AdminUserDirectoryResponse:
    normalized_roles = _normalize_admin_directory_roles(
        role_name=role_name,
        role_names=role_names,
    )

    unsupported_roles = [
        role
        for role in normalized_roles
        if role not in ADMIN_DIRECTORY_ROLES
    ]
    if unsupported_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_user_role",
                "message": "role is not supported.",
            },
        )

    if user_status is not None and user_status not in ADMIN_DIRECTORY_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_user_status",
                "message": "status is not supported.",
            },
        )

    try:
        result = fetch_admin_user_directory(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            role_names=normalized_roles or None,
            status=user_status,
            page=page,
            limit=limit,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "admin_user_directory_failed",
                "message": "Failed to fetch admin user directory.",
            },
        ) from exc

    return AdminUserDirectoryResponse(**result)


def _normalize_admin_directory_roles(
    *,
    role_name: str | None,
    role_names: list[str] | None,
) -> list[str]:
    roles: list[str] = []
    if role_name is not None:
        roles.append(str(role_name))
    for raw_role in role_names or []:
        for part in str(raw_role).split(","):
            normalized = part.strip().upper()
            if normalized and normalized not in roles:
                roles.append(normalized)
    return roles

def get_user_by_id_service(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    user_id: str,
) -> UserDetailsResponse:

    user = fetch_user_details_by_id(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "user_not_found",
                "message": "User not found.",
            },
        )

    if not _can_view_user_resource(current_user=current_user, target_user=user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "user_view_forbidden",
                "message": "You are not allowed to view this user's details.",
            },
        )

    return UserDetailsResponse(**user)


def get_user_booking_history(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    user_id: str,
) -> UserBookingHistoryResponse:
    """Return one user's profile plus today's booking (if any) and history.

    `today_booking` is pulled out of the confirmed-booking list so the UI
    can render "today" state without scanning `bookings.items`; the same
    booking is not duplicated into `items`.
    """

    tenant_id = str(current_user["tenant_id"])

    user = fetch_user_details_by_id(
        conn,
        tenant_id=tenant_id,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "user_not_found",
                "message": "User not found.",
            },
        )

    if not _can_view_user_resource(current_user=current_user, target_user=user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "user_bookings_forbidden",
                "message": "You are not allowed to view this user's bookings.",
            },
        )

    bookings = fetch_all_confirmed_bookings_for_user(
        conn,
        tenant_id=tenant_id,
        user_id=user_id,
    )

    today = date.today()
    today_booking_row = next(
        (row for row in bookings if row.get("booking_date") == today),
        None,
    )
    other_rows = [row for row in bookings if row is not today_booking_row]

    if today_booking_row is not None and today_booking_row.get("seat_id"):
        amenity_names = fetch_seat_amenity_names(
            conn,
            tenant_id=tenant_id,
            seat_id=today_booking_row["seat_id"],
        )
        today_booking_row = {**today_booking_row, "amenities": amenity_names}

    return UserBookingHistoryResponse(
        user=UserDetailsResponse(**user),
        has_today_booking=today_booking_row is not None,
        today_booking=(
            BookingResponse(**today_booking_row)
            if today_booking_row is not None
            else None
        ),
        bookings=UserBookingsSummary(
            items=[BookingResponse(**row) for row in other_rows],
        ),
    )