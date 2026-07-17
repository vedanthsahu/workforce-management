from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from typing import Any
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.booking_repository import (
    fetch_admin_bookings,
    fetch_admin_bookings_summary,
)
from backend.schemas.booking import AdminBookingListQuery
from backend.services.booking_service import get_admin_bookings


class FakeCursor:
    def __init__(self, *, fetchall_result=None, fetchone_result=None) -> None:
        self.executions: list[tuple[str, Any]] = []
        self._fetchall_result = fetchall_result or []
        self._fetchone_result = fetchone_result

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchall(self):
        return self._fetchall_result

    def fetchone(self):
        return self._fetchone_result


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class AdminBookingsRepositoryFilterTests(unittest.TestCase):
    def test_no_filters_only_scopes_by_tenant(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_admin_bookings(conn, tenant_id="3", limit=20, offset=0)

        sql, params = cursor.executions[0]
        self.assertIn("WHERE b.tenant_id = %s", sql)
        self.assertNotIn("AND b.site_id", sql)
        self.assertNotIn("ILIKE", sql)
        self.assertEqual(params, ("3", 20, 0))

    def test_every_filter_is_applied_independently(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_admin_bookings(
            conn,
            tenant_id="3",
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 31),
            site_id="5",
            building_id="7",
            floor_id="18",
            booking_type="EMPLOYEE",
            booking_status="CONFIRMED",
            search="vedanth",
            seat_code="A1",
            booked_by_user_id="50",
            limit=20,
            offset=0,
        )

        sql, params = cursor.executions[0]
        self.assertIn("b.booking_date >= %s", sql)
        self.assertIn("b.booking_date <= %s", sql)
        self.assertIn("b.site_id = %s", sql)
        self.assertIn("b.building_id = %s", sql)
        self.assertIn("b.floor_id = %s", sql)
        self.assertIn("b.booking_type = %s", sql)
        self.assertIn("b.booking_status = %s", sql)
        self.assertIn("s.seat_code ILIKE %s", sql)
        self.assertIn("b.booked_by_user_id = %s", sql)
        self.assertIn(
            "COALESCE(booked_for_user.full_name, g.full_name) ILIKE %s", sql
        )
        self.assertEqual(
            params,
            (
                "3",
                date(2026, 7, 1),
                date(2026, 7, 31),
                "5",
                "7",
                "18",
                "EMPLOYEE",
                "CONFIRMED",
                "%A1%",
                "50",
                "%vedanth%",
                "%vedanth%",
                20,
                0,
            ),
        )

    def test_single_filter_combinations_do_not_require_others(self) -> None:
        """Business rule: filters are independent -- booking_status alone,
        seat_code alone, and site_id alone must each work without the others."""
        for kwargs, expected_fragment in (
            ({"booking_status": "CANCELLED"}, "b.booking_status = %s"),
            ({"seat_code": "B2"}, "s.seat_code ILIKE %s"),
            ({"site_id": "9"}, "b.site_id = %s"),
        ):
            with self.subTest(kwargs=kwargs):
                cursor = FakeCursor(fetchall_result=[])
                conn = FakeConnection(cursor)
                fetch_admin_bookings(conn, tenant_id="3", limit=20, offset=0, **kwargs)
                sql, _ = cursor.executions[0]
                self.assertIn(expected_fragment, sql)

    def test_summary_uses_same_filters_without_pagination(self) -> None:
        cursor = FakeCursor(
            fetchone_result={
                "total_bookings": 10,
                "confirmed_bookings": 6,
                "cancelled_bookings": 2,
                "modified_bookings": 1,
                "completed_bookings": 1,
                "no_show_bookings": 0,
                "employee_bookings": 7,
                "guest_bookings": 3,
                "checked_in_bookings": 4,
                "checked_out_bookings": 2,
            }
        )
        conn = FakeConnection(cursor)

        result = fetch_admin_bookings_summary(conn, tenant_id="3", site_id="5")

        sql, params = cursor.executions[0]
        self.assertIn("COUNT(*) FILTER (WHERE b.booking_status = 'CONFIRMED')", sql)
        self.assertIn("COUNT(*) FILTER (WHERE b.check_in_at IS NOT NULL)", sql)
        self.assertNotIn("LIMIT", sql)
        self.assertNotIn("OFFSET", sql)
        self.assertEqual(params, ["3", "5"])
        self.assertEqual(result["total_bookings"], 10)
        self.assertEqual(result["employee_bookings"], 7)


class AdminBookingsServiceTests(unittest.TestCase):
    def test_invalid_date_range_raises_400(self) -> None:
        query = AdminBookingListQuery(
            start_date=date(2026, 8, 1),
            end_date=date(2026, 7, 1),
        )

        with self.assertRaises(HTTPException) as context:
            get_admin_bookings(
                conn=object(),
                tenant_id="3",
                query=query,
                page=1,
                limit=20,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_date_range")

    def test_builds_pagination_and_summary_from_repository_results(self) -> None:
        query = AdminBookingListQuery(booking_status="CONFIRMED")

        summary_payload = {
            "total_bookings": 45,
            "confirmed_bookings": 45,
            "cancelled_bookings": 0,
            "modified_bookings": 0,
            "completed_bookings": 0,
            "no_show_bookings": 0,
            "employee_bookings": 30,
            "guest_bookings": 15,
            "checked_in_bookings": 5,
            "checked_out_bookings": 2,
        }

        with patch(
            "backend.services.booking_service.fetch_admin_bookings",
            return_value=[],
        ) as mock_fetch, patch(
            "backend.services.booking_service.fetch_admin_bookings_summary",
            return_value=summary_payload,
        ):
            response = get_admin_bookings(
                conn=object(),
                tenant_id="3",
                query=query,
                page=2,
                limit=20,
            )

        # page=2, limit=20 -> offset=20
        _, kwargs = mock_fetch.call_args
        self.assertEqual(kwargs["offset"], 20)
        self.assertEqual(kwargs["limit"], 20)
        self.assertEqual(kwargs["booking_status"], "CONFIRMED")

        self.assertEqual(response.summary.total_bookings, 45)
        self.assertEqual(response.pagination.total, 45)
        self.assertEqual(response.pagination.page, 2)
        self.assertEqual(response.pagination.total_pages, 3)


if __name__ == "__main__":
    unittest.main()
