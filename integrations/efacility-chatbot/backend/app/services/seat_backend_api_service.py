from __future__ import annotations

import json
import logging
import os
from pathlib import Path
import time
from typing import Any, Optional

import httpx

from app.config import settings
from app.deps.seatbook_auth import current_seatbook_client, current_seatbook_user
from app.middleware.request_id import request_id_ctx
from app.services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)

TOKEN_COOKIE_NAMES = ("access_token", "refresh_token", "session_token")


class SeatBackendApiService:
    """Client for the external seat-management backend.

    The published backend uses SSO cookies. Prefer setting
    SEAT_BACKEND_REFRESH_TOKEN, with access/session tokens optional. The legacy
    SEAT_BACKEND_AUTH_COOKIE string is still supported for backward
    compatibility.
    """

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._last_refresh_monotonic = 0.0
        self._me: Optional[dict[str, Any]] = None

    @property
    def enabled(self) -> bool:
        return bool(settings.ENABLE_SEAT_BACKEND_API and settings.SEAT_BACKEND_API_URL)

    async def list_sites(self) -> Optional[list[dict[str, Any]]]:
        payload = await self._request("GET", "/sites", params={"status": "ACTIVE", "limit": 100})
        return self._items(payload)

    async def list_buildings(self, site_id: int) -> Optional[list[dict[str, Any]]]:
        payload = await self._request(
            "GET",
            "/buildings",
            params={"site_id": site_id, "status": "ACTIVE", "limit": 100},
        )
        return self._items(payload)

    async def list_floors(self, building_id: int) -> Optional[list[dict[str, Any]]]:
        payload = await self._request(
            "GET",
            f"/buildings/{building_id}/floors",
            params={"status": "ACTIVE", "limit": 100},
        )
        return self._items(payload)

    async def preferences(self) -> Optional[dict[str, Any]]:
        payload = await self._request("GET", "/preferences")
        return payload if isinstance(payload, dict) else None

    async def me(self) -> Optional[dict[str, Any]]:
        request_user = current_seatbook_user()
        if request_user is not None:
            return request_user
        if self._me is not None:
            return self._me
        payload = await self._request("GET", "/auth/me")
        if isinstance(payload, dict):
            self._me = payload
            return payload
        return None

    async def user_id(self) -> Optional[int]:
        me = await self.me()
        if not me:
            return None
        value = self._find_first_key(me, {"user_id", "userId", "id"})
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    async def my_current_bookings(self) -> Optional[list[dict[str, Any]]]:
        payload = await self._request("GET", "/bookings/me/current")
        return self._items(payload)

    async def my_future_bookings(self, *, page: int = 1, limit: int = 20) -> Optional[tuple[list[dict[str, Any]], bool]]:
        payload = await self._request("GET", "/bookings/me/future", params={"page": page, "limit": limit})
        return self._paged_items(payload, limit)

    async def my_past_bookings(self, *, page: int = 1, limit: int = 20) -> Optional[tuple[list[dict[str, Any]], bool]]:
        payload = await self._request("GET", "/bookings/me/past", params={"page": page, "limit": limit})
        return self._paged_items(payload, limit)

    async def my_cancelled_bookings(self, *, page: int = 1, limit: int = 20) -> Optional[tuple[list[dict[str, Any]], bool]]:
        payload = await self._request("GET", "/bookings/me/cancelled", params={"page": page, "limit": limit})
        return self._paged_items(payload, limit)

    async def available_seats(
        self,
        *,
        floor_id: int,
        booking_date: str,
        amenity_ids: Optional[list[int]] = None,
        modify_booking_id: Optional[str] = None,
    ) -> Optional[list[dict[str, Any]]]:
        params: dict[str, Any] = {
            "start_date": booking_date,
            "end_date": booking_date,
            "calendar_mode": False,
        }
        user_id = await self.user_id()
        if user_id:
            params["booked_for_user_id"] = user_id
        if amenity_ids:
            params["amenity_ids"] = amenity_ids
        if modify_booking_id:
            params["modifyBookingId"] = modify_booking_id
        payload = await self._request("GET", f"/floors/{floor_id}/seats", params=params)
        return self._items(payload)

    async def create_booking(
        self,
        *,
        site_id: int,
        building_id: int,
        floor_id: int,
        seat_id: int,
        booking_date: str,
    ) -> Optional[dict[str, Any]]:
        payload = {
            "site_id": site_id,
            "building_id": building_id,
            "floor_id": floor_id,
            "seat_id": seat_id,
            "booking_date": booking_date,
        }
        user_id = await self.user_id()
        if user_id:
            payload["booked_for_user_id"] = user_id
        return await self._request(
            "POST",
            "/bookings",
            json=payload,
            expected_status={200, 201},
        )

    async def cancel_booking(self, booking_id: str, *, reason: str = "Cancelled from chatbot") -> Optional[dict[str, Any]]:
        return await self._request(
            "POST",
            f"/bookings/{booking_id}/cancel",
            json={"cancellation_reason": reason},
        )

    async def modify_booking(
        self,
        booking_id: str,
        *,
        site_id: int,
        building_id: int,
        floor_id: int,
        seat_id: int,
        booking_date: str,
    ) -> Optional[dict[str, Any]]:
        payload = {
            "site_id": site_id,
            "building_id": building_id,
            "floor_id": floor_id,
            "seat_id": seat_id,
            "booking_date": booking_date,
        }
        user_id = await self.user_id()
        if user_id:
            payload["booked_for_user_id"] = user_id
        return await self._request(
            "POST",
            f"/bookings/{booking_id}/modify",
            json=payload,
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict[str, Any]] = None,
        json: Optional[dict[str, Any]] = None,
        expected_status: set[int] = {200},
        retry_refresh: bool = True,
    ) -> Optional[Any]:
        if not self.enabled:
            return None

        started = time.monotonic()
        client = self._client_or_create()
        self._sync_configured_cookies(client)
        await self._refresh_if_due(client)
        try:
            response = await client.request(method, path, params=params, json=json)
        except httpx.HTTPError as exc:
            telemetry_service.record_seat_backend_call(
                method=method,
                path=path,
                params=params,
                elapsed_ms=(time.monotonic() - started) * 1000,
                ok=False,
                request_id=request_id_ctx.get(),
                error=str(exc),
            )
            logger.warning("Seat backend API call failed method=%s path=%s error=%s", method, path, exc)
            return None

        if response.status_code == 401 and retry_refresh:
            telemetry_service.record_seat_backend_call(
                method=method,
                path=path,
                params=params,
                status_code=response.status_code,
                elapsed_ms=(time.monotonic() - started) * 1000,
                ok=False,
                request_id=request_id_ctx.get(),
                payload_shape="auth_retry",
            )
            await self._refresh(client, force=True)
            return await self._request(
                method,
                path,
                params=params,
                json=json,
                expected_status=expected_status,
                retry_refresh=False,
            )

        if response.status_code not in expected_status:
            telemetry_service.record_seat_backend_call(
                method=method,
                path=path,
                params=params,
                status_code=response.status_code,
                elapsed_ms=(time.monotonic() - started) * 1000,
                ok=False,
                request_id=request_id_ctx.get(),
                payload_shape="unexpected_status",
            )
            logger.warning(
                "Seat backend API returned unexpected status method=%s path=%s status=%s body=%s",
                method,
                path,
                response.status_code,
                response.text[:500],
            )
            return None

        try:
            payload = response.json()
        except ValueError:
            telemetry_service.record_seat_backend_call(
                method=method,
                path=path,
                params=params,
                status_code=response.status_code,
                elapsed_ms=(time.monotonic() - started) * 1000,
                ok=False,
                request_id=request_id_ctx.get(),
                payload_shape="non_json",
            )
            logger.info(
                "Seat backend API response method=%s path=%s status=%s elapsed_ms=%s payload=non_json",
                method,
                path,
                response.status_code,
                round((time.monotonic() - started) * 1000, 2),
            )
            return None
        elapsed_ms = (time.monotonic() - started) * 1000
        payload_shape = self._payload_shape(payload)
        item_count = self._payload_item_count(payload)
        telemetry_service.record_seat_backend_call(
            method=method,
            path=path,
            params=params,
            status_code=response.status_code,
            elapsed_ms=elapsed_ms,
            ok=True,
            request_id=request_id_ctx.get(),
            payload_shape=payload_shape,
            item_count=item_count,
        )
        logger.info(
            "Seat backend API response method=%s path=%s status=%s elapsed_ms=%s payload=%s item_count=%s",
            method,
            path,
            response.status_code,
            round(elapsed_ms, 2),
            payload_shape,
            item_count,
        )
        return payload

    def _client_or_create(self) -> httpx.AsyncClient:
        request_client = current_seatbook_client()
        if request_client is not None:
            return request_client
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=str(settings.SEAT_BACKEND_API_URL).rstrip("/"),
                timeout=float(settings.SEAT_BACKEND_TIMEOUT_SECONDS or 10.0),
                headers={"Accept": "application/json"},
                cookies=self._configured_cookies(),
            )
        return self._client

    async def _refresh_if_due(self, client: httpx.AsyncClient):
        interval = max(60, int(settings.SEAT_BACKEND_REFRESH_INTERVAL_SECONDS or 840))
        if time.monotonic() - self._last_refresh_monotonic >= interval:
            await self._refresh(client)

    async def _refresh(self, client: httpx.AsyncClient, *, force: bool = False):
        if not self._configured_cookies() and not client.cookies:
            return
        try:
            response = await client.post("/auth/refresh")
        except httpx.HTTPError as exc:
            logger.warning("Seat backend token refresh failed: %s", exc)
            return
        if response.status_code == 200:
            self._last_refresh_monotonic = time.monotonic()
            self._me = None
            self._save_cached_cookies(client.cookies)
            return
        if force:
            logger.warning("Seat backend token refresh failed status=%s body=%s", response.status_code, response.text[:500])

    @staticmethod
    def _items(payload: Any) -> Optional[list[dict[str, Any]]]:
        if payload is None:
            return None
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            items = payload.get("items")
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]
        return None

    def _paged_items(self, payload: Any, limit: int) -> Optional[tuple[list[dict[str, Any]], bool]]:
        items = self._items(payload)
        if items is None:
            return None
        has_more = False
        if isinstance(payload, dict):
            pagination = payload.get("pagination") or {}
            page = int(pagination.get("page") or 1)
            total_pages = int(pagination.get("total_pages") or pagination.get("totalPages") or page)
            has_more = page < total_pages
        else:
            has_more = len(items) > limit
        return items[:limit], has_more

    @staticmethod
    def _parse_cookie_header(raw: str) -> dict[str, str]:
        cookies: dict[str, str] = {}
        for part in (raw or "").split(";"):
            if "=" not in part:
                continue
            name, value = part.split("=", 1)
            name = name.strip()
            value = value.strip()
            if name:
                cookies[name] = value
        return cookies

    def _configured_cookies(self) -> dict[str, str]:
        file_values = self._env_file_token_values()
        cookies = self._parse_cookie_header(
            file_values.get("SEAT_BACKEND_AUTH_COOKIE") or settings.SEAT_BACKEND_AUTH_COOKIE
        )
        explicit = {
            "access_token": file_values.get("SEAT_BACKEND_ACCESS_TOKEN") or settings.SEAT_BACKEND_ACCESS_TOKEN,
            "refresh_token": file_values.get("SEAT_BACKEND_REFRESH_TOKEN") or settings.SEAT_BACKEND_REFRESH_TOKEN,
            "session_token": file_values.get("SEAT_BACKEND_SESSION_TOKEN") or settings.SEAT_BACKEND_SESSION_TOKEN,
        }
        for name, value in explicit.items():
            if value:
                cookies[name] = value
        cached = self._cached_cookies()
        if cached and not self._env_file_is_newer_than_cache():
            cookies.update(cached)
        return cookies

    def _sync_configured_cookies(self, client: httpx.AsyncClient) -> None:
        for name, value in self._configured_cookies().items():
            if value:
                client.cookies.set(name, value)

    @staticmethod
    def _env_file_token_values() -> dict[str, str]:
        path = Path(".env")
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError:
            return {}
        wanted = {
            "SEAT_BACKEND_ACCESS_TOKEN",
            "SEAT_BACKEND_REFRESH_TOKEN",
            "SEAT_BACKEND_SESSION_TOKEN",
            "SEAT_BACKEND_AUTH_COOKIE",
        }
        values: dict[str, str] = {}
        for line in raw.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            key = key.strip()
            if key not in wanted:
                continue
            value = value.strip().strip("\"'")
            if value:
                values[key] = value
        return values

    def _cached_cookies(self) -> dict[str, str]:
        path = self._token_cache_path()
        if not path:
            return {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return {}
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Seat backend token cache could not be read: %s", exc)
            return {}
        if not isinstance(payload, dict):
            return {}
        raw_cookies = payload.get("cookies", payload)
        if not isinstance(raw_cookies, dict):
            return {}
        return {
            name: str(raw_cookies.get(name) or "")
            for name in TOKEN_COOKIE_NAMES
            if raw_cookies.get(name)
        }

    def _save_cached_cookies(self, cookies: httpx.Cookies) -> None:
        path = self._token_cache_path()
        if not path:
            return
        values = {
            name: value
            for name in TOKEN_COOKIE_NAMES
            for value in [self._cookie_value(cookies, name)]
            if value
        }
        if not values:
            return
        payload = {
            "updated_at_unix": int(time.time()),
            "cookies": values,
        }
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = path.with_suffix(path.suffix + ".tmp")
            tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            os.chmod(tmp_path, 0o600)
            os.replace(tmp_path, path)
        except OSError as exc:
            logger.warning("Seat backend token cache could not be saved: %s", exc)

    def _env_file_is_newer_than_cache(self) -> bool:
        cache_path = self._token_cache_path()
        if not cache_path:
            return False
        env_path = Path(".env")
        try:
            return env_path.stat().st_mtime > cache_path.stat().st_mtime
        except OSError:
            return False

    @staticmethod
    def _token_cache_path() -> Optional[Path]:
        raw_path = (settings.SEAT_BACKEND_TOKEN_CACHE_PATH or "").strip()
        if not raw_path:
            return None
        return Path(raw_path)

    @staticmethod
    def _cookie_value(cookies: httpx.Cookies, name: str) -> Optional[str]:
        value = None
        for cookie in cookies.jar:
            if cookie.name == name:
                value = cookie.value
        return value

    @staticmethod
    def _payload_shape(payload: Any) -> str:
        if isinstance(payload, list):
            return "list"
        if isinstance(payload, dict):
            return "dict:" + ",".join(sorted(str(key) for key in payload.keys())[:8])
        return type(payload).__name__

    @staticmethod
    def _payload_item_count(payload: Any) -> Optional[int]:
        if isinstance(payload, list):
            return len(payload)
        if isinstance(payload, dict):
            items = payload.get("items")
            if isinstance(items, list):
                return len(items)
        return None

    @classmethod
    def _find_first_key(cls, payload: Any, keys: set[str]) -> Optional[Any]:
        if isinstance(payload, dict):
            for key, value in payload.items():
                if key in keys:
                    return value
                nested = cls._find_first_key(value, keys)
                if nested is not None:
                    return nested
        elif isinstance(payload, list):
            for item in payload:
                nested = cls._find_first_key(item, keys)
                if nested is not None:
                    return nested
        return None


seat_backend_api_service = SeatBackendApiService()
