from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.deps import require_any_permission
from backend.api.routes.admin_dashboard import router


class AdminDashboardRouteTests(unittest.TestCase):
    def test_admin_dashboard_routes_are_registered(self) -> None:
        route_paths = {
            route.path
            for route in router.routes
            if isinstance(route, APIRoute)
        }

        self.assertIn("/admin/dashboard/summary", route_paths)
        self.assertIn("/admin/activities", route_paths)
        self.assertIn("/admin/occupancy/date-range", route_paths)
        self.assertIn("/admin/occupancy/hierarchy", route_paths)

    def test_require_any_permission_allows_admin_roles(self) -> None:
        dependency = require_any_permission(["admin_dashboard:view"])
        current_user = {
            "role_name": "TENANT_ADMIN",
            "permissions": [],
        }

        self.assertIs(dependency(current_user), current_user)

    def test_require_any_permission_allows_any_matching_permission(self) -> None:
        dependency = require_any_permission(["admin_dashboard:view", "booking:view_all"])
        current_user = {
            "role_name": "EMPLOYEE",
            "permissions": ["booking:view_all"],
        }

        self.assertIs(dependency(current_user), current_user)

    def test_require_any_permission_rejects_missing_permissions(self) -> None:
        dependency = require_any_permission(["admin_dashboard:view", "occupancy:view"])

        with self.assertRaises(HTTPException) as context:
            dependency({"role_name": "EMPLOYEE", "permissions": []})

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail["code"],
            "insufficient_permissions",
        )


if __name__ == "__main__":
    unittest.main()
