from typing import Any, Annotated
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.user_management import UserSearchResponse
from backend.services.team_service import get_my_team_overview, search_my_team_members

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/me")
def get_my_team(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    user_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    """If user_id is given, return only that teammate's entry; otherwise
    return the full (paginated) team member list."""
    return get_my_team_overview(
        conn,
        current_user=current_user,
        member_user_id=user_id,
        page=page,
        limit=limit,
    )


@router.get("/members/search", response_model=list[UserSearchResponse])
def search_team_members_route(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    include_inactive: bool = Query(False),
) -> list[UserSearchResponse]:
    """Search within the caller's own team(s) only -- same contract as
    GET /users, just scoped to teammates instead of the whole tenant."""
    return search_my_team_members(
        conn,
        current_user=current_user,
        search_text=q,
        include_inactive=include_inactive,
        limit=limit,
    )