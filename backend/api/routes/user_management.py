from __future__ import annotations

from typing import Any, Annotated

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import (
    get_current_user,
    require_any_permission,
    require_permission,
)
from backend.db.connection import get_db
from backend.schemas.auth import UserResponse
from backend.schemas.user_management import (
    AdminUserAccessUpdateRequest,
    AdminDirectoryRole,
    AdminDirectoryStatus,
    UserDetailsResponse,
    AdminUserDirectoryResponse,
    UpdateMyProfileRequest,
    UserBookingHistoryResponse,
)
from backend.services.user_management_service import (
    admin_update_user_access_service,
    get_user_booking_history,
    get_user_by_id_service,
    get_admin_user_directory,
    update_my_profile,
)
from fastapi import Query

from backend.schemas.user_management import (
    UserSearchResponse,
)
from backend.services.user_management_service import (
    search_user_profiles,
)

router = APIRouter(tags=["user-management"])


@router.get(
    "/admin/users",
    response_model=AdminUserDirectoryResponse,
)
def admin_user_directory(
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view", "users:view", "user:view"])),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
    role: str | None = Query(default=None),
    roles: list[str] | None = Query(default=None),
    status: AdminDirectoryStatus | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1, le=100),
) -> AdminUserDirectoryResponse:

    return get_admin_user_directory(
        conn,
        current_user=current_user,
        role_name=role,
        role_names=roles,
        user_status=status,
        page=page,
        limit=limit,
    )


@router.get(
    "/users",
    response_model=list[UserSearchResponse],
)
def search_users(
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    include_inactive: bool = Query(False),
) -> list[UserSearchResponse]:

    return search_user_profiles(
        conn,
        current_user=current_user,
        search_text=q,
        include_inactive=include_inactive,
        limit=limit,
    )

@router.patch(
    "/users/me",
    response_model=UserResponse,
)
def update_profile(
    payload: UpdateMyProfileRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> UserResponse:

    return update_my_profile(
        conn,
        current_user=current_user,
        payload=payload,
    )

@router.get(
    "/users/{user_id}",
    response_model=UserDetailsResponse,
)
def get_user_by_id(
    user_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(get_current_user),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> UserDetailsResponse:

    return get_user_by_id_service(
        conn,
        current_user=current_user,
        user_id=user_id,
    )


@router.get(
    "/users/{user_id}/bookings",
    response_model=UserBookingHistoryResponse,
)
def get_user_bookings(
    user_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_any_permission(["admin_dashboard:view", "users:view", "user:view", "teammate:view"])),
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
) -> UserBookingHistoryResponse:

    return get_user_booking_history(
        conn,
        current_user=current_user,
        user_id=user_id,
    )


@router.patch(
    "/admin/users/{user_id}/access",
    response_model=UserResponse,
)
def update_user_access(
    user_id: str,
    payload: AdminUserAccessUpdateRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("user:manage")),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> UserResponse:

    return admin_update_user_access_service(
        conn,
        current_user=current_user,
        target_user_id=user_id,
        payload=payload,
    )
