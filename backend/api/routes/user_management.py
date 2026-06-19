from __future__ import annotations

from typing import Any, Annotated

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import (
    get_current_user,
    require_permission,
)
from backend.db.connection import get_db
from backend.schemas.auth import UserResponse
from backend.schemas.user_management import (
    AdminUserAccessUpdateRequest,
    UpdateMyProfileRequest,
)
from backend.services.user_management_service import (
    admin_update_user_access_service,
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
) -> list[UserSearchResponse]:

    return search_user_profiles(
        conn,
        current_user=current_user,
        search_text=q,
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