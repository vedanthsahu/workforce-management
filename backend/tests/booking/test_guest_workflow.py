from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

import psycopg2
from fastapi import HTTPException
from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.routes.guest_visits import router
from backend.core.enums import GuestType, VisitPurpose
from backend.schemas.guest import (
    GuestWorkflowAction,
    GuestWorkflowRequest,
)
from backend.services import guest_service


class FakeConnection:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _future_date(days: int = 10) -> date:
    return date.today() + timedelta(days=days)


def _visit(**overrides):
    row = {
        "guest_visit_id": "60",
        "tenant_id": "1",
        "guest_id": "50",
        "host_user_id": "20",
        "site_id": "2",
        "building_id": "3",
        "floor_id": "4",
        "visit_date": _future_date(),
        "guest_type": "CUSTOMER",
        "purpose_of_visit": "MEETING",
        "requires_seat": True,
        "visit_status": "SCHEDULED",
    }
    row.update(overrides)
    return row


def _booking(**overrides):
    row = {
        "booking_id": "200",
        "tenant_id": "1",
        "booked_for_guest_id": "50",
        "guest_visit_id": "60",
        "booking_type": "GUEST",
        "seat_id": "30",
        "site_id": "2",
        "building_id": "3",
        "floor_id": "4",
        "booking_date": _future_date(),
        "booking_status": "CONFIRMED",
    }
    row.update(overrides)
    return row


def _payload(action: GuestWorkflowAction, **overrides) -> GuestWorkflowRequest:
    values = {
        "action": action,
        "host_user_id": 21,
        "site_id": 5,
        "building_id": 6,
        "floor_id": 7,
        "visit_date": _future_date(20),
        "guest_type": GuestType.VENDOR,
        "purpose_of_visit": VisitPurpose.VENDOR_VISIT,
        "seat_id": 31,
    }
    values.update(overrides)
    return GuestWorkflowRequest(**values)


class GuestWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.current_user = {
            "tenant_id": "1",
            "user_id": "10",
            "role_name": "TALENT",
        }

    def test_schema_does_not_accept_guest_id_and_route_is_registered(self) -> None:
        self.assertNotIn("guest_id", GuestWorkflowRequest.model_fields)
        route = next(
            route
            for route in router.routes
            if isinstance(route, APIRoute)
            and route.path == "/guest-visits/{guest_visit_id}/workflow"
        )
        self.assertEqual(route.methods, {"POST"})

    def test_modify_visit_only_never_touches_booking(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(),
        ), patch.object(
            guest_service,
            "_resolve_host",
            return_value={},
        ), patch.object(
            guest_service,
            "update_guest_visit_only",
        ) as update_visit, patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
        ) as fetch_booking, patch.object(
            guest_service,
            "cancel_booking",
        ) as cancel_booking:
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(GuestWorkflowAction.MODIFY_VISIT_ONLY),
            )

        update_visit.assert_called_once()
        fetch_booking.assert_not_called()
        cancel_booking.assert_not_called()
        self.assertEqual(response.guest_visit_id, "60")
        self.assertIsNone(response.booking_id)
        self.assertEqual(conn.commits, 1)

    def test_modify_visit_and_booking_creates_new_historical_pair(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(),
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=_booking(),
        ), patch.object(
            guest_service,
            "_resolve_guest",
            return_value={},
        ), patch.object(
            guest_service,
            "_resolve_host",
            return_value={},
        ), patch.object(
            guest_service,
            "_validate_visit_location",
        ), patch.object(
            guest_service,
            "_resolve_seat",
            return_value={
                "seat_id": "31",
                "site_id": "5",
                "building_id": "6",
                "floor_id": "7",
            },
        ), patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            guest_service,
            "cancel_booking",
        ) as mark_booking, patch.object(
            guest_service,
            "mark_guest_visit_modified",
        ) as mark_visit, patch.object(
            guest_service,
            "insert_guest_visit",
            return_value={"guest_visit_id": "61"},
        ) as insert_visit, patch.object(
            guest_service,
            "insert_guest_booking",
            return_value={"booking_id": "201"},
        ) as insert_booking, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(
                    GuestWorkflowAction.MODIFY_VISIT_AND_BOOKING,
                ),
            )

        self.assertEqual(mark_booking.call_args.kwargs["booking_status"], "MODIFIED")
        mark_visit.assert_called_once()
        self.assertEqual(insert_visit.call_args.kwargs["guest_id"], "50")
        self.assertEqual(insert_booking.call_args.kwargs["guest_visit_id"], "61")
        self.assertEqual(response.guest_visit_id, "61")
        self.assertEqual(response.booking_id, "201")
        self.assertEqual(conn.commits, 1)

    def test_add_booking_uses_existing_visit_as_source_of_truth(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(),
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=None,
        ), patch.object(
            guest_service,
            "_resolve_guest",
            return_value={},
        ), patch.object(
            guest_service,
            "_resolve_seat",
            return_value={
                "seat_id": "31",
                "site_id": "2",
                "building_id": "3",
                "floor_id": "4",
            },
        ) as resolve_seat, patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(
            guest_service,
            "insert_guest_booking",
            return_value={"booking_id": "201"},
        ) as insert_booking, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(GuestWorkflowAction.ADD_BOOKING),
            )

        self.assertEqual(resolve_seat.call_args.kwargs["site_id"], "2")
        self.assertEqual(resolve_seat.call_args.kwargs["floor_id"], "4")
        self.assertEqual(
            insert_booking.call_args.kwargs["booking_date"],
            _visit()["visit_date"],
        )
        self.assertEqual(response.booking_id, "201")
        self.assertEqual(conn.commits, 1)

    def test_cancel_booking_keeps_visit_active(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(),
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=_booking(),
        ), patch.object(
            guest_service,
            "cancel_booking",
        ) as cancel_booking, patch.object(
            guest_service,
            "cancel_guest_visit",
        ) as cancel_visit, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(
                    GuestWorkflowAction.CANCEL_BOOKING,
                    cancellation_reason="Seat not needed",
                ),
            )

        cancel_booking.assert_called_once()
        cancel_visit.assert_not_called()
        self.assertEqual(response.booking_id, "200")
        self.assertEqual(conn.commits, 1)

    def test_cancel_visit_cancels_linked_booking(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(),
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=_booking(),
        ), patch.object(
            guest_service,
            "cancel_booking",
        ) as cancel_booking, patch.object(
            guest_service,
            "cancel_guest_visit",
        ) as cancel_visit, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(GuestWorkflowAction.CANCEL_VISIT),
            )

        cancel_booking.assert_called_once()
        cancel_visit.assert_called_once()
        self.assertEqual(response.booking_id, "200")
        self.assertEqual(conn.commits, 1)

    def test_cancel_visit_without_booking_cancels_visit_only(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(requires_seat=False),
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=None,
        ), patch.object(
            guest_service,
            "cancel_booking",
        ) as cancel_booking, patch.object(
            guest_service,
            "cancel_guest_visit",
        ) as cancel_visit, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(GuestWorkflowAction.CANCEL_VISIT),
            )

        cancel_booking.assert_not_called()
        cancel_visit.assert_called_once()
        self.assertIsNone(response.booking_id)
        self.assertEqual(conn.commits, 1)

    def test_failure_rolls_back_historical_modification(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=_visit(),
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=_booking(),
        ), patch.object(guest_service, "_resolve_guest", return_value={}), patch.object(
            guest_service,
            "_resolve_host",
            return_value={},
        ), patch.object(guest_service, "_validate_visit_location"), patch.object(
            guest_service,
            "_resolve_seat",
            return_value={
                "seat_id": "31",
                "site_id": "5",
                "building_id": "6",
                "floor_id": "7",
            },
        ), patch.object(
            guest_service,
            "guest_has_active_booking_on_date",
            return_value=False,
        ), patch.object(
            guest_service,
            "has_active_booking_conflict",
            return_value=False,
        ), patch.object(guest_service, "cancel_booking"), patch.object(
            guest_service,
            "mark_guest_visit_modified",
        ), patch.object(
            guest_service,
            "insert_guest_visit",
            return_value={"guest_visit_id": "61"},
        ), patch.object(
            guest_service,
            "insert_guest_booking",
            side_effect=psycopg2.DatabaseError("insert failed"),
        ):
            with self.assertRaises(HTTPException):
                guest_service.execute_guest_visit_workflow(
                    conn,
                    current_user=self.current_user,
                    guest_visit_id="60",
                    payload=_payload(
                        GuestWorkflowAction.MODIFY_VISIT_AND_BOOKING,
                    ),
                )

        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)


if __name__ == "__main__":
    unittest.main()
