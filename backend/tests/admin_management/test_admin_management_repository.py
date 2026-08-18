from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.location_repository import (
    fetch_buildings_by_site,
    fetch_floors_by_building,
    fetch_sites,
)
from backend.repositories.preferences_repository import fetch_amenities
from backend.repositories.user_repository import fetch_admin_user_directory, search_users


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


class AdminManagementRepositoryTests(unittest.TestCase):
    def test_site_listing_adds_aggregates_filters_and_pagination(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        fetch_sites(
            conn,
            tenant_id="1",
            page=2,
            limit=25,
            search="blr",
            status_filter="INACTIVE",
        )

        sql, params = cursor.executions[0]
        self.assertIn("building_count", sql)
        self.assertIn("active_seat_count", sql)
        self.assertIn("bookable_seat_count", sql)
        self.assertIn("s.status = %s", sql)
        self.assertIn("ILIKE %s", sql)
        self.assertIn("LIMIT %s OFFSET %s", sql)
        self.assertEqual(params[0], "1")
        self.assertIn("INACTIVE", params)
        self.assertEqual(params[-2:], [25, 25])

    def test_building_listing_uses_reusable_seat_count_shape(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        fetch_buildings_by_site(
            conn,
            tenant_id="1",
            site_id="2",
            limit=10,
        )

        sql, params = cursor.executions[0]
        self.assertIn("floor_count", sql)
        self.assertIn("COUNT(*) FILTER (WHERE st.status = 'ACTIVE')", sql)
        self.assertIn("st.is_bookable = TRUE", sql)
        self.assertNotIn("AND b.status = %s", sql)
        self.assertNotIn("s.status = 'ACTIVE'", sql)
        self.assertEqual(params[:2], ["1", "2"])

    def test_site_listing_without_status_filter_does_not_default_active(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        fetch_sites(conn, tenant_id="1")

        sql, params = cursor.executions[0]
        self.assertNotIn("AND s.status = %s", sql)
        self.assertEqual(params, ["1"])

    def test_floor_listing_adds_layout_and_seat_aggregates(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        fetch_floors_by_building(
            conn,
            tenant_id="1",
            building_id="3",
            status_filter="ACTIVE",
            search="one",
        )

        sql, params = cursor.executions[0]
        self.assertIn("layout_count", sql)
        self.assertIn("published_layout_exists", sql)
        self.assertIn("flc.status = ANY(%s)", sql)
        self.assertIn("fl.status = ANY(%s)", sql)
        self.assertIn("f.status = %s", sql)
        self.assertIn("f.floor_name ILIKE %s", sql)
        self.assertEqual(
            params[:2],
            [["DRAFT", "ARCHIVED", "PUBLISHED"], ["DRAFT", "ARCHIVED", "PUBLISHED"]],
        )
        self.assertEqual(params[2:4], ["3", "1"])

    def test_amenity_listing_returns_metrics_and_assignment_counts(self) -> None:
        cursor = FakeCursor(
            fetchone_values=[
                {"total": 1},
                {
                    "total_amenities": 2,
                    "active_amenities": 1,
                    "inactive_amenities": 1,
                    "assigned_amenities": 1,
                },
            ],
            fetchall_values=[
                [
                    {
                        "amenity_id": "5",
                        "assigned_seat_count": 3,
                    }
                ]
            ],
        )
        conn = FakeConnection(cursor)

        result = fetch_amenities(
            conn,
            tenant_id="1",
            page=1,
            limit=10,
            search="desk",
            is_active=True,
        )

        combined_sql = " ".join(sql for sql, _ in cursor.executions)
        self.assertIn("assigned_seat_count", combined_sql)
        self.assertIn("COUNT(DISTINCT sa.amenity_id)", combined_sql)
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["active_amenities"], 1)
        self.assertEqual(result["items"][0]["assigned_seat_count"], 3)

    def test_admin_user_directory_filters_and_sorts_in_sql(self) -> None:
        cursor = FakeCursor(
            fetchone_values=[
                {
                    "total_users": 10,
                    "filtered_users": 4,
                    "active_users": 3,
                    "inactive_users": 1,
                }
            ],
            fetchall_values=[
                [],
                [
                    {
                        "id": "42",
                        "full_name": "Employee One",
                        "role_name": "EMPLOYEE",
                        "status": "ACTIVE",
                    }
                ],
            ],
        )
        conn = FakeConnection(cursor)

        result = fetch_admin_user_directory(
            conn,
            tenant_id="1",
            role_name="EMPLOYEE",
            status="ACTIVE",
        )

        combined_sql = " ".join(sql for sql, _ in cursor.executions)
        self.assertIn("au.tenant_id = %(tenant_id)s", combined_sql)
        self.assertIn(
    "UPPER(REPLACE(au.role_name, ' ', '_')) = ANY(",
    combined_sql,
)
        self.assertIn("%(role_names)s::text[]", combined_sql)
        self.assertIn("au.status = %(status)s", combined_sql)
        self.assertIn("LOWER(au.full_name)", combined_sql)
        self.assertIn("ASC NULLS LAST", combined_sql)
        self.assertEqual(cursor.executions[0][1]["tenant_id"], "1")
        self.assertEqual(result["summary"]["filtered_users"], 4)
        self.assertEqual(result["items"][0]["id"], "42")


class SearchUsersRepositoryTests(unittest.TestCase):
    """A word must match at the START of a name token to count -- 'K'
    matches 'Kishore' (token 1) and 'Kumar' (token 2 of 'Amit Kumar'), and
    whichever match sits earliest in its own name ranks first. This is the
    same match_position ranking search_team_members already used; search_
    guests uses the identical pattern for the same reason."""

    def test_orders_by_earliest_matching_word_position(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        search_users(conn, tenant_id="1", search_text="K", limit=20)

        sql, params = cursor.executions[0]
        self.assertIn("WITH ORDINALITY", sql)
        self.assertIn("word LIKE %s || '%%'", sql)
        self.assertIn("COALESCE(mp.match_position, 999)", sql)
        self.assertIn("mp.match_position IS NOT NULL", sql)
        # Search text feeds the LATERAL join first (it appears earliest in
        # the SQL text), then tenant_id, then the remaining WHERE clauses.
        self.assertEqual(params, ("k", "1", "k", "k", 20))

    def test_include_inactive_drops_status_filter(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        search_users(
            conn, tenant_id="1", search_text="amit", include_inactive=True,
        )

        sql, _ = cursor.executions[0]
        self.assertNotIn("au.status = 'ACTIVE'", sql)


if __name__ == "__main__":
    unittest.main()
