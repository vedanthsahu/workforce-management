from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi import HTTPException

from backend.repositories.booking_repository import acquire_booking_slot_locks
from backend.repositories.floor_layout_repository import acquire_floor_publish_lock
from backend.schemas.booking import CreateBookingRequest
from backend.services.booking_service import book_seat

TOMORROW = date.today() + timedelta(days=1)
CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}


class FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class AcquireBookingSlotLocksTests(unittest.TestCase):
    """No DB constraint backstops "one active booking per seat/user per
    day" -- these locks are what actually closes the check-then-insert
    race in the absence of one. Wrong order here is a deadlock waiting to
    happen under real concurrency, so the lock class + order is exactly
    what needs pinning down with a test, not just a docstring promise."""

    def test_acquires_seat_lock_before_subject_lock(self) -> None:
        cursor = FakeCursor()
        acquire_booking_slot_locks(
            FakeConnection(cursor),
            tenant_id="1",
            seat_id="42",
            subject_id="7",
            booking_date=TOMORROW,
        )

        self.assertEqual(len(cursor.executions), 2)

        seat_sql, seat_params = cursor.executions[0]
        subject_sql, subject_params = cursor.executions[1]

        self.assertIn("pg_advisory_xact_lock", seat_sql)
        self.assertIn("pg_advisory_xact_lock", subject_sql)
        # Lock class (first param) distinguishes the two lock families;
        # class must differ between seat-scoped and subject-scoped locks.
        self.assertEqual(seat_params[0], 1)
        self.assertEqual(subject_params[0], 2)

    def test_lock_key_is_scoped_to_tenant_seat_and_date(self) -> None:
        """Two different seats (or two different dates) must hash to
        different keys, or unrelated bookings would serialize against
        each other for no reason."""
        cursor_a = FakeCursor()
        acquire_booking_slot_locks(
            FakeConnection(cursor_a), tenant_id="1", seat_id="42",
            subject_id="7", booking_date=TOMORROW,
        )
        cursor_b = FakeCursor()
        acquire_booking_slot_locks(
            FakeConnection(cursor_b), tenant_id="1", seat_id="99",
            subject_id="7", booking_date=TOMORROW,
        )

        seat_key_a = cursor_a.executions[0][1][1]
        seat_key_b = cursor_b.executions[0][1][1]
        self.assertNotEqual(seat_key_a, seat_key_b)


class _CommitRollbackOnlyConnection:
    """Minimal conn stand-in for book_seat paths that reach the
    commit/rollback try-block after the lock call."""

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


class AcquireFloorPublishLockTests(unittest.TestCase):
    def test_issues_a_distinct_lock_class_from_booking_locks(self) -> None:
        cursor = FakeCursor()
        acquire_floor_publish_lock(FakeConnection(cursor), tenant_id="1", floor_id="12")

        sql, params = cursor.executions[0]
        self.assertIn("pg_advisory_xact_lock", sql)
        self.assertNotIn(params[0], {1, 2})


class BookSeatAcquiresLockBeforeConflictChecksTests(unittest.TestCase):
    """Regression guard: the lock must actually wrap the conflict-check +
    insert sequence, not just exist somewhere in the function. Proven the
    same way the past-date guard tests prove their ordering -- by having
    the lock call itself raise and checking that this, not some later
    step, is what fired."""

    def _payload(self) -> CreateBookingRequest:
        return CreateBookingRequest(
            site_id=1, building_id=1, floor_id=1, seat_id=1,
            booking_date=TOMORROW,
        )

    def test_lock_failure_prevents_the_conflict_checks_and_insert(self) -> None:
        with (
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                return_value={"email": "a@b.com"},
            ),
            patch(
                "backend.services.booking_service.fetch_seat_for_booking",
                return_value={
                    "tenant_id": "1", "site_id": "1", "building_id": "1",
                    "floor_id": "1", "seat_id": "1",
                    "status": "ACTIVE", "is_bookable": True,
                },
            ),
            patch(
                "backend.services.booking_service.acquire_booking_slot_locks",
                side_effect=HTTPException(status_code=418, detail="lock reached"),
            ),
            patch(
                "backend.services.booking_service.user_has_active_booking_on_date",
            ) as mock_user_check,
            patch(
                "backend.services.booking_service.insert_booking",
            ) as mock_insert,
            patch("backend.services.booking_service.safe_write_audit_log"),
        ):
            with self.assertRaises(HTTPException) as context:
                book_seat(conn=_CommitRollbackOnlyConnection(), current_user=CALLER, payload=self._payload())

        self.assertEqual(context.exception.status_code, 418)
        mock_user_check.assert_not_called()
        mock_insert.assert_not_called()

    def test_seat_and_subject_ids_passed_through_correctly(self) -> None:
        with (
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                return_value={"email": "a@b.com"},
            ),
            patch(
                "backend.services.booking_service.fetch_seat_for_booking",
                return_value={
                    "tenant_id": "1", "site_id": "1", "building_id": "1",
                    "floor_id": "1", "seat_id": "1",
                    "status": "ACTIVE", "is_bookable": True,
                },
            ),
            patch(
                "backend.services.booking_service.acquire_booking_slot_locks",
            ) as mock_lock,
            patch(
                "backend.services.booking_service.user_has_active_booking_on_date",
                return_value=False,
            ),
            patch(
                "backend.services.booking_service.has_active_booking_conflict",
                return_value=False,
            ),
            patch(
                "backend.services.booking_service.insert_booking",
                return_value={"booking_id": "1", "booking_type": "EMPLOYEE"},
            ),
            patch("backend.services.booking_service.write_audit_log"),
        ):
            book_seat(conn=_CommitRollbackOnlyConnection(), current_user=CALLER, payload=self._payload())

        kwargs = mock_lock.call_args.kwargs
        self.assertEqual(kwargs["tenant_id"], "1")
        self.assertEqual(kwargs["seat_id"], "1")
        self.assertEqual(kwargs["subject_id"], "7")
        self.assertEqual(kwargs["booking_date"], TOMORROW)


if __name__ == "__main__":
    unittest.main()
