from __future__ import annotations

import logging
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass

from fastapi import BackgroundTasks
from psycopg2.extensions import connection as PGConnection

logger = logging.getLogger(__name__)

_request_user: ContextVar[dict | None] = ContextVar(
    "seatbook_request_user", default=None
)
_request_conn: ContextVar[PGConnection | None] = ContextVar(
    "seatbook_request_conn", default=None
)
_request_background_tasks: ContextVar[BackgroundTasks | None] = ContextVar(
    "seatbook_request_background_tasks", default=None
)


@dataclass(frozen=True)
class SeatBookIdentity:
    user_id: str
    tenant_id: str
    display_name: str


def current_seatbook_user() -> dict | None:
    """The full current_user dict for this request -- same shape every
    other route in the app gets from get_current_user, not a trimmed-down
    identity. seat_backend_api_service reads this (and current_request_conn)
    to call the main app's own service functions directly, in process."""
    return _request_user.get()


def current_seatbook_identity() -> SeatBookIdentity | None:
    user = current_seatbook_user() or {}
    user_id = str(user.get("user_id") or "").strip()
    tenant_id = str(user.get("tenant_id") or "").strip()
    display_name = str(
        user.get("display_name")
        or user.get("full_name")
        or user.get("email")
        or ""
    ).strip()
    if not user_id or not tenant_id or not display_name:
        return None
    return SeatBookIdentity(
        user_id=user_id, tenant_id=tenant_id, display_name=display_name
    )


def current_request_conn() -> PGConnection | None:
    """The request's single shared DB connection -- same one the route
    handler got from get_db, passed through so the chatbot's internal
    service calls never open a second one."""
    return _request_conn.get()


def current_request_background_tasks() -> BackgroundTasks | None:
    return _request_background_tasks.get()


@contextmanager
def seatbook_identity(
    current_user: dict,
    conn: PGConnection,
    background_tasks: BackgroundTasks | None = None,
):
    """Bind the authenticated user, DB connection, and background-task queue
    to one chatbot request.

    This used to mint a short-lived JWT and open an httpx client so the
    chatbot could call back into this same application over real HTTP
    (same process, same Lambda) just to act as the authenticated user. That
    network round-trip is gone -- seat_backend_api_service now calls the
    main app's service functions directly, using the context this binds.
    """
    user_marker = _request_user.set(current_user)
    conn_marker = _request_conn.set(conn)
    bg_marker = _request_background_tasks.set(background_tasks)
    try:
        yield
    finally:
        _request_user.reset(user_marker)
        _request_conn.reset(conn_marker)
        _request_background_tasks.reset(bg_marker)
