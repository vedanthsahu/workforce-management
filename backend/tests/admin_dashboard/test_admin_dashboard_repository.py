from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.dashboard_repository import (
    fetch_admin_booking_list,
    fetch_date_range_occupancy,
)


class FakeCursor:
    def __init__(
        self,
        *,
        fetchone_values: list[dict[str, Any]] | None = None,
        fetchall_values: list[list[dict[str, Any]]] | None = None,
    ) -> None:
        self.fetchone_values = fetchone_values or []
        self.fetchall_values = fetchall_values or []
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchone(self) -> dict[str, Any] | None:
        return self.fetchone_values.pop(0) if self.fetchone_values else None

    def fetchall(self) -> list[dict[str, Any]]:
        return self.fetchall_values.pop(0) if self.fetchall_values else []


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class AdminDashboardRepositoryTests(unittest.TestCase):
    def test_booking_list_query_is_tenant_scoped_and_paginated(self) -> None:
        cursor = FakeCursor(
            fetchone_values=[{"total": 0}],
            fetchall_values=[[]],
        )
        conn = FakeConnection(cursor)

        result = fetch_admin_booking_list(
            conn,
            tenant_id="1",
            booking_date=date(2026, 5, 22),
            site_id="2",
            building_id="3",
            floor_id="4",
            booking_status="CONFIRMED",
            page=2,
            limit=25,
        )

        combined_sql = " ".join(sql for sql, _ in cursor.executions)
        self.assertIn("b.tenant_id = %(tenant_id)s", combined_sql)
        self.assertIn("b.site_id = %(site_id)s::bigint", combined_sql)
        self.assertIn("b.building_id = %(building_id)s::bigint", combined_sql)
        self.assertIn("b.floor_id = %(floor_id)s::bigint", combined_sql)
        self.assertIn("LIMIT %(limit)s", combined_sql)
        self.assertEqual(result["page"], 2)
        self.assertEqual(result["limit"], 25)
        self.assertEqual(cursor.executions[0][1]["tenant_id"], "1")
        self.assertEqual(cursor.executions[1][1]["offset"], 25)

    def test_date_range_occupancy_query_uses_generate_series_and_grouped_counts(self) -> None:
        cursor = FakeCursor(
            fetchall_values=[
                [
                    {
                        "date": date(2026, 5, 22),
                        "total_seats": 10,
                        "blocked_seats": 1,
                        "available_seats": 9,
                        "booked_seats": 3,
                        "occupancy_rate": 33.33,
                    }
                ]
            ],
        )
        conn = FakeConnection(cursor)

        rows = fetch_date_range_occupancy(
            conn,
            tenant_id="1",
            start_date=date(2026, 5, 22),
            end_date=date(2026, 5, 23),
            floor_id="4",
        )

        sql = cursor.executions[0][0]
        params = cursor.executions[0][1]
        self.assertIn("generate_series", sql)
        self.assertIn("b.tenant_id = %(tenant_id)s", sql)
        self.assertIn("COUNT(DISTINCT b.seat_id)", sql)
        self.assertIn("COUNT(DISTINCT bs.seat_id)", sql)
        self.assertEqual(params["tenant_id"], "1")
        self.assertEqual(params["floor_id"], "4")
        self.assertEqual(rows[0]["occupancy_rate"], 33.33)


if __name__ == "__main__":
    unittest.main()
