from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.chatbot.config import settings

logger = logging.getLogger(__name__)

_request_client: ContextVar[httpx.AsyncClient | None] = ContextVar(
    "seatbook_request_client", default=None
)
_request_user: ContextVar[dict | None] = ContextVar(
    "seatbook_request_user", default=None
)
_request_token: ContextVar[str | None] = ContextVar(
    "seatbook_request_token", default=None
)
_request_base_url: ContextVar[str | None] = ContextVar(
    "seatbook_request_base_url", default=None
)
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class SeatBookIdentity:
    user_id: str
    tenant_id: str
    display_name: str


def current_seatbook_client() -> httpx.AsyncClient | None:
    client = _request_client.get()
    token = _request_token.get()
    if client is None and token:
        resolved_base_url = (
            _request_base_url.get() or str(settings.SEAT_BACKEND_API_URL)
        ).rstrip("/")
        client = httpx.AsyncClient(
            base_url=resolved_base_url,
            timeout=float(settings.SEAT_BACKEND_TIMEOUT_SECONDS or 10.0),
            trust_env=settings.SEAT_BACKEND_TRUST_ENV,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )
        _request_client.set(client)
    return client


def current_seatbook_user() -> dict | None:
    return _request_user.get()


def current_seatbook_identity() -> SeatBookIdentity | None:
    user = current_seatbook_user() or {}
    user_id = str(user.get("user_id") or "").strip()
    tenant_id = str(user.get("tenant_id") or "").strip()
    display_name = str(user.get("display_name") or "").strip()
    if not user_id or not tenant_id or not display_name:
        return None
    return SeatBookIdentity(
        user_id=user_id, tenant_id=tenant_id, display_name=display_name
    )


@asynccontextmanager
async def seatbook_identity(identity: SeatBookIdentity, *, base_url: str | None = None):
    """Bind an authenticated application user to one chatbot request."""
    if not settings.MAIN_APP_JWT_SECRET:
        raise RuntimeError("JWT_SECRET is required for chatbot identity binding")
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "user_id": identity.user_id,
            "sub": identity.user_id,
            "tenant_id": identity.tenant_id,
            "display_name": identity.display_name,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=5)).timestamp()),
        },
        settings.MAIN_APP_JWT_SECRET,
        algorithm=settings.MAIN_APP_JWT_ALGORITHM,
    )
    token_marker = _request_token.set(token)
    base_url_marker = _request_base_url.set(base_url)
    user_marker = _request_user.set(
        {
            "user_id": identity.user_id,
            "tenant_id": identity.tenant_id,
            "display_name": identity.display_name,
        }
    )
    _request_client.set(None)
    try:
        yield
    finally:
        client = _request_client.get()
        if client is not None:
            await client.aclose()
        _request_client.set(None)
        _request_user.reset(user_marker)
        _request_token.reset(token_marker)
        _request_base_url.reset(base_url_marker)


async def require_seatbook_identity(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> AsyncIterator[SeatBookIdentity]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        logger.warning("event=auth_rejected reason=missing_bearer_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A SeatBook chatbot token is required.",
        )

    request_token = _request_token.set(credentials.credentials)
    _request_client.set(None)
    try:
        if settings.MAIN_APP_JWT_SECRET:
            try:
                claims = jwt.decode(
                    credentials.credentials,
                    settings.MAIN_APP_JWT_SECRET,
                    algorithms=[settings.MAIN_APP_JWT_ALGORITHM],
                )
            except jwt.PyJWTError as exc:
                logger.warning(
                    "event=auth_rejected reason=invalid_local_token error_type=%s",
                    type(exc).__name__,
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="The SeatBook session is invalid or expired.",
                ) from exc
            user = {
                "user_id": claims.get("user_id") or claims.get("sub"),
                "tenant_id": claims.get("tenant_id"),
                "display_name": claims.get("display_name") or claims.get("email"),
                "email": claims.get("email"),
                "role": claims.get("role"),
            }
        else:
            client = current_seatbook_client()
            if client is None:
                logger.error("event=auth_failed reason=seatbook_client_unavailable")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="SeatBook authentication is temporarily unavailable.",
                )
            response = await client.get("/auth/me")
            if response.status_code != 200:
                logger.warning(
                    "event=auth_rejected reason=remote_validation_failed status_code=%s",
                    response.status_code,
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="The SeatBook session is invalid or expired.",
                )
            user = response.json()
        user_id = str(user.get("user_id") or "").strip()
        tenant_id = str(user.get("tenant_id") or "").strip()
        display_name = str(
            user.get("display_name")
            or user.get("full_name")
            or user.get("name")
            or user.get("email")
            or ""
        ).strip()
        if not user_id or not tenant_id or not display_name:
            logger.warning(
                "event=auth_rejected reason=incomplete_identity has_user_id=%s has_tenant_id=%s has_display_name=%s",
                bool(user_id),
                bool(tenant_id),
                bool(display_name),
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SeatBook returned an incomplete authenticated identity.",
            )

        user_token = _request_user.set(user)
        logger.info(
            "event=auth_accepted source=%s user_id=%s tenant_id=%s",
            "local_jwt" if settings.MAIN_APP_JWT_SECRET else "remote_auth_me",
            user_id,
            tenant_id,
        )
        try:
            yield SeatBookIdentity(
                user_id=user_id,
                tenant_id=tenant_id,
                display_name=display_name,
            )
        finally:
            _request_user.reset(user_token)
    except httpx.HTTPError as exc:
        logger.warning(
            "event=auth_failed reason=network_error error_type=%s",
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SeatBook authentication is temporarily unavailable.",
        ) from exc
    finally:
        client = _request_client.get()
        if client is not None:
            await client.aclose()
        _request_client.set(None)
        _request_token.reset(request_token)
