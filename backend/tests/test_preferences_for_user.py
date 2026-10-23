from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.services.preferences_service import get_preferences_for_user

TARGET_USER = {"user_id": "15", "tenant_id": "3"}


class PreferencesForUserTests(unittest.TestCase):
    """GET /preferences/{user_id} -- replaces the old GET /dashboard/
    employee/{user_id}. Same delegation rule as originating a booking for
    someone else: self, TENANT_ADMIN, or FACILITATOR."""

    def _call(self, current_user: dict[str, str]):
        with patch(
            "backend.services.preferences_service.fetch_user_by_id",
            return_value=TARGET_USER,
        ), patch(
            "backend.services.preferences_service.fetch_user_work_preferences",
            return_value={"site_id": "10", "site_name": "Hyderabad"},
        ), patch(
            "backend.services.preferences_service.fetch_user_preferred_amenities",
            return_value=[],
        ):
            return get_preferences_for_user(
                conn=object(),
                current_user=current_user,
                target_user_id="15",
            )

    def test_self_can_view_own_preferences(self) -> None:
        response = self._call(
            {"user_id": "15", "tenant_id": "3", "role_name": "EMPLOYEE"}
        )
        self.assertEqual(response.site_id, "10")

    def test_tenant_admin_can_view_any_employees_preferences(self) -> None:
        response = self._call(
            {"user_id": "1", "tenant_id": "3", "role_name": "TENANT_ADMIN"}
        )
        self.assertEqual(response.site_id, "10")

    def test_facilitator_can_view_any_employees_preferences(self) -> None:
        response = self._call(
            {"user_id": "1", "tenant_id": "3", "role_name": "FACILITATOR"}
        )
        self.assertEqual(response.site_id, "10")

    def test_other_employee_cannot_view_another_employees_preferences(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._call({"user_id": "7", "tenant_id": "3", "role_name": "EMPLOYEE"})

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail["code"], "preferences_view_forbidden"
        )

    def test_unknown_user_is_404(self) -> None:
        with patch(
            "backend.services.preferences_service.fetch_user_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            get_preferences_for_user(
                conn=object(),
                current_user={"user_id": "1", "tenant_id": "3", "role_name": "TENANT_ADMIN"},
                target_user_id="999",
            )

        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
