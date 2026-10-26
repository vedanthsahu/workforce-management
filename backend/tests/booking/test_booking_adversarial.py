"""Adversarial unit tests for employee booking create, cancel, modify and
the delegated-booking views (backend/services/booking_service.py).

Every repository call is replaced by a mock, so these tests check the
service's decisions (who may act, which states are accepted, what is
written and committed) without a database. Concurrency and constraint
behaviour that only PostgreSQL can show is out of scope here; see
docs/testing/test-report.md.

Tests marked ``xfail(strict=True)`` encode the expected behaviour for an
open finding and fail today by design.
"""

from __future__ import annotations

import sys
import unittest
from contextlib import ExitStack
from datetime import date, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import psycopg2
import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.booking import CreateBookingRequest, ModifyBookingRequest
from backend.services import booking_service

TODAY = date.today()
TOMORROW = TODAY + timedelta(days=1)


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
            "email": "tester@example.com", "full_name": "Test User", "status": "ACTIVE"}


def _booking(**overrides: Any) -> dict[str, Any]:
    row = {
        "booking_id": "500", "tenant_id": "3", "booking_type": "EMPLOYEE",
        "booking_status": "CONFIRMED", "booking_date": TOMORROW,
        "booked_for_user_id": "20", "booked_by_user_id": "20",
        "seat_id": "7", "site_id": "1", "building_id": "2", "floor_id": "3",
        "seat_code": "A-01", "cancellation_reason": None,
    }
    row.update(overrides)
    return row


SEAT = {"seat_id": "8", "tenant_id": "3", "site_id": "1", "building_id": "2", "floor_id": "3",
        "status": "ACTIVE", "is_bookable": True, "seat_code": "A-02"}


class _ServiceTestCase(unittest.TestCase):
    """Patches every repository/side-effect symbol the booking service uses."""

    def setUp(self) -> None:
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.m: dict[str, MagicMock] = {}
        defaults: dict[str, Any] = {
            "fetch_booking_by_id_for_update": _booking(),
            "fetch_booking_by_id": _booking(booking_status="CANCELLED"),
            "fetch_user_by_id": {**_user("EMPLOYEE", "20"), "manager_user_id": None},
            "fetch_seat_for_booking": SEAT,
            "acquire_booking_slot_locks": None,
            "user_has_active_booking_on_date": False,
            "has_active_booking_conflict": False,
            "seat_has_active_block_in_range": False,
            "mark_booking_modified": None,
            "insert_booking": _booking(booking_id="501", seat_id="8"),
            "cancel_booking": None,
            "safe_write_audit_log": None,
            "write_audit_log": None,
            "resolve_booking_advance_days": {"employee_max_advance_days": 30, "guest_max_advance_days": 15},
            "fetch_future_delegated_bookings": [],
            "fetch_future_delegated_guest_visits_without_booking": [],
        }
        for name, value in defaults.items():
            if hasattr(booking_service, name):
                self.m[name] = self.stack.enter_context(
                    patch.object(booking_service, name, return_value=value)
                )
        self.conn = FakeConnection()

    def audit_statuses(self) -> list[str]:
        return [c.kwargs.get("event_status", "SUCCESS") for c in self.m["safe_write_audit_log"].call_args_list]


