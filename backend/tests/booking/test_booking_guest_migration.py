from __future__ import annotations

import inspect
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

import psycopg2
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.enums import GuestType, VisitPurpose
from backend.repositories import booking_repository, guest_visit_repository
from backend.schemas.booking import ModifyBookingRequest
from backend.schemas.guest import (
    CreateGuestBookingRequest,
    CreateGuestVisitRequest,
)
from backend.services import booking_service, guest_service


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class RecordingCursor:
    def __init__(self, conn: RecordingConnection) -> None:
        self.conn = conn
        self.rowcount = 1

    def __enter__(self) -> RecordingCursor:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def execute(self, sql, params=None) -> None:
        self.conn.executed.append((sql, params))


class RecordingConnection:
    def __init__(self) -> None:
        self.executed = []

    def cursor(self, *args, **kwargs) -> RecordingCursor:
        return RecordingCursor(self)


def _future_date(days: int = 10) -> date:
    return date.today() + timedelta(days=days)


def _employee_booking(**overrides):
    row = {
        "booking_id": "100",
        "tenant_id": "1",
        "booked_for_user_id": "20",
        "booked_for_guest_id": None,
        "booked_by_user_id": "10",
        "guest_visit_id": None,
        "booking_type": "EMPLOYEE",
        "seat_id": "30",
        "site_id": "2",
        "building_id": "3",
        "floor_id": "4",
        "booking_date": _future_date(),
        "booking_status": "CONFIRMED",
    }
    row.update(overrides)
    return row


def _guest_booking(**overrides):
    row = {
        "booking_id": "200",
        "tenant_id": "1",
        "booked_for_user_id": None,
        "booked_for_guest_id": "50",
        "booked_by_user_id": "10",
        "guest_visit_id": "60",
        "booking_type": "GUEST",
        "seat_id": "30",
        "site_id": "2",
        "building_id": "3",
        "floor_id": "4",
        "booking_date": _future_date(),
        "booking_status": "CONFIRMED",
        "guest_name": "Guest One",
        "guest_email": "guest@example.com",
    }
    row.update(overrides)
    return row


def _guest_payload() -> CreateGuestBookingRequest:
    return CreateGuestBookingRequest(
        guest_id=50,
        host_user_id=20,
        site_id=2,
        building_id=3,
        floor_id=4,
        seat_id=30,
        visit_date=_future_date(),
        guest_type=GuestType.CUSTOMER,
        purpose_of_visit=VisitPurpose.MEETING,
    )


