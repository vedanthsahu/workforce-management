from __future__ import annotations

import sys
import unittest
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.booking import CreateBookingRequest
from backend.services.booking_service import book_seat
from backend.services.idempotency_service import IdempotentClaim

TOMORROW = date.today() + timedelta(days=1)
EMPLOYEE_CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}


class FakeConnection:
    def cursor(self, *args, **kwargs):
        raise AssertionError("business logic must not run on a replayed response")

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


def _payload() -> CreateBookingRequest:
    return CreateBookingRequest(
        site_id=1, building_id=1, floor_id=1, seat_id=1,
        booking_date=TOMORROW, start_time=time(9, 0), end_time=time(18, 0),
    )


class BookSeatIdempotencyTests(unittest.TestCase):
    def test_a_replayed_claim_short_circuits_before_any_db_write(self) -> None:
        """A retry with a key already SUCCEEDED must return the stored
        response without re-running the booking logic at all -- proven
        here by a conn.cursor() that raises if it's ever called."""
        with patch(
            "backend.services.booking_service.begin_idempotent_operation",
            return_value=IdempotentClaim(
                operation_id=None,
                replay_response={"booking_type": "EMPLOYEE", "booking_id": "99"},
            ),
        ):
            result = book_seat(
                conn=FakeConnection(),
                current_user=EMPLOYEE_CALLER,
                payload=_payload(),
                idempotency_key="retry-key",
            )

        self.assertEqual(result.booking_id, "99")

    def test_a_failure_after_a_fresh_claim_records_it_as_failed(self) -> None:
        """A claimed operation that then fails downstream must be marked
        FAILED so a retry with the same key can be safely reclaimed,
        rather than being stuck reporting in-progress forever. The mark
        must be scoped to the updated_at read at claim time, so a reclaimed
        (no longer owned) claim can't clobber whoever reclaimed it."""
        claimed_at = datetime.now(UTC)
        with (
            patch(
                "backend.services.booking_service.begin_idempotent_operation",
                return_value=IdempotentClaim(operation_id=42, replay_response=None, claimed_at=claimed_at),
            ),
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                side_effect=HTTPException(status_code=400, detail={"code": "boom", "message": "boom"}),
            ),
            patch("backend.services.booking_service.mark_idempotent_operation_failed") as mock_fail,
            self.assertRaises(HTTPException),
        ):
            book_seat(
                conn=FakeConnection(),
                current_user=EMPLOYEE_CALLER,
                payload=_payload(),
                idempotency_key="fresh-key",
            )

        mock_fail.assert_called_once()
        self.assertEqual(mock_fail.call_args.kwargs["operation_id"], 42)
        self.assertEqual(mock_fail.call_args.kwargs["error_code"], "boom")
        self.assertEqual(mock_fail.call_args.kwargs["expected_updated_at"], claimed_at)


if __name__ == "__main__":
    unittest.main()