class CancelBookingTests(_ServiceTestCase):
    def _cancel(self, user: dict[str, Any]) -> Any:
        return booking_service.cancel_booking_by_id(
            self.conn, current_user=user, booking_id="500", cancellation_reason=None
        )

    def test_uninvolved_employee_cannot_cancel_and_nothing_is_written(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            self._cancel(_user("EMPLOYEE", "99"))
        self.assertEqual(caught.exception.status_code, 403)
        self.m["cancel_booking"].assert_not_called()
        self.assertEqual(self.conn.commits, 0)
        self.assertEqual(self.audit_statuses(), ["DENIED"])

    def test_uninvolved_facilitator_cannot_cancel(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            self._cancel(_user("FACILITATOR", "99"))
        self.assertEqual(caught.exception.status_code, 403)
        self.m["cancel_booking"].assert_not_called()

    def test_facilitator_who_made_the_booking_can_cancel(self) -> None:
        self.m["fetch_booking_by_id_for_update"].return_value = _booking(booked_by_user_id="99")
        self._cancel(_user("FACILITATOR", "99"))
        self.m["cancel_booking"].assert_called_once()
        self.assertEqual(self.conn.commits, 1)

    def test_subject_can_cancel_own_booking(self) -> None:
        self._cancel(_user("EMPLOYEE", "20"))
        self.m["cancel_booking"].assert_called_once()

    def test_tenant_admin_can_cancel_any_booking_in_the_tenant(self) -> None:
        self._cancel(_user("TENANT_ADMIN", "1"))
        self.m["cancel_booking"].assert_called_once()

    def test_unknown_booking_returns_404_without_writing(self) -> None:
        self.m["fetch_booking_by_id_for_update"].return_value = None
        with self.assertRaises(HTTPException) as caught:
            self._cancel(_user("TENANT_ADMIN", "1"))
        self.assertEqual(caught.exception.status_code, 404)
        self.m["cancel_booking"].assert_not_called()

    def test_already_cancelled_booking_cannot_be_cancelled_again(self) -> None:
        for status_value in ("CANCELLED", "MODIFIED", "COMPLETED", "NO_SHOW"):
            with self.subTest(status=status_value):
                self.m["cancel_booking"].reset_mock()
                self.m["fetch_booking_by_id_for_update"].return_value = _booking(booking_status=status_value)
                with self.assertRaises(HTTPException) as caught:
                    self._cancel(_user("EMPLOYEE", "20"))
                self.assertEqual(caught.exception.status_code, 400)
                self.m["cancel_booking"].assert_not_called()

    def test_past_booking_cannot_be_cancelled(self) -> None:
        self.m["fetch_booking_by_id_for_update"].return_value = _booking(booking_date=TODAY - timedelta(days=1))
        with self.assertRaises(HTTPException) as caught:
            self._cancel(_user("EMPLOYEE", "20"))
        self.assertEqual(caught.exception.status_code, 400)

    def test_guest_booking_is_refused_on_the_employee_endpoint(self) -> None:
        self.m["fetch_booking_by_id_for_update"].return_value = _booking(booking_type="GUEST", booked_for_user_id=None)
        with self.assertRaises(HTTPException) as caught:
            self._cancel(_user("TENANT_ADMIN", "1"))
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(caught.exception.detail["code"], "booking_type_mismatch")

    def test_existence_is_disclosed_before_authorization(self) -> None:
        # An uninvolved user learns the booking is a guest booking (400)
        # instead of receiving the 403 an unknown or foreign booking would
        # give. Finding QA-SEC-08 (pre-authorization state disclosure).
        self.m["fetch_booking_by_id_for_update"].return_value = _booking(booking_type="GUEST", booked_for_user_id=None)
        with self.assertRaises(HTTPException) as caught:
            self._cancel(_user("EMPLOYEE", "99"))
        self.assertEqual(caught.exception.status_code, 400)

    @pytest.mark.xfail(strict=True, reason="QA-REL-01: a failure after COMMIT is audited and reported as a failed cancel")
    def test_failure_after_commit_is_not_reported_as_a_failed_cancellation(self) -> None:
        self.m["fetch_booking_by_id"].side_effect = psycopg2.OperationalError("connection lost after commit")
        try:
            self._cancel(_user("EMPLOYEE", "20"))
        except HTTPException:
            pass
        self.assertEqual(self.conn.commits, 1)  # the cancellation is durable
        self.assertNotIn("FAILURE", self.audit_statuses())


class ModifyBookingTests(_ServiceTestCase):
    def _payload(self, booking_date: date, seat_id: int = 8) -> ModifyBookingRequest:
        return ModifyBookingRequest(site_id=1, building_id=2, floor_id=3, seat_id=seat_id, booking_date=booking_date)

    def _modify(self, user: dict[str, Any], payload: ModifyBookingRequest) -> Any:
        return booking_service.modify_booking(self.conn, current_user=user, booking_id="500", payload=payload)

    def test_valid_modification_supersedes_and_inserts_in_one_commit(self) -> None:
        self._modify(_user("EMPLOYEE", "20"), self._payload(TOMORROW + timedelta(days=1)))
        self.m["mark_booking_modified"].assert_called_once()
        self.m["insert_booking"].assert_called_once()
        self.assertEqual(self.m["insert_booking"].call_args.kwargs["modified_from_booking_id"], "500")
        self.assertEqual(self.m["insert_booking"].call_args.kwargs["booked_by_user_id"], "20")
        self.assertEqual(self.conn.commits, 1)

    def test_seat_is_locked_before_conflict_checks(self) -> None:
        order: list[str] = []
        self.m["acquire_booking_slot_locks"].side_effect = lambda *a, **k: order.append("lock")
        self.m["has_active_booking_conflict"].side_effect = lambda *a, **k: order.append("check") or False
        self._modify(_user("EMPLOYEE", "20"), self._payload(TOMORROW + timedelta(days=1)))
        self.assertEqual(order[:2], ["lock", "check"])

    def test_uninvolved_employee_cannot_modify(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            self._modify(_user("EMPLOYEE", "99"), self._payload(TOMORROW + timedelta(days=1)))
        self.assertEqual(caught.exception.status_code, 403)
        self.m["insert_booking"].assert_not_called()

    def test_conflict_on_target_seat_writes_nothing(self) -> None:
        self.m["has_active_booking_conflict"].return_value = True
        with self.assertRaises(HTTPException) as caught:
            self._modify(_user("EMPLOYEE", "20"), self._payload(TOMORROW + timedelta(days=1)))
        self.assertEqual(caught.exception.status_code, 409)
        self.m["mark_booking_modified"].assert_not_called()
        self.m["insert_booking"].assert_not_called()
        self.assertEqual(self.conn.commits, 0)

    def test_blocked_target_seat_writes_nothing(self) -> None:
        self.m["seat_has_active_block_in_range"].return_value = True
        with self.assertRaises(HTTPException) as caught:
            self._modify(_user("EMPLOYEE", "20"), self._payload(TOMORROW + timedelta(days=1)))
        self.assertEqual(caught.exception.status_code, 409)
        self.m["insert_booking"].assert_not_called()

    def test_unchanged_seat_and_date_is_a_no_op(self) -> None:
        self._modify(_user("EMPLOYEE", "20"), self._payload(TOMORROW, seat_id=7))
        self.m["insert_booking"].assert_not_called()
        self.assertEqual(self.conn.commits, 0)

    @pytest.mark.xfail(strict=True, reason="QA-BUS-01: modify does not apply the past-date rule to the new date")
    def test_cannot_move_a_booking_to_a_past_date(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            self._modify(_user("EMPLOYEE", "20"), self._payload(TODAY - timedelta(days=3)))
        self.assertEqual(caught.exception.status_code, 400)
        self.m["insert_booking"].assert_not_called()

    @pytest.mark.xfail(strict=True, reason="QA-BUS-01: modify does not apply the advance-window rule to the new date")
    def test_cannot_move_a_booking_beyond_the_advance_window(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            self._modify(_user("EMPLOYEE", "20"), self._payload(TODAY + timedelta(days=365)))
        self.assertEqual(caught.exception.status_code, 400)
        self.m["insert_booking"].assert_not_called()


class CreateBookingTests(_ServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        # Default beneficiary lookup = the caller (self-booking).
        self.m["fetch_user_by_id"].return_value = {**_user("EMPLOYEE", "10"), "manager_user_id": None}

    def _payload(self, **overrides: Any) -> CreateBookingRequest:
        data = {"site_id": 1, "building_id": 2, "floor_id": 3, "seat_id": 8, "booking_date": TOMORROW}
        data.update(overrides)
        return CreateBookingRequest(**data)

    def test_employee_cannot_book_for_another_user(self) -> None:
        self.m["fetch_user_by_id"].return_value = {**_user("EMPLOYEE", "20"), "manager_user_id": "10"}
        with self.assertRaises(HTTPException) as caught:
            booking_service.book_seat(self.conn, current_user=_user("EMPLOYEE", "10"),
                                      payload=self._payload(booked_for_user_id=20))
        self.assertEqual(caught.exception.status_code, 403)
        self.m["insert_booking"].assert_not_called()

    def test_dormant_manager_role_cannot_book_for_direct_report(self) -> None:
        self.m["fetch_user_by_id"].return_value = {**_user("EMPLOYEE", "20"), "manager_user_id": "10"}
        with self.assertRaises(HTTPException) as caught:
            booking_service.book_seat(self.conn, current_user=_user("MANAGER", "10"),
                                      payload=self._payload(booked_for_user_id=20))
        self.assertEqual(caught.exception.status_code, 403)

    def test_facilitator_can_book_for_another_active_user(self) -> None:
        booking_service.book_seat(self.conn, current_user=_user("FACILITATOR", "10"),
                                  payload=self._payload(booked_for_user_id=20))
        kwargs = self.m["insert_booking"].call_args.kwargs
        self.assertEqual(kwargs["booked_for_user_id"], "20")
        self.assertEqual(kwargs["booked_by_user_id"], "10")
        self.assertEqual(self.conn.commits, 1)

    def test_inactive_beneficiary_is_refused(self) -> None:
        self.m["fetch_user_by_id"].return_value = {**_user("EMPLOYEE", "20"), "status": "INACTIVE"}
        with self.assertRaises(HTTPException) as caught:
            booking_service.book_seat(self.conn, current_user=_user("FACILITATOR", "10"),
                                      payload=self._payload(booked_for_user_id=20))
        self.assertEqual(caught.exception.status_code, 400)

    def test_seat_outside_the_submitted_hierarchy_is_refused(self) -> None:
        self.m["fetch_seat_for_booking"].return_value = None
        with self.assertRaises(HTTPException) as caught:
            booking_service.book_seat(self.conn, current_user=_user("EMPLOYEE", "10"), payload=self._payload())
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(caught.exception.detail["code"], "booking_hierarchy_invalid")

    def test_unique_violation_from_the_database_becomes_409(self) -> None:
        class _ServerUniqueViolation(psycopg2.errors.UniqueViolation):
            pgcode = "23505"  # set by the server on a real error

        self.m["insert_booking"].side_effect = _ServerUniqueViolation("duplicate key")
        with self.assertRaises(HTTPException) as caught:
            booking_service.book_seat(self.conn, current_user=_user("EMPLOYEE", "10"), payload=self._payload())
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.conn.commits, 0)

    def test_audit_row_is_written_in_the_same_transaction(self) -> None:
        booking_service.book_seat(self.conn, current_user=_user("EMPLOYEE", "10"), payload=self._payload())
        self.m["write_audit_log"].assert_called_once()
        self.assertEqual(self.conn.commits, 1)

    @pytest.mark.xfail(strict=True, reason="QA-DAT-02: source_channel is caller-controlled; an employee can label a booking ADMIN")
    def test_employee_cannot_label_a_booking_as_admin_created(self) -> None:
        booking_service.book_seat(self.conn, current_user=_user("EMPLOYEE", "10"),
                                  payload=self._payload(source_channel="ADMIN"))
        self.assertNotEqual(self.m["insert_booking"].call_args.kwargs.get("source_channel"), "ADMIN")


class DelegatedViewTests(_ServiceTestCase):
    def test_employee_is_refused_the_delegated_view(self) -> None:
        with self.assertRaises(HTTPException) as caught:
            booking_service.get_delegated_future_bookings(self.conn, current_user=_user("EMPLOYEE", "10"))
        self.assertEqual(caught.exception.status_code, 403)
        self.assertEqual(caught.exception.detail["code"], "delegation_view_not_allowed")

    def test_front_office_is_refused_the_delegated_view(self) -> None:
        with self.assertRaises(HTTPException):
            booking_service.get_delegated_future_bookings(self.conn, current_user=_user("FRONT_OFFICE", "10"))

    def test_facilitator_sees_only_rows_they_created(self) -> None:
        booking_service.get_delegated_future_bookings(self.conn, current_user=_user("FACILITATOR", "10"))
        kwargs = self.m["fetch_future_delegated_bookings"].call_args.kwargs
        self.assertEqual(kwargs["user_id"], "10")
        self.assertEqual(kwargs["tenant_id"], "3")


if __name__ == "__main__":
    unittest.main()
