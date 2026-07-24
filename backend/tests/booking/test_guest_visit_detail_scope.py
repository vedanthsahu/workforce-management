from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.guest_service import get_guest_visit_details

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)


def _visit_row(*, site_id: str = "5", visit_date: date = TODAY) -> dict:
    return {
        "guest_visit_id": "60",
        "tenant_id": "3",
        "guest_id": "1",
        "guest_name": "A Guest",
        "guest_email": None,
        "guest_phone": None,
        "host_user_id": "2",
        "host_name": "A Host",
        "host_email": None,
        "host_phone": None,
        "host_department": None,
        "host_job_title": None,
        "created_by_user_id": None,
        "created_by_name": None,
        "created_by_email": None,
        "site_id": site_id,
        "site_name": "Site",
        "building_id": "1",
        "building_name": "Building",
        "floor_id": None,
        "floor_name": None,
        "booking_id": None,
        "booking_status": None,
        "seat_id": None,
        "seat_code": None,
        "visit_date": visit_date,
        "start_time": None,
        "end_time": None,
        "visit_status": "SCHEDULED",
        "guest_type": "OTHER",
        "purpose_of_visit": None,
        "notes": None,
        "requires_seat": False,
        "checked_in_at": None,
        "checked_out_at": None,
    }


class GuestVisitDetailScopeTests(unittest.TestCase):
    """FRONT_OFFICE's home-site/today-only restriction was deliberately
    removed (guest:view_visits already grants tenant-wide access via
    role_permissions) -- any guest-operator role can now view any visit
    regardless of site or date. These tests confirm that decision and that
    a missing visit still 404s cleanly."""

    def test_front_office_can_view_any_visit_regardless_of_site_or_date(self) -> None:
        current_user = {
            "tenant_id": "3",
            "user_id": "9",
            "role_name": "FRONT_OFFICE",
            "home_site_id": "5",
        }

        with patch(
            "backend.services.guest_service.fetch_guest_visit_by_id",
            return_value=_visit_row(site_id="99", visit_date=YESTERDAY),
        ):
            response = get_guest_visit_details(
                conn=object(),
                current_user=current_user,
                guest_visit_id="60",
            )

        self.assertEqual(response.guest_visit_id, "60")

    def test_front_office_without_home_site_is_still_allowed(self) -> None:
        current_user = {
            "tenant_id": "3",
            "user_id": "9",
            "role_name": "FRONT_OFFICE",
            "home_site_id": None,
        }

        with patch(
            "backend.services.guest_service.fetch_guest_visit_by_id",
            return_value=_visit_row(site_id="5", visit_date=TODAY),
        ):
            response = get_guest_visit_details(
                conn=object(),
                current_user=current_user,
                guest_visit_id="60",
            )

        self.assertEqual(response.guest_visit_id, "60")

    def test_facilitator_can_view_any_tenant_visit_regardless_of_site_or_date(
        self,
    ) -> None:
        current_user = {
            "tenant_id": "3",
            "user_id": "2",
            "role_name": "FACILITATOR",
        }

        with patch(
            "backend.services.guest_service.fetch_guest_visit_by_id",
            return_value=_visit_row(site_id="99", visit_date=YESTERDAY),
        ):
            response = get_guest_visit_details(
                conn=object(),
                current_user=current_user,
                guest_visit_id="60",
            )

        self.assertEqual(response.guest_visit_id, "60")

    def test_missing_visit_returns_404_not_500(self) -> None:
        """Previously this unpacked None into GuestVisitListItem(**row),
        raising an unhandled TypeError (500) instead of a clean 404."""
        current_user = {
            "tenant_id": "3",
            "user_id": "2",
            "role_name": "FACILITATOR",
        }

        with patch(
            "backend.services.guest_service.fetch_guest_visit_by_id",
            return_value=None,
        ):
            with self.assertRaises(HTTPException) as context:
                get_guest_visit_details(
                    conn=object(),
                    current_user=current_user,
                    guest_visit_id="404",
                )

        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
