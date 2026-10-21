"""Booking-domain access for the chatbot.

This used to be an HTTP client calling back into this same application
(same process, same Lambda) over the network, authenticated with a
short-lived JWT minted just for that purpose. That round-trip is gone --
every method here now calls the main app's own service functions
directly, using the request's already-authenticated current_user and
already-open DB connection (bound by seatbook_identity, see
backend.chatbot.deps.seatbook_auth). Method names and signatures are
unchanged on purpose: chat_engine.py and entity_extractor.py call these
the same way they always did.
"""

from __future__ import annotations

import logging
import time
from datetime import date
from typing import Any

from fastapi import HTTPException

from backend.chatbot.config import settings
from backend.chatbot.deps.seatbook_auth import (
    current_request_background_tasks,
    current_request_conn,
    current_seatbook_user,
)
from backend.schemas.booking import CreateBookingRequest, ModifyBookingRequest
from backend.services.booking_service import (
    book_seat,
    cancel_booking_by_id,
    get_available_seats_by_range,
    get_user_cancelled_bookings,
    get_user_current_bookings,
    get_user_future_bookings,
    get_user_past_bookings,
)
from backend.services.booking_service import modify_booking as modify_booking_service
from backend.services.business_rule_service import resolve_booking_advance_days
from backend.services.dashboard_service import get_dashboard_me
from backend.services.location_service import (
    get_buildings_by_site,
    get_floors_by_building,
    get_sites,
)

logger = logging.getLogger(__name__)

LOCATION_CACHE_TTL_SECONDS = 300


