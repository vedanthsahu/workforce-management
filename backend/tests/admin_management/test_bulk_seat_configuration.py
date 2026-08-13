from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.location import BulkSeatConfigurationUpdateRequest
from backend.services.location_service import update_seats_configuration_bulk

TENANT_ADMIN_CALLER = {"user_id": "1", "email": "admin@example.com", "role_name": "TENANT_ADMIN"}


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _seat_row(seat_id: str, *, layout_id: str | None = None) -> dict[str, object]:
    return {
        "seat_id": seat_id,
        "site_id": "1",
        "building_id": "1",
        "floor_id": "1",
        "layout_id": layout_id,
        "seat_code": f"SEAT-{seat_id}",
        "status": "ACTIVE",
        "is_bookable": True,
    }


class BulkSeatConfigurationServiceTests(unittest.TestCase):
    def test_applies_same_configuration_to_every_seat(self) -> None:
        conn = FakeConnection()
        payload = BulkSeatConfigurationUpdateRequest(seat_ids=[1, 2, 3], is_bookable=False)

        fetched = [_seat_row("1"), _seat_row("2"), _seat_row("3")]
        updated = [
            {**_seat_row("1"), "is_bookable": False},
            {**_seat_row("2"), "is_bookable": False},
            {**_seat_row("3"), "is_bookable": False},
        ]

        with (
            patch(
                "backend.services.location_service.fetch_seat_configuration",
                side_effect=fetched,
            ),
            patch(
                "backend.services.location_service.update_seat_configuration",
                side_effect=updated,
            ) as mock_update,
            patch("backend.services.location_service.safe_write_audit_log") as mock_audit,
        ):
            responses = update_seats_configuration_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=TENANT_ADMIN_CALLER,
            )

        self.assertEqual([r.seat_id for r in responses], ["1", "2", "3"])
        self.assertTrue(all(r.is_bookable is False for r in responses))
        self.assertEqual(mock_update.call_count, 3)
        for call in mock_update.call_args_list:
            self.assertEqual(call.kwargs["updates"], {"is_bookable": False})
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)
        # One audit entry per configured seat.
        self.assertEqual(mock_audit.call_count, 3)

    def test_deduplicates_repeated_seat_ids(self) -> None:
        conn = FakeConnection()
        payload = BulkSeatConfigurationUpdateRequest(seat_ids=[5, 5, 5], status="INACTIVE")

        with (
            patch(
                "backend.services.location_service.fetch_seat_configuration",
                return_value=_seat_row("5"),
            ) as mock_fetch,
            patch(
                "backend.services.location_service.update_seat_configuration",
                return_value={**_seat_row("5"), "status": "INACTIVE"},
            ),
            patch("backend.services.location_service.safe_write_audit_log"),
        ):
            responses = update_seats_configuration_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=TENANT_ADMIN_CALLER,
            )

        self.assertEqual(len(responses), 1)
        mock_fetch.assert_called_once()

    def test_unknown_seat_rolls_back_the_whole_batch(self) -> None:
        """All-or-nothing: if any seat in the batch is not found, none of
        the earlier seats in the batch should remain updated."""
        conn = FakeConnection()
        payload = BulkSeatConfigurationUpdateRequest(seat_ids=[1, 2], is_bookable=True)

        with (
            patch(
                "backend.services.location_service.fetch_seat_configuration",
                side_effect=[_seat_row("1"), None],
            ),
            patch(
                "backend.services.location_service.update_seat_configuration",
                return_value={**_seat_row("1"), "is_bookable": True},
            ),
            patch("backend.services.location_service.safe_write_audit_log") as mock_audit,
        ):
            with self.assertRaises(HTTPException) as context:
                update_seats_configuration_bulk(
                    conn,
                    tenant_id="1",
                    payload=payload,
                    current_user=TENANT_ADMIN_CALLER,
                )

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)
        # Failure audit written once for the whole batch, not per seat.
        mock_audit.assert_called_once()
        self.assertEqual(mock_audit.call_args.kwargs["event_status"], "FAILURE")

    def test_stamps_each_distinct_parent_layout_exactly_once(self) -> None:
        """Seats in the batch that share a layout_id must only stamp that
        layout once; a seat with no layout_id (pre-tracking data) must not
        be stamped at all."""
        conn = FakeConnection()
        payload = BulkSeatConfigurationUpdateRequest(seat_ids=[1, 2, 3], is_bookable=False)

        fetched = [
            _seat_row("1", layout_id="100"),
            _seat_row("2", layout_id="100"),
            _seat_row("3", layout_id=None),
        ]
        updated = [
            {**_seat_row("1", layout_id="100"), "is_bookable": False},
            {**_seat_row("2", layout_id="100"), "is_bookable": False},
            {**_seat_row("3", layout_id=None), "is_bookable": False},
        ]

        with (
            patch(
                "backend.services.location_service.fetch_seat_configuration",
                side_effect=fetched,
            ),
            patch(
                "backend.services.location_service.update_seat_configuration",
                side_effect=updated,
            ),
            patch("backend.services.location_service.safe_write_audit_log"),
            patch(
                "backend.services.location_service.touch_floor_layout_updated_by",
            ) as mock_touch,
        ):
            update_seats_configuration_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=TENANT_ADMIN_CALLER,
            )

        mock_touch.assert_called_once_with(
            conn, tenant_id="1", layout_id="100", updated_by_user_id="1"
        )
        self.assertEqual(conn.commits, 1)

    def test_rejects_immutable_fields_like_the_single_seat_endpoint(self) -> None:
        conn = FakeConnection()
        payload = BulkSeatConfigurationUpdateRequest(seat_ids=[1], status="ACTIVE", map_x=10)

        with self.assertRaises(HTTPException) as context:
            update_seats_configuration_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=TENANT_ADMIN_CALLER,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "immutable_field_update")
        self.assertEqual(conn.rollbacks, 0)


if __name__ == "__main__":
    unittest.main()
