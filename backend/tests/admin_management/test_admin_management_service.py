from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.location import (
    CreateFloorRequest,
    CreateSiteRequest,
    SeatConfigurationUpdateRequest,
    UpdateSiteRequest,
)
from backend.schemas.preferences import CreateAmenityRequest, UpdateAmenityRequest
from backend.services.location_service import (
    create_floor,
    create_site,
    update_seat_configuration_metadata,
    update_site_metadata,
)
from backend.services.preferences_service import create_amenity, update_amenity_metadata


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class AdminManagementServiceTests(unittest.TestCase):
    def test_create_site_rejects_duplicate_tenant_code(self) -> None:
        conn = FakeConnection()
        payload = CreateSiteRequest(
            site_code=" blr ",
            site_name="Bangalore",
            city="Bengaluru",
            country="India",
            timezone="Asia/Kolkata",
        )

        with patch(
            "backend.services.location_service.fetch_site_duplicates",
            return_value=[{"site_code": "BLR", "site_name": "Other"}],
        ), self.assertRaises(HTTPException) as context:
            create_site(conn, tenant_id="1", payload=payload)

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "duplicate_site_code")
        self.assertEqual(payload.site_code, "BLR")
        self.assertEqual(conn.rollbacks, 1)

    def test_update_site_rejects_immutable_fields(self) -> None:
        conn = FakeConnection()
        payload = UpdateSiteRequest(site_code="MUM")

        with self.assertRaises(HTTPException) as context:
            update_site_metadata(
                conn,
                tenant_id="1",
                site_id="2",
                payload=payload,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "immutable_field_update")
        self.assertEqual(conn.rollbacks, 0)

    def test_create_floor_validates_building_belongs_to_site(self) -> None:
        conn = FakeConnection()
        payload = CreateFloorRequest(
            site_id=2,
            building_id=3,
            floor_code=" l1 ",
            floor_name="Level 1",
        )

        with patch(
            "backend.services.location_service.fetch_building_by_id",
            return_value={"building_id": "3", "site_id": "99"},
        ), self.assertRaises(HTTPException) as context:
            create_floor(conn, tenant_id="1", payload=payload)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_hierarchy")
        self.assertEqual(payload.floor_code, "L1")
        self.assertEqual(conn.rollbacks, 1)

    def test_seat_configuration_rejects_layout_and_coordinate_fields(self) -> None:
        conn = FakeConnection()
        payload = SeatConfigurationUpdateRequest(status="ACTIVE", map_x=10)

        with self.assertRaises(HTTPException) as context:
            update_seat_configuration_metadata(
                conn,
                tenant_id="1",
                seat_id="4",
                payload=payload,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "immutable_field_update")
        self.assertEqual(conn.rollbacks, 0)

    def test_create_amenity_rejects_cross_tenant_or_missing_category(self) -> None:
        conn = FakeConnection()
        payload = CreateAmenityRequest(
            amenity_key=" monitor ",
            amenity_name="Monitor",
            category_id=10,
        )

        with patch(
            "backend.services.preferences_service.fetch_amenity_category_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            create_amenity(conn, tenant_id="1", payload=payload)

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(context.exception.detail["code"], "amenity_category_not_found")
        self.assertEqual(payload.amenity_key, "MONITOR")
        self.assertEqual(conn.rollbacks, 1)

    def test_update_amenity_rejects_immutable_key(self) -> None:
        conn = FakeConnection()
        payload = UpdateAmenityRequest(amenity_key="PARKING")

        with self.assertRaises(HTTPException) as context:
            update_amenity_metadata(
                conn,
                tenant_id="1",
                amenity_id="5",
                payload=payload,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "immutable_field_update")
        self.assertEqual(conn.rollbacks, 0)


if __name__ == "__main__":
    unittest.main()
