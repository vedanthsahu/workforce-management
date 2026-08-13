from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.location import LayoutSeatConfigurationUpdateRequest
from backend.services.location_service import update_layout_seat_configuration


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
        "seat_name": "Desk 1",
        "seat_type": "STANDARD",
        "status": "ACTIVE",
        "is_bookable": True,
        "is_reserved": False,
        "amenity_ids": [],
    }
    base.update(overrides)
    return base


class UpdateLayoutSeatConfigurationVisibilityTests(unittest.TestCase):
    def test_rejects_mapping_belonging_to_deleted_layout(self) -> None:
        """fetch_layout_seat_mapping_by_id already excludes mappings whose
        parent floor layout is DELETED, so this must surface as a plain
        404 like any other missing mapping."""
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}
        payload = LayoutSeatConfigurationUpdateRequest(seat_name="Desk 1")

        with patch(
            "backend.services.location_service.fetch_layout_seat_mapping_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            update_layout_seat_configuration(
                conn,
                tenant_id=str(current_user["tenant_id"]),
                layout_seat_mapping_id="20",
                payload=payload,
                current_user=current_user,
            )

        self.assertEqual(context.exception.status_code, 404)


def _draft_layout(layout_id: str = "100") -> dict[str, object]:
    return {"layout_id": layout_id, "status": "DRAFT"}


def _published_layout(layout_id: str = "100") -> dict[str, object]:
    return {"layout_id": layout_id, "status": "PUBLISHED"}


class UpdateLayoutSeatConfigurationParentLayoutTouchTests(unittest.TestCase):
    """A single-mapping edit must stamp floor_layouts.updated_by_user_id
    for the mapping's parent layout, exactly like the bulk endpoint does --
    otherwise `updated_by` on floor_layouts silently drifts out of sync
    with the mapping data it's supposed to summarize."""

    def test_stamps_the_mapping_parent_layout_on_success(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}
        payload = LayoutSeatConfigurationUpdateRequest(seat_name="Desk 1")

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                return_value=_mapping_row("20", layout_id="100"),
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("20"),
            ),
            patch(
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_draft_layout(),
            ),
            patch(
                "backend.services.location_service.touch_floor_layout_updated_by",
            ) as mock_touch,
        ):
            update_layout_seat_configuration(
                conn,
                tenant_id=str(current_user["tenant_id"]),
                layout_seat_mapping_id="20",
                payload=payload,
                current_user=current_user,
            )

        mock_touch.assert_called_once_with(
            conn, tenant_id="1", layout_id="100", updated_by_user_id="5"
        )
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)


class UpdateLayoutSeatConfigurationPublishedCascadeTests(unittest.TestCase):
    """A single-mapping edit against a PUBLISHED layout has no separate
    "push the draft live" step (same rationale as the bulk endpoint), so it
    must cascade into seats/seat_amenities in the same transaction --
    otherwise an admin editing one already-live seat gets a 200 while the
    seat bookings actually read from stays stale."""

    def test_published_layout_cascades_into_seats_and_amenities(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}
        payload = LayoutSeatConfigurationUpdateRequest(status="INACTIVE")

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                return_value=_mapping_row("20", layout_id="100"),
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("20", status="INACTIVE"),
            ),
            patch(
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_published_layout(),
            ),
            patch(
                "backend.services.location_service.upsert_operational_seat",
                return_value={"seat_id": "999"},
            ) as mock_upsert,
            patch(
                "backend.services.location_service.replace_seat_amenities",
            ) as mock_replace_amenities,
            patch("backend.services.location_service.touch_floor_layout_updated_by"),
        ):
            update_layout_seat_configuration(
                conn,
                tenant_id=str(current_user["tenant_id"]),
                layout_seat_mapping_id="20",
                payload=payload,
                current_user=current_user,
            )

        mock_upsert.assert_called_once()
        self.assertEqual(mock_upsert.call_args.kwargs["layout_id"], "100")
        self.assertEqual(mock_upsert.call_args.kwargs["seat_code"], "SEAT-20")
        self.assertEqual(mock_upsert.call_args.kwargs["status"], "INACTIVE")

        mock_replace_amenities.assert_called_once_with(
            conn,
            tenant_id="1",
            seat_id="999",
            amenity_ids=[],
            assigned_by_user_id="5",
        )
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_draft_layout_does_not_cascade(self) -> None:
        """Draft isolation still holds for DRAFT/ARCHIVED layouts -- only a
        PUBLISHED layout has no separate publish step to rely on."""
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}
        payload = LayoutSeatConfigurationUpdateRequest(status="INACTIVE")

        with (
            patch(
                "backend.services.location_service.fetch_layout_seat_mapping_by_id",
                return_value=_mapping_row("20", layout_id="100"),
            ),
            patch(
                "backend.services.location_service.update_layout_seat_mapping_configuration",
                return_value=_updated_row("20", status="INACTIVE"),
            ),
            patch(
                "backend.services.location_service.fetch_floor_layout_by_id",
                return_value=_draft_layout(),
            ),
            patch(
                "backend.services.location_service.upsert_operational_seat",
            ) as mock_upsert,
            patch(
                "backend.services.location_service.replace_seat_amenities",
            ) as mock_replace_amenities,
            patch("backend.services.location_service.touch_floor_layout_updated_by"),
        ):
            update_layout_seat_configuration(
                conn,
                tenant_id=str(current_user["tenant_id"]),
                layout_seat_mapping_id="20",
                payload=payload,
                current_user=current_user,
            )

        mock_upsert.assert_not_called()
        mock_replace_amenities.assert_not_called()
        self.assertEqual(conn.commits, 1)


if __name__ == "__main__":
    unittest.main()
