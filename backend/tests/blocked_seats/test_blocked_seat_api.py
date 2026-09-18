from __future__ import annotations

import unittest
from datetime import UTC, date, datetime
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.routing import APIRoute
from pydantic import ValidationError

from backend.api.routes.admin_blocked_seats import router
from backend.schemas.blocked_seat import (
    BlockedSeatListQuery,
    CreateBlockedSeatsRequest,
    UpdateBlockedSeatRequest,
)
from backend.services.blocked_seat_service import (
    create_blocked_seats,
    get_blockable_floor_layout,
    get_blocked_seats,
    update_seat_block,
)


def _row(block_id: str = "10") -> dict[str, object]:
    return {
        "block_id": block_id,
        "seat_id": "501",
        "seat_code": "3570",
        "site_id": "1",
        "site_name": "Site 10",
        "building_id": "14",
        "building_name": "Building 14",
        "floor_id": "16",
        "floor_name": "Floor 16",
        "blocked_from": date(2026, 9, 10),
        "blocked_to": date(2026, 9, 12),
        "block_type": "MAINTENANCE",
        "reason": "Cable repair",
        "display_status": "ACTIVE",
        "blocked_by_user_id": "7",
        "blocked_by_name": "Admin User",
        "created_at": datetime(2026, 9, 10, tzinfo=UTC),
    }


class BlockedSeatSchemaTests(unittest.TestCase):
    def test_create_request_rejects_invalid_date_range(self) -> None:
        with self.assertRaises(ValidationError):
            CreateBlockedSeatsRequest(
                seat_ids=[501],
                block_type="MAINTENANCE",
                blocked_from=date(2026, 9, 12),
                blocked_to=date(2026, 9, 10),
                reason="Repair",
            )

    def test_create_request_rejects_duplicate_seats(self) -> None:
        with self.assertRaises(ValidationError):
            CreateBlockedSeatsRequest(
                seat_ids=[501, 501],
                block_type="MAINTENANCE",
                blocked_from=date(2026, 9, 10),
                blocked_to=date(2026, 9, 12),
                reason="Repair",
            )

    def test_update_request_requires_at_least_one_change(self) -> None:
        with self.assertRaises(ValidationError):
            UpdateBlockedSeatRequest()


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
        self.assertIn(
            ("/admin/blocked-seats/floors/{floor_id}/layout-resources", "GET"),
            operations,
        )
        self.assertIn(("/admin/blocked-seats/{block_id}/cancel", "POST"), operations)
        self.assertIn(("/admin/blocked-seats/{block_id}", "PATCH"), operations)
        self.assertIn(("/admin/blocked-seats/{block_id}/history", "GET"), operations)


