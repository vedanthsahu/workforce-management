from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.floor_layout_repository import (
    fetch_floor_layout_by_id,
    fetch_floor_layouts_by_floor,
    soft_delete_floor_layout,
)
from backend.repositories.location_repository import (
    fetch_layout_seat_mapping_by_id,
)


class FakeCursor:
    def __init__(
        self,
        *,
        fetchone_values: list[dict[str, Any] | None] | None = None,
        fetchall_values: list[list[dict[str, Any]]] | None = None,
    ) -> None:
        self.fetchone_values = fetchone_values or []
        self.fetchall_values = fetchall_values or []
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> "FakeCursor":
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


class FloorLayoutRepositoryFilterTests(unittest.TestCase):
    def test_fetch_layouts_by_floor_excludes_deleted(self) -> None:
        cursor = FakeCursor(fetchall_values=[[]])
        conn = FakeConnection(cursor)

        fetch_floor_layouts_by_floor(conn, tenant_id="1", floor_id="2")

        sql, params = cursor.executions[0]
        self.assertIn("fl.status = ANY(%s)", sql)
        self.assertNotIn("!=", sql)
        self.assertEqual(params, ("1", "2", ["DRAFT", "ARCHIVED", "PUBLISHED"]))

    def test_fetch_layout_by_id_excludes_deleted(self) -> None:
        cursor = FakeCursor(fetchone_values=[None])
        conn = FakeConnection(cursor)

        fetch_floor_layout_by_id(conn, tenant_id="1", layout_id="10")

        sql, params = cursor.executions[0]
        self.assertIn("fl.status = ANY(%s)", sql)
        self.assertEqual(params, ("1", "10", ["DRAFT", "ARCHIVED", "PUBLISHED"]))


class SoftDeleteFloorLayoutRepositoryTests(unittest.TestCase):
    def test_soft_delete_updates_only_floor_layouts_and_restricts_source_statuses(
        self,
    ) -> None:
        cursor = FakeCursor(
            fetchone_values=[
                {"layout_id": "10"},
                {"layout_id": "10", "status": "DELETED"},
            ]
        )
        conn = FakeConnection(cursor)

        result = soft_delete_floor_layout(conn, tenant_id="1", layout_id="10")

        update_sql, update_params = cursor.executions[0]
        self.assertIn("UPDATE floor_layouts", update_sql)
        self.assertIn("status = ANY(%s)", update_sql)
        self.assertEqual(
            update_params,
            ("DELETED", "1", "10", ["DRAFT", "ARCHIVED"]),
        )

        for sql, _ in cursor.executions:
            self.assertNotIn("layout_seat_mappings", sql)
            self.assertNotIn("DELETE FROM", sql)

        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "DELETED")

    def test_soft_delete_returns_none_when_status_not_eligible(self) -> None:
        """PUBLISHED and already-DELETED rows never match the UPDATE WHERE clause."""
        cursor = FakeCursor(fetchone_values=[None])
        conn = FakeConnection(cursor)

        result = soft_delete_floor_layout(conn, tenant_id="1", layout_id="10")

        self.assertIsNone(result)
        self.assertEqual(len(cursor.executions), 1)


class LayoutSeatMappingConfigurationVisibilityTests(unittest.TestCase):
    def test_mapping_lookup_joins_floor_layouts_and_excludes_deleted(self) -> None:
        cursor = FakeCursor(fetchone_values=[None])
        conn = FakeConnection(cursor)

        fetch_layout_seat_mapping_by_id(
            conn,
            tenant_id="1",
            layout_seat_mapping_id="20",
        )

        sql, params = cursor.executions[0]
        self.assertIn("JOIN floor_layouts", sql)
        self.assertIn("fl.status = ANY(%s)", sql)
        self.assertEqual(params, ("1", "20", ["DRAFT", "ARCHIVED", "PUBLISHED"]))


if __name__ == "__main__":
    unittest.main()
