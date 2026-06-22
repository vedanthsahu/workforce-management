"""Administrative guest visit routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.guest import CreateGuestVisitRequest, GuestVisitResponse,GuestVisitListItem, AttachSeatToGuestVisitRequest , CancelGuestVisitRequest
from backend.services.guest_service import create_guest_visit

from backend.api.deps import (
    get_current_user,
    require_permission,
)

from backend.services.guest_service import (
    list_guest_visits,
    guest_visit_check_in,
    attach_seat_to_guest_visit,
    get_guest_visit_details,    
    guest_visit_check_out,
    cancel_guest_visit_record,
    modify_guest_visit,
    create_booking_for_existing_guest_visit,
)

from backend.schemas.booking import BookingResponse

from backend.schemas.guest import (
    GuestVisitListResponse,
    GuestVisitStatusUpdateResponse,
    AttachSeatToGuestVisitRequest,
    ModifyGuestVisitRequest,
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
    "/{guest_visit_id}",
    response_model=GuestVisitListItem,
)
def get_guest_visit(
    guest_visit_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:view_visits"))
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
):
    return get_guest_visit_details(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
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


@router.post(
    "/{guest_visit_id}/book-seat",
    response_model=BookingResponse,
)
def book_seat_for_existing_guest_visit(
    guest_visit_id: str,
    payload: AttachSeatToGuestVisitRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("booking:book_for_guest"))
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
):
    return create_booking_for_existing_guest_visit(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
        payload=payload,
    )


@router.post(
    "/{guest_visit_id}/cancel",
    response_model=GuestVisitStatusUpdateResponse,
)
def cancel_visit(
    guest_visit_id: str,
    payload: CancelGuestVisitRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:manage"))
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
):

    return cancel_guest_visit_record(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
        cancellation_reason=payload.cancellation_reason,
    )


@router.patch(
    "/{guest_visit_id}",
    response_model=GuestVisitResponse,
)
def modify_visit(
    guest_visit_id: str,
    payload: ModifyGuestVisitRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:manage"))
    ],
    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],
):

    return modify_guest_visit(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
        payload=payload,
    )

