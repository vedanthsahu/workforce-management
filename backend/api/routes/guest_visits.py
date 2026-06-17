"""Administrative guest visit routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.guest import CreateGuestVisitRequest, GuestVisitResponse
from backend.services.guest_service import create_guest_visit

from backend.api.deps import (
    get_current_user,
    require_permission,
)

from backend.services.guest_service import (
    list_guest_visits,
    guest_visit_check_in,
    guest_visit_check_out,
)

from backend.schemas.guest import (
    GuestVisitListResponse,
    GuestVisitStatusUpdateResponse,
)


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


@router.get(
    "",
    response_model=GuestVisitListResponse,
)
def get_guest_visits(
    visit_scope: str = "CURRENT",
    site_id: str | None = None,
    visit_status: str | None = None,
    requires_seat: bool | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:view_visits"))
    ] = None,
    conn: Annotated[PGConnection, Depends(get_db)] = None,
):
    return list_guest_visits(
        conn,
        current_user=current_user,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
        limit=limit,
        offset=offset,
    )

@router.post(
    "/{guest_visit_id}/check-in",
    response_model=GuestVisitStatusUpdateResponse,
)
def check_in_visit(
    guest_visit_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:check_in"))
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
):
    return guest_visit_check_in(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
    )

@router.post(
    "/{guest_visit_id}/check-out",
    response_model=GuestVisitStatusUpdateResponse,
)
def check_out_visit(
    guest_visit_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:check_out"))
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
):
    return guest_visit_check_out(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
    )

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
