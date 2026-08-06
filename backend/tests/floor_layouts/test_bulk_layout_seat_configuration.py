from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.location import BulkLayoutSeatConfigurationUpdateRequest
from backend.services.location_service import update_layout_seat_configurations_bulk

CALLER = {"tenant_id": "1", "user_id": "5"}


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _mapping_row(mapping_id: str) -> dict[str, object]:
    return {
        "id": mapping_id,
        "layout_id": "100",
        "floor_id": "12",
        "seat_code": f"SEAT-{mapping_id}",
    }


def _updated_row(mapping_id: str, **overrides) -> dict[str, object]:
    base = {
        "id": mapping_id,
        "seat_name": None,
        "seat_type": "STANDARD",
        "status": "ACTIVE",
        "is_bookable": True,
        "is_reserved": False,
        "amenity_ids": [],
    }
    base.update(overrides)
    return base


class BulkLayoutSeatConfigurationServiceTests(unittest.TestCase):
    """Bulk variant of the layout-seat draft configuration endpoint. Must
    preserve the same draft isolation as the single-mapping endpoint: only
    layout_seat_mappings is touched, never seats."""

    def test_applies_same_configuration_to_every_mapping(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            layout_seat_mapping_ids=[1, 2, 3],
            is_reserved=True,
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                side_effect=[_mapping_row("1"), _mapping_row("2"), _mapping_row("3")],
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                side_effect=[
                    _updated_row("1", is_reserved=True),
                    _updated_row("2", is_reserved=True),
                    _updated_row("3", is_reserved=True),
                ],
            ) as mock_update,
        ):
            responses = update_layout_seat_configurations_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=CALLER,
            )

        self.assertEqual(
            [r.layout_seat_mapping_id for r in responses], ["1", "2", "3"]
        )
        self.assertTrue(all(r.is_reserved is True for r in responses))
        self.assertEqual(mock_update.call_count, 3)
        for call in mock_update.call_args_list:
            self.assertEqual(call.kwargs["is_reserved"], True)
            self.assertEqual(call.kwargs["updated_by"], "5")
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_deduplicates_repeated_mapping_ids(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            layout_seat_mapping_ids=[7, 7, 7],
            status="INACTIVE",
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                return_value=_mapping_row("7"),
            ) as mock_fetch,
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("7", status="INACTIVE"),
            ),
        ):
            responses = update_layout_seat_configurations_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=CALLER,
            )

        self.assertEqual(len(responses), 1)
        mock_fetch.assert_called_once()

    def test_unknown_mapping_rolls_back_the_whole_batch(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            layout_seat_mapping_ids=[1, 2],
            seat_type="STANDING_DESK",
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                side_effect=[_mapping_row("1"), None],
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("1", seat_type="STANDING_DESK"),
            ),
        ):
            with self.assertRaises(HTTPException) as context:
                update_layout_seat_configurations_bulk(
                    conn,
                    tenant_id="1",
                    payload=payload,
                    current_user=CALLER,
                )

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_never_touches_the_seats_table(self) -> None:
        """Draft isolation: this must call the layout_seat_mappings repo
        functions only, never anything that writes to `seats`."""
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            layout_seat_mapping_ids=[1],
            status="ACTIVE",
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                return_value=_mapping_row("1"),
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("1"),
            ),
            patch(
                "backend.services.location_service.update_seat_configuration",
            ) as mock_seats_update,
        ):
            update_layout_seat_configurations_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=CALLER,
            )

        mock_seats_update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
