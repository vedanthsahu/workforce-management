"""Administrative guest visit routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import (
    get_current_user,
    require_permission,
)
from backend.db.connection import get_db
from backend.schemas.booking import BookingResponse
from backend.schemas.guest import (
    CreateGuestVisitRequest,
    GuestVisitListItem,
    GuestVisitListResponse,
    GuestVisitResponse,
    GuestVisitStatusUpdateResponse,
    GuestWorkflowRequest,
    GuestWorkflowResponse,
)
from backend.services.guest_service import (
    create_guest_visit,
    execute_guest_visit_workflow,
    get_guest_visit_details,
    guest_visit_check_in,
    guest_visit_check_out,
    list_guest_visits,
)

router = APIRouter(prefix="/guest-visits", tags=["guest-visits"])


@router.post(
    "",
    response_model=GuestVisitResponse | BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest_visit_record(
    payload: CreateGuestVisitRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GuestVisitResponse | BookingResponse:
    """seat_id absent on the payload -> visit only. seat_id present ->
    visit + booking, atomically (replaces the old POST /guest-bookings)."""
    return create_guest_visit(
        conn,
        current_user=current_user,
        payload=payload,
        background_tasks=background_tasks,
    )

# Future Scope API -- no caller today; kept for the planned admin/
# facilitator overseer view (look up one guest visit directly, e.g. from
# a user's or guest's profile), not dead code.
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
    "/{guest_visit_id}/workflow",
    response_model=GuestWorkflowResponse,
)
def guest_visit_workflow(
    guest_visit_id: str,
    payload: GuestWorkflowRequest,
    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("guest:manage")),
    ],
    conn: Annotated[PGConnection, Depends(get_db)],
):
    return execute_guest_visit_workflow(
        conn,
        current_user=current_user,
        guest_visit_id=guest_visit_id,
        payload=payload,
    )

