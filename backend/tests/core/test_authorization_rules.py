"""Unit tests for backend/core/authorization.py.

These rules decide who may create, change and check in bookings and
visits for every route that uses them, so each rule is pinned down here
for every role, including the dormant MANAGER role and malformed input.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.authorization import (
    can_check_in_out_guest_visit,
    can_create_for_user,
    can_manage_resource,
    current_user_id,
    is_guest_operator,
    user_role,
)


def _user(role: str | None, user_id: str = "10") -> dict:
    user = {"user_id": user_id, "tenant_id": "3"}
    if role is not None:
        user["role_name"] = role
    return user


class UserRoleNormalizationTests(unittest.TestCase):
    def test_role_is_read_from_role_name_then_role(self) -> None:
        self.assertEqual(user_role({"role_name": "facilitator"}), "FACILITATOR")
        self.assertEqual(user_role({"role": " tenant_admin "}), "TENANT_ADMIN")

    def test_missing_role_is_empty_string_not_an_error(self) -> None:
        self.assertEqual(user_role({}), "")

    def test_space_form_of_front_office_is_not_normalized_here(self) -> None:
        # deps.get_current_user -> attach_permissions_to_user converts
        # "FRONT OFFICE" to "FRONT_OFFICE" before services run. This module
        # relies on that; it does not normalize the space form itself.
        self.assertEqual(user_role({"role_name": "FRONT OFFICE"}), "FRONT OFFICE")
        self.assertFalse(can_check_in_out_guest_visit({"role_name": "FRONT OFFICE"}))

    def test_current_user_id_falls_back_to_id(self) -> None:
        self.assertEqual(current_user_id({"id": 7}), "7")
        self.assertEqual(current_user_id({}), "")


class CanCreateForUserTests(unittest.TestCase):
    def test_every_role_can_create_for_self(self) -> None:
        for role in ("EMPLOYEE", "FACILITATOR", "FRONT_OFFICE", "TENANT_ADMIN", "MANAGER", None):
            with self.subTest(role=role):
                self.assertTrue(can_create_for_user(_user(role), subject_user_id="10"))

    def test_self_match_is_type_insensitive(self) -> None:
        self.assertTrue(can_create_for_user(_user("EMPLOYEE", "10"), subject_user_id=10))

    def test_only_admin_and_facilitator_create_for_others(self) -> None:
        expected = {
            "EMPLOYEE": False,
            "FRONT_OFFICE": False,
            "MANAGER": False,
            "PRODUCT_ADMIN": False,
            "FACILITATOR": True,
            "TENANT_ADMIN": True,
        }
        for role, allowed in expected.items():
            with self.subTest(role=role):
                self.assertIs(can_create_for_user(_user(role), subject_user_id="99"), allowed)

    def test_missing_role_cannot_create_for_others(self) -> None:
        self.assertFalse(can_create_for_user(_user(None), subject_user_id="99"))

    def test_none_subject_is_not_treated_as_self(self) -> None:
        self.assertFalse(can_create_for_user(_user("EMPLOYEE"), subject_user_id=None))


class CanManageResourceTests(unittest.TestCase):
    def test_tenant_admin_bypasses_ownership(self) -> None:
        self.assertTrue(
            can_manage_resource(_user("TENANT_ADMIN"), created_by_user_id="1", subject_user_id="2")
        )

    def test_creator_and_subject_are_allowed(self) -> None:
        for role in ("EMPLOYEE", "FACILITATOR", "FRONT_OFFICE"):
            with self.subTest(role=role):
                self.assertTrue(can_manage_resource(_user(role), created_by_user_id="10", subject_user_id="2"))
                self.assertTrue(can_manage_resource(_user(role), created_by_user_id="1", subject_user_id="10"))

    def test_uninvolved_facilitator_has_no_bypass(self) -> None:
        self.assertFalse(
            can_manage_resource(_user("FACILITATOR"), created_by_user_id="1", subject_user_id="2")
        )

    def test_uninvolved_non_admin_roles_are_denied(self) -> None:
        for role in ("EMPLOYEE", "FRONT_OFFICE", "MANAGER", "PRODUCT_ADMIN", None):
            with self.subTest(role=role):
                self.assertFalse(can_manage_resource(_user(role), created_by_user_id="1", subject_user_id="2"))

    def test_missing_resource_ids_never_match_a_caller_without_id(self) -> None:
        # Only None is guarded. An empty-string id would match an empty
        # caller id (finding QA-INF-01); unreachable today because caller ids
        # come from app_users.id and resource ids are BIGINT columns.
        anonymous = {"tenant_id": "3", "role_name": "EMPLOYEE"}
        self.assertFalse(can_manage_resource(anonymous, created_by_user_id=None, subject_user_id=None))

    def test_integer_ids_match_string_caller_id(self) -> None:
        self.assertTrue(can_manage_resource(_user("EMPLOYEE", "10"), created_by_user_id=10))


class GuestRuleTests(unittest.TestCase):
    def test_only_front_office_checks_guests_in_and_out(self) -> None:
        expected = {"FRONT_OFFICE": True, "TENANT_ADMIN": False, "FACILITATOR": False, "EMPLOYEE": False, "MANAGER": False}
        for role, allowed in expected.items():
            with self.subTest(role=role):
                self.assertIs(can_check_in_out_guest_visit(_user(role)), allowed)

    def test_guest_operators_are_admin_and_facilitator_only(self) -> None:
        expected = {"FRONT_OFFICE": False, "TENANT_ADMIN": True, "FACILITATOR": True, "EMPLOYEE": False}
        for role, allowed in expected.items():
            with self.subTest(role=role):
                self.assertIs(is_guest_operator(_user(role)), allowed)


if __name__ == "__main__":
    unittest.main()