class BlockedSeatServiceTests(unittest.TestCase):
    @patch("backend.services.blocked_seat_service.safe_write_audit_log")
    @patch("backend.services.blocked_seat_service.update_blocked_seat")
    @patch("backend.services.blocked_seat_service.fetch_conflicting_booking_seat_codes")
    @patch("backend.services.blocked_seat_service.fetch_blockable_floor_layout")
    @patch("backend.services.blocked_seat_service.fetch_blocked_seats_by_ids")
    def test_update_validates_and_returns_updated_block(
        self,
        fetch_rows: MagicMock,
        fetch_layout: MagicMock,
        fetch_conflicts: MagicMock,
        update_row: MagicMock,
        audit: MagicMock,
    ) -> None:
        old = _row()
        updated = {**old, "blocked_to": date(2026, 9, 20), "reason": "Extended repair"}
        fetch_rows.side_effect = [[old], [updated]]
        fetch_layout.return_value = {"resources": [{"resource_id": "501"}]}
        fetch_conflicts.return_value = []
        update_row.return_value = True
        conn = MagicMock()

        response = update_seat_block(
            conn,
            tenant_id="1",
            block_id="10",
            payload=UpdateBlockedSeatRequest(
                blocked_to=date(2026, 9, 20), reason="Extended repair"
            ),
            current_user={"user_id": "7", "tenant_id": "1"},
        )

        self.assertEqual(response.blocked_to, date(2026, 9, 20))
        conn.commit.assert_called_once()
        audit.assert_called_once()

    @patch("backend.services.blocked_seat_service.fetch_blockable_floor_layout")
    def test_layout_range_must_resolve_to_one_effective_layout(
        self,
        fetch_layout: MagicMock,
    ) -> None:
        fetch_layout.return_value = None
        with self.assertRaises(HTTPException) as context:
            get_blockable_floor_layout(
                MagicMock(),
                tenant_id="1",
                floor_id=16,
                blocked_from=date(2026, 9, 11),
                blocked_to=date(2026, 9, 15),
            )
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(
            context.exception.detail["code"], "layout_effective_period_crossed"
        )

    @patch("backend.services.blocked_seat_service.fetch_blocked_seat_summary")
    @patch("backend.services.blocked_seat_service.fetch_blocked_seats")
    def test_list_returns_summary_and_pagination(
        self, fetch_rows: MagicMock, fetch_summary: MagicMock
    ) -> None:
        fetch_rows.return_value = ([_row()], 1)
        fetch_summary.return_value = {
            "active_blocks": 1,
            "seats_blocked_today": 1,
            "upcoming_blocks": 0,
            "expiring_soon": 1,
            "expired": 0,
        }
        response = get_blocked_seats(
            MagicMock(),
            tenant_id="1",
            query=BlockedSeatListQuery(category="active"),
            page=1,
            limit=20,
        )
        self.assertEqual(response.pagination.total, 1)
        self.assertEqual(response.summary.active_blocks, 1)
        self.assertEqual(response.items[0].seat_code, "3570")

    @patch("backend.services.blocked_seat_service.fetch_blocked_seat_summary")
    @patch("backend.services.blocked_seat_service.fetch_blocked_seats")
    def test_list_filters_do_not_change_summary_query(
        self,
        fetch_rows: MagicMock,
        fetch_summary: MagicMock,
    ) -> None:
        fetch_rows.return_value = ([], 0)
        fetch_summary.return_value = {
            "active_blocks": 5,
            "seats_blocked_today": 0,
            "upcoming_blocks": 0,
            "expiring_soon": 0,
            "expired": 2,
        }
        query = BlockedSeatListQuery(
            category="active",
            search="testing",
            site_id=1,
            building_id=2,
            floor_id=3,
            block_type="MAINTENANCE",
            selected_date=date(2026, 9, 11),
        )

        response = get_blocked_seats(
            MagicMock(),
            tenant_id="1",
            query=query,
            page=1,
            limit=20,
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
    @patch("backend.services.blocked_seat_service.insert_blocked_seats")
    @patch("backend.services.blocked_seat_service.fetch_conflicting_booking_seat_codes")
    @patch("backend.services.blocked_seat_service.fetch_blockable_floor_layout")
    @patch("backend.services.blocked_seat_service.fetch_seats_for_block")
    def test_create_is_transactional(
        self,
        fetch_seats: MagicMock,
        fetch_layout: MagicMock,
        fetch_conflicts: MagicMock,
        insert: MagicMock,
        fetch_created: MagicMock,
        _audit: MagicMock,
    ) -> None:
        conn = MagicMock()
        fetch_seats.return_value = [
            {
                "id": 501,
                "seat_code": "3570",
                "site_id": 1,
                "building_id": 14,
                "floor_id": 16,
                "status": "ACTIVE",
                "is_bookable": True,
            }
        ]
        fetch_layout.return_value = {"resources": [{"resource_id": "501"}]}
        fetch_conflicts.return_value = []
        insert.return_value = ["10"]
        fetch_created.return_value = [_row()]
        response = create_blocked_seats(
            conn,
            tenant_id="1",
            payload=CreateBlockedSeatsRequest(
                seat_ids=[501],
                block_type="MAINTENANCE",
                blocked_from=date(2026, 9, 10),
                blocked_to=date(2026, 9, 12),
                reason="Repair",
            ),
            current_user={"user_id": "7", "tenant_id": "1"},
        )
        conn.commit.assert_called_once()
        self.assertEqual(response.created_count, 1)

    @patch("backend.services.blocked_seat_service.safe_write_audit_log")
    @patch("backend.services.blocked_seat_service.fetch_conflicting_booking_seat_codes")
    @patch("backend.services.blocked_seat_service.fetch_blockable_floor_layout")
    @patch("backend.services.blocked_seat_service.fetch_seats_for_block")
    def test_create_rejects_booking_conflict(
        self,
        fetch_seats: MagicMock,
        fetch_layout: MagicMock,
        fetch_conflicts: MagicMock,
        _audit: MagicMock,
    ) -> None:
        conn = MagicMock()
        fetch_seats.return_value = [
            {
                "id": 501,
                "seat_code": "3570",
                "floor_id": 16,
                "status": "ACTIVE",
                "is_bookable": True,
            }
        ]
        fetch_layout.return_value = {"resources": [{"resource_id": "501"}]}
        fetch_conflicts.return_value = ["3570"]
        with self.assertRaises(HTTPException) as context:
            create_blocked_seats(
                conn,
                tenant_id="1",
                payload=CreateBlockedSeatsRequest(
                    seat_ids=[501],
                    block_type="RESERVED",
                    blocked_from=date(2026, 9, 10),
                    blocked_to=date(2026, 9, 12),
                    reason="Reserved",
                ),
                current_user={"user_id": "7", "tenant_id": "1"},
            )
        self.assertEqual(context.exception.status_code, 409)
        conn.rollback.assert_called_once()


if __name__ == "__main__":
    unittest.main()
