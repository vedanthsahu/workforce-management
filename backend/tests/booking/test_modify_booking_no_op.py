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


def _payload(*, seat_id: int, booking_date: date) -> ModifyBookingRequest:
    return ModifyBookingRequest(
        site_id=1,
        building_id=1,
        floor_id=1,
        seat_id=seat_id,
        booking_date=booking_date,
    )


class ModifyBookingNoOpTests(unittest.TestCase):
    """POST /bookings/{id}/modify must not write anything when the payload
    matches the booking's current seat + date -- only re-audit, re-notify,
    and re-persist when something actually changed."""

    def test_identical_seat_and_date_short_circuits_without_writes(self) -> None:
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
            patch("backend.services.booking_service.fetch_seat_for_booking") as mock_fetch_seat,
            patch("backend.services.booking_service.mark_booking_modified") as mock_mark_modified,
            patch("backend.services.booking_service.insert_booking") as mock_insert,
            patch("backend.services.booking_service.safe_write_audit_log") as mock_audit,
        ):
            result = modify_booking(
                conn,
                current_user=CALLER,
                booking_id="99",
                payload=_payload(seat_id=10, booking_date=TOMORROW),
            )

        self.assertEqual(result.booking_id, "99")
        # Nothing should have been touched beyond the initial lookups.
        mock_fetch_seat.assert_not_called()
        mock_mark_modified.assert_not_called()
        mock_insert.assert_not_called()
        mock_audit.assert_not_called()
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_a_real_change_still_reaches_downstream_logic(self) -> None:
        """Regression guard: the no-op check must not swallow legitimate
        modifications. Proven by letting the next lookup fail with its own
        distinct error, which could only happen if the no-op check passed
        the request through."""
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
                    payload=_payload(seat_id=999, booking_date=TOMORROW),
                )

        self.assertEqual(context.exception.status_code, 418)
        self.assertEqual(conn.rollbacks, 1)


if __name__ == "__main__":
    unittest.main()
