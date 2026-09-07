from __future__ import annotations

import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.booking_repository import (
    fetch_admin_bookings,
    fetch_admin_bookings_summary,
    fetch_admin_guest_visits_without_booking,
)
from backend.schemas.booking import AdminBookingListQuery
from backend.services.booking_service import get_admin_bookings


class FakeCursor:
    def __init__(self, *, fetchall_result=None, fetchone_result=None) -> None:
        self.executions: list[tuple[str, Any]] = []
        self._fetchall_result = fetchall_result or []
        self._fetchone_result = fetchone_result

    def __enter__(self) -> FakeCursor:
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


EMPTY_SUMMARY = {
    "total_bookings": 0,
    "confirmed_bookings": 0,
    "cancelled_bookings": 0,
    "modified_bookings": 0,
    "completed_bookings": 0,
    "no_show_bookings": 0,
    "employee_bookings": 0,
    "guest_bookings": 0,
    "checked_in_bookings": 0,
    "checked_out_bookings": 0,
}


class AdminBookingsRepositoryFilterTests(unittest.TestCase):
    def test_no_filters_only_scopes_by_tenant_and_excludes_modified(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_admin_bookings(conn, tenant_id="3")

        sql, params = cursor.executions[0]
        self.assertIn("WHERE b.tenant_id = %s", sql)
        self.assertIn("b.booking_status <> 'MODIFIED'", sql)
        self.assertNotIn("AND b.site_id", sql)
        self.assertNotIn("ILIKE", sql)
        self.assertNotIn("LIMIT", sql)
        self.assertNotIn("OFFSET", sql)
        self.assertEqual(list(params), ["3"])

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
        self.assertIn("b.booking_status <> 'MODIFIED'", sql)
        self.assertEqual(
            list(params),
            [
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
            ],
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
                fetch_admin_bookings(conn, tenant_id="3", **kwargs)
                sql, _ = cursor.executions[0]
                self.assertIn(expected_fragment, sql)

    def test_visit_status_filters_the_joined_guest_visit_not_booking_status(self) -> None:
        """A GUEST-type row's own booking_status (bookings table) and its
        guest visit's visit_status (guest_visits table, joined as gv in
        BOOKING_SELECT_FROM) are independent filters -- both can be applied
        at once, and neither requires the other."""
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_admin_bookings(
            conn,
            tenant_id="3",
            booking_type="GUEST",
            booking_status="CONFIRMED",
            visit_status="CHECKED_IN",
        )

        sql, params = cursor.executions[0]
        self.assertIn("b.booking_status = %s", sql)
        self.assertIn("gv.visit_status = %s", sql)
        self.assertIn("CONFIRMED", params)
        self.assertIn("CHECKED_IN", params)

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


class AdminGuestVisitsWithoutBookingRepositoryTests(unittest.TestCase):
    def test_scopes_by_tenant_excludes_modified_and_requires_no_booking(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_admin_guest_visits_without_booking(conn, tenant_id="3")

        sql, params = cursor.executions[0]
        self.assertIn("gv.tenant_id = %s", sql)
        self.assertIn("b.id IS NULL", sql)
        self.assertIn("gv.visit_status <> 'MODIFIED'", sql)
        self.assertEqual(list(params), ["3"])

    def test_filters_are_applied_independently(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_admin_guest_visits_without_booking(
            conn,
            tenant_id="3",
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 31),
            site_id="5",
            building_id="7",
            floor_id="18",
            visit_status="CANCELLED",
            search="vedanth",
            booked_by_user_id="50",
        )

        sql, params = cursor.executions[0]
        self.assertIn("gv.visit_date >= %s", sql)
        self.assertIn("gv.visit_date <= %s", sql)
        self.assertIn("gv.site_id = %s", sql)
        self.assertIn("gv.building_id = %s", sql)
        self.assertIn("gv.floor_id = %s", sql)
        self.assertIn("gv.visit_status = %s", sql)
        self.assertIn("gv.created_by_user_id = %s", sql)
        self.assertIn("g.full_name ILIKE %s OR g.email ILIKE %s", sql)
        self.assertEqual(
            list(params),
            [
                "3",
                date(2026, 7, 1),
                date(2026, 7, 31),
                "5",
                "7",
                "18",
                "CANCELLED",
                "50",
                "%vedanth%",
                "%vedanth%",
            ],
        )


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

    def test_merges_bookings_and_guest_visits_then_paginates_combined_list(self) -> None:
        """Mirrors get_delegated_past_bookings: fetch both sources in full,
        merge, sort by (booking_date, created_at) desc, then paginate.
        Uses visit_status (not booking_status) since a guest visit without
        a booking has no bookings.booking_status to filter on -- see
        test_skips_guest_visit_lookup_for_filters_a_booking_less_visit_cant_match."""
        query = AdminBookingListQuery(visit_status="SCHEDULED")

        booking_rows = [
            {
                "booking_id": str(i),
                "booking_type": "EMPLOYEE",
                "booking_date": date(2026, 7, 10),
                "created_at": datetime(2026, 7, 1, 0, 0, i),
            }
            for i in range(3)
        ]
        guest_visit_rows = [
            {
                "booking_id": None,
                "guest_visit_id": "gv-1",
                "activity_source": "GUEST_VISIT",
                "booking_type": "GUEST",
                "booking_date": date(2026, 7, 11),
                "created_at": datetime(2026, 7, 2, 0, 0, 0),
            }
        ]

        summary_payload = {**EMPTY_SUMMARY, "total_bookings": 3, "employee_bookings": 3}

        with patch(
            "backend.services.booking_service.fetch_admin_bookings",
            return_value=booking_rows,
        ) as mock_fetch_bookings, patch(
            "backend.services.booking_service.fetch_admin_guest_visits_without_booking",
            return_value=guest_visit_rows,
        ) as mock_fetch_visits, patch(
            "backend.services.booking_service.fetch_admin_bookings_summary",
            return_value=summary_payload,
        ):
            response = get_admin_bookings(
                conn=object(),
                tenant_id="3",
                query=query,
                page=1,
                limit=2,
            )

        mock_fetch_bookings.assert_called_once()
        mock_fetch_visits.assert_called_once()

        # 4 combined rows (3 bookings + 1 guest visit); page 1 of limit 2.
        self.assertEqual(len(response.items), 2)
        self.assertEqual(response.pagination.total, 4)
        self.assertEqual(response.pagination.page, 1)
        self.assertEqual(response.pagination.total_pages, 2)
        # total_bookings in the summary is overridden to the combined total
        # so it stays consistent with pagination.total.
        self.assertEqual(response.summary.total_bookings, 4)
        # Sorted by booking_date desc: the 7/11 guest visit comes first.
        self.assertEqual(response.items[0].activity_source, "GUEST_VISIT")
        self.assertTrue(response.items[0].guest_visit_id)

    def test_skips_guest_visit_lookup_for_filters_a_booking_less_visit_cant_match(self) -> None:
        """A booking-less guest visit can never be EMPLOYEE type, have a
        seat_code, or have a bookings.booking_status (it has no bookings
        row at all), so those filters should short-circuit the extra query."""
        for kwargs in (
            {"booking_type": "EMPLOYEE"},
            {"seat_code": "A1"},
            {"booking_status": "CONFIRMED"},
        ):
            with self.subTest(kwargs=kwargs):
                query = AdminBookingListQuery(**kwargs)
                with patch(
                    "backend.services.booking_service.fetch_admin_bookings",
                    return_value=[],
                ), patch(
                    "backend.services.booking_service.fetch_admin_guest_visits_without_booking",
                ) as mock_fetch_visits, patch(
                    "backend.services.booking_service.fetch_admin_bookings_summary",
                    return_value=EMPTY_SUMMARY,
                ):
                    get_admin_bookings(
                        conn=object(),
                        tenant_id="3",
                        query=query,
                        page=1,
                        limit=20,
                    )
                mock_fetch_visits.assert_not_called()


if __name__ == "__main__":
    unittest.main()
