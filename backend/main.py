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
from time import perf_counter
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes.dashboard import router as dashboard_router
from backend.api.routes.auth import router as auth_router
from backend.api.routes.bookings import router as bookings_router
from backend.api.routes.locations import router as locations_router
from backend.api.routes.sso import router as sso_router
from backend.core.config import get_settings
from backend.core.logging import (
    LOGGER_NAME,
    configure_console_logging,
    enable_backend_function_trace,
)
from backend.db.connection import get_db_connection
from backend.repositories.token_repository import (
    ensure_refresh_tokens_table,
    ensure_sessions_table,
    purge_expired_refresh_tokens,
    purge_expired_sessions,
)
from backend.api.routes import teams
from backend.api.routes.preferences import router as preferences_router
from backend.api.routes.admin_dashboard import router as admin_dashboard_router
from backend.api.routes.floor_layouts import router as floor_layout_router

settings = get_settings()
configure_console_logging(
    "DEBUG" if settings.app_trace_functions else settings.app_log_level,
)
if settings.app_trace_functions:
    enable_backend_function_trace()

request_logger = logging.getLogger(f"{LOGGER_NAME}.requests")

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
app.include_router(locations_router)
app.include_router(teams.router)
app.include_router(dashboard_router)
app.include_router(admin_dashboard_router)
app.include_router(preferences_router)
app.include_router(floor_layout_router)


@app.middleware("http")
async def log_http_requests(request: Request, call_next):
    """Log every HTTP request to the command window."""
    request_id = uuid4().hex[:8]
    started_at = perf_counter()
    method = request.method
    path = request.url.path
    query = _safe_query_string(request)
    client = request.client.host if request.client else "-"

    request_logger.info(
        "request.start id=%s method=%s path=%s query=%s client=%s",
        request_id,
        method,
        path,
        query,
        client,
    )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - started_at) * 1000
        request_logger.exception(
            "request.error id=%s method=%s path=%s endpoint=%s duration_ms=%.2f",
            request_id,
            method,
            path,
            _endpoint_name(request),
            duration_ms,
        )
        raise

    duration_ms = (perf_counter() - started_at) * 1000
    tenant_id, user_id = _request_identity(request)
    request_logger.info(
        (
            "request.end id=%s method=%s path=%s endpoint=%s "
            "status=%s duration_ms=%.2f tenant_id=%s user_id=%s"
        ),
        request_id,
        method,
        path,
        _endpoint_name(request),
        response.status_code,
        duration_ms,
        tenant_id,
        user_id,
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Convert FastAPI HTTP exceptions into a consistent error envelope.

    Args:
        _: Incoming request object provided by FastAPI. The handler does not
            inspect the request because the response depends only on the raised
            exception.
        exc: The ``HTTPException`` raised by route handlers or dependencies.
            Its ``status_code``, optional headers, and ``detail`` payload are
            preserved and normalized for clients.

    Returns:
        JSONResponse: A response whose body follows the service-wide
        ``{"error": ...}`` structure expected by frontend and API consumers.

    Side Effects:
        None beyond generating the outgoing HTTP response.

    Failure Modes:
        Any unexpected failure would come from response serialization or from
        invalid exception detail values that cannot be coerced to strings.
    """
    payload = _normalize_http_error(exc.detail)
    error = payload.get("error", {})
    request_logger.warning(
        (
            "request.http_exception method=%s path=%s endpoint=%s "
            "status=%s code=%s message=%s"
        ),
        request.method,
        request.url.path,
        _endpoint_name(request),
        exc.status_code,
        error.get("code", "-") if isinstance(error, dict) else "-",
        error.get("message", "-") if isinstance(error, dict) else "-",
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
            "GET /bookings/available",
            "GET /sites",
            "GET /buildings?site_id={site_id}",
            "GET /offices/{office_id}/floors",
            "GET /floors/{floor_id}/seats",
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


if __name__ == "__main__":
    import uvicorn

    # Local execution path for development; production deployments typically
    # start the ASGI app through a dedicated process manager instead.
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
