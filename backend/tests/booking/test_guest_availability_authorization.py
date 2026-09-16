from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.booking_service import get_available_seats_by_range


class GuestAvailabilityAuthorizationTests(unittest.TestCase):
    """GET /floors/{floor_id}/seats?is_guest_booking=true&booked_for_guest_id=X
    must be restricted to guest-operator roles, matching every other
    guest-data code path in the app."""

    def test_employee_cannot_probe_guest_availability(self) -> None:
        with patch(
            "backend.services.booking_service.guest_has_active_booking_in_range",
        ) as mock_guest_conflict, patch(
            "backend.services.booking_service.fetch_available_seats_by_range",
        ) as mock_fetch_seats, self.assertRaises(HTTPException) as context:
            get_available_seats_by_range(
                conn=object(),
                tenant_id="1",
                floor_id="10",
                start_date=date(2026, 7, 1),
                end_date=date(2026, 7, 2),
                is_guest_booking=True,
                booked_for_guest_id="99",
                current_user={"user_id": "7", "role_name": "EMPLOYEE"},
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(
            context.exception.detail["code"], "guest_booking_not_allowed"
        )
        mock_guest_conflict.assert_not_called()
        mock_fetch_seats.assert_not_called()

    def test_missing_current_user_is_also_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            get_available_seats_by_range(
                conn=object(),
                tenant_id="1",
                floor_id="10",
                start_date=date(2026, 7, 1),
                end_date=date(2026, 7, 2),
                is_guest_booking=True,
                booked_for_guest_id="99",
                current_user=None,
            )

        self.assertEqual(context.exception.status_code, 403)

    def test_facilitator_passes_the_gate_and_reaches_the_guest_conflict_check(
        self,
    ) -> None:
        """A FACILITATOR must clear the new role gate and reach the existing
        guest-conflict logic -- proven here by that check firing its own 409,
        which could only happen if the 403 gate did not block the call."""
        with patch(
            "backend.services.booking_service.guest_has_active_booking_in_range",
            return_value=True,
        ) as mock_guest_conflict, patch(
            "backend.services.booking_service.fetch_available_seats_by_range",
        ) as mock_fetch_seats, self.assertRaises(HTTPException) as context:
            get_available_seats_by_range(
                conn=object(),
                tenant_id="1",
                floor_id="10",
                start_date=date(2026, 7, 1),
                end_date=date(2026, 7, 2),
                is_guest_booking=True,
                booked_for_guest_id="99",
                current_user={"user_id": "39", "role_name": "FACILITATOR"},
            )

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(
            context.exception.detail["code"], "booking_guest_conflict"
        )
        mock_guest_conflict.assert_called_once()
        mock_fetch_seats.assert_not_called()


if __name__ == "__main__":
    unittest.main()
