from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.routes.bookings import router as bookings_router

LISTING_ROUTES = [
    "/bookings/me/past",
    "/bookings/me/current",
    "/bookings/me/future",
    "/bookings/me/cancelled",
    "/bookings/delegated/past",
    "/bookings/delegated/current",
    "/bookings/delegated/future",
    "/bookings/delegated/cancelled",
]


def _route(path: str) -> APIRoute:
    for route in bookings_router.routes:
        if isinstance(route, APIRoute) and route.path == path and "GET" in route.methods:
            return route
    raise AssertionError(f"GET {path} is not registered")


class BookingListingQueryParamTests(unittest.TestCase):
    def test_every_listing_route_accepts_seat_id_and_booking_date(self) -> None:
        for path in LISTING_ROUTES:
            with self.subTest(route=path):
                names = {p.name for p in _route(path).dependant.query_params}
                self.assertIn("seat_id", names)
                self.assertIn("booking_date", names)

    def test_delegated_current_now_supports_pagination(self) -> None:
        names = {p.name for p in _route("/bookings/delegated/current").dependant.query_params}
        self.assertIn("page", names)
        self.assertIn("limit", names)

    def test_me_current_pagination_is_unchanged(self) -> None:
        """Only delegated/current was asked to gain pagination -- me/current
        keeps its existing (unpaginated) contract."""
        names = {p.name for p in _route("/bookings/me/current").dependant.query_params}
        self.assertNotIn("page", names)
        self.assertNotIn("limit", names)


if __name__ == "__main__":
    unittest.main()