class EmployeeBookingMigrationTests(unittest.TestCase):
    def test_delegation_allows_only_self_direct_report_or_tenant_admin(self) -> None:
        target = {"user_id": "20", "manager_user_id": "10"}
        self.assertTrue(
            booking_service._can_book_for_user(
                current_user={"user_id": "20", "role_name": "EMPLOYEE"},
                booking_user=target,
            )
        )
        self.assertTrue(
            booking_service._can_book_for_user(
                current_user={"user_id": "10", "role_name": "MANAGER"},
                booking_user=target,
            )
        )
        self.assertFalse(
            booking_service._can_book_for_user(
                current_user={"user_id": "99", "role_name": "MANAGER"},
                booking_user=target,
            )
        )
        self.assertTrue(
            booking_service._can_book_for_user(
                current_user={"user_id": "99", "role_name": "TENANT_ADMIN"},
                booking_user=target,
            )
        )
        self.assertTrue(
            booking_service._can_book_for_user(
                current_user={"user_id": "99", "role_name": "FACILITATOR"},
                booking_user=target,
            )
        )

    def test_employee_cancel_uses_booked_for_user_owner(self) -> None:
        conn = FakeConnection()
        booking = _employee_booking(booked_for_user_id="20")
        cancelled = _employee_booking(
            booked_for_user_id="20",
            booking_status="CANCELLED",
            cancellation_reason="Changed plans",
        )
        with patch.object(
            booking_service,
            "fetch_booking_by_id_for_update",
            return_value=booking,
        ), patch.object(
            booking_service,
            "fetch_user_by_id",
            return_value={"user_id": "20", "manager_user_id": "10"},
        ) as fetch_user, patch.object(
            booking_service,
            "cancel_booking",
        ) as cancel, patch.object(
            booking_service,
            "fetch_booking_by_id",
            return_value=cancelled,
        ):
            response = booking_service.cancel_booking_by_id(
                conn,
                current_user={
                    "tenant_id": "1",
                    "user_id": "10",
                    "role_name": "MANAGER",
                },
                booking_id="100",
                cancellation_reason="Changed plans",
            )

        fetch_user.assert_called_once_with(
            conn,
            tenant_id="1",
            user_id="20",
        )
        cancel.assert_called_once()
        self.assertEqual(response.booked_for_user_id, "20")
        self.assertEqual(conn.commits, 1)

    def test_employee_modify_marks_old_booking_modified(self) -> None:
        conn = FakeConnection()
        old_booking = _employee_booking()
        new_booking = _employee_booking(
            booking_id="101",
            seat_id="31",
            booking_date=_future_date(11),
        )
        payload = ModifyBookingRequest(
            site_id=2,
            building_id=3,
            floor_id=4,
            seat_id=31,
            booking_date=_future_date(11),
            modification_reason="OTHER",
        )
        with patch.object(
            booking_service,
            "fetch_booking_by_id_for_update",
            return_value=old_booking,
        ), patch.object(
            booking_service,
            "fetch_user_by_id",
            return_value={"user_id": "20", "manager_user_id": "10"},
        ), patch.object(
            booking_service,
            "fetch_booking_by_id",
            return_value=old_booking,
        ), patch.object(
            booking_service,
            "fetch_seat_for_booking",
            return_value={
                "seat_id": "31",
                "site_id": "2",
                "building_id": "3",
                "floor_id": "4",
                "status": "ACTIVE",
                "is_bookable": True,
            },
        ), patch.object(
            booking_service,
            "user_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            booking_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            booking_service,
            "mark_booking_modified",
        ) as mark_modified, patch.object(
            booking_service,
            "insert_booking",
            return_value=new_booking,
        ) as insert_booking:
            response = booking_service.modify_booking(
                conn,
                current_user={
                    "tenant_id": "1",
                    "user_id": "10",
                    "role_name": "MANAGER",
                },
                booking_id="100",
                payload=payload,
            )

        self.assertEqual(mark_modified.call_args.kwargs["booking_id"], "100")
        self.assertEqual(
            mark_modified.call_args.kwargs["modification_reason"],
            "OTHER",
        )
        self.assertEqual(
            insert_booking.call_args.kwargs["modified_from_booking_id"], "100"
        )
        self.assertNotIn("modification_reason", insert_booking.call_args.kwargs)
        self.assertEqual(response.booking_id, "101")
        self.assertEqual(conn.commits, 1)


class GuestBookingMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.current_user = {
            "tenant_id": "1",
            "user_id": "10",
            "role_name": "FACILITATOR",
        }

    def _guest_create_patches(self):
        return (
            patch.object(
                guest_service,
                "_resolve_guest",
                return_value={
                    "guest_id": "50",
                    "full_name": "Guest One",
                    "email": "guest@example.com",
                    "status": "ACTIVE",
                },
            ),
            patch.object(guest_service, "_resolve_host", return_value={}),
            patch.object(
                guest_service,
                "_resolve_seat",
                return_value={
                    "seat_id": "30",
                    "site_id": "2",
                    "building_id": "3",
                    "floor_id": "4",
                    "status": "ACTIVE",
                    "is_bookable": True,
                },
            ),
        )

    def test_guest_permission_failure(self) -> None:
        with self.assertRaises(HTTPException) as context:
            guest_service.create_guest_booking(
                FakeConnection(),
                current_user={
                    "tenant_id": "1",
                    "user_id": "10",
                    "role_name": "EMPLOYEE",
                },
                payload=_guest_payload(),
            )
        self.assertEqual(context.exception.status_code, 403)

    def test_guest_visit_only_commits_without_booking(self) -> None:
        conn = FakeConnection()
        payload = CreateGuestVisitRequest(
            guest_id=50,
            host_user_id=20,
            site_id=2,
            building_id=3,
            visit_date=_future_date(),
            guest_type=GuestType.CUSTOMER,
            purpose_of_visit=VisitPurpose.MEETING,
        )
        visit = {
            "guest_visit_id": "60",
            "tenant_id": "1",
            "guest_id": "50",
            "host_user_id": "20",
            "site_id": "2",
            "building_id": "3",
            "floor_id": None,
            "visit_date": payload.visit_date,
            "guest_type": "CUSTOMER",
            "purpose_of_visit": "MEETING",
            "requires_seat": False,
            "visit_status": "SCHEDULED",
        }
        with patch.object(
            guest_service,
            "_resolve_guest",
            return_value={},
        ), patch.object(
            guest_service,
            "_resolve_host",
            return_value={},
        ), patch.object(
            guest_service,
            "_validate_visit_location",
        ), patch.object(
            guest_service,
            "insert_guest_visit",
            return_value=visit,
        ) as insert_visit, patch.object(
            guest_service,
            "fetch_guest_visit_by_id",
            return_value=visit,
        ), patch.object(
            guest_service,
            "insert_guest_booking",
        ) as insert_booking:
            response = guest_service.create_guest_visit(
                conn,
                current_user=self.current_user,
                payload=payload,
            )

        insert_visit.assert_called_once()
        insert_booking.assert_not_called()
        self.assertFalse(response.requires_seat)
        self.assertEqual(conn.commits, 1)

    def test_guest_booking_creation_is_atomic(self) -> None:
        conn = FakeConnection()
        guest_patch, host_patch, seat_patch = self._guest_create_patches()
        with guest_patch, host_patch, seat_patch, patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            guest_service,
            "insert_guest_visit",
            return_value={"guest_visit_id": "60"},
        ) as insert_visit, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ), patch.object(
            guest_service,
            "insert_guest_booking",
            return_value=_guest_booking(),
        ) as insert_booking:
            response = guest_service.create_guest_booking(
                conn,
                current_user=self.current_user,
                payload=_guest_payload(),
            )

        insert_visit.assert_called_once()
        insert_booking.assert_called_once()
        self.assertEqual(response.booking_type, "GUEST")
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_guest_visit_insert_failure_rolls_back_before_booking(self) -> None:
        conn = FakeConnection()
        guest_patch, host_patch, seat_patch = self._guest_create_patches()
        with guest_patch, host_patch, seat_patch, patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            guest_service,
            "insert_guest_visit",
            side_effect=psycopg2.DatabaseError("visit failed"),
        ), patch.object(
            guest_service,
            "insert_guest_booking",
        ) as insert_booking, self.assertRaises(HTTPException):
            guest_service.create_guest_booking(
                conn,
                current_user=self.current_user,
                payload=_guest_payload(),
            )

        insert_booking.assert_not_called()
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_guest_booking_insert_failure_rolls_back_visit(self) -> None:
        conn = FakeConnection()
        guest_patch, host_patch, seat_patch = self._guest_create_patches()
        with guest_patch, host_patch, seat_patch, patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            guest_service,
            "insert_guest_visit",
            return_value={"guest_visit_id": "60"},
        ), patch.object(
            guest_service,
            "update_guest_visit_requires_seat",
        ), patch.object(
            guest_service,
            "insert_guest_booking",
            side_effect=psycopg2.DatabaseError("booking failed"),
        ), self.assertRaises(HTTPException):
            guest_service.create_guest_booking(
                conn,
                current_user=self.current_user,
                payload=_guest_payload(),
            )

        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_guest_conflict_prevents_inserts(self) -> None:
        conn = FakeConnection()
        guest_patch, host_patch, seat_patch = self._guest_create_patches()
        with guest_patch, host_patch, seat_patch, patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=True,
        ), patch.object(
            guest_service,
            "insert_guest_visit",
        ) as insert_visit, self.assertRaises(HTTPException) as context:
            guest_service.create_guest_booking(
                conn,
                current_user=self.current_user,
                payload=_guest_payload(),
            )

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(
            context.exception.detail["code"],
            "booking_guest_conflict",
        )
        insert_visit.assert_not_called()

    def test_seat_conflict_prevents_inserts(self) -> None:
        conn = FakeConnection()
        guest_patch, host_patch, seat_patch = self._guest_create_patches()
        with guest_patch, host_patch, seat_patch, patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=True,
        ), patch.object(
            guest_service,
            "insert_guest_visit",
        ) as insert_visit, self.assertRaises(HTTPException) as context:
            guest_service.create_guest_booking(
                conn,
                current_user=self.current_user,
                payload=_guest_payload(),
            )

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "booking_conflict")
        insert_visit.assert_not_called()

    def test_guest_cancel_uses_guest_owner_not_audit_user(self) -> None:
        conn = FakeConnection()
        cancelled = _guest_booking(
            booking_status="CANCELLED",
            cancellation_reason="Visit changed",
        )
        with patch.object(
            guest_service,
            "fetch_booking_by_id_for_update",
            return_value=_guest_booking(booked_by_user_id="999"),
        ), patch.object(
            guest_service,
            "_resolve_guest",
            return_value={
                "guest_id": "50",
                "full_name": "Guest One",
                "email": None,
            },
        ) as resolve_guest, patch.object(
            guest_service,
            "cancel_booking",
        ), patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ), patch.object(
            guest_service,
            "fetch_booking_by_id",
            return_value=cancelled,
        ):
            response = guest_service.cancel_guest_booking(
                conn,
                current_user=self.current_user,
                booking_id="200",
                cancellation_reason="Visit changed",
            )

        self.assertEqual(resolve_guest.call_args.kwargs["guest_id"], "50")
        self.assertEqual(response.booked_for_guest_id, "50")
        self.assertEqual(conn.commits, 1)

    def test_guest_modify_preserves_visit_and_marks_old_booking_modified(self) -> None:
        conn = FakeConnection()
        old_booking = _guest_booking()
        new_booking = _guest_booking(
            booking_id="201",
            seat_id="31",
            booking_date=_future_date(11),
        )
        payload = ModifyBookingRequest(
            site_id=2,
            building_id=3,
            floor_id=4,
            seat_id=31,
            booking_date=_future_date(11),
            modification_reason="OTHER",
        )
        with patch.object(
            guest_service,
            "fetch_booking_by_id_for_update",
            return_value=old_booking,
        ), patch.object(
            guest_service,
            "_resolve_guest",
            return_value={
                "guest_id": "50",
                "full_name": "Guest One",
                "email": None,
                "status": "ACTIVE",
            },
        ), patch.object(
            guest_service,
            "_resolve_seat",
            return_value={
                "seat_id": "31",
                "site_id": "2",
                "building_id": "3",
                "floor_id": "4",
                "status": "ACTIVE",
                "is_bookable": True,
            },
        ), patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            guest_service,
            "fetch_booking_by_id",
            return_value=old_booking,
        ), patch.object(
            guest_service,
            "update_guest_visit_booking_details",
        ) as update_visit, patch.object(
            guest_service,
            "mark_booking_modified",
        ) as mark_modified, patch.object(
            guest_service,
            "insert_guest_booking",
            return_value=new_booking,
        ) as insert_booking, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ):
            response = guest_service.modify_guest_booking(
                conn,
                current_user=self.current_user,
                booking_id="200",
                payload=payload,
            )

        self.assertEqual(update_visit.call_args.kwargs["guest_visit_id"], "60")
        self.assertEqual(mark_modified.call_args.kwargs["booking_id"], "200")
        self.assertEqual(
            mark_modified.call_args.kwargs["modification_reason"],
            "OTHER",
        )
        self.assertEqual(insert_booking.call_args.kwargs["guest_visit_id"], "60")
        self.assertEqual(
            insert_booking.call_args.kwargs["modified_from_booking_id"], "200"
        )
        self.assertNotIn("modification_reason", insert_booking.call_args.kwargs)
        self.assertEqual(response.booking_id, "201")
        self.assertEqual(conn.commits, 1)


