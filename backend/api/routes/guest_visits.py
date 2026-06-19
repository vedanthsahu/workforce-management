"""Administrative guest visit routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.guest import CreateGuestVisitRequest, GuestVisitResponse
from backend.services.guest_service import create_guest_visit

router = APIRouter(prefix="/guest-visits", tags=["guest-visits"])


@router.post(
    "",
    response_model=GuestVisitResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest_visit_record(
    payload: CreateGuestVisitRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GuestVisitResponse:
    return create_guest_visit(
        conn,
        current_user=current_user,
        payload=payload,
    )
