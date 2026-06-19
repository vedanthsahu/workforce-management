"""Administrative guest profile routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.guest import CreateGuestRequest, GuestResponse
from backend.services.guest_service import (
    create_guest_profile,
    get_guest_profile,
    search_guest_profiles,
)

router = APIRouter(prefix="/guests", tags=["guests"])


@router.get("", response_model=list[GuestResponse])
def search_guest_records(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    q: Annotated[str, Query(min_length=1)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[GuestResponse]:
    return search_guest_profiles(
        conn,
        current_user=current_user,
        search_text=q,
        limit=limit,
    )


@router.post(
    "",
    response_model=GuestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest_record(
    payload: CreateGuestRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GuestResponse:
    return create_guest_profile(
        conn,
        current_user=current_user,
        payload=payload,
    )


@router.get("/{guest_id}", response_model=GuestResponse)
def fetch_guest_record(
    guest_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GuestResponse:
    return get_guest_profile(
        conn,
        current_user=current_user,
        guest_id=str(guest_id),
    )
