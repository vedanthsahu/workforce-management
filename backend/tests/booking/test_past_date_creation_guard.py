from __future__ import annotations

import sys
import unittest
from datetime import date, time, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.enums import GuestType
from backend.schemas.booking import CreateBookingRequest
from backend.schemas.guest import CreateGuestBookingRequest, CreateGuestVisitRequest
from backend.services.booking_service import book_seat
from backend.services.guest_service import create_guest_booking, create_guest_visit

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)
TOMORROW = TODAY + timedelta(days=1)

EMPLOYEE_CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}
GUEST_OPERATOR_CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "FACILITATOR"}


class FakeConnection:
    """Minimal conn stand-in for paths that reach the commit/rollback
    try-block after clearing the past-date guard."""

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


class BookSeatPastDateGuardTests(unittest.TestCase):
    """Regression coverage: booking creation had no server-side guard
    against a past booking_date -- only a client <input min> attribute,
    trivially bypassed by editing the request. Cancel/modify already
    checked this; creation did not."""

    def _payload(self, booking_date: date) -> CreateBookingRequest:
        return CreateBookingRequest(
            site_id=1,
            building_id=1,
            floor_id=1,
            seat_id=1,
            booking_date=booking_date,
            start_time=time(9, 0),
            end_time=time(18, 0),
        )

    def test_rejects_a_past_booking_date(self) -> None:
        with patch(
            "backend.services.booking_service._resolve_booked_for_user",
        ) as mock_resolve, self.assertRaises(HTTPException) as context:
            book_seat(
                conn=object(),
                current_user=EMPLOYEE_CALLER,
                payload=self._payload(YESTERDAY),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(
            context.exception.detail["code"], "booking_date_in_past"
        )
        mock_resolve.assert_not_called()

    def test_accepts_todays_date_and_reaches_downstream_logic(self) -> None:
        """Proven by letting a downstream check fail with its own distinct
        error -- which could only happen if the past-date guard let the
        request through."""
        with patch(
            "backend.services.booking_service._resolve_booked_for_user",
            side_effect=HTTPException(status_code=418, detail="reached"),
        ), self.assertRaises(HTTPException) as context:
            book_seat(
                conn=FakeConnection(),
                current_user=EMPLOYEE_CALLER,
                payload=self._payload(TODAY),
            )

        self.assertEqual(context.exception.status_code, 418)

    def test_accepts_a_future_date_and_reaches_downstream_logic(self) -> None:
        with patch(
            "backend.services.booking_service._resolve_booked_for_user",
            side_effect=HTTPException(status_code=418, detail="reached"),
        ), self.assertRaises(HTTPException) as context:
            book_seat(
                conn=FakeConnection(),
                current_user=EMPLOYEE_CALLER,
                payload=self._payload(TOMORROW),
            )

        self.assertEqual(context.exception.status_code, 418)


class GuestVisitPastDateGuardTests(unittest.TestCase):
    def _payload(self, visit_date: date) -> CreateGuestVisitRequest:
        return CreateGuestVisitRequest(
            guest_id=1,
            host_user_id=1,
            site_id=1,
            building_id=1,
            visit_date=visit_date,
            guest_type=GuestType.OTHER,
        )

    def test_rejects_a_past_visit_date(self) -> None:
        with patch(
            "backend.services.guest_service._resolve_guest",
        ) as mock_resolve_guest, self.assertRaises(HTTPException) as context:
            create_guest_visit(
                conn=object(),
                current_user=GUEST_OPERATOR_CALLER,
                payload=self._payload(YESTERDAY),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "visit_date_in_past")
        mock_resolve_guest.assert_not_called()

    def test_role_gate_still_runs_before_the_date_guard(self) -> None:
        """Non-operator roles must still be rejected for a past-dated
        request -- the date guard must not accidentally short-circuit
        authorization checks for anyone, including on invalid input."""
        with self.assertRaises(HTTPException) as context:
            create_guest_visit(
                conn=object(),
                current_user=EMPLOYEE_CALLER,
                payload=self._payload(YESTERDAY),
            )

        self.assertEqual(context.exception.status_code, 403)

    def test_accepts_a_future_visit_date_and_reaches_downstream_logic(self) -> None:
        with patch(
            "backend.services.guest_service._resolve_guest",
            side_effect=HTTPException(status_code=418, detail="reached"),
        ), self.assertRaises(HTTPException) as context:
            create_guest_visit(
                conn=FakeConnection(),
                current_user=GUEST_OPERATOR_CALLER,
                payload=self._payload(TOMORROW),
            )

        self.assertEqual(context.exception.status_code, 418)


class GuestBookingPastDateGuardTests(unittest.TestCase):
    def _payload(self, visit_date: date) -> CreateGuestBookingRequest:
        return CreateGuestBookingRequest(
            guest_id=1,
            host_user_id=1,
            site_id=1,
            building_id=1,
            floor_id=1,
            seat_id=1,
            visit_date=visit_date,
            guest_type=GuestType.OTHER,
        )

    def test_rejects_a_past_visit_date(self) -> None:
        with patch(
            "backend.services.guest_service._resolve_guest",
        ) as mock_resolve_guest, self.assertRaises(HTTPException) as context:
            create_guest_booking(
                conn=object(),
                current_user=GUEST_OPERATOR_CALLER,
                payload=self._payload(YESTERDAY),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "visit_date_in_past")
        mock_resolve_guest.assert_not_called()

    def test_accepts_a_future_visit_date_and_reaches_downstream_logic(self) -> None:
        with patch(
            "backend.services.guest_service._resolve_guest",
            side_effect=HTTPException(status_code=418, detail="reached"),
        ), self.assertRaises(HTTPException) as context:
            create_guest_booking(
                conn=FakeConnection(),
                current_user=GUEST_OPERATOR_CALLER,
                payload=self._payload(TOMORROW),
            )

        self.assertEqual(context.exception.status_code, 418)


if __name__ == "__main__":
    unittest.main()
