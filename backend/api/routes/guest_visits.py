"""Administrative guest visit routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import (
    require_permission,
)
from backend.db.connection import get_db
from backend.schemas.booking import BookingResponse
from backend.schemas.guest import (
    AttachSeatToGuestVisitRequest,
    CancelGuestVisitRequest,
    CreateGuestVisitRequest,
    GuestVisitListItem,
    GuestVisitListResponse,
    GuestVisitResponse,
    GuestVisitStatusUpdateResponse,
    GuestWorkflowRequest,
    GuestWorkflowResponse,
    ModifyGuestVisitRequest,
)
from backend.services.guest_service import (
    cancel_guest_visit_record,
    create_booking_for_existing_guest_visit,
    create_guest_visit,
    execute_guest_visit_workflow,
    get_guest_visit_details,
    guest_visit_check_in,
    guest_visit_check_out,
    list_guest_visits,
    modify_guest_visit,
)

router = APIRouter(prefix="/guest-visits", tags=["guest-visits"])


@router.post(
    "",
    response_model=GuestVisitResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest_visit_record(
    payload: CreateGuestVisitRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(require_permission("guest_visit:create"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GuestVisitResponse:
    return create_guest_visit(
        conn,
        current_user=current_user,
        payload=payload,
        background_tasks=background_tasks,
    )

@router.get(
    "/{guest_visit_id}",
    response_model=GuestVisitListItem,
)
def get_guest_visit(
    guest_visit_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest_visit:view"))
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
    response_model_exclude_none=True,
)
def get_guest_visits(
    visit_scope: str = "CURRENT",
    site_id: str | None = None,
    visit_status: str | None = None,
    requires_seat: bool | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    page: int | None = Query(default=None, ge=1),
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest_visit:view"))
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
        page=page,
    )

@router.post(
    "/{guest_visit_id}/check-in",
    response_model=GuestVisitStatusUpdateResponse,
)
def check_in_visit(
    guest_visit_id: str,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest_visit:check_in"))
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
        Depends(require_permission("guest_visit:check_out"))
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
        Depends(require_permission("booking:create_for_guest"))
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
    background_tasks: BackgroundTasks,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest_visit:cancel"))
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
        background_tasks=background_tasks,
    )


@router.patch(
    "/{guest_visit_id}",
    response_model=GuestVisitResponse,
)
def modify_visit(
    guest_visit_id: str,
    payload: ModifyGuestVisitRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest_visit:update"))
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
        background_tasks=background_tasks,
    )


@router.post(
    "/{guest_visit_id}/workflow",
    response_model=GuestWorkflowResponse,
)
def guest_visit_workflow(
    guest_visit_id: str,
    payload: GuestWorkflowRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest_visit:workflow")),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
):
    return execute_guest_visit_workflow(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
        payload=payload,
    )

