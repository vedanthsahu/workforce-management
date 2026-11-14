from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.booking import ModifyBookingRequest
from backend.services.booking_service import modify_booking

TOMORROW = date.today() + timedelta(days=1)
YESTERDAY = date.today() - timedelta(days=1)
MAX_ADVANCE_DAYS = 30
FAR_FUTURE = date.today() + timedelta(days=MAX_ADVANCE_DAYS + 1)

CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}

EXISTING_BOOKING = {
    "booking_id": "99",
    "tenant_id": "1",
    "booking_type": "EMPLOYEE",
    "booked_for_user_id": "7",
    "seat_id": "10",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "booking_date": TOMORROW,
    "booking_status": "CONFIRMED",
}

BOOKING_OWNER = {"user_id": "7", "status": "ACTIVE", "email": "owner@example.com"}


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _payload(*, booking_date: date) -> ModifyBookingRequest:
    return ModifyBookingRequest(
        site_id=1,
        building_id=1,
        floor_id=1,
        seat_id=999,  # different seat so this is never treated as a no-op
        booking_date=booking_date,
    )


class ModifyBookingWindowTests(unittest.TestCase):
    """Audit finding S-05: `modify_booking` checked only the booking's
    *original* date, so `payload.booking_date` could be moved to an
    arbitrary past or far-future date on modify, even though `book_seat`
    enforces both limits on create. These prove the same policy is now
    enforced on the modify path too, before any seat lookup or write."""

    def _run(self, booking_date: date) -> HTTPException:
        conn = FakeConnection()
        with (
            patch(
                "backend.services.booking_service.fetch_booking_by_id_for_update",
                return_value=dict(EXISTING_BOOKING),
            ),
            patch(
                "backend.services.booking_service.fetch_user_by_id",
                return_value=BOOKING_OWNER,
            ),
            patch(
                "backend.services.booking_service.resolve_booking_advance_days",
                return_value={"employee_max_advance_days": MAX_ADVANCE_DAYS},
            ),
            patch("backend.services.booking_service.fetch_seat_for_booking") as mock_fetch_seat,
            patch("backend.services.booking_service.insert_booking") as mock_insert,
            patch("backend.services.booking_service.safe_write_audit_log"),
        ):
            with self.assertRaises(HTTPException) as context:
                modify_booking(
                    conn,
                    current_user=CALLER,
                    booking_id="99",
                    payload=_payload(booking_date=booking_date),
                )
            # Rejected before the new seat was ever looked up or booked.
            mock_fetch_seat.assert_not_called()
            mock_insert.assert_not_called()
        self.assertEqual(conn.commits, 0)
        return context.exception

    def test_modify_to_past_date_is_rejected(self) -> None:
        exc = self._run(YESTERDAY)
        self.assertEqual(exc.status_code, 400)
        self.assertEqual(exc.detail["code"], "booking_date_in_past")

    def test_modify_beyond_max_advance_days_is_rejected(self) -> None:
        exc = self._run(FAR_FUTURE)
        self.assertEqual(exc.status_code, 400)
        self.assertEqual(exc.detail["code"], "booking_date_too_far_in_advance")

    def test_modify_within_window_still_reaches_seat_lookup(self) -> None:
        """Regression guard: the new check must not reject legitimate
        in-window modifications. Proven by letting the next lookup fail with
        its own distinct error, which could only happen if the window check
        passed the request through."""
        conn = FakeConnection()
        with (
            patch(
                "backend.services.booking_service.fetch_booking_by_id_for_update",
                return_value=dict(EXISTING_BOOKING),
            ),
            patch(
                "backend.services.booking_service.fetch_user_by_id",
                return_value=BOOKING_OWNER,
            ),
            patch(
                "backend.services.booking_service.resolve_booking_advance_days",
                return_value={"employee_max_advance_days": MAX_ADVANCE_DAYS},
            ),
            patch(
                "backend.services.booking_service.fetch_booking_by_id",
                return_value=dict(EXISTING_BOOKING),
            ),
            patch(
                "backend.services.booking_service.fetch_seat_for_booking",
                side_effect=HTTPException(status_code=418, detail="reached"),
            ),
            patch("backend.services.booking_service.safe_write_audit_log"),
        ):
            with self.assertRaises(HTTPException) as context:
                modify_booking(
                    conn,
                    current_user=CALLER,
                    booking_id="99",
                    payload=_payload(booking_date=TOMORROW),
                )
        self.assertEqual(context.exception.status_code, 418)


if __name__ == "__main__":
    unittest.main()
