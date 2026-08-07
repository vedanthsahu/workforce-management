from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from typing import AsyncIterator

import httpx
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_request_client: ContextVar[httpx.AsyncClient | None] = ContextVar(
    "seatbook_request_client", default=None
)
_request_user: ContextVar[dict | None] = ContextVar(
    "seatbook_request_user", default=None
)
_request_token: ContextVar[str | None] = ContextVar(
    "seatbook_request_token", default=None
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
        client = httpx.AsyncClient(
            base_url=str(settings.SEAT_BACKEND_API_URL).rstrip("/"),
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


async def require_seatbook_identity(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> AsyncIterator[SeatBookIdentity]:
    if credentials is None or credentials.scheme.lower() != "bearer":
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
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="SeatBook authentication is temporarily unavailable.",
                )
            response = await client.get("/auth/me")
            if response.status_code != 200:
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
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SeatBook returned an incomplete authenticated identity.",
            )

        user_token = _request_user.set(user)
        try:
            yield SeatBookIdentity(
                user_id=user_id,
                tenant_id=tenant_id,
                display_name=display_name,
            )
        finally:
            _request_user.reset(user_token)
    except httpx.HTTPError as exc:
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
