"""FastAPI application entrypoint for the seat management backend.

This module assembles the HTTP application used by the backend service. It is
responsible for loading runtime configuration, configuring cross-origin access
for the frontend client, registering route groups, normalizing HTTP error
payloads, and performing startup-time database maintenance required by the
authentication and SSO flows.

Key dependencies include FastAPI for request handling, the shared settings
loader for environment-backed configuration, the database connection factory,
and repository helpers that keep authentication-related tables in sync with the
expectations of the API layer.
"""

import logging
import threading
from time import perf_counter
from typing import Any
from uuid import uuid4

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from structlog.contextvars import bind_contextvars, clear_contextvars

from backend.api.routes import teams
from backend.api.routes.admin_audit import router as admin_audit_router
from backend.api.routes.admin_bookings import router as admin_bookings_router
from backend.api.routes.admin_dashboard import router as admin_dashboard_router
from backend.api.routes.auth import router as auth_router
from backend.api.routes.bookings import router as bookings_router
from backend.api.routes.dashboard import router as dashboard_router
from backend.api.routes.floor_layouts import router as floor_layout_router
from backend.api.routes.guest_bookings import router as guest_bookings_router
from backend.api.routes.guest_visits import router as guest_visits_router
from backend.api.routes.groups import router as groups_router
from backend.api.routes.groups import user_groups_router
from backend.api.routes.roles import router as roles_router
from backend.api.routes.guests import router as guests_router
from backend.api.routes.locations import router as locations_router
from backend.api.routes.preferences import router as preferences_router
from backend.api.routes.sso import router as sso_router
from backend.api.routes.user_management import router as user_management_router
from backend.core.app_logging import (
    LOGGER_NAME,
    configure_logging,
    enable_backend_function_trace,
)
from backend.core.config import get_settings
from backend.db.connection import get_db_connection
from backend.repositories.token_repository import (
    ensure_refresh_tokens_table,
    ensure_sessions_table,
    purge_expired_refresh_tokens,
    purge_expired_sessions,
)
from backend.services.auth_service import (
    sync_department_teams,
    sync_graph_managed_roles,
)

settings = get_settings()
configure_logging(
    "DEBUG" if settings.app_trace_functions else settings.app_log_level,
)
if settings.app_trace_functions:
    enable_backend_function_trace()

_req_log = structlog.get_logger("requests")
graph_role_sync_logger = logging.getLogger(f"{LOGGER_NAME}.graph_role_sync")
_graph_role_sync_stop = threading.Event()
_graph_role_sync_thread: threading.Thread | None = None

graph_team_sync_logger = logging.getLogger(f"{LOGGER_NAME}.graph_team_sync")
_graph_team_sync_stop = threading.Event()
_graph_team_sync_thread: threading.Thread | None = None

