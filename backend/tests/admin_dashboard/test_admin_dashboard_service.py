from __future__ import annotations

import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services import admin_dashboard_service as service


class AdminDashboardServiceTests(unittest.TestCase):
    def test_date_range_rejects_end_before_start(self) -> None:
        with self.assertRaises(HTTPException) as context:
            service.get_date_range_occupancy(
                object(),
                tenant_id="1",
                start_date=date(2026, 5, 16),
                end_date=date(2026, 5, 12),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "invalid_date_range")

    def test_date_range_rejects_more_than_ninety_days(self) -> None:
        with self.assertRaises(HTTPException) as context:
            service.get_date_range_occupancy(
                object(),
                tenant_id="1",
                start_date=date(2026, 1, 1),
                end_date=date(2026, 4, 1),
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail["code"], "date_range_too_large")

    def test_hierarchy_requires_site_when_building_filter_is_used(self) -> None:
        with self.assertRaises(HTTPException) as context:
            service.get_hierarchy_occupancy(
                object(),
                tenant_id="1",
                selected_date=date(2026, 5, 22),
                building_id="10",
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(
            context.exception.detail["code"],
            "invalid_hierarchy_combination",
        )

    def test_activity_list_maps_rows(self) -> None:
        row = {
            "activity_id": "employee-booking-1001",
            "activity_type": "EMPLOYEE_BOOKING",
            "has_booking": True,
            "activity_status": "CONFIRMED",
            "activity_date": date(2026, 5, 22),
            "booking_id": "1001",
            "guest_visit_id": None,
            "check_in_at": None,
            "checked_out_at": None,
            "created_at": datetime(2026, 5, 22, 8, 30),
            "booked_by_id": "42",
            "booked_by_email": "employee@example.com",
            "booked_by_name": "Employee One",
            "booked_by_role": "EMPLOYEE",
            "booked_by_department": "Engineering",
            "booked_by_job_title": "Developer",
            "booked_for_id": "42",
            "booked_for_email": "employee@example.com",
            "booked_for_name": "Employee One",
            "booked_for_role": "EMPLOYEE",
            "booked_for_department": "Engineering",
            "booked_for_job_title": "Developer",
            "booked_for_guest_type": None,
            "seat_id": "501",
            "seat_code": "A-101",
            "seat_type": "STANDARD",
            "seat_neighborhood": "North",
            "site_id": "1",
            "site_code": "BLR",
            "site_name": "Bangalore Campus",
            "building_id": "11",
            "building_code": "TWA",
            "building_name": "Tower A",
            "floor_id": "101",
            "floor_code": "F1",
            "floor_name": "Floor 1",
        }

        with patch.object(service, "_validate_hierarchy_filters") as validate, patch.object(
            service,
            "fetch_admin_activity_list",
            return_value=[row],
        ) as fetch:
            response = service.get_admin_activity_list(
                object(),
                tenant_id="1",
                selected_date=date(2026, 5, 22),
            )

        validate.assert_called_once()
        fetch.assert_called_once()
        payload = response.model_dump(by_alias=True)
        self.assertEqual(payload["items"][0]["activityId"], "employee-booking-1001")
        self.assertEqual(payload["items"][0]["bookingId"], "1001")
        self.assertEqual(payload["items"][0]["bookedFor"]["entityType"], "EMPLOYEE")
        self.assertEqual(payload["items"][0]["bookedFor"]["id"], "42")


if __name__ == "__main__":
    unittest.main()
