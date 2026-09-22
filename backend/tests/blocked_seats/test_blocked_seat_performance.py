"""Regression checks for the blocked-seat-only query paths."""
from datetime import date, timedelta
from unittest import TestCase
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from backend.api.routes.admin_blocked_seats import blockable_floor_layout
from backend.repositories.blocked_seat_repository import (
    fetch_blockable_floor_layout,
    fetch_blocked_seat_summary,
    fetch_blocked_seats,
    insert_blocked_seats,
)
from backend.schemas.blocked_seat import BlockedSeatListQuery


class BlockedSeatQueryTests(TestCase):
    def setUp(self):
        self.conn = MagicMock()
        self.cur = self.conn.cursor.return_value.__enter__.return_value
        self.layout = {"layout_id": "44", "layout_name": "Floor A", "layout_file_url": "/map.svg"}
        self.cur.fetchone.return_value = self.layout
        self.args = dict(tenant_id="7", floor_id=16,
                         blocked_from=date(2026, 9, 10), blocked_to=date(2026, 9, 12))

    def test_metadata_skips_resource_and_booking_queries(self):
        result = fetch_blockable_floor_layout(self.conn, **self.args, view="metadata")
        self.assertEqual(result["resources"], [])
        self.cur.execute.assert_called_once()
        self.cur.fetchall.assert_not_called()

    def test_schedule_reuses_layout_endpoint_and_returns_current_and_future(self):
        self.cur.fetchall.return_value = [
            {"layout_id": "44", "layout_name": "Current"},
            {"layout_id": "45", "layout_name": "Future"},
        ]
        result = fetch_blockable_floor_layout(self.conn, **self.args, view="schedule")
        self.assertEqual(len(result["layouts"]), 2)
        self.cur.execute.assert_called_once()
        self.cur.fetchone.assert_not_called()

    def test_default_view_retains_availability_query(self):
        self.cur.fetchall.return_value = [{"resource_id": "501"}]
        result = fetch_blockable_floor_layout(self.conn, **self.args)
        self.assertEqual(result["resources"], [{"resource_id": "501"}])
        self.assertEqual(self.cur.execute.call_count, 2)
        self.assertIn("AS has_booking", self.cur.execute.call_args.args[0])
        self.assertNotIn("conflicts", result)

    def test_conflicts_are_scoped_and_paginated_in_sql_with_lookahead(self):
        self.cur.fetchall.return_value = [{"booking_id": str(i)} for i in range(3)]
        result = fetch_blockable_floor_layout(self.conn, **self.args,
                                             view="conflicts", page=2, limit=2)
        self.assertEqual(len(result["conflicts"]), 2)
        self.assertTrue(result["has_more_conflicts"])
        sql, params = self.cur.execute.call_args.args
        self.assertIn("b.tenant_id = %s", sql)
        self.assertIn("st.layout_id = %s", sql)
        self.assertIn("LIMIT %s OFFSET %s", sql)
        self.assertIn("'CONFIRMED', 'CHECKED_IN', 'COMPLETED'", sql)
        self.assertEqual(params, ("7", 16, "44", date(2026, 9, 10), date(2026, 9, 12), 3, 2))
        self.assertEqual(self.cur.execute.call_count, 2)

    def test_conflicts_last_page_and_missing_layout(self):
        self.cur.fetchall.return_value = [{"booking_id": "1"}]
        result = fetch_blockable_floor_layout(self.conn, **self.args, view="conflicts", limit=2)
        self.assertFalse(result["has_more_conflicts"])
        self.cur.reset_mock()
        self.cur.fetchone.return_value = None
        self.assertIsNone(fetch_blockable_floor_layout(self.conn, **self.args, view="conflicts"))
        self.cur.execute.assert_called_once()

    def test_dashboard_count_keeps_filters_without_display_joins(self):
        self.cur.fetchall.return_value = []
        self.cur.fetchone.return_value = {"total": 0}
        fetch_blocked_seats(self.conn, tenant_id="7",
                            query=BlockedSeatListQuery(search="repair", floor_id=16),
                            reference_date=date(2026, 9, 10), page=1, limit=10)
        sql, params = self.cur.execute.call_args.args
        self.assertIn("JOIN seats", sql)
        self.assertIn("bs.floor_id = %s", sql)
        self.assertNotIn("JOIN app_users", sql)
        self.assertNotIn("JOIN buildings", sql)
        self.assertNotIn("JOIN floors", sql)
        self.assertIn("%repair%", params)
        self.assertIn(16, params)

    def test_all_category_applies_filters_without_card_category_condition(self):
        self.cur.fetchall.return_value = []
        self.cur.fetchone.return_value = {"total": 0}

        fetch_blocked_seats(
            self.conn,
            tenant_id="7",
            query=BlockedSeatListQuery(category="all", site_id=4),
            reference_date=date(2026, 9, 22),
            page=1,
            limit=10,
        )

        count_sql, count_params = self.cur.execute.call_args.args
        self.assertIn("bs.site_id = %s", count_sql)
        self.assertNotIn("bs.blocked_from > %s", count_sql)
        self.assertNotIn("BETWEEN bs.blocked_from AND bs.blocked_to", count_sql)
        self.assertEqual(count_params, ["7", 4])

    def test_summary_avoids_unneeded_joins(self):
        self.cur.fetchone.return_value = {"active_blocks": 1}
        fetch_blocked_seat_summary(self.conn, tenant_id="7",
                                  query=BlockedSeatListQuery(), reference_date=date(2026, 9, 10))
        sql, params = self.cur.execute.call_args.args
        self.assertNotIn("JOIN seats", sql)
        self.assertNotIn("JOIN app_users", sql)
        self.assertIn("JOIN sites", sql)  # Site timezone is needed for today's count.
        self.assertEqual(params[-1], "7")

    @patch("backend.repositories.blocked_seat_repository.execute_values")
    def test_selection_is_inserted_in_one_batch(self, execute):
        seats = [{"id": i, "site_id": 1, "building_id": 2, "floor_id": 16} for i in range(1, 201)]
        execute.return_value = [(str(i),) for i in range(1, 201)]
        result = insert_blocked_seats(self.conn, tenant_id="7", seats=seats,
                                     block_type="Operational block", blocked_from=date(2026, 9, 10),
                                     blocked_to=date(2026, 9, 12), reason="Repair", blocked_by_user_id="9")
        execute.assert_called_once()
        self.assertEqual(len(execute.call_args.args[2]), 200)
        self.assertEqual(execute.call_args.kwargs["page_size"], 200)
        self.assertEqual(len(result), 200)
        self.conn.commit.assert_not_called()  # The service owns the transaction.


