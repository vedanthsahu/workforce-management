from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        status_code = 500
        outcome = "error"
        try:
            response = await call_next(request)
            status_code = response.status_code
            outcome = "success" if status_code < 400 else "failure"
        except Exception as exc:
            logger.exception(
                "event=http_request_failed method=%s path=%s error_type=%s",
                request.method,
                request.url.path,
                type(exc).__name__,
            )
            raise
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "event=http_request method=%s path=%s status_code=%s outcome=%s elapsed_ms=%s",
                request.method,
                request.url.path,
                status_code,
                outcome,
                elapsed_ms,
            )
            request_id_ctx.reset(token)
        response.headers["X-Request-ID"] = request_id
        return response
