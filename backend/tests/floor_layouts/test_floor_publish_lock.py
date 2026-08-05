from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.floor_layout_service import activate_floor_layout

CALLER = {"tenant_id": "1", "user_id": "5", "role_name": "TENANT_ADMIN"}

DRAFT_LAYOUT = {
    "layout_id": "10",
    "tenant_id": "1",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "12",
    "layout_name": "v2",
    "layout_file_url": "https://example.com/v2.svg",
    "file_storage_provider": "S3",
    "layout_type": "SVG",
    "version_no": 2,
    "status": "DRAFT",
    "is_published": False,
    "uploaded_by_user_id": "5",
    "updated_by_user_id": "5",
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class ActivateFloorLayoutLockTests(unittest.TestCase):
    """No unique index enforces "one PUBLISHED layout per floor" at the DB
    level -- acquire_floor_publish_lock is what actually closes the race
    between two concurrent activate requests for the same floor. Must run
    before archive/activate, or it doesn't protect anything."""

    def test_lock_failure_prevents_archive_and_activate(self) -> None:
        conn = FakeConnection()

        with (
            patch(
                "backend.services.floor_layout_service.fetch_floor_layout_by_id",
                return_value=dict(DRAFT_LAYOUT),
            ),
            patch(
                "backend.services.floor_layout_service.acquire_floor_publish_lock",
                side_effect=HTTPException(status_code=418, detail="lock reached"),
            ),
            patch(
                "backend.services.floor_layout_service.archive_existing_published_layouts",
            ) as mock_archive,
            patch(
                "backend.services.floor_layout_service.activate_floor_layout_record",
            ) as mock_activate,
            patch("backend.services.floor_layout_service.safe_write_audit_log"),
        ):
            with self.assertRaises(HTTPException) as context:
                activate_floor_layout(conn, current_user=CALLER, layout_id="10")

        self.assertEqual(context.exception.status_code, 418)
        mock_archive.assert_not_called()
        mock_activate.assert_not_called()
        self.assertEqual(conn.rollbacks, 1)

    def test_lock_scoped_to_the_layouts_floor(self) -> None:
        conn = FakeConnection()

        with (
            patch(
                "backend.services.floor_layout_service.fetch_floor_layout_by_id",
                return_value=dict(DRAFT_LAYOUT),
            ),
            patch(
                "backend.services.floor_layout_service.acquire_floor_publish_lock",
            ) as mock_lock,
            patch(
                "backend.services.floor_layout_service.archive_existing_published_layouts",
            ),
            patch(
                "backend.services.floor_layout_service.activate_floor_layout_record",
                return_value=dict(DRAFT_LAYOUT, status="PUBLISHED", is_published=True),
            ),
            patch(
                "backend.services.floor_layout_service.publish_layout_seat_configurations",
            ),
            patch(
                "backend.services.floor_layout_service.reconcile_published_layout_seats",
            ),
            patch("backend.services.floor_layout_service.safe_write_audit_log"),
        ):
            activate_floor_layout(conn, current_user=CALLER, layout_id="10")

        mock_lock.assert_called_once_with(conn, tenant_id="1", floor_id="12")
        self.assertEqual(conn.commits, 1)

    def test_already_published_layout_skips_the_lock_entirely(self) -> None:
        """No-op path: nothing changes, so nothing needs to serialize."""
        conn = FakeConnection()
        published_layout = dict(DRAFT_LAYOUT, status="PUBLISHED", is_published=True)

        with (
            patch(
                "backend.services.floor_layout_service.fetch_floor_layout_by_id",
                return_value=published_layout,
            ),
            patch(
                "backend.services.floor_layout_service.acquire_floor_publish_lock",
            ) as mock_lock,
        ):
            activate_floor_layout(conn, current_user=CALLER, layout_id="10")

        mock_lock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