class ConflictPermissionTests(TestCase):
    @patch("backend.api.routes.admin_blocked_seats.get_blockable_floor_layout")
    def test_conflict_details_preserve_booking_view_permission(self, get_layout):
        args = dict(floor_id=16, blocked_from=date(2026, 9, 10),
                    blocked_to=date(2026, 9, 12), conn=MagicMock(), view="conflicts")
        with self.assertRaises(HTTPException) as error:
            blockable_floor_layout(current_user={"tenant_id": "7", "permissions": ["seat:block"]}, **args)
        self.assertEqual(error.exception.status_code, 403)
        get_layout.assert_not_called()
        for permission in ("booking:view_all", "admin_dashboard:view"):
            blockable_floor_layout(current_user={"tenant_id": "7", "permissions": ["seat:block", permission]}, **args)
        self.assertEqual(get_layout.call_count, 2)


class BatchRollbackTests(TestCase):
    def test_batch_conflict_rolls_back_without_partial_commit(self):
        from contextlib import ExitStack

        from psycopg2.errors import ExclusionViolation

        from backend.schemas.blocked_seat import CreateBlockedSeatsRequest
        from backend.services.blocked_seat_service import create_blocked_seats

        class Overlap(ExclusionViolation):
            @property
            def pgcode(self):
                return "23P01"

        conn = MagicMock()
        prefix = "backend.services.blocked_seat_service."
        seats = [{"id": i, "seat_code": str(i), "floor_id": 16,
                  "status": "ACTIVE", "is_bookable": True} for i in (501, 502)]
        with ExitStack() as stack:
            stack.enter_context(patch(prefix + "fetch_seats_for_block", return_value=seats))
            stack.enter_context(patch(prefix + "fetch_blockable_floor_layout", return_value={
                "resources": [{"resource_id": str(i)} for i in (501, 502)]}))
            stack.enter_context(patch(prefix + "fetch_conflicting_booking_seat_codes", return_value=[]))
            insert = stack.enter_context(patch(prefix + "insert_blocked_seats", side_effect=Overlap()))
            stack.enter_context(patch(prefix + "safe_write_audit_log"))
            with self.assertRaises(HTTPException) as error:
                start = date.today()
                create_blocked_seats(conn, tenant_id="7", current_user={"user_id": "9"},
                    payload=CreateBlockedSeatsRequest(seat_ids=[501, 502], block_type="Operational block",
                        blocked_from=start, blocked_to=start + timedelta(days=2), reason="Repair"))
            self.assertEqual(error.exception.status_code, 409)
            self.assertEqual(insert.call_args.kwargs["seats"], seats)
        conn.rollback.assert_called_once()
        conn.commit.assert_not_called()
