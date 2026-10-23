from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.user_management_service import (
    get_user_booking_history,
    get_user_by_id_service,
)

TARGET_USER = {
    "id": "15",
    "email": "employeeb@example.com",
    "full_name": "Employee B",
    "display_name": "Employee B",
    "role_name": "EMPLOYEE",
    "status": "ACTIVE",
    "employee_id": "E-15",
    "mobile_phone": "+1 555 0000",
    "office_location": "HQ",
    "job_title": "Engineer",
    "department": "Engineering",
    "company_name": "Acme",
    "manager_user_id": "51",
    "home_site_id": "1",
}


class UserResourceAuthorizationTests(unittest.TestCase):
    """GET /users/{user_id} and GET /users/{user_id}/bookings must not allow
    one employee to view another employee's data by changing the user_id."""

    def test_employee_cannot_view_another_employees_details(self) -> None:
        current_user = {"user_id": "7", "tenant_id": "3", "role_name": "EMPLOYEE"}

        with patch(
            "backend.services.user_management_service.fetch_user_details_by_id",
            return_value=TARGET_USER,
        ), self.assertRaises(HTTPException) as context:
            get_user_by_id_service(
                conn=object(),
                current_user=current_user,
                user_id="15",
            )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail["code"], "user_view_forbidden")

    def test_employee_can_view_their_own_details(self) -> None:
        current_user = {"user_id": "15", "tenant_id": "3", "role_name": "EMPLOYEE"}

        with patch(
            "backend.services.user_management_service.fetch_user_details_by_id",
            return_value=TARGET_USER,
        ):
            response = get_user_by_id_service(
                conn=object(),
                current_user=current_user,
                user_id="15",
            )

        self.assertEqual(response.id, "15")

    def test_manager_cannot_view_direct_reports_details(self) -> None:
        # Narrowed 2026-10-23: MANAGER (dormant) no longer gets a bypass
        # here at all, report or not -- self or TENANT_ADMIN only.
        current_user = {"user_id": "51", "tenant_id": "3", "role_name": "MANAGER"}

        with patch(
            "backend.services.user_management_service.fetch_user_details_by_id",
            return_value=TARGET_USER,
        ), self.assertRaises(HTTPException) as context:
            get_user_by_id_service(
                conn=object(),
                current_user=current_user,
                user_id="15",
            )

        self.assertEqual(context.exception.status_code, 403)

    def test_facilitator_cannot_view_another_users_details(self) -> None:
        # Narrowed 2026-10-23: viewing a specific user's detail/bookings is
        # not a FACILITATOR delegation surface, unlike booking creation
        # itself (can_create_for_user) -- self or TENANT_ADMIN only.
        current_user = {"user_id": "1", "tenant_id": "3", "role_name": "FACILITATOR"}

        with patch(
            "backend.services.user_management_service.fetch_user_details_by_id",
            return_value=TARGET_USER,
        ), self.assertRaises(HTTPException) as context:
            get_user_by_id_service(
                conn=object(),
                current_user=current_user,
                user_id="15",
            )

        self.assertEqual(context.exception.status_code, 403)

    def test_tenant_admin_can_view_any_user(self) -> None:
        current_user = {"user_id": "1", "tenant_id": "3", "role_name": "TENANT_ADMIN"}

        with patch(
            "backend.services.user_management_service.fetch_user_details_by_id",
            return_value=TARGET_USER,
        ):
            response = get_user_by_id_service(
                conn=object(),
                current_user=current_user,
                user_id="15",
            )

        self.assertEqual(response.id, "15")

    def test_employee_cannot_view_another_employees_bookings(self) -> None:
        current_user = {"user_id": "7", "tenant_id": "3", "role_name": "EMPLOYEE"}

        with patch(
            "backend.services.user_management_service.fetch_user_details_by_id",
            return_value=TARGET_USER,
        ), patch(
            "backend.services.user_management_service.fetch_all_confirmed_bookings_for_user",
        ) as mock_fetch_bookings:
            with self.assertRaises(HTTPException) as context:
                get_user_booking_history(
                    conn=object(),
                    current_user=current_user,
                    user_id="15",
                )

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail["code"], "user_bookings_forbidden")
        mock_fetch_bookings.assert_not_called()


if __name__ == "__main__":
    unittest.main()