class SeatBackendApiError(RuntimeError):
    """A structured business error from the booking domain -- same shape as
    before (status_code/code/message), now raised from an HTTPException
    caught at the boundary instead of an HTTP response parsed off the wire."""

    def __init__(self, *, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _as_seat_backend_error(exc: HTTPException) -> SeatBackendApiError:
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    return SeatBackendApiError(
        status_code=exc.status_code,
        code=str(detail.get("code") or "seat_backend_error"),
        message=str(detail.get("message") or "The seat booking request could not be completed."),
    )


class SeatBackendApiService:
    def __init__(self):
        self._past_bookings_cache: dict[
            tuple[str, int, int],
            tuple[float, tuple[list[dict[str, Any]], bool]],
        ] = {}
        self._location_cache: dict[
            tuple[str, str, int],
            tuple[float, list[dict[str, Any]]],
        ] = {}
        self._booking_policy_cache: dict[str, tuple[float, dict[str, Any]]] = {}

    @property
    def enabled(self) -> bool:
        return bool(settings.ENABLE_SEAT_BACKEND_API)

    def _context(self) -> tuple[Any, dict[str, Any], str]:
        conn = current_request_conn()
        current_user = current_seatbook_user()
        if conn is None or not current_user:
            raise RuntimeError(
                "seat_backend_api_service called outside a bound chatbot request "
                "(see backend.chatbot.deps.seatbook_auth.seatbook_identity)"
            )
        return conn, current_user, str(current_user["tenant_id"])

    # -- locations (cached the same way they always were, now caching DB
    # query results instead of HTTP responses) --------------------------

    def _location_cache_key(self, kind: str, parent_id: int) -> tuple[str, str, int]:
        user = current_seatbook_user() or {}
        tenant_id = str(user.get("tenant_id") or "").strip()
        return tenant_id, kind, parent_id

    def _cached_location(self, kind: str, parent_id: int) -> list[dict[str, Any]] | None:
        cached = self._location_cache.get(self._location_cache_key(kind, parent_id))
        if not cached or time.monotonic() - cached[0] >= LOCATION_CACHE_TTL_SECONDS:
            return None
        return [dict(item) for item in cached[1]]

    def _cache_location(
        self, kind: str, parent_id: int, items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        snapshot = [dict(item) for item in items]
        self._location_cache[self._location_cache_key(kind, parent_id)] = (
            time.monotonic(), snapshot,
        )
        return [dict(item) for item in snapshot]

    async def list_sites(self) -> list[dict[str, Any]] | None:
        cached = self._cached_location("sites", 0)
        if cached is not None:
            return cached
        conn, _current_user, tenant_id = self._context()
        sites = get_sites(conn, tenant_id=tenant_id, status_filter="ACTIVE", limit=100)
        return self._cache_location("sites", 0, [s.model_dump(mode="json") for s in sites])

    async def list_buildings(self, site_id: int) -> list[dict[str, Any]] | None:
        cached = self._cached_location("buildings", site_id)
        if cached is not None:
            return cached
        conn, _current_user, tenant_id = self._context()
        buildings = get_buildings_by_site(
            conn, tenant_id=tenant_id, site_id=str(site_id), status_filter="ACTIVE", limit=100,
        )
        return self._cache_location(
            "buildings", site_id, [b.model_dump(mode="json") for b in buildings],
        )

    async def list_floors(self, building_id: int) -> list[dict[str, Any]] | None:
        cached = self._cached_location("floors", building_id)
        if cached is not None:
            return cached
        conn, _current_user, tenant_id = self._context()
        floors = get_floors_by_building(
            conn, tenant_id=tenant_id, building_id=str(building_id),
            status_filter="ACTIVE", limit=100,
        )
        return self._cache_location(
            "floors", building_id, [f.model_dump(mode="json") for f in floors],
        )

    # -- profile / policy -------------------------------------------------

    async def preferences(self) -> dict[str, Any] | None:
        conn, current_user, _tenant_id = self._context()
        dashboard = get_dashboard_me(conn, current_user=current_user).model_dump(mode="json")
        preferences = dict(dashboard.get("work_preferences") or {})
        favorite_seat_ids: list[Any] = []
        for key in ("favorite_seat", "second_favorite_seat", "third_favorite_seat"):
            favorite = dashboard.get(key)
            if isinstance(favorite, dict) and favorite.get("seat_id") is not None:
                favorite_seat_ids.append(favorite["seat_id"])
        preferences["favorite_seat_ids"] = favorite_seat_ids
        return preferences

    async def booking_policy(self) -> dict[str, Any] | None:
        _conn, _current_user, tenant_id = self._context()
        cached = self._booking_policy_cache.get(tenant_id)
        if cached and time.monotonic() - cached[0] < LOCATION_CACHE_TTL_SECONDS:
            return dict(cached[1])
        conn, _current_user, tenant_id = self._context()
        policy = resolve_booking_advance_days(conn, tenant_id=tenant_id)
        self._booking_policy_cache[tenant_id] = (time.monotonic(), dict(policy))
        return policy

    async def me(self) -> dict[str, Any] | None:
        return current_seatbook_user()

    async def user_id(self) -> int | None:
        me = await self.me()
        if not me:
            return None
        try:
            return int(me["user_id"])
        except (TypeError, ValueError, KeyError):
            return None

    # -- bookings -----------------------------------------------------------

    async def my_current_bookings(self) -> list[dict[str, Any]] | None:
        conn, current_user, _tenant_id = self._context()
        bookings = get_user_current_bookings(conn, current_user=current_user)
        return [b.model_dump(mode="json") for b in bookings]

    def _paginated_to_items(
        self, result: Any, limit: int,
    ) -> tuple[list[dict[str, Any]], bool]:
        if isinstance(result, list):
            items = [b.model_dump(mode="json") for b in result]
            return items[:limit], len(items) > limit
        dumped = result.model_dump(mode="json")
        items = dumped.get("items") or []
        pagination = dumped.get("pagination") or {}
        page = int(pagination.get("page") or 1)
        total_pages = int(pagination.get("total_pages") or page)
        return items, page < total_pages

    async def my_future_bookings(
        self, *, page: int = 1, limit: int = 20,
    ) -> tuple[list[dict[str, Any]], bool] | None:
        conn, current_user, _tenant_id = self._context()
        result = get_user_future_bookings(conn, current_user=current_user, page=page, limit=limit)
        return self._paginated_to_items(result, limit)

    async def my_past_bookings(
        self, *, page: int = 1, limit: int = 20,
    ) -> tuple[list[dict[str, Any]], bool] | None:
        conn, current_user, _tenant_id = self._context()
        user_id = str(current_user.get("user_id") or "")
        cache_key = (user_id, page, limit)
        cached = self._past_bookings_cache.get(cache_key) if user_id else None
        if cached and time.monotonic() - cached[0] < 120:
            rows, has_more = cached[1]
            return list(rows), has_more

        result = get_user_past_bookings(conn, current_user=current_user, page=page, limit=limit)
        items, has_more = self._paginated_to_items(result, limit)
        if user_id:
            self._past_bookings_cache[cache_key] = (time.monotonic(), (list(items), has_more))
        return items, has_more

    async def my_cancelled_bookings(
        self, *, page: int = 1, limit: int = 20,
    ) -> tuple[list[dict[str, Any]], bool] | None:
        conn, current_user, _tenant_id = self._context()
        result = get_user_cancelled_bookings(conn, current_user=current_user, page=page, limit=limit)
        return self._paginated_to_items(result, limit)

    async def available_seats(
        self,
        *,
        floor_id: int,
        booking_date: str,
        amenity_ids: list[int] | None = None,
        modify_booking_id: str | None = None,
    ) -> list[dict[str, Any]] | None:
        conn, current_user, tenant_id = self._context()
        try:
            result = get_available_seats_by_range(
                conn,
                tenant_id=tenant_id,
                floor_id=str(floor_id),
                start_date=date.fromisoformat(booking_date),
                end_date=date.fromisoformat(booking_date),
                amenity_ids=amenity_ids,
                current_user=current_user,
                booked_for_user_id=str(current_user["user_id"]),
                exclude_booking_id=modify_booking_id,
                calendar_mode=False,
            )
        except HTTPException as exc:
            raise _as_seat_backend_error(exc) from exc
        return [item.model_dump(mode="json") for item in result.items]

    async def create_booking(
        self,
        *,
        site_id: int,
        building_id: int,
        floor_id: int,
        seat_id: int,
        booking_date: str,
    ) -> dict[str, Any] | None:
        conn, current_user, _tenant_id = self._context()
        payload = CreateBookingRequest(
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
            seat_id=seat_id,
            booking_date=date.fromisoformat(booking_date),
            booked_for_user_id=int(current_user["user_id"]),
        )
        try:
            result = book_seat(
                conn,
                current_user=current_user,
                payload=payload,
                background_tasks=current_request_background_tasks(),
            )
        except HTTPException as exc:
            raise _as_seat_backend_error(exc) from exc
        return result.model_dump(mode="json")

    async def cancel_booking(
        self, booking_id: str, *, reason: str = "Cancelled from chatbot",
    ) -> dict[str, Any] | None:
        conn, current_user, _tenant_id = self._context()
        try:
            result = cancel_booking_by_id(
                conn,
                current_user=current_user,
                booking_id=booking_id,
                cancellation_reason=reason,
                background_tasks=current_request_background_tasks(),
            )
        except HTTPException as exc:
            raise _as_seat_backend_error(exc) from exc
        return result.model_dump(mode="json")

    async def modify_booking(
        self,
        booking_id: str,
        *,
        site_id: int,
        building_id: int,
        floor_id: int,
        seat_id: int,
        booking_date: str,
    ) -> dict[str, Any] | None:
        conn, current_user, _tenant_id = self._context()
        payload = ModifyBookingRequest(
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
            seat_id=seat_id,
            booking_date=date.fromisoformat(booking_date),
        )
        try:
            result = modify_booking_service(
                conn,
                current_user=current_user,
                booking_id=booking_id,
                payload=payload,
                background_tasks=current_request_background_tasks(),
            )
        except HTTPException as exc:
            raise _as_seat_backend_error(exc) from exc
        return result.model_dump(mode="json")


seat_backend_api_service = SeatBackendApiService()
