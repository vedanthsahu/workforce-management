from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.booking_repository import (
    fetch_available_seats,
    fetch_available_seats_by_range,
    fetch_seat_for_booking,
)
from backend.repositories.dashboard_repository import fetch_admin_dashboard_summary
from backend.repositories.floor_layout_repository import (
    reconcile_published_layout_seats,
)
from backend.repositories.location_repository import (
    fetch_seat_configuration,
    fetch_site_by_id,
    upsert_operational_seat,
)


class FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchone(self):
        return None

    def fetchall(self):
        return []


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class SeatQueriesOnlyConsiderPublishedLayoutTests(unittest.TestCase):
    """Every query that decides which seats exist/are available/count for a
    floor must be scoped to that floor's currently PUBLISHED layout --
    otherwise seats left over from a superseded layout get double-counted
    or become bookable as ghost seats."""

    def test_fetch_seat_for_booking_requires_published_layout_and_active_chain(self) -> None:
        cursor = FakeCursor()
        fetch_seat_for_booking(
            FakeConnection(cursor),
            tenant_id="1", site_id="1", building_id="1", floor_id="1", seat_id="99",
        )
        sql, _ = cursor.executions[0]
        self.assertIn("floor_layouts", sql)
        self.assertIn("is_published = TRUE", sql)
        self.assertIn("fl.status = 'PUBLISHED'", sql)
        self.assertIn("fl.id = s.layout_id", sql)
        self.assertIn("si.status = 'ACTIVE'", sql)
        self.assertIn("bu.status = 'ACTIVE'", sql)
        self.assertIn("f.status = 'ACTIVE'", sql)

    def test_fetch_available_seats_by_range_requires_published_layout_and_active_chain(self) -> None:
        cursor = FakeCursor()
        fetch_available_seats_by_range(
            FakeConnection(cursor),
            tenant_id="1", floor_id="1",
            start_date=date(2026, 1, 1), end_date=date(2026, 1, 2),
            amenity_ids=[],
        )
        sql, _ = cursor.executions[0]
        self.assertIn("floor_layouts", sql)
        self.assertIn("is_published = TRUE", sql)
        self.assertIn("fl.status = 'PUBLISHED'", sql)
        self.assertIn("fl.id = s.layout_id", sql)
        self.assertIn("flr.status = 'ACTIVE'", sql)
        self.assertIn("bldg.status = 'ACTIVE'", sql)
        self.assertIn("st.status = 'ACTIVE'", sql)

    def test_fetch_available_seats_single_date_requires_published_layout(self) -> None:
        cursor = FakeCursor()
        fetch_available_seats(
            FakeConnection(cursor),
            tenant_id="1", floor_id="1", booking_date=date(2026, 1, 1), amenity_ids=[],
        )
        sql, _ = cursor.executions[0]
        self.assertIn("floor_layouts", sql)
        self.assertIn("is_published = TRUE", sql)
        self.assertIn("fl.id = s.layout_id", sql)

    def test_fetch_seat_configuration_default_ignores_layout_currency(self) -> None:
        """Admin seat-management must still be able to find a stale seat in
        order to fix it -- the default (used by single/bulk seat config)
        must NOT filter by published layout."""
        cursor = FakeCursor()
        fetch_seat_configuration(FakeConnection(cursor), tenant_id="1", seat_id="99")
        sql, _ = cursor.executions[0]
        self.assertNotIn("floor_layouts", sql)

    def test_fetch_seat_configuration_opt_in_requires_published_layout(self) -> None:
        """The booking-eligibility path opts in explicitly."""
        cursor = FakeCursor()
        fetch_seat_configuration(
            FakeConnection(cursor), tenant_id="1", seat_id="99", require_current_layout=True,
        )
        sql, _ = cursor.executions[0]
        self.assertIn("floor_layouts", sql)
        self.assertIn("is_published = TRUE", sql)
        self.assertIn("status = 'PUBLISHED'", sql)

    def test_dashboard_summary_scopes_seats_to_published_layout(self) -> None:
        cursor = FakeCursor()
        fetch_admin_dashboard_summary(
            FakeConnection(cursor), tenant_id="1", selected_date=date(2026, 1, 1),
        )
        sql, _ = cursor.executions[0]
        self.assertIn("floor_layouts", sql)
        self.assertIn("sfl.is_published = TRUE", sql)
        self.assertIn("sfl.id = st.layout_id", sql)

    def test_site_detail_seat_counts_scoped_to_published_layout(self) -> None:
        cursor = FakeCursor()
        fetch_site_by_id(FakeConnection(cursor), tenant_id="1", site_id="1")
        sql, _ = cursor.executions[0]
        self.assertIn("floor_layouts", sql)
        self.assertIn("is_published = TRUE", sql)


class _FakeUpsertCursor(FakeCursor):
    def fetchone(self):
        return {"seat_id": "501"}


class UpsertOperationalSeatAppendOnlyTests(unittest.TestCase):
    def test_conflict_target_includes_layout_id(self) -> None:
        """Unique key is (floor_id, seat_code, layout_id): an upsert against
        the SAME layout_id updates in place (in-version edits); a new
        layout_id always inserts a fresh row instead of overwriting the
        previous version's, so seats is append-only across republishes."""
        cursor = _FakeUpsertCursor()
        upsert_operational_seat(
            FakeConnection(cursor),
            tenant_id="1", layout_id="10", site_id="1", building_id="1",
            floor_id="2", seat_code="A-1", seat_type="STANDARD",
            status="ACTIVE", is_bookable=True, svg_element_id="svg-1",
        )
        sql, _ = cursor.executions[0]
        self.assertIn("ON CONFLICT", sql)
        self.assertIn("floor_id,", sql)
        self.assertIn("seat_code,", sql)
        self.assertIn("layout_id", sql)
        self.assertNotIn("layout_id = EXCLUDED.layout_id", sql)


class ReconcilePublishedLayoutSeatsAppendOnlyTests(unittest.TestCase):
    """seats is append-only per layout version (unique key floor_id,
    seat_code, layout_id): reconciling a newly published layout must only
    ever retire the previous version's still-live rows, never delete
    anything -- bookings/audit_logs must keep pointing at the exact
    historical seat row they were made against."""

    def test_retires_by_layout_id_never_deletes(self) -> None:
        cursor = FakeCursor()
        reconcile_published_layout_seats(
            FakeConnection(cursor), tenant_id="1", floor_id="2", layout_id="10",
        )

        self.assertEqual(len(cursor.executions), 1)
        sql, params = cursor.executions[0]
        self.assertIn("UPDATE seats", sql)
        self.assertNotIn("DELETE", sql)
        self.assertIn("status = 'INACTIVE'", sql)
        self.assertIn("is_bookable = FALSE", sql)
        self.assertIn("live_until = NOW()", sql)
        self.assertIn("layout_id <> %s", sql)
        self.assertIn("live_until IS NULL", sql)
        self.assertEqual(params, ("1", "2", "10"))


if __name__ == "__main__":
    unittest.main()
