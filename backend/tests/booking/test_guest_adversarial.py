"""Adversarial unit tests for the guest domain
(backend/services/guest_service.py): who may operate on guests, the
front-office-only check-in rule, front-office data scoping, and visit
state rules.

Repository calls are mocked; see test_booking_adversarial.py for the
conventions. ``xfail(strict=True)`` marks an open finding.
"""

from __future__ import annotations

import sys
import unittest
from contextlib import ExitStack
from datetime import date, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.guest import CreateGuestRequest
from backend.services import guest_service

TODAY = date.today()


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _user(role: str, user_id: str = "10") -> dict[str, Any]:
    return {"user_id": user_id, "tenant_id": "3", "role_name": role, "role": role,
            "email": "tester@example.com", "full_name": "Test User"}


def _visit(**overrides: Any) -> dict[str, Any]:
    row = {"guest_visit_id": "70", "tenant_id": "3", "visit_status": "SCHEDULED", "visit_date": TODAY,
           "guest_id": "5", "host_user_id": "20", "created_by_user_id": "20",
           "guest_name": "Guest Example", "host_name": "Host Example", "checked_in_at": None}
    row.update(overrides)
    return row


class _GuestTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.m: dict[str, MagicMock] = {}
        for name, value in {
            "fetch_guest_visit_by_id": _visit(),
            "check_in_guest_visit": None,
            "check_out_guest_visit": None,
            "safe_write_audit_log": None,
            "fetch_guest_visit_summary": {},
            "fetch_guest_visits": [],
            "insert_guest": None,
        }.items():
            if hasattr(guest_service, name):
                self.m[name] = self.stack.enter_context(patch.object(guest_service, name, return_value=value))
        self.conn = FakeConnection()


class CheckInTests(_GuestTestCase):
    def test_only_front_office_can_check_a_guest_in(self) -> None:
        for role in ("TENANT_ADMIN", "FACILITATOR", "EMPLOYEE", "MANAGER"):
            with self.subTest(role=role):
                self.m["check_in_guest_visit"].reset_mock()
                with self.assertRaises(HTTPException) as caught:
                    guest_service.guest_visit_check_in(self.conn, current_user=_user(role, "20"), guest_visit_id="70")
                self.assertEqual(caught.exception.status_code, 403)
                self.m["check_in_guest_visit"].assert_not_called()

    def test_host_and_creator_get_no_check_in_exception(self) -> None:
        # The visit's own host (user 20) is still refused.
        with self.assertRaises(HTTPException):
            guest_service.guest_visit_check_in(self.conn, current_user=_user("FACILITATOR", "20"), guest_visit_id="70")

    def test_front_office_check_in_writes_and_commits(self) -> None:
        guest_service.guest_visit_check_in(self.conn, current_user=_user("FRONT_OFFICE", "30"), guest_visit_id="70")
        self.m["check_in_guest_visit"].assert_called_once()
        self.assertEqual(self.conn.commits, 1)

    def test_unknown_visit_returns_404_without_writing(self) -> None:
        self.m["fetch_guest_visit_by_id"].return_value = None
        with self.assertRaises(HTTPException) as caught:
            guest_service.guest_visit_check_in(self.conn, current_user=_user("FRONT_OFFICE", "30"), guest_visit_id="70")
        self.assertEqual(caught.exception.status_code, 404)
        self.m["check_in_guest_visit"].assert_not_called()

    def test_front_office_check_out_is_allowed_and_admin_is_not(self) -> None:
        self.m["fetch_guest_visit_by_id"].return_value = _visit(visit_status="CHECKED_IN")
        guest_service.guest_visit_check_out(self.conn, current_user=_user("FRONT_OFFICE", "30"), guest_visit_id="70")
        self.m["check_out_guest_visit"].assert_called_once()
        with self.assertRaises(HTTPException) as caught:
            guest_service.guest_visit_check_out(self.conn, current_user=_user("TENANT_ADMIN", "1"), guest_visit_id="70")
        self.assertEqual(caught.exception.status_code, 403)

    @pytest.mark.xfail(strict=True, reason="QA-BUS-02: check-in accepts a visit scheduled for another day")
    def test_cannot_check_in_a_guest_whose_visit_is_next_week(self) -> None:
        self.m["fetch_guest_visit_by_id"].return_value = _visit(visit_date=TODAY + timedelta(days=7))
        with self.assertRaises(HTTPException) as caught:
            guest_service.guest_visit_check_in(self.conn, current_user=_user("FRONT_OFFICE", "30"), guest_visit_id="70")
        self.assertEqual(caught.exception.status_code, 400)
        self.m["check_in_guest_visit"].assert_not_called()


class FrontOfficeScopeTests(_GuestTestCase):
    def test_front_office_is_forced_to_the_current_window(self) -> None:
        for requested in ("PAST", "UPCOMING", "CURRENT"):
            with self.subTest(requested=requested):
                guest_service.list_guest_visits(self.conn, current_user=_user("FRONT_OFFICE", "30"), visit_scope=requested)
                self.assertEqual(self.m["fetch_guest_visits"].call_args.kwargs["visit_scope"], "CURRENT")

    def test_admin_keeps_the_requested_window(self) -> None:
        guest_service.list_guest_visits(self.conn, current_user=_user("TENANT_ADMIN", "1"), visit_scope="PAST")
        self.assertEqual(self.m["fetch_guest_visits"].call_args.kwargs["visit_scope"], "PAST")

    def test_front_office_cannot_read_a_visit_from_another_day(self) -> None:
        self.m["fetch_guest_visit_by_id"].return_value = _visit(visit_date=TODAY - timedelta(days=1))
        with self.assertRaises(HTTPException) as caught:
            guest_service.get_guest_visit_details(self.conn, current_user=_user("FRONT_OFFICE", "30"), guest_visit_id="70")
        self.assertEqual(caught.exception.status_code, 403)


class GuestOperatorGateTests(_GuestTestCase):
    def test_only_admin_and_facilitator_can_create_guest_profiles(self) -> None:
        payload = CreateGuestRequest(full_name="Guest Example", email="qa.guest@outlook.com", phone="+919876543210")
        for role in ("FRONT_OFFICE", "EMPLOYEE", "MANAGER"):
            with self.subTest(role=role):
                with self.assertRaises(HTTPException) as caught:
                    guest_service.create_guest_profile(self.conn, current_user=_user(role), payload=payload)
                self.assertEqual(caught.exception.status_code, 403)
        self.assertEqual(self.conn.commits, 0)

    def test_front_office_cannot_list_or_search_guests(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            guest_service.search_guest_profiles(self.conn, current_user=_user("FRONT_OFFICE"), search_text="a", limit=20)
        self.assertEqual(caught.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
