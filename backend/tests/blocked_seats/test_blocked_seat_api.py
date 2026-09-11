from __future__ import annotations

import unittest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.routing import APIRoute
from pydantic import ValidationError

from backend.schemas.blocked_seat import BlockedSeatListQuery, CreateBlockedSeatsRequest
from backend.services.blocked_seat_service import create_blocked_seats, get_blocked_seats
from backend.api.routes.admin_blocked_seats import router


def _row(block_id: str = "10") -> dict[str, object]:
    return {
        "block_id": block_id, "seat_id": "501", "seat_code": "3570",
        "site_id": "1", "site_name": "Site 10",
        "building_id": "14", "building_name": "Building 14",
        "floor_id": "16", "floor_name": "Floor 16",
        "blocked_from": date(2026, 9, 10), "blocked_to": date(2026, 9, 12),
        "block_type": "MAINTENANCE", "reason": "Cable repair",
        "display_status": "ACTIVE", "blocked_by_user_id": "7",
        "blocked_by_name": "Admin User", "created_at": datetime(2026, 9, 10, tzinfo=timezone.utc),
    }


class BlockedSeatSchemaTests(unittest.TestCase):
    def test_create_request_rejects_invalid_date_range(self) -> None:
        with self.assertRaises(ValidationError):
            CreateBlockedSeatsRequest(
                seat_ids=[501], block_type="MAINTENANCE",
                blocked_from=date(2026, 9, 12), blocked_to=date(2026, 9, 10), reason="Repair",
            )

    def test_create_request_rejects_duplicate_seats(self) -> None:
        with self.assertRaises(ValidationError):
            CreateBlockedSeatsRequest(
                seat_ids=[501, 501], block_type="MAINTENANCE",
                blocked_from=date(2026, 9, 10), blocked_to=date(2026, 9, 12), reason="Repair",
            )


class BlockedSeatRouteTests(unittest.TestCase):
    def test_routes_are_registered(self) -> None:
        operations = {
            (route.path, method)
            for route in router.routes
            if isinstance(route, APIRoute)
            for method in route.methods
        }
        self.assertIn(("/admin/blocked-seats", "GET"), operations)
        self.assertIn(("/admin/blocked-seats", "POST"), operations)
        self.assertIn(("/admin/blocked-seats/{block_id}/cancel", "POST"), operations)

class BlockedSeatServiceTests(unittest.TestCase):
    @patch("backend.services.blocked_seat_service.fetch_blocked_seat_summary")
    @patch("backend.services.blocked_seat_service.fetch_blocked_seats")
    def test_list_returns_summary_and_pagination(self, fetch_rows: MagicMock, fetch_summary: MagicMock) -> None:
        fetch_rows.return_value = ([_row()], 1)
        fetch_summary.return_value = {
            "active_blocks": 1, "seats_blocked_today": 1, "upcoming_blocks": 0,
            "expiring_soon": 1, "expired": 0,
        }
        response = get_blocked_seats(
            MagicMock(), tenant_id="1", query=BlockedSeatListQuery(category="active"), page=1, limit=20,
        )
        self.assertEqual(response.pagination.total, 1)
        self.assertEqual(response.summary.active_blocks, 1)
        self.assertEqual(response.items[0].seat_code, "3570")

    @patch("backend.services.blocked_seat_service.fetch_blocked_seat_summary")
    @patch("backend.services.blocked_seat_service.fetch_blocked_seats")
    def test_list_filters_do_not_change_summary_query(
        self, fetch_rows: MagicMock, fetch_summary: MagicMock,
    ) -> None:
        fetch_rows.return_value = ([], 0)
        fetch_summary.return_value = {
            "active_blocks": 5, "seats_blocked_today": 0,
            "upcoming_blocks": 0, "expiring_soon": 0, "expired": 2,
        }
        query = BlockedSeatListQuery(
            category="active", search="testing", site_id=1,
            building_id=2, floor_id=3, block_type="MAINTENANCE",
            selected_date=date(2026, 9, 11),
        )

        response = get_blocked_seats(
            MagicMock(), tenant_id="1", query=query, page=1, limit=20,
        )

        summary_query = fetch_summary.call_args.kwargs["query"]
        self.assertIsNone(summary_query.search)
        self.assertIsNone(summary_query.site_id)
        self.assertIsNone(summary_query.building_id)
        self.assertIsNone(summary_query.floor_id)
        self.assertIsNone(summary_query.block_type)
        self.assertIsNone(summary_query.selected_date)
        self.assertEqual(response.summary.active_blocks, 5)

    @patch("backend.services.blocked_seat_service.safe_write_audit_log")
    @patch("backend.services.blocked_seat_service.fetch_blocked_seats_by_ids")
    @patch("backend.services.blocked_seat_service.insert_blocked_seat")
    @patch("backend.services.blocked_seat_service.fetch_conflicting_booking_seat_codes")
    @patch("backend.services.blocked_seat_service.fetch_seats_for_block")
    def test_create_is_transactional(
        self, fetch_seats: MagicMock, fetch_conflicts: MagicMock, insert: MagicMock,
        fetch_created: MagicMock, _audit: MagicMock,
    ) -> None:
        conn = MagicMock()
        fetch_seats.return_value = [{"id": 501, "seat_code": "3570", "site_id": 1, "building_id": 14, "floor_id": 16, "status": "ACTIVE", "is_bookable": True}]
        fetch_conflicts.return_value = []
        insert.return_value = "10"
        fetch_created.return_value = [_row()]
        response = create_blocked_seats(
            conn, tenant_id="1",
            payload=CreateBlockedSeatsRequest(seat_ids=[501], block_type="MAINTENANCE", blocked_from=date(2026, 9, 10), blocked_to=date(2026, 9, 12), reason="Repair"),
            current_user={"user_id": "7", "tenant_id": "1"},
        )
        conn.commit.assert_called_once()
        self.assertEqual(response.created_count, 1)

    @patch("backend.services.blocked_seat_service.safe_write_audit_log")
    @patch("backend.services.blocked_seat_service.fetch_conflicting_booking_seat_codes")
    @patch("backend.services.blocked_seat_service.fetch_seats_for_block")
    def test_create_rejects_booking_conflict(self, fetch_seats: MagicMock, fetch_conflicts: MagicMock, _audit: MagicMock) -> None:
        conn = MagicMock()
        fetch_seats.return_value = [{"id": 501, "seat_code": "3570", "status": "ACTIVE", "is_bookable": True}]
        fetch_conflicts.return_value = ["3570"]
        with self.assertRaises(HTTPException) as context:
            create_blocked_seats(
                conn, tenant_id="1",
                payload=CreateBlockedSeatsRequest(seat_ids=[501], block_type="RESERVED", blocked_from=date(2026, 9, 10), blocked_to=date(2026, 9, 12), reason="Reserved"),
                current_user={"user_id": "7", "tenant_id": "1"},
            )
        self.assertEqual(context.exception.status_code, 409)
        conn.rollback.assert_called_once()


if __name__ == "__main__":
    unittest.main()