class ModificationAuditRepositoryTests(unittest.TestCase):
    def test_booking_mark_modified_writes_reason_on_old_row(self) -> None:
        conn = RecordingConnection()

        booking_repository.mark_booking_modified(
            conn,
            tenant_id="1",
            booking_id="100",
            modification_reason="Seat changed",
        )

        sql, params = conn.executed[-1]
        self.assertIn("booking_status = 'MODIFIED'", sql)
        self.assertIn("cancelled_at = NOW()", sql)
        self.assertIn("cancellation_reason = %s", sql)
        self.assertIn("modification_reason = %s", sql)
        self.assertEqual(params, ("Seat changed", "Seat changed", "100", "1"))

    def test_guest_visit_mark_modified_writes_reason_on_old_row(self) -> None:
        conn = RecordingConnection()

        guest_visit_repository.mark_guest_visit_modified(
            conn,
            tenant_id="1",
            guest_visit_id="60",
            modification_reason="Visit moved",
        )

        sql, params = conn.executed[-1]
        self.assertIn("visit_status = 'MODIFIED'", sql)
        self.assertIn("cancelled_at = NOW()", sql)
        self.assertIn("cancellation_reason = %s", sql)
        self.assertIn("modification_reason = %s", sql)
        self.assertEqual(params, ("Visit moved", "Visit moved", "60", "1"))

    def test_successor_insert_helpers_do_not_accept_modification_reason(self) -> None:
        self.assertNotIn(
            "modification_reason",
            inspect.signature(booking_repository.insert_booking).parameters,
        )
        self.assertNotIn(
            "modification_reason",
            inspect.signature(booking_repository.insert_guest_booking).parameters,
        )
        self.assertNotIn(
            "modification_reason",
            inspect.signature(guest_visit_repository.insert_guest_visit).parameters,
        )


if __name__ == "__main__":
    unittest.main()
