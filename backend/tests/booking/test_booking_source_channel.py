from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.booking import CreateBookingRequest
from backend.services.booking_service import book_seat

TOMORROW = date.today() + timedelta(days=1)
CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}


class FakeConnection:
    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


def _payload(source_channel: str | None) -> CreateBookingRequest:
    return CreateBookingRequest(
        site_id=1,
        building_id=1,
        floor_id=1,
        seat_id=1,
        booking_date=TOMORROW,
        source_channel=source_channel,
    )


class CreateBookingSourceChannelTests(unittest.TestCase):
    """POST /bookings should default source_channel to WEB when omitted,
    but persist whatever valid value the caller supplies."""

    def _run(self, payload: CreateBookingRequest):
        with (
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                return_value={"email": "owner@example.com"},
            ),
            patch(
                "backend.services.booking_service.fetch_seat_for_booking",
                return_value={
                    "tenant_id": "1",
                    "site_id": "1",
                    "building_id": "1",
                    "floor_id": "1",
                    "seat_id": "1",
                    "status": "ACTIVE",
                    "is_bookable": True,
                },
            ),
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
            ) as mock_insert,
            patch("backend.services.booking_service.write_audit_log"),
        ):
            book_seat(
                FakeConnection(),
                current_user=CALLER,
                payload=payload,
            )
        return mock_insert

    def test_defaults_to_web_when_omitted(self) -> None:
        mock_insert = self._run(_payload(None))
        self.assertEqual(mock_insert.call_args.kwargs["source_channel"], "WEB")

    def test_honors_a_supplied_source_channel(self) -> None:
        mock_insert = self._run(_payload("MOBILE"))
        self.assertEqual(mock_insert.call_args.kwargs["source_channel"], "MOBILE")

    def test_invalid_source_channel_is_rejected_by_existing_validation(self) -> None:
        """insert_booking's existing SOURCE_CHANNELS check is reused as-is;
        book_seat should surface it as the standard 400 invalid_booking_value."""
        with (
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                return_value={"email": "owner@example.com"},
            ),
            patch(
                "backend.services.booking_service.fetch_seat_for_booking",
                return_value={
                    "tenant_id": "1",
                    "site_id": "1",
                    "building_id": "1",
                    "floor_id": "1",
                    "seat_id": "1",
                    "status": "ACTIVE",
                    "is_bookable": True,
                },
            ),
            patch(
                "backend.services.booking_service.user_has_active_booking_on_date",
                return_value=False,
            ),
            patch(
                "backend.services.booking_service.has_active_booking_conflict",
                return_value=False,
            ),
            patch("backend.services.booking_service.safe_write_audit_log"),
        ):
            with self.assertRaises(HTTPException) as context:
                book_seat(
                    FakeConnection(),
                    current_user=CALLER,
                    payload=_payload("CARRIER_PIGEON"),
                )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_booking_value")


if __name__ == "__main__":
    unittest.main()
