from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.auth_service import get_auth_me_payload


class AuthDashboardCompatibilityTests(unittest.TestCase):
    def test_auth_me_preserves_legacy_role_and_profile_fields(self) -> None:
        current_user = {
            "user_id": "10",
            "tenant_id": "1",
            "email": "user@example.com",
            "full_name": "User One",
            "display_name": None,
            "role_name": "TENANT_ADMIN",
            "department": "Operations",
            "job_title": "Lead",
            "manager_user_id": None,
            "home_site_id": None,
            "permissions": ["admin_dashboard:view"],
        }

        with patch(
            "backend.services.auth_service.fetch_tenant_name_by_id",
            return_value="Tenant One",
        ):
            response = get_auth_me_payload(object(), current_user=current_user)

        payload = response.model_dump()
        self.assertEqual(payload["role"], "TENANT_ADMIN")
        self.assertEqual(payload["role_name"], "TENANT_ADMIN")
        self.assertEqual(payload["full_name"], "User One")
        self.assertEqual(payload["name"], "User One")
        self.assertEqual(payload["department"], "Operations")
        self.assertEqual(payload["tenant_name"], "Tenant One")


if __name__ == "__main__":
    unittest.main()