# The application exposes a single frontend origin and composes feature routers
# from the authentication, SSO, booking, and location modules.
app = FastAPI(title="Seat Management Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(sso_router)
app.include_router(bookings_router)
app.include_router(guests_router)
app.include_router(groups_router)
app.include_router(user_groups_router)
app.include_router(roles_router)
app.include_router(guest_visits_router)
app.include_router(guest_bookings_router)
app.include_router(locations_router)
app.include_router(teams.router)
app.include_router(dashboard_router)
app.include_router(admin_dashboard_router)
app.include_router(admin_bookings_router)
app.include_router(admin_audit_router)
app.include_router(preferences_router)
app.include_router(floor_layout_router)
app.include_router(user_management_router)


@app.middleware("http")
async def log_http_requests(request: Request, call_next):
    # Bind request_id to structlog context — every log emitted anywhere
    # during this request automatically carries it, with zero per-call effort.
    clear_contextvars()
    request_id = uuid4().hex[:8]
    method = request.method
    path = request.url.path
    client_ip = request.client.host if request.client else None
    correlation_id = (
        request.headers.get("x-correlation-id")
        or request.headers.get("x-request-id")
        or None
    )
    user_agent = request.headers.get("user-agent")
    bind_contextvars(
        request_id=request_id,
        request_method=method,
        request_path=path,
        source_channel=_detect_source_channel(request),
        correlation_id=correlation_id,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    started_at = perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        _req_log.error(
            "request.error",
            method=method,
            path=path,
            duration_ms=duration_ms,
            client=client_ip,
            exc_info=True,
        )
        raise

    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    tenant_id, user_id = _request_identity(request)
    status_code = response.status_code

    log_fields: dict[str, Any] = dict(
        method=method,
        path=path,
        query=_safe_query_string(request),
        status=status_code,
        duration_ms=duration_ms,
        tenant_id=tenant_id,
        user_id=user_id,
        client=client_ip,
    )

    if status_code >= 500:
        _req_log.error("request.complete", **log_fields)
    elif status_code == 403:
        _req_log.warning("request.complete", **log_fields)
    else:
        _req_log.info("request.complete", **log_fields)

    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Convert FastAPI HTTP exceptions into a consistent error envelope."""
    payload = _normalize_http_error(exc.detail)
    error = payload.get("error", {})

    # request_id is already in structlog context from the middleware above,
    # so it appears in this log entry automatically.
    _req_log.warning(
        "request.http_exception",
        method=request.method,
        path=request.url.path,
        status=exc.status_code,
        error_code=error.get("code") if isinstance(error, dict) else None,
        error_message=error.get("message") if isinstance(error, dict) else None,
    )

    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content=payload,
    )


@app.on_event("startup")
def startup() -> None:
    """Prepare database state required before the API starts serving traffic.

    The startup hook ensures authentication session tables exist and removes
    expired authentication artifacts left from previous runs.

    Returns:
        None.

    Side Effects:
        Opens a database connection, executes DDL and DML statements, deletes
        expired session and refresh-token records, and commits the transaction.

    Failure Modes:
        Propagates database connectivity, SQL execution, or commit errors. Any
        such failure prevents the FastAPI application from finishing startup.
    """
    with get_db_connection() as conn:
        ensure_refresh_tokens_table(conn)
        ensure_sessions_table(conn)
        # Startup opportunistically clears expired auth state so later request
        # handling does not rely on background cleanup infrastructure.
        purge_expired_refresh_tokens(conn)
        purge_expired_sessions(conn, settings.session_ttl)
        conn.commit()
    _start_graph_role_sync_scheduler()
    _start_graph_team_sync_scheduler()


@app.on_event("shutdown")
def shutdown() -> None:
    """Stop optional background workers before process shutdown."""
    _stop_graph_role_sync_scheduler()
    _stop_graph_team_sync_scheduler()


@app.get("/")
def index() -> dict[str, object]:
    """Expose a lightweight service descriptor for operators and developers.

    Returns:
        dict[str, object]: Static metadata describing the service name,
        documentation location, and the major public endpoints currently
        mounted on the application.

    Side Effects:
        None.

    Failure Modes:
        None expected under normal runtime conditions because the response is a
        static in-memory structure.
    """
    return {
        "service": "seat-management-backend",
        "docs": "/docs",
        "endpoints": [
            "GET /auth/login",
            "GET /auth/callback",
            "POST /auth/refresh",
            "GET /auth/me",
            "GET /graph/me",
            "GET /graph/groups",
            "GET /graph/manager",
            "POST /bookings",
            "GET /bookings/me/past",
            "GET /bookings/me/current",
            "GET /bookings/me/future",
            "GET /bookings/me/cancelled",
            "POST /guests",
            "GET /guests?q={search}",
            "POST /guest-visits",
            "POST /guest-bookings",
            "GET /guest-bookings",
            "GET /sites",
            "POST /sites",
            "PATCH /sites/{site_id}",
            "GET /buildings?site_id={site_id}",
            "POST /buildings",
            "PATCH /buildings/{building_id}",
            "GET /offices/{office_id}/floors",
            "POST /floors",
            "PATCH /floors/{floor_id}",
            "GET /floors/{floor_id}/seats",
            "PATCH /seats/{seat_id}/configuration",
            "GET /amenities",
            "POST /amenities",
            "PATCH /amenities/{amenity_id}",
            "GET /health",
        ],
    }


@app.get("/health")
def health() -> dict[str, str]:
    """Report a minimal liveness signal for health checks.

    Returns:
        dict[str, str]: A static status payload indicating that the process is
        running and able to serve requests.

    Side Effects:
        None.

    Failure Modes:
        None expected because no external dependencies are consulted here.
    """
    return {"status": "ok"}


def _detect_source_channel(request: Request) -> str:
    explicit = request.headers.get("x-source-channel", "").strip().upper()
    if explicit in {"WEB", "MOBILE", "API", "SYSTEM", "IMPORT"}:
        return explicit

    ua = (request.headers.get("user-agent") or "").lower()

    if not ua:
        return "API"

    if any(token in ua for token in ("okhttp", "dart", "cfnetwork", "nsurlsession")):
        return "MOBILE"

    if any(token in ua for token in ("mozilla", "webkit", "gecko", "opera")):
        return "WEB"

    return "API"


def _normalize_http_error(detail: Any) -> dict[str, Any]:
    """Normalize arbitrary HTTP error details into the API error contract.

    Args:
        detail: Exception detail provided to ``HTTPException``. This may be a
            plain string, a dictionary supplied by internal code, or another
            value that can be stringified for the response body.

    Returns:
        dict[str, Any]: A dictionary containing an ``error`` object with a
        stable ``code`` and ``message`` field, plus optional ``details`` for
        extra structured metadata.

    Side Effects:
        None.

    Failure Modes:
        None intentionally raised by this helper. Non-dictionary values are
        stringified defensively so callers can pass through varied error types.
    """
    if isinstance(detail, dict):
        if "error" in detail and isinstance(detail["error"], dict):
            # Preserve already-normalized payloads so deeper layers can control
            # the exact public error contract when needed.
            return detail

        payload: dict[str, Any] = {
            "error": {
                "code": str(detail.get("code") or "http_error"),
                "message": str(detail.get("message") or detail.get("detail") or "Request failed."),
            }
        }
        extra = {
            key: value
            for key, value in detail.items()
            if key not in {"code", "message", "detail"}
        }
        if extra:
            # Attach remaining structured fields without promoting them to the
            # top level of the response body.
            payload["error"]["details"] = extra
        return payload

    return {
        "error": {
            "code": "http_error",
            "message": str(detail),
        }
    }


def _endpoint_name(request: Request) -> str:
    endpoint = request.scope.get("endpoint")
    if endpoint is None:
        return "-"
    module_name = getattr(endpoint, "__module__", "")
    function_name = getattr(endpoint, "__name__", str(endpoint))
    return f"{module_name}.{function_name}" if module_name else function_name


def _request_identity(request: Request) -> tuple[str, str]:
    current_user = getattr(request.state, "current_user", None)
    if isinstance(current_user, dict):
        return (
            str(current_user.get("tenant_id") or "-"),
            str(current_user.get("user_id") or "-"),
        )

    auth_claims = getattr(request.state, "auth_claims", None)
    if isinstance(auth_claims, dict):
        return (
            str(auth_claims.get("tenant_id") or "-"),
            str(auth_claims.get("user_id") or auth_claims.get("sub") or "-"),
        )

    return "-", "-"


def _safe_query_string(request: Request) -> str:
    if not request.query_params:
        return "-"

    sensitive_fragments = {
        "authorization",
        "code",
        "cookie",
        "password",
        "secret",
        "state",
        "token",
    }
    parts: list[str] = []
    for key, value in request.query_params.multi_items():
        normalized_key = key.lower()
        safe_value = (
            "<redacted>"
            if any(fragment in normalized_key for fragment in sensitive_fragments)
            else value
        )
        parts.append(f"{key}={safe_value}")

    query_string = "&".join(parts)
    if len(query_string) > 500:
        return f"{query_string[:500]}..."
    return query_string


def _start_graph_role_sync_scheduler() -> None:
    global _graph_role_sync_thread
    if not settings.graph_role_sync_enabled:
        return
    if _graph_role_sync_thread and _graph_role_sync_thread.is_alive():
        return

    _graph_role_sync_stop.clear()
    _graph_role_sync_thread = threading.Thread(
        target=_graph_role_sync_loop,
        name="graph-role-sync",
        daemon=True,
    )
    _graph_role_sync_thread.start()


def _stop_graph_role_sync_scheduler() -> None:
    if _graph_role_sync_thread is None:
        return
    _graph_role_sync_stop.set()
    _graph_role_sync_thread.join(timeout=5)


def _graph_role_sync_loop() -> None:
    interval_seconds = settings.graph_role_sync_interval_minutes * 60
    while not _graph_role_sync_stop.is_set():
        try:
            with get_db_connection() as conn:
                result = sync_graph_managed_roles(conn)
            graph_role_sync_logger.info(
                (
                    "graph_role_sync.complete scanned=%s changed=%s "
                    "promoted=%s demoted=%s"
                ),
                result.scanned_users,
                result.changed_users,
                result.promoted_users,
                result.demoted_users,
            )
        except Exception:
            graph_role_sync_logger.exception("graph_role_sync.failed")

        if _graph_role_sync_stop.wait(interval_seconds):
            break


def _start_graph_team_sync_scheduler() -> None:
    global _graph_team_sync_thread
    if not settings.graph_team_sync_enabled:
        return
    if _graph_team_sync_thread and _graph_team_sync_thread.is_alive():
        return

    _graph_team_sync_stop.clear()
    _graph_team_sync_thread = threading.Thread(
        target=_graph_team_sync_loop,
        name="graph-team-sync",
        daemon=True,
    )
    _graph_team_sync_thread.start()


def _stop_graph_team_sync_scheduler() -> None:
    if _graph_team_sync_thread is None:
        return
    _graph_team_sync_stop.set()
    _graph_team_sync_thread.join(timeout=5)


def _graph_team_sync_loop() -> None:
    interval_seconds = settings.graph_team_sync_interval_minutes * 60
    while not _graph_team_sync_stop.is_set():
        try:
            with get_db_connection() as conn:
                result = sync_department_teams(conn)
            graph_team_sync_logger.info(
                "graph_team_sync.complete scanned=%s changed=%s",
                result.scanned_users,
                result.changed_users,
            )
        except Exception:
            graph_team_sync_logger.exception("graph_team_sync.failed")

        if _graph_team_sync_stop.wait(interval_seconds):
            break


if __name__ == "__main__":
    import uvicorn

    # Local execution path for development; production deployments typically
    # start the ASGI app through a dedicated process manager instead.
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
