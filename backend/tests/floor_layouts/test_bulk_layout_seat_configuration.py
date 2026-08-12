from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

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


def _mapping_row(mapping_id: str, *, layout_id: str = "100") -> dict[str, object]:
    return {
        "id": mapping_id,
        "layout_id": layout_id,
        "site_id": "1",
        "building_id": "1",
        "floor_id": "12",
        "seat_code": f"SEAT-{mapping_id}",
        "svg_element_id": f"svg-{mapping_id}",
    }


def _updated_row(mapping_id: str, **overrides) -> dict[str, object]:
    base = {
        "id": mapping_id,
        "layout_id": "100",
        "site_id": "1",
        "building_id": "1",
        "floor_id": "12",
        "seat_code": f"SEAT-{mapping_id}",
        "svg_element_id": f"svg-{mapping_id}",
        "seat_name": None,
        "seat_type": "STANDARD",
        "status": "ACTIVE",
        "is_bookable": True,
        "is_reserved": False,
        "amenity_ids": [],
    }
    base.update(overrides)
    return base


def _draft_layout(layout_id: str = "100") -> dict[str, object]:
    return {"layout_id": layout_id, "status": "DRAFT"}


def _published_layout(layout_id: str = "100") -> dict[str, object]:
    return {"layout_id": layout_id, "status": "PUBLISHED"}


class BulkLayoutSeatConfigurationServiceTests(unittest.TestCase):
    """Per-seat bulk layout-seat configuration. DRAFT/ARCHIVED layouts keep
    draft isolation (layout_seat_mappings only); PUBLISHED layouts cascade
    the same edits into seats/seat_amenities in the same transaction."""

    def test_defaults_apply_to_every_seat_that_omits_the_field(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            defaults={"is_reserved": True},
            seats=[
                {"layout_seat_mapping_id": 1},
                {"layout_seat_mapping_id": 2},
                {"layout_seat_mapping_id": 3},
            ],
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
            patch(
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_draft_layout(),
            ),
            patch(
                "backend.services.location_service.touch_floor_layout_updated_by",
            ) as mock_touch,
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
        mock_touch.assert_called_once_with(
            conn, tenant_id="1", layout_id="100", updated_by_user_id="5"
        )
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_per_seat_value_overrides_the_shared_default(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            defaults={"status": "ACTIVE"},
            seats=[
                {"layout_seat_mapping_id": 1},
                {"layout_seat_mapping_id": 2, "status": "INACTIVE"},
            ],
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                side_effect=[_mapping_row("1"), _mapping_row("2")],
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                side_effect=[
                    _updated_row("1", status="ACTIVE"),
                    _updated_row("2", status="INACTIVE"),
                ],
            ) as mock_update,
            patch(
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_draft_layout(),
            ),
            patch("backend.services.location_service.touch_floor_layout_updated_by"),
        ):
            update_layout_seat_configurations_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=CALLER,
            )

        self.assertEqual(mock_update.call_args_list[0].kwargs["status"], "ACTIVE")
        self.assertEqual(mock_update.call_args_list[1].kwargs["status"], "INACTIVE")

    def test_rejects_duplicate_mapping_ids_in_payload(self) -> None:
        """Silent dedup was the old behavior; a duplicate id in a per-seat
        payload is now ambiguous (two different configs for one seat?) so
        it's rejected outright at the schema layer."""
        with self.assertRaises(ValidationError):
            BulkLayoutSeatConfigurationUpdateRequest(
                seats=[
                    {"layout_seat_mapping_id": 7, "status": "ACTIVE"},
                    {"layout_seat_mapping_id": 7, "status": "INACTIVE"},
                ]
            )

    def test_unknown_mapping_rolls_back_the_whole_batch(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            seats=[
                {"layout_seat_mapping_id": 1, "seat_type": "STANDING_DESK"},
                {"layout_seat_mapping_id": 2, "seat_type": "STANDING_DESK"},
            ],
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

    def test_rejects_seats_from_two_different_layouts(self) -> None:
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            seats=[
                {"layout_seat_mapping_id": 1, "status": "ACTIVE"},
                {"layout_seat_mapping_id": 2, "status": "ACTIVE"},
            ],
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                side_effect=[
                    _mapping_row("1", layout_id="100"),
                    _mapping_row("2", layout_id="200"),
                ],
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("1", status="ACTIVE"),
            ),
        ):
            with self.assertRaises(HTTPException) as context:
                update_layout_seat_configurations_bulk(
                    conn,
                    tenant_id="1",
                    payload=payload,
                    current_user=CALLER,
                )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(
            context.exception.detail["code"], "mixed_layout_bulk_request"
        )
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_draft_layout_never_touches_the_seats_table(self) -> None:
        """Draft isolation: for a DRAFT/ARCHIVED layout this must never
        write to seats/seat_amenities."""
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            seats=[{"layout_seat_mapping_id": 1, "status": "ACTIVE"}],
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
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_draft_layout(),
            ),
            patch("backend.services.location_service.touch_floor_layout_updated_by"),
            patch(
                "backend.services.location_service.upsert_operational_seat",
            ) as mock_upsert_seat,
            patch(
                "backend.services.location_service.replace_seat_amenities",
            ) as mock_replace_amenities,
        ):
            update_layout_seat_configurations_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=CALLER,
            )

        mock_upsert_seat.assert_not_called()
        mock_replace_amenities.assert_not_called()

    def test_published_layout_cascades_edits_into_seats(self) -> None:
        """A layout that's already PUBLISHED has no separate publish step
        for a later edit -- the bulk save must push straight into
        seats/seat_amenities in the same call/transaction."""
        conn = FakeConnection()
        payload = BulkLayoutSeatConfigurationUpdateRequest(
            seats=[
                {"layout_seat_mapping_id": 1, "status": "ACTIVE", "amenity_ids": [9]},
                {"layout_seat_mapping_id": 2, "status": "ACTIVE"},
            ],
        )

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                side_effect=[_mapping_row("1"), _mapping_row("2")],
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                side_effect=[
                    _updated_row("1", status="ACTIVE", amenity_ids=[9]),
                    _updated_row("2", status="ACTIVE"),
                ],
            ),
            patch(
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_published_layout(),
            ),
            patch(
                "backend.services.location_service.touch_floor_layout_updated_by",
            ) as mock_touch,
            patch(
                "backend.services.location_service.upsert_operational_seat",
                side_effect=[{"seat_id": "501"}, {"seat_id": "502"}],
            ) as mock_upsert_seat,
            patch(
                "backend.services.location_service.replace_seat_amenities",
            ) as mock_replace_amenities,
        ):
            update_layout_seat_configurations_bulk(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=CALLER,
            )

        self.assertEqual(mock_upsert_seat.call_count, 2)
        self.assertEqual(mock_replace_amenities.call_count, 2)
        self.assertEqual(
            mock_replace_amenities.call_args_list[0].kwargs["seat_id"], "501"
        )
        self.assertEqual(
            mock_replace_amenities.call_args_list[0].kwargs["amenity_ids"], [9]
        )
        self.assertEqual(
            mock_replace_amenities.call_args_list[1].kwargs["amenity_ids"], []
        )
        mock_touch.assert_called_once_with(
            conn, tenant_id="1", layout_id="100", updated_by_user_id="5"
        )
        self.assertEqual(conn.commits, 1)


if __name__ == "__main__":
    unittest.main()
