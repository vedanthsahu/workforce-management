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
        self.rollbacks = 0

    def rollback(self) -> None:
        self.rollbacks += 1


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
        ):
            with self.assertRaises(HTTPException) as context:
                update_layout_seat_configuration(
                    conn,
                    tenant_id=str(current_user["tenant_id"]),
                    layout_seat_mapping_id="20",
                    payload=payload,
                    current_user=current_user,
                )

        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
