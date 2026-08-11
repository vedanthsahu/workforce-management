'''
Employee dashboard
'''
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.dashboard import DashboardMeResponse
from backend.services.dashboard_service import (
    get_dashboard_for_employee,
    get_dashboard_me,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/me", response_model=DashboardMeResponse)
def dashboard_me(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> DashboardMeResponse:
    return get_dashboard_me(
        conn,
        current_user=current_user,
    )


@router.get("/employee/{user_id}", response_model=DashboardMeResponse)
def dashboard_for_employee(
    user_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> DashboardMeResponse:
    """Same shape as GET /dashboard/me, but for a specific employee — used by a
    facilitator/admin/manager to pre-fill a delegated seat booking with that
    employee's saved work_preferences."""
    return get_dashboard_for_employee(
        conn,
        current_user=current_user,
        target_user_id=str(user_id),
    )