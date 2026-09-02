from __future__ import annotations

import sys
import unittest
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services import floor_layout_service as floor_layout_service_module
from backend.services.floor_layout_service import (
    LAYOUT_VISIBILITY_INTERVAL_UNIT,
    LAYOUT_VISIBILITY_PILOT_FLOOR_IDS,
    LAYOUT_VISIBILITY_THRESHOLDS,
    activate_floor_layout,
    delete_floor_layout,
    get_floor_layout_seats,
    get_floor_layouts_by_floor,
)


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _layout_row(*, layout_id: str = "10", status: str = "DRAFT") -> dict:
    now = datetime.now(UTC)
    return {
        "layout_id": layout_id,
        "tenant_id": "1",
        "site_id": "1",
        "building_id": "1",
        "floor_id": "1",
        "site_name": None,
        "building_name": None,
        "floor_name": None,
        "layout_name": "Layout A",
        "layout_file_url": "https://example.com/layout.svg",
        "file_storage_provider": "S3",
        "layout_type": "SVG",
        "version_no": 1,
        "is_published": status == "PUBLISHED",
        "layout_metadata": None,
        "uploaded_by_user_id": "5",
        "uploaded_by_name": None,
        "uploaded_by_email": None,
        "uploaded_by_role": None,
        "uploaded_by_department": None,
        "uploaded_by_job_title": None,
        "updated_by_user_id": "5",
        "updated_by_name": None,
        "updated_by_email": None,
        "updated_by_role": None,
        "updated_by_department": None,
        "updated_by_job_title": None,
        "published_by_user_id": None,
        "published_by_name": None,
        "published_by_email": None,
        "published_by_role": None,
        "published_by_department": None,
        "published_by_job_title": None,
        "published_at": None,
        "status": status,
        "created_at": now,
        "updated_at": now,
    }


class GetFloorLayoutsByFloorServiceTests(unittest.TestCase):
    """With LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS=True (today's setting),
    every floor gets the age-based visibility filter. Flipping that to
    False restricts it back down to LAYOUT_VISIBILITY_PILOT_FLOOR_IDS only
    -- both branches are exercised here since that flag is the entire
    pilot-vs-everywhere rollout mechanism."""

    def test_apply_to_all_floors_forwards_thresholds_for_any_floor(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layouts_by_floor",
            return_value=[_layout_row(status="DRAFT")],
        ) as mock_fetch, patch.object(
            floor_layout_service_module,
            "LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS",
            True,
        ):
            get_floor_layouts_by_floor(
                conn,
                current_user=current_user,
                floor_id="some-floor-not-in-the-pilot-set",
            )

        self.assertEqual(
            mock_fetch.call_args.kwargs["visibility_thresholds"],
            LAYOUT_VISIBILITY_THRESHOLDS,
        )
        self.assertEqual(
            mock_fetch.call_args.kwargs["visibility_unit"],
            LAYOUT_VISIBILITY_INTERVAL_UNIT,
        )

    def test_restricted_to_pilot_floors_forwards_thresholds_only_for_pilot(
        self,
    ) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}
        pilot_floor_id = next(iter(LAYOUT_VISIBILITY_PILOT_FLOOR_IDS))

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layouts_by_floor",
            return_value=[_layout_row(status="DRAFT")],
        ) as mock_fetch, patch.object(
            floor_layout_service_module,
            "LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS",
            False,
        ):
            get_floor_layouts_by_floor(
                conn, current_user=current_user, floor_id=pilot_floor_id,
            )
            self.assertEqual(
                mock_fetch.call_args.kwargs["visibility_thresholds"],
                LAYOUT_VISIBILITY_THRESHOLDS,
            )

            get_floor_layouts_by_floor(
                conn,
                current_user=current_user,
                floor_id="some-other-floor-not-in-the-pilot-set",
            )
            self.assertIsNone(mock_fetch.call_args.kwargs["visibility_thresholds"])


class DeleteFloorLayoutServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        audit_patcher = patch(
            "backend.services.floor_layout_service.safe_write_audit_log"
        )
        audit_patcher.start()
        self.addCleanup(audit_patcher.stop)

    def test_delete_draft_layout_succeeds(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=_layout_row(status="DRAFT"),
        ), patch(
            "backend.services.floor_layout_service.soft_delete_floor_layout",
            return_value=_layout_row(status="DELETED"),
        ) as mock_delete:
            response = delete_floor_layout(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        self.assertEqual(response.status, "DELETED")
        mock_delete.assert_called_once_with(conn, tenant_id="1", layout_id="10")
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_delete_archived_layout_succeeds(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=_layout_row(status="ARCHIVED"),
        ), patch(
            "backend.services.floor_layout_service.soft_delete_floor_layout",
            return_value=_layout_row(status="DELETED"),
        ):
            response = delete_floor_layout(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        self.assertEqual(response.status, "DELETED")
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_delete_published_layout_returns_409(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=_layout_row(status="PUBLISHED"),
        ), patch(
            "backend.services.floor_layout_service.soft_delete_floor_layout",
        ) as mock_delete, self.assertRaises(HTTPException) as context:
            delete_floor_layout(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(
            context.exception.detail["code"],
            "floor_layout_published",
        )
        mock_delete.assert_not_called()
        self.assertEqual(conn.rollbacks, 1)
        self.assertEqual(conn.commits, 0)

    def test_delete_nonexistent_layout_returns_404(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            delete_floor_layout(
                conn,
                current_user=current_user,
                layout_id="999",
            )

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(
            context.exception.detail["code"],
            "floor_layout_not_found",
        )
        self.assertEqual(conn.rollbacks, 1)

    def test_delete_already_deleted_layout_returns_404_not_conflict(self) -> None:
        """A DELETED layout must be indistinguishable from a missing one.

        fetch_floor_layout_by_id already excludes DELETED rows at the
        repository level, so the service sees None either way and must
        never surface a "layout is deleted" style message.
        """
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            delete_floor_layout(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        self.assertEqual(context.exception.status_code, 404)
        self.assertNotIn("delete", context.exception.detail["message"].lower())


class DeletedLayoutVisibilityServiceTests(unittest.TestCase):
    def test_activate_deleted_layout_returns_404(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            activate_floor_layout(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(
            context.exception.detail["code"],
            "floor_layout_not_found",
        )

    def test_get_seats_for_nonexistent_layout_returns_404(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=None,
        ) as mock_fetch_layout, patch(
            "backend.services.floor_layout_service.fetch_layout_seats_by_layout_id",
        ) as mock_fetch_seats, self.assertRaises(HTTPException) as context:
            get_floor_layout_seats(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        self.assertEqual(context.exception.status_code, 404)
        mock_fetch_seats.assert_not_called()
        mock_fetch_layout.assert_called_once_with(
            conn, tenant_id="1", layout_id="10", include_deleted=True,
        )

    def test_get_seats_for_deleted_layout_succeeds_as_view_only_entry(self) -> None:
        """Viewing a deleted layout's seats is allowed — the UI shows it as a
        read-only historical entry. Only actions (configure, activate) are
        blocked for a deleted layout, not viewing."""
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=_layout_row(status="DELETED"),
        ) as mock_fetch_layout, patch(
            "backend.services.floor_layout_service.fetch_layout_seats_by_layout_id",
            return_value=[],
        ) as mock_fetch_seats:
            response = get_floor_layout_seats(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        mock_fetch_seats.assert_called_once()
        mock_fetch_layout.assert_called_once_with(
            conn, tenant_id="1", layout_id="10", include_deleted=True,
        )
        self.assertEqual(response.total_seats, 0)

    def test_get_seats_for_existing_layout_succeeds(self) -> None:
        conn = FakeConnection()
        current_user = {"tenant_id": "1", "user_id": "5"}

        with patch(
            "backend.services.floor_layout_service.fetch_floor_layout_by_id",
            return_value=_layout_row(status="DRAFT"),
        ), patch(
            "backend.services.floor_layout_service.fetch_layout_seats_by_layout_id",
            return_value=[],
        ) as mock_fetch_seats:
            response = get_floor_layout_seats(
                conn,
                current_user=current_user,
                layout_id="10",
            )

        mock_fetch_seats.assert_called_once()
        self.assertEqual(response.total_seats, 0)


if __name__ == "__main__":
    unittest.main()
