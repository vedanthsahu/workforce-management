from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.booking_service import cancel_booking_by_id

TOMORROW = date.today() + timedelta(days=1)

CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}

ALREADY_CANCELLED_BOOKING = {
    "booking_id": "99",
    "tenant_id": "1",
    "booking_type": "EMPLOYEE",
    "booked_for_user_id": "7",
    "booked_by_user_id": "7",
    "seat_id": "10",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "booking_date": TOMORROW,
    "booking_status": "CANCELLED",
    "cancellation_reason": "Changed plans",
}


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class CancelBookingIdempotencyTests(unittest.TestCase):
    """Cancelling twice must be a no-op by construction (dev-notes/backend/
    idempotency_recovery_design.md, Business recovery policies + Implementation
    tasks #7): a retry that lands after the original cancellation already
    committed must report the real current state, not an error -- a caller
    must never have to infer success/failure from an error code alone."""

    def test_retrying_a_cancel_against_an_already_cancelled_booking_returns_it_as_is(
        self,
    ) -> None:
        conn = FakeConnection()

        with (
            patch(
                "backend.services.booking_service.fetch_booking_by_id_for_update",
                return_value=dict(ALREADY_CANCELLED_BOOKING),
            ),
            patch("backend.services.booking_service.fetch_user_by_id") as mock_fetch_user,
            patch("backend.services.booking_service.cancel_booking") as mock_cancel,
            patch("backend.services.booking_service.fetch_booking_by_id") as mock_refetch,
            patch("backend.services.booking_service.safe_write_audit_log") as mock_audit,
        ):
            result = cancel_booking_by_id(
                conn,
                current_user=CALLER,
                booking_id="99",
                cancellation_reason="Changed my mind, again",
            )

        self.assertEqual(result.booking_id, "99")
        self.assertEqual(result.booking_status, "CANCELLED")
        # Nothing re-executed: no re-cancel write, no second read, no
        # re-audit, no email -- it's a pure report of what's already true.
        mock_fetch_user.assert_not_called()
        mock_cancel.assert_not_called()
        mock_refetch.assert_not_called()
        mock_audit.assert_not_called()
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_a_genuinely_terminal_booking_still_rejects_the_cancel(self) -> None:
        """Regression guard: only CANCELLED is treated as a no-op retry --
        COMPLETED/MODIFIED/NO_SHOW are terminal states cancel never produces,
        so they must still be rejected, not silently reported as success."""
        conn = FakeConnection()
        completed = dict(ALREADY_CANCELLED_BOOKING)
        completed["booking_status"] = "COMPLETED"
        del completed["cancellation_reason"]

        with (
            patch(
                "backend.services.booking_service.fetch_booking_by_id_for_update",
                return_value=completed,
            ),
            patch("backend.services.booking_service.safe_write_audit_log"),
        ):
            with self.assertRaises(HTTPException) as context:
                cancel_booking_by_id(
                    conn,
                    current_user=CALLER,
                    booking_id="99",
                    cancellation_reason="Changed my mind",
                )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "booking_not_mutable")
        self.assertEqual(conn.rollbacks, 1)


if __name__ == "__main__":
    unittest.main()
