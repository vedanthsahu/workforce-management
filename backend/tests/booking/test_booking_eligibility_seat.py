from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.booking import BookingEligibilityRequest
from backend.services.booking_service import check_booking_eligibility

TODAY = date.today()
IN_5_DAYS = TODAY + timedelta(days=5)

CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}

ACTIVE_BOOKABLE_SEAT = {
    "seat_id": "42",
    "site_id": "1",
    "building_id": "1",
    "floor_id": "1",
    "seat_code": "A-1",
    "status": "ACTIVE",
    "is_bookable": True,
}


def _payload(**overrides) -> BookingEligibilityRequest:
    base = dict(
        start_date=TODAY,
        end_date=IN_5_DAYS,
        is_guest_booking=False,
        booked_for_user_id=7,
        seat_id=42,
    )
    base.update(overrides)
    return BookingEligibilityRequest(**base)


class BookingEligibilitySeatTests(unittest.TestCase):
    """POST /bookings/eligibility with seat_id must additionally validate
    the seat itself, on top of the pre-existing user/guest availability
    checks, which must keep working exactly as before."""

    def _run(
        self,
        payload: BookingEligibilityRequest,
        *,
        current_user: dict[str, str] = CALLER,
        **patches,
    ):
        defaults = {
            "backend.services.booking_service._resolve_booked_for_user": patch(
                "backend.services.booking_service._resolve_booked_for_user",
                return_value={"user_id": "7"},
            ),
            "backend.services.booking_service.user_has_active_booking_in_range": patch(
                "backend.services.booking_service.user_has_active_booking_in_range",
                return_value=False,
            ),
            "backend.services.booking_service.fetch_seat_configuration": patch(
                "backend.services.booking_service.fetch_seat_configuration",
                return_value=dict(ACTIVE_BOOKABLE_SEAT),
            ),
            "backend.services.booking_service.seat_has_active_block_in_range": patch(
                "backend.services.booking_service.seat_has_active_block_in_range",
                return_value=False,
            ),
            "backend.services.booking_service.seat_has_active_booking_in_range": patch(
                "backend.services.booking_service.seat_has_active_booking_in_range",
                return_value=False,
            ),
        }
        for name, new_patch in patches.items():
            defaults[name] = new_patch

        with defaults[
            "backend.services.booking_service._resolve_booked_for_user"
        ], defaults[
            "backend.services.booking_service.user_has_active_booking_in_range"
        ], defaults[
            "backend.services.booking_service.fetch_seat_configuration"
        ], defaults[
            "backend.services.booking_service.seat_has_active_block_in_range"
        ], defaults[
            "backend.services.booking_service.seat_has_active_booking_in_range"
        ]:
            return check_booking_eligibility(
                conn=object(),
                tenant_id="1",
                current_user=current_user,
                payload=payload,
            )

    def test_eligible_when_seat_is_clear(self) -> None:
        result = self._run(_payload())
        self.assertTrue(result.eligible)

    def test_seat_lookup_uses_layout_effective_on_start_date(self) -> None:
        """A seat left over from a superseded layout must be treated as
        not-found here, same as the booking-creation path."""
        with patch(
            "backend.services.booking_service._resolve_booked_for_user",
            return_value={"user_id": "7"},
        ), patch(
            "backend.services.booking_service.user_has_active_booking_in_range",
            return_value=False,
        ), patch(
            "backend.services.booking_service.fetch_seat_configuration",
            return_value=dict(ACTIVE_BOOKABLE_SEAT),
        ) as mock_fetch_seat, patch(
            "backend.services.booking_service.seat_has_active_block_in_range",
            return_value=False,
        ), patch(
            "backend.services.booking_service.seat_has_active_booking_in_range",
            return_value=False,
        ):
            check_booking_eligibility(
                conn=object(), tenant_id="1", current_user=CALLER, payload=_payload(),
            )

        # The seat lookup must be scoped to the layout covering the
        # requested date (the current PUBLISHED one, or a SCHEDULED one
        # whose effective_from has passed) -- passing booking_date is what
        # makes fetch_seat_configuration exclude a seat left over from a
        # superseded layout, same as the booking-creation path.
        self.assertEqual(mock_fetch_seat.call_args.kwargs["booking_date"], TODAY)

    def test_seat_not_found_raises_404(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._run(
                _payload(),
                **{
                    "backend.services.booking_service.fetch_seat_configuration": patch(
                        "backend.services.booking_service.fetch_seat_configuration",
                        return_value=None,
                    )
                },
            )
        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(context.exception.detail["code"], "seat_not_found")

    def test_inactive_seat_raises_400(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._run(
                _payload(),
                **{
                    "backend.services.booking_service.fetch_seat_configuration": patch(
                        "backend.services.booking_service.fetch_seat_configuration",
                        return_value={**ACTIVE_BOOKABLE_SEAT, "status": "INACTIVE"},
                    )
                },
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "booking_seat_inactive")

    def test_non_bookable_seat_raises_400(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._run(
                _payload(),
                **{
                    "backend.services.booking_service.fetch_seat_configuration": patch(
                        "backend.services.booking_service.fetch_seat_configuration",
                        return_value={**ACTIVE_BOOKABLE_SEAT, "is_bookable": False},
                    )
                },
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "booking_seat_not_bookable")

    def test_tenant_admin_can_use_active_non_bookable_seat(self) -> None:
        result = self._run(
            _payload(),
            current_user={
                "tenant_id": "1",
                "user_id": "7",
                "role_name": "TENANT_ADMIN",
            },
            **{
                "backend.services.booking_service.fetch_seat_configuration": patch(
                    "backend.services.booking_service.fetch_seat_configuration",
                    return_value={**ACTIVE_BOOKABLE_SEAT, "is_bookable": False},
                )
            },
        )

        self.assertTrue(result.eligible)

    def test_blocked_seat_raises_409(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._run(
                _payload(),
                **{
                    "backend.services.booking_service.seat_has_active_block_in_range": patch(
                        "backend.services.booking_service.seat_has_active_block_in_range",
                        return_value=True,
                    )
                },
            )
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "booking_seat_blocked")

    def test_restricted_block_is_ignored_for_facilitator(self) -> None:
        seen: dict[str, object] = {}

        def block_check(*_args, **kwargs):
            seen.update(kwargs)
            return False

        result = self._run(
            _payload(),
            current_user={
                "tenant_id": "1",
                "user_id": "39",
                "role_name": "FACILITATOR",
            },
            **{
                "backend.services.booking_service.seat_has_active_block_in_range": patch(
                    "backend.services.booking_service.seat_has_active_block_in_range",
                    side_effect=block_check,
                )
            },
        )

        self.assertTrue(result.eligible)
        self.assertEqual(seen["allowed_block_types"], ("Restricted",))

    def test_admin_can_pass_restricted_and_exclusive_blocks(self) -> None:
        seen: dict[str, object] = {}

        def block_check(*_args, **kwargs):
            seen.update(kwargs)
            return False

        result = self._run(
            _payload(),
            current_user={
                "tenant_id": "1",
                "user_id": "8",
                "role_name": "TENANT_ADMIN",
            },
            **{
                "backend.services.booking_service.seat_has_active_block_in_range": patch(
                    "backend.services.booking_service.seat_has_active_block_in_range",
                    side_effect=block_check,
                )
            },
        )

        self.assertTrue(result.eligible)
        self.assertEqual(
            seen["allowed_block_types"],
            ("Restricted", "Exclusive"),
        )

    def test_employee_cannot_pass_any_block_type(self) -> None:
        seen: dict[str, object] = {}

        def block_check(*_args, **kwargs):
            seen.update(kwargs)
            return True

        with self.assertRaises(HTTPException) as context:
            self._run(
                _payload(),
                **{
                    "backend.services.booking_service.seat_has_active_block_in_range": patch(
                        "backend.services.booking_service.seat_has_active_block_in_range",
                        side_effect=block_check,
                    )
                },
            )

        self.assertEqual(context.exception.detail["code"], "booking_seat_blocked")
        self.assertEqual(seen["allowed_block_types"], ())

    def test_overlapping_seat_booking_raises_409(self) -> None:
        with self.assertRaises(HTTPException) as context:
            self._run(
                _payload(),
                **{
                    "backend.services.booking_service.seat_has_active_booking_in_range": patch(
                        "backend.services.booking_service.seat_has_active_booking_in_range",
                        return_value=True,
                    )
                },
            )
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "booking_conflict")

    def test_exclude_booking_id_is_forwarded_to_the_seat_conflict_check(self) -> None:
        with patch(
            "backend.services.booking_service._resolve_booked_for_user",
            return_value={"user_id": "7"},
        ), patch(
            "backend.services.booking_service.user_has_active_booking_in_range",
            return_value=False,
        ), patch(
            "backend.services.booking_service.fetch_seat_configuration",
            return_value=dict(ACTIVE_BOOKABLE_SEAT),
        ), patch(
            "backend.services.booking_service.seat_has_active_block_in_range",
            return_value=False,
        ), patch(
            "backend.services.booking_service.seat_has_active_booking_in_range",
            return_value=False,
        ) as mock_seat_conflict:
            check_booking_eligibility(
                conn=object(),
                tenant_id="1",
                current_user=CALLER,
                payload=_payload(exclude_booking_id="55"),
            )

        self.assertEqual(mock_seat_conflict.call_args.kwargs["exclude_booking_id"], "55")

    def test_no_seat_id_preserves_existing_behaviour(self) -> None:
        """Omitting seat_id must not trigger any of the new seat checks."""
        with patch(
            "backend.services.booking_service._resolve_booked_for_user",
            return_value={"user_id": "7"},
        ), patch(
            "backend.services.booking_service.user_has_active_booking_in_range",
            return_value=False,
        ), patch(
            "backend.services.booking_service.fetch_seat_configuration",
        ) as mock_fetch_seat:
            result = check_booking_eligibility(
                conn=object(),
                tenant_id="1",
                current_user=CALLER,
                payload=_payload(seat_id=None),
            )

        self.assertTrue(result.eligible)
        mock_fetch_seat.assert_not_called()


if __name__ == "__main__":
    unittest.main()
