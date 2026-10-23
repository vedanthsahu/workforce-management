from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.location import (
    CreateBuildingRequest,
    CreateFloorRequest,
    CreateSiteRequest,
    UpdateBuildingRequest,
    UpdateSiteRequest,
)
from backend.schemas.preferences import CreateAmenityRequest, UpdateAmenityRequest
from backend.services.location_service import (
    create_building,
    create_floor,
    create_site,
    update_building_metadata,
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


TENANT_ADMIN_CALLER = {"user_id": "1", "email": "admin@example.com", "role_name": "TENANT_ADMIN"}


class AdminManagementServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.current_user = {
            "tenant_id": "1",
            "user_id": "5",
            "role_name": "ADMIN",
        }

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
        ), patch(
            "backend.services.location_service.safe_write_audit_log",
        ), self.assertRaises(HTTPException) as context:
            create_site(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=self.current_user,
            )

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
                current_user=self.current_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "immutable_field_update")
        self.assertEqual(conn.rollbacks, 0)

    def test_update_site_metadata_deactivating_cascades_to_buildings_and_floors(self) -> None:
        conn = FakeConnection()
        payload = UpdateSiteRequest(status="INACTIVE")
        site = {
            "site_id": "2",
            "site_code": "BLR",
            "site_name": "Bangalore",
            "status": "ACTIVE",
        }

        with patch(
            "backend.services.location_service.fetch_site_by_id",
            return_value=site,
        ), patch(
            "backend.services.location_service.update_site",
            return_value={**site, "status": "INACTIVE"},
        ), patch(
            "backend.services.location_service.deactivate_buildings_by_site",
        ) as mock_deactivate_buildings, patch(
            "backend.services.location_service.deactivate_floors_by_site",
        ) as mock_deactivate_floors, patch(
            "backend.services.location_service.safe_write_audit_log",
        ):
            update_site_metadata(
                conn,
                tenant_id="1",
                site_id="2",
                payload=payload,
                current_user=self.current_user,
            )

        mock_deactivate_buildings.assert_called_once_with(conn, tenant_id="1", site_id="2")
        mock_deactivate_floors.assert_called_once_with(conn, tenant_id="1", site_id="2")
        self.assertEqual(conn.commits, 1)

    def test_update_site_metadata_reactivating_does_not_cascade(self) -> None:
        conn = FakeConnection()
        payload = UpdateSiteRequest(status="ACTIVE")
        site = {
            "site_id": "2",
            "site_code": "BLR",
            "site_name": "Bangalore",
            "status": "INACTIVE",
        }

        with patch(
            "backend.services.location_service.fetch_site_by_id",
            return_value=site,
        ), patch(
            "backend.services.location_service.update_site",
            return_value={**site, "status": "ACTIVE"},
        ), patch(
            "backend.services.location_service.deactivate_buildings_by_site",
        ) as mock_deactivate_buildings, patch(
            "backend.services.location_service.deactivate_floors_by_site",
        ) as mock_deactivate_floors, patch(
            "backend.services.location_service.safe_write_audit_log",
        ):
            update_site_metadata(
                conn,
                tenant_id="1",
                site_id="2",
                payload=payload,
                current_user=self.current_user,
            )

        mock_deactivate_buildings.assert_not_called()
        mock_deactivate_floors.assert_not_called()

    def test_update_building_metadata_deactivating_cascades_to_floors(self) -> None:
        conn = FakeConnection()
        payload = UpdateBuildingRequest(status="INACTIVE")
        building = {
            "building_id": "3",
            "site_id": "2",
            "site_name": "Bangalore",
            "building_code": "BLD1",
            "building_name": "Tower A",
            "status": "ACTIVE",
        }

        with patch(
            "backend.services.location_service.fetch_building_by_id",
            return_value=building,
        ), patch(
            "backend.services.location_service.update_building",
            return_value={**building, "status": "INACTIVE"},
        ), patch(
            "backend.services.location_service.deactivate_floors_by_building",
        ) as mock_deactivate_floors, patch(
            "backend.services.location_service.safe_write_audit_log",
        ):
            update_building_metadata(
                conn,
                tenant_id="1",
                building_id="3",
                payload=payload,
                current_user=self.current_user,
            )

        mock_deactivate_floors.assert_called_once_with(conn, tenant_id="1", building_id="3")
        self.assertEqual(conn.commits, 1)

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
        ), patch(
            "backend.services.location_service.safe_write_audit_log",
        ), self.assertRaises(HTTPException) as context:
            create_floor(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=self.current_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_hierarchy")
        self.assertEqual(payload.floor_code, "L1")
        self.assertEqual(conn.rollbacks, 1)

    def test_create_building_rejects_active_under_inactive_site(self) -> None:
        conn = FakeConnection()
        payload = CreateBuildingRequest(
            site_id=2,
            building_code="BLD1",
            building_name="Tower A",
            status="ACTIVE",
        )

        with patch(
            "backend.services.location_service.fetch_site_by_id",
            return_value={"site_id": "2", "status": "INACTIVE"},
        ), patch(
            "backend.services.location_service.safe_write_audit_log",
        ), self.assertRaises(HTTPException) as context:
            create_building(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=self.current_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_hierarchy")
        self.assertEqual(conn.rollbacks, 1)

    def test_create_building_allows_inactive_under_inactive_site(self) -> None:
        conn = FakeConnection()
        payload = CreateBuildingRequest(
            site_id=2,
            building_code="BLD1",
            building_name="Tower A",
            status="INACTIVE",
        )

        with patch(
            "backend.services.location_service.fetch_site_by_id",
            return_value={"site_id": "2", "status": "INACTIVE"},
        ), patch(
            "backend.services.location_service.fetch_building_duplicates",
            return_value=[],
        ), patch(
            "backend.services.location_service.insert_building",
            return_value={
                "building_id": "10",
                "site_id": "2",
                "site_name": "Bangalore",
                "building_code": "BLD1",
                "building_name": "Tower A",
                "status": "INACTIVE",
            },
        ), patch(
            "backend.services.location_service.safe_write_audit_log",
        ):
            result = create_building(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=self.current_user,
            )

        self.assertEqual(result.status, "INACTIVE")
        self.assertEqual(conn.commits, 1)

    def test_create_floor_rejects_active_under_inactive_building(self) -> None:
        conn = FakeConnection()
        payload = CreateFloorRequest(
            site_id=2,
            building_id=3,
            floor_code="L1",
            floor_name="Level 1",
            status="ACTIVE",
        )

        with patch(
            "backend.services.location_service.fetch_building_by_id",
            return_value={"building_id": "3", "site_id": "2", "status": "INACTIVE"},
        ), patch(
            "backend.services.location_service.safe_write_audit_log",
        ), self.assertRaises(HTTPException) as context:
            create_floor(
                conn,
                tenant_id="1",
                payload=payload,
                current_user=self.current_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_hierarchy")
        self.assertEqual(conn.rollbacks, 1)

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
