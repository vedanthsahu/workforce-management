from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.user_management import AdminUserAccessUpdateRequest
from backend.services.user_management_service import admin_update_user_access_service


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


CALLER = {"user_id": "1", "tenant_id": "3", "role_name": "TENANT_ADMIN"}


def _target(role_name: str) -> dict:
    return {
        "id": "15",
        "user_id": "15",
        "tenant_id": "3",
        "email": "target@example.com",
        "full_name": "Target User",
        "role_name": role_name,
        "status": "ACTIVE",
    }


class PeerAdminDemotionProtectionTests(unittest.TestCase):
    """Regression coverage: PATCH /admin/users/{id}/access must reject any
    change to a target who currently holds TENANT_ADMIN or PRODUCT_ADMIN,
    regardless of the payload -- closing the API-level bypass of the
    previously UI-only 'Admin role not able to change' guard."""

    def test_rejects_role_change_on_tenant_admin_target(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
        ) as mock_update, patch(
            "backend.services.user_management_service.revoke_all_user_sessions",
        ) as mock_revoke, self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(role_name="EMPLOYEE"),
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail["code"], "protected_target_role"
        )
        mock_update.assert_not_called()
        mock_revoke.assert_not_called()
        self.assertEqual(conn.commits, 0)

    def test_rejects_status_change_on_tenant_admin_target(self) -> None:
        """Deactivating an admin is just as dangerous as demoting one --
        both must be blocked, not only role_name changes."""
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
        ) as mock_update, self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(status="INACTIVE"),
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail["code"], "protected_target_role"
        )
        mock_update.assert_not_called()

    def test_rejects_change_on_product_admin_target(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("PRODUCT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
        ) as mock_update, self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(status="INACTIVE"),
            )

        self.assertEqual(context.exception.status_code, 403)
        mock_update.assert_not_called()

    def test_allows_change_on_non_admin_target(self) -> None:
        conn = FakeConnection()
        updated = {**_target("MANAGER"), "role_name": "EMPLOYEE"}

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("MANAGER"),
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
            return_value=updated,
        ) as mock_update, patch(
            "backend.services.user_management_service.revoke_all_user_sessions",
        ) as mock_revoke, patch(
            "backend.services.user_management_service.record_auth_event",
        ):
            response = admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(role_name="EMPLOYEE"),
            )

        self.assertEqual(response.role_name, "EMPLOYEE")
        mock_update.assert_called_once()
        mock_revoke.assert_called_once()
        self.assertEqual(conn.commits, 1)

    def test_self_modification_is_still_blocked(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
        ) as mock_fetch, self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id=CALLER["user_id"],
                payload=AdminUserAccessUpdateRequest(status="INACTIVE"),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(
            context.exception.detail["code"], "self_modification_not_allowed"
        )
        mock_fetch.assert_not_called()

    def test_nonexistent_target_still_returns_404(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=None,
        ), self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="999",
                payload=AdminUserAccessUpdateRequest(status="INACTIVE"),
            )

        self.assertEqual(context.exception.status_code, 404)

    def test_still_rejects_granting_an_admin_role(self) -> None:
        """Pydantic's Literal already rejects this at the schema layer --
        confirm it can never even reach the service."""
        with self.assertRaises(ValueError):
            AdminUserAccessUpdateRequest(role_name="TENANT_ADMIN")


if __name__ == "__main__":
    unittest.main()
