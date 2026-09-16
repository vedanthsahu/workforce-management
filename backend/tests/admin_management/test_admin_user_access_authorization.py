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


def _target(role_name: str, *, user_id: str = "15", status: str = "ACTIVE") -> dict:
    return {
        "id": user_id,
        "user_id": user_id,
        "tenant_id": "3",
        "email": "target@example.com",
        "full_name": "Target User",
        "role_name": role_name,
        "status": status,
    }


class PeerAdminDemotionProtectionTests(unittest.TestCase):
    """PATCH /admin/users/{id}/access:

    - PRODUCT_ADMIN targets can never be changed here, regardless of payload.
    - TENANT_ADMIN targets CAN now be changed (by another admin, or by
      themselves), and a Tenant Admin can promote any user straight to
      TENANT_ADMIN through the same endpoint -- but never a change that
      would leave the tenant with zero active Tenant Admins.
    """

    def test_allows_role_change_on_tenant_admin_target_when_other_admins_remain(self) -> None:
        conn = FakeConnection()
        updated = {**_target("TENANT_ADMIN"), "role_name": "EMPLOYEE"}

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.count_active_tenant_admins",
            return_value=1,
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

    def test_allows_status_change_on_tenant_admin_target_when_other_admins_remain(self) -> None:
        conn = FakeConnection()
        updated = {**_target("TENANT_ADMIN"), "status": "INACTIVE"}

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.count_active_tenant_admins",
            return_value=1,
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
            return_value=updated,
        ) as mock_update, patch(
            "backend.services.user_management_service.revoke_all_user_sessions",
        ), patch(
            "backend.services.user_management_service.record_auth_event",
        ):
            response = admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(status="INACTIVE"),
            )

        self.assertEqual(response.status, "INACTIVE")
        mock_update.assert_called_once()

    def test_blocks_demotion_that_would_remove_last_active_admin(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.count_active_tenant_admins",
            return_value=0,
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
        ) as mock_update, self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(role_name="EMPLOYEE"),
            )

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "last_admin_required")
        mock_update.assert_not_called()
        self.assertEqual(conn.commits, 0)

    def test_blocks_deactivation_that_would_remove_last_active_admin(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.count_active_tenant_admins",
            return_value=0,
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
        ) as mock_update, self.assertRaises(HTTPException) as context:
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(status="INACTIVE"),
            )

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "last_admin_required")
        mock_update.assert_not_called()

    def test_allows_reassigning_tenant_admin_to_itself_while_only_changing_status(self) -> None:
        """The frontend always resends the target's current role alongside
        any status change (no partial-field submission) -- TENANT_ADMIN ->
        TENANT_ADMIN must round-trip as a no-op, not get rejected as a
        'promotion'."""
        conn = FakeConnection()
        updated = {**_target("TENANT_ADMIN"), "status": "INACTIVE"}

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN"),
        ), patch(
            "backend.services.user_management_service.count_active_tenant_admins",
            return_value=1,
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
            return_value=updated,
        ) as mock_update, patch(
            "backend.services.user_management_service.revoke_all_user_sessions",
        ), patch(
            "backend.services.user_management_service.record_auth_event",
        ):
            admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(role_name="TENANT_ADMIN", status="INACTIVE"),
            )

        mock_update.assert_called_once()

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

    def test_self_modification_is_still_blocked_for_a_non_admin(self) -> None:
        conn = FakeConnection()

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("MANAGER", user_id=CALLER["user_id"]),
        ), self.assertRaises(HTTPException) as context:
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

    def test_allows_tenant_admin_self_modification(self) -> None:
        """A Tenant Admin managing another admin's access now also covers
        managing their own -- e.g. deactivating themselves."""
        conn = FakeConnection()
        updated = {**_target("TENANT_ADMIN", user_id=CALLER["user_id"]), "status": "INACTIVE"}

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("TENANT_ADMIN", user_id=CALLER["user_id"]),
        ), patch(
            "backend.services.user_management_service.count_active_tenant_admins",
            return_value=1,
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
            return_value=updated,
        ) as mock_update, patch(
            "backend.services.user_management_service.revoke_all_user_sessions",
        ), patch(
            "backend.services.user_management_service.record_auth_event",
        ):
            response = admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id=CALLER["user_id"],
                payload=AdminUserAccessUpdateRequest(role_name="TENANT_ADMIN", status="INACTIVE"),
            )

        self.assertEqual(response.status, "INACTIVE")
        mock_update.assert_called_once()

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

    def test_allows_promoting_a_non_admin_straight_to_tenant_admin(self) -> None:
        """A Tenant Admin can promote any user straight to TENANT_ADMIN
        through this same endpoint -- not just manage an existing admin."""
        conn = FakeConnection()
        updated = {**_target("MANAGER"), "role_name": "TENANT_ADMIN"}

        with patch(
            "backend.services.user_management_service.fetch_user_by_id",
            return_value=_target("MANAGER"),
        ), patch(
            "backend.services.user_management_service.admin_update_user_access",
            return_value=updated,
        ) as mock_update, patch(
            "backend.services.user_management_service.revoke_all_user_sessions",
        ), patch(
            "backend.services.user_management_service.record_auth_event",
        ):
            response = admin_update_user_access_service(
                conn,
                current_user=CALLER,
                target_user_id="15",
                payload=AdminUserAccessUpdateRequest(role_name="TENANT_ADMIN"),
            )

        self.assertEqual(response.role_name, "TENANT_ADMIN")
        mock_update.assert_called_once()
        self.assertEqual(conn.commits, 1)


if __name__ == "__main__":
    unittest.main()
