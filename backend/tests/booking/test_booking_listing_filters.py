from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from typing import Any
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.booking_repository import (
    fetch_cancelled_delegated_bookings,
    fetch_current_bookings_for_user,
    fetch_future_bookings_for_user,
    fetch_past_bookings_for_user,
)
from backend.services.booking_service import (
    get_delegated_future_bookings,
    get_user_future_bookings,
)

FILTER_DATE = date(2026, 8, 15)


class FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchall(self):
        return []


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class RepositorySeatAndDateFilterTests(unittest.TestCase):
    """seat_id / booking_date are optional AND-filters layered on top of the
    existing WHERE clause; omitting both must reproduce the original SQL."""

    def test_no_filters_matches_previous_query_shape(self) -> None:
        cursor = FakeCursor()
        fetch_past_bookings_for_user(
            FakeConnection(cursor), tenant_id="1", user_id="7",
        )
        sql, params = cursor.executions[0]
        self.assertNotIn("b.seat_id = %s", sql)
        self.assertNotIn("b.booking_date = %s", sql)
        self.assertEqual(list(params), ["7", "1"])

    def test_seat_id_only_appends_one_filter(self) -> None:
        cursor = FakeCursor()
        fetch_future_bookings_for_user(
            FakeConnection(cursor), tenant_id="1", user_id="7", seat_id="15",
        )
        sql, params = cursor.executions[0]
        self.assertIn("AND b.seat_id = %s", sql)
        self.assertNotIn("b.booking_date = %s", sql)
        self.assertEqual(list(params), ["7", "1", "15"])

    def test_booking_date_only_appends_one_filter(self) -> None:
        cursor = FakeCursor()
        fetch_current_bookings_for_user(
            FakeConnection(cursor), tenant_id="1", user_id="7", booking_date=FILTER_DATE,
        )
        sql, params = cursor.executions[0]
        self.assertNotIn("b.seat_id = %s", sql)
        self.assertIn("AND b.booking_date = %s", sql)
        self.assertEqual(list(params), ["7", "1", FILTER_DATE])

    def test_both_filters_apply_together_and_before_order_by(self) -> None:
        cursor = FakeCursor()
        fetch_past_bookings_for_user(
            FakeConnection(cursor),
            tenant_id="1",
            user_id="7",
            seat_id="15",
            booking_date=FILTER_DATE,
        )
        sql, params = cursor.executions[0]
        seat_pos = sql.index("b.seat_id = %s")
        date_pos = sql.index("b.booking_date = %s", seat_pos)
        order_pos = sql.index("ORDER BY")
        self.assertLess(date_pos, order_pos)
        self.assertEqual(list(params), ["7", "1", "15", FILTER_DATE])

    def test_delegated_cancelled_custom_query_also_supports_filters(self) -> None:
        cursor = FakeCursor()
        fetch_cancelled_delegated_bookings(
            FakeConnection(cursor),
            tenant_id="1",
            user_id="7",
            seat_id="15",
            booking_date=FILTER_DATE,
        )
        sql, params = cursor.executions[0]
        self.assertIn("AND b.seat_id = %s", sql)
        self.assertIn("AND b.booking_date = %s", sql)
        self.assertEqual(list(params), ["1", "7", "15", FILTER_DATE])


class ServiceLayerSeatFilterSkipsGuestVisitsTests(unittest.TestCase):
    """Guest visits without a seat booking can never match a seat_id
    filter -- the delegated services should skip that extra query entirely
    rather than fetch rows that would always be discarded."""

    def test_seat_id_filter_skips_guest_visit_without_booking_lookup(self) -> None:
        with (
            patch(
                "backend.services.booking_service.fetch_future_delegated_bookings",
                return_value=[],
            ),
            patch(
                "backend.services.booking_service.fetch_future_delegated_guest_visits_without_booking",
            ) as mock_guest_visits,
        ):
            get_delegated_future_bookings(
                conn=object(),
                current_user={"tenant_id": "1", "user_id": "7"},
                seat_id="15",
            )
        mock_guest_visits.assert_not_called()

    def test_no_seat_id_still_fetches_guest_visits_without_booking(self) -> None:
        with (
            patch(
                "backend.services.booking_service.fetch_future_delegated_bookings",
                return_value=[],
            ),
            patch(
                "backend.services.booking_service.fetch_future_delegated_guest_visits_without_booking",
                return_value=[],
            ) as mock_guest_visits,
        ):
            get_delegated_future_bookings(
                conn=object(),
                current_user={"tenant_id": "1", "user_id": "7"},
            )
        mock_guest_visits.assert_called_once()


class ServiceLayerFilterPassthroughTests(unittest.TestCase):
    def test_me_future_bookings_forwards_filters_to_the_repository(self) -> None:
        with patch(
            "backend.services.booking_service.fetch_future_bookings_for_user",
            return_value=[],
        ) as mock_fetch:
            get_user_future_bookings(
                conn=object(),
                current_user={"tenant_id": "1", "user_id": "7"},
                seat_id="15",
                booking_date=FILTER_DATE,
            )
        self.assertEqual(mock_fetch.call_args.kwargs["seat_id"], "15")
        self.assertEqual(mock_fetch.call_args.kwargs["booking_date"], FILTER_DATE)


if __name__ == "__main__":
    unittest.main()
