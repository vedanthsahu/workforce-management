from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.guest_repository import create_guest, update_guest
from backend.repositories.user_repository import (
    create_app_user_from_graph,
    sync_app_user_from_graph,
    update_user_profile,
)


class FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchone(self):
        return {"id": "1"}


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class AppUserNameCapitalizationTests(unittest.TestCase):
    """Every path that writes app_users.full_name -- first-time SSO
    creation, later SSO re-sync, and self-service profile edits -- must
    apply the same capitalization, or the same person's name renders
    differently depending on which path last touched their row."""

    def test_create_app_user_from_graph_capitalizes(self) -> None:
        cursor = FakeCursor()
        create_app_user_from_graph(
            FakeConnection(cursor),
            tenant_id="1",
            microsoft_object_id="obj-1",
            email="amit.kumar@example.com",
            full_name="amit kumar",
            user_principal_name=None,
            display_name=None,
            mobile_phone=None,
            office_location=None,
            job_title=None,
            department=None,
            company_name=None,
            employee_id=None,
            manager_user_id=None,
        )
        _, params = cursor.executions[0]
        self.assertIn("Amit Kumar", params)
        self.assertNotIn("amit kumar", params)

    def test_sync_app_user_from_graph_capitalizes(self) -> None:
        cursor = FakeCursor()
        sync_app_user_from_graph(
            FakeConnection(cursor),
            tenant_id="1",
            user_id="1",
            microsoft_object_id="obj-1",
            email="amit.kumar@example.com",
            full_name="amit kumar",
            user_principal_name=None,
            display_name=None,
            role_name="EMPLOYEE",
            mobile_phone=None,
            office_location=None,
        )
        _, params = cursor.executions[0]
        self.assertIn("Amit Kumar", params)

    def test_update_user_profile_capitalizes_when_supplied(self) -> None:
        cursor = FakeCursor()
        update_user_profile(
            FakeConnection(cursor),
            tenant_id="1",
            user_id="1",
            full_name="amit kumar",
        )
        _, params = cursor.executions[0]
        self.assertIn("Amit Kumar", params)

    def test_update_user_profile_leaves_other_fields_untouched_when_name_omitted(self) -> None:
        """COALESCE(%s, full_name) semantics: omitting full_name must still
        pass None through, not silently invent/blank the name."""
        cursor = FakeCursor()
        update_user_profile(
            FakeConnection(cursor),
            tenant_id="1",
            user_id="1",
            display_name="Something",
        )
        _, params = cursor.executions[0]
        self.assertIsNone(params[0])


class GuestNameCapitalizationTests(unittest.TestCase):
    def test_create_guest_capitalizes(self) -> None:
        cursor = FakeCursor()
        create_guest(
            FakeConnection(cursor),
            tenant_id="1",
            full_name="kishore nandan",
            email=None,
            phone=None,
            organization=None,
            created_by_user_id="1",
        )
        _, params = cursor.executions[0]
        self.assertIn("Kishore Nandan", params)

    def test_update_guest_capitalizes_full_name_when_present(self) -> None:
        cursor = FakeCursor()
        update_guest(
            FakeConnection(cursor),
            tenant_id="1",
            guest_id="1",
            updates={"full_name": "kishore nandan"},
        )
        _, params = cursor.executions[0]
        self.assertIn("Kishore Nandan", params)

    def test_update_guest_does_not_touch_other_fields(self) -> None:
        """Only full_name gets the name treatment -- email/phone/
        organization must pass through byte-for-byte."""
        cursor = FakeCursor()
        update_guest(
            FakeConnection(cursor),
            tenant_id="1",
            guest_id="1",
            updates={"email": "Some.Mixed@Case.com"},
        )
        _, params = cursor.executions[0]
        self.assertIn("Some.Mixed@Case.com", params)


if __name__ == "__main__":
    unittest.main()
