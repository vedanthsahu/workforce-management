"""CSRF protection for cookie-authenticated state-changing requests.

Fixes audit finding S-02: six routes accept a CORS "simple request" (no
preflight, no custom header required), which means a cross-site page can
trigger them while the browser automatically attaches the auth cookie
(``SameSite=None``). This middleware closes that gap without touching
cookie settings or breaking the cross-origin SSO flow: it rejects any
mutating request whose ``Origin`` (falling back to ``Referer``) is present
and not one of the configured frontend origins. Requests with no
Origin/Referer header at all (same-origin browser requests, and all
non-browser clients) are left untouched.
"""

from collections.abc import Awaitable, Callable
from urllib.parse import urlparse

from fastapi import Request, Response
from fastapi.responses import JSONResponse

_UNSAFE_METHODS = {"POST", "PATCH", "PUT", "DELETE"}


def _origin_from_referer(referer: str) -> str | None:
    parsed = urlparse(referer)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


async def enforce_same_origin_for_mutations(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    if request.method in _UNSAFE_METHODS:
        origin = request.headers.get("origin")
        if origin is None:
            referer = request.headers.get("referer")
            origin = _origin_from_referer(referer) if referer else None

        if origin is not None and origin not in request.app.state.cors_allowed_origins:
            return JSONResponse(
                status_code=403,
                content={"detail": "Cross-origin request rejected."},
            )

    return await call_next(request)
