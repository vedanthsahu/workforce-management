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
    GuestWorkflowResponse,
    ModifyGuestVisitRequest,
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
            "role_name": "FACILITATOR",
        }
        audit_patcher = patch.object(guest_service, "safe_write_audit_log")
        audit_patcher.start()
        self.addCleanup(audit_patcher.stop)

    def test_schema_does_not_accept_guest_id_and_route_is_registered(self) -> None:
        self.assertNotIn("guest_id", GuestWorkflowRequest.model_fields)
        self.assertNotIn("guest_visit_id", GuestWorkflowResponse.model_fields)
        self.assertNotIn("booking_id", GuestWorkflowResponse.model_fields)
        self.assertIn("guest_visit", GuestWorkflowResponse.model_fields)
        self.assertIn("booking", GuestWorkflowResponse.model_fields)
        route = next(
            route
            for route in router.routes
            if isinstance(route, APIRoute)
            and route.path == "/guest-visits/{guest_visit_id}/workflow"
        )
        self.assertEqual(route.methods, {"POST"})

    def test_modify_visit_only_creates_new_visit_and_never_touches_booking(self) -> None:
        conn = FakeConnection()
        old_visit = _visit()
        new_visit = _visit(
            guest_visit_id="61",
            host_user_id="21",
            site_id="5",
            building_id="6",
            floor_id="7",
            visit_date=_future_date(20),
            guest_type="VENDOR",
            purpose_of_visit="VENDOR_VISIT",
        )
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            side_effect=[old_visit, new_visit],
        ), patch.object(
            guest_service,
            "_resolve_host",
            return_value={},
        ), patch.object(
            guest_service,
            "_validate_visit_location",
        ), patch.object(
            guest_service,
            "mark_guest_visit_modified",
        ) as mark_visit, patch.object(
            guest_service,
            "insert_guest_visit",
            return_value=new_visit,
        ) as insert_visit, patch.object(
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
                payload=_payload(
                    GuestWorkflowAction.MODIFY_VISIT_ONLY,
                    modification_reason="OTHER",
                ),
            )

        mark_visit.assert_called_once_with(
            conn,
            tenant_id="1",
            guest_visit_id="60",
            modification_reason="OTHER",
        )
        self.assertEqual(insert_visit.call_args.kwargs["guest_id"], "50")
        self.assertEqual(insert_visit.call_args.kwargs["site_id"], "5")
        self.assertEqual(insert_visit.call_args.kwargs["building_id"], "6")
        self.assertEqual(insert_visit.call_args.kwargs["floor_id"], "7")
        self.assertEqual(
            insert_visit.call_args.kwargs["visit_date"],
            _future_date(20),
        )
        self.assertNotIn("modification_reason", insert_visit.call_args.kwargs)
        fetch_booking.assert_not_called()
        cancel_booking.assert_not_called()
        self.assertNotEqual(old_visit["guest_visit_id"], new_visit["guest_visit_id"])
        self.assertEqual(response.guest_visit.guest_visit_id, "61")
        self.assertEqual(response.guest_visit.visit_status, "SCHEDULED")
        self.assertIsNone(response.booking)
        self.assertEqual(conn.commits, 1)

    def test_modify_visit_and_booking_creates_new_historical_pair(self) -> None:
        conn = FakeConnection()
        old_visit = _visit()
        new_visit = _visit(
            guest_visit_id="61",
            host_user_id="21",
            site_id="5",
            building_id="6",
            floor_id="7",
            visit_date=_future_date(20),
            guest_type="VENDOR",
            purpose_of_visit="VENDOR_VISIT",
        )
        old_booking = _booking()
        new_booking = _booking(
            booking_id="201",
            guest_visit_id="61",
            seat_id="31",
            site_id="5",
            building_id="6",
            floor_id="7",
            booking_date=_future_date(20),
        )
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            side_effect=[old_visit, new_visit],
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=old_booking,
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
            "mark_booking_modified",
        ) as mark_booking, patch.object(
            guest_service,
            "mark_guest_visit_modified",
        ) as mark_visit, patch.object(
            guest_service,
            "insert_guest_visit",
            return_value=new_visit,
        ) as insert_visit, patch.object(
            guest_service,
            "insert_guest_booking",
            return_value=new_booking,
        ) as insert_booking, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ), patch.object(
            guest_service,
            "fetch_booking_by_id",
            return_value=new_booking,
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(
                    GuestWorkflowAction.MODIFY_VISIT_AND_BOOKING,
                    modification_reason="OTHER",
                ),
            )

        self.assertEqual(mark_booking.call_args.kwargs["booking_id"], "200")
        self.assertEqual(
            mark_booking.call_args.kwargs["modification_reason"],
            "OTHER",
        )
        self.assertEqual(insert_booking.call_args.kwargs["modified_from_booking_id"], "200")
        self.assertNotIn("modification_reason", insert_booking.call_args.kwargs)
        self.assertEqual(insert_visit.call_args.kwargs["modified_from_guest_visit_id"], "60")
        mark_visit.assert_called_once_with(
            conn,
            tenant_id="1",
            guest_visit_id="60",
            modification_reason="OTHER",
        )
        self.assertNotIn("modification_reason", insert_visit.call_args.kwargs)
        self.assertEqual(insert_visit.call_args.kwargs["guest_id"], "50")
        self.assertEqual(insert_booking.call_args.kwargs["guest_visit_id"], "61")
        self.assertNotEqual(old_visit["guest_visit_id"], new_visit["guest_visit_id"])
        self.assertNotEqual(old_booking["booking_id"], new_booking["booking_id"])
        self.assertEqual(response.guest_visit.guest_visit_id, "61")
        self.assertEqual(response.guest_visit.visit_status, "SCHEDULED")
        self.assertIsNotNone(response.booking)
        self.assertEqual(response.booking.booking_id, "201")
        self.assertEqual(response.booking.booking_status, "CONFIRMED")
        self.assertEqual(response.booking.guest_visit_id, "61")
        self.assertEqual(conn.commits, 1)

    def test_direct_modify_guest_visit_replaces_visit_and_linked_booking(self) -> None:
        conn = FakeConnection()
        old_visit = _visit()
        old_booking = _booking()
        new_visit = _visit(
            guest_visit_id="61",
            host_user_id="21",
            site_id="5",
            building_id="6",
            floor_id="7",
            visit_date=_future_date(20),
            guest_type="VENDOR",
            purpose_of_visit="VENDOR_VISIT",
        )
        payload = ModifyGuestVisitRequest(
            host_user_id=21,
            site_id=5,
            building_id=6,
            floor_id=7,
            visit_date=_future_date(20),
            guest_type=GuestType.VENDOR,
            purpose_of_visit=VisitPurpose.VENDOR_VISIT,
            modification_reason="LOCATION_CHANGED",
        )
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            return_value=old_visit,
        ), patch.object(
            guest_service,
            "_resolve_host",
            return_value={},
        ), patch.object(
            guest_service,
            "_validate_visit_location",
        ), patch.object(
            guest_service,
            "fetch_active_booking_for_guest_visit",
            return_value=old_booking,
        ), patch.object(
            guest_service,
            "mark_booking_modified",
        ) as mark_booking, patch.object(
            guest_service,
            "mark_guest_visit_modified",
        ) as mark_visit, patch.object(
            guest_service,
            "insert_guest_visit",
            return_value=new_visit,
        ) as insert_visit, patch.object(
            guest_service,
            "update_guest_visit_booking_details",
        ), patch.object(
            guest_service,
            "sync_booking_from_guest_visit",
        ) as sync_booking, patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ), patch.object(
            guest_service,
            "fetch_guest_visit_by_id",
            return_value=new_visit,
        ):
            response = guest_service.modify_guest_visit(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=payload,
            )

        self.assertEqual(mark_booking.call_args.kwargs["booking_id"], "200")
        self.assertEqual(
            # LOCATION_CHANGED is valid for guest_visits.modification_reason
            # but not bookings.modification_reason (chk_booking_modification_reason),
            # so the booking side falls back to OTHER.
            mark_booking.call_args.kwargs["modification_reason"],
            "OTHER",
        )
        mark_visit.assert_called_once_with(
            conn,
            tenant_id="1",
            guest_visit_id="60",
            modification_reason="LOCATION_CHANGED",
        )
        self.assertEqual(insert_visit.call_args.kwargs["modified_from_guest_visit_id"], "60")
        self.assertNotIn("modification_reason", insert_visit.call_args.kwargs)
        self.assertEqual(sync_booking.call_args.kwargs["guest_visit_id"], "60")
        self.assertEqual(sync_booking.call_args.kwargs["site_id"], "5")
        self.assertEqual(sync_booking.call_args.kwargs["building_id"], "6")
        self.assertEqual(sync_booking.call_args.kwargs["floor_id"], "7")
        self.assertEqual(response.guest_visit_id, "61")
        self.assertEqual(conn.commits, 2)

    def test_add_booking_uses_existing_visit_as_source_of_truth(self) -> None:
        conn = FakeConnection()
        visit = _visit()
        new_booking = _booking(booking_id="201")
        payload = _payload(GuestWorkflowAction.ADD_BOOKING)
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            side_effect=[visit, visit],
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
            "_validate_visit_location",
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
            return_value=new_booking,
        ) as insert_booking, patch.object(
            guest_service,
            "update_guest_visit_booking_details",
        ), patch.object(
            guest_service,
            "recalculate_guest_visit_requires_seat",
        ), patch.object(
            guest_service,
            "fetch_booking_by_id",
            return_value=new_booking,
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=payload,
            )

        self.assertEqual(resolve_seat.call_args.kwargs["site_id"], "5")
        self.assertEqual(resolve_seat.call_args.kwargs["floor_id"], "7")
        self.assertEqual(
            insert_booking.call_args.kwargs["booking_date"],
            payload.visit_date,
        )
        self.assertEqual(response.guest_visit.guest_visit_id, "60")
        self.assertIsNotNone(response.booking)
        self.assertEqual(response.booking.booking_id, "201")
        self.assertEqual(conn.commits, 1)

    def test_cancel_booking_keeps_visit_active(self) -> None:
        conn = FakeConnection()
        cancelled_booking = _booking(
            booking_status="CANCELLED",
            cancellation_reason="Seat not needed",
        )
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            side_effect=[_visit(), _visit(requires_seat=False)],
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
        ), patch.object(
            guest_service,
            "fetch_booking_by_id",
            return_value=cancelled_booking,
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
        self.assertEqual(response.guest_visit.guest_visit_id, "60")
        self.assertIsNotNone(response.booking)
        self.assertEqual(response.booking.booking_id, "200")
        self.assertEqual(response.booking.booking_status, "CANCELLED")
        self.assertEqual(conn.commits, 1)

    def test_cancel_visit_cancels_linked_booking(self) -> None:
        conn = FakeConnection()
        cancelled_visit = _visit(
            visit_status="CANCELLED",
            requires_seat=False,
        )
        cancelled_booking = _booking(booking_status="CANCELLED")
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            side_effect=[_visit(), cancelled_visit],
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
        ), patch.object(
            guest_service,
            "fetch_booking_by_id",
            return_value=cancelled_booking,
        ):
            response = guest_service.execute_guest_visit_workflow(
                conn,
                current_user=self.current_user,
                guest_visit_id="60",
                payload=_payload(GuestWorkflowAction.CANCEL_VISIT),
            )

        cancel_booking.assert_called_once()
        cancel_visit.assert_called_once()
        self.assertEqual(response.guest_visit.visit_status, "CANCELLED")
        self.assertIsNotNone(response.booking)
        self.assertEqual(response.booking.booking_status, "CANCELLED")
        self.assertEqual(conn.commits, 1)

    def test_cancel_visit_without_booking_cancels_visit_only(self) -> None:
        conn = FakeConnection()
        with patch.object(
            guest_service,
            "fetch_guest_visit_by_id_for_update",
            side_effect=[
                _visit(requires_seat=False),
                _visit(requires_seat=False, visit_status="CANCELLED"),
            ],
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
        self.assertEqual(response.guest_visit.visit_status, "CANCELLED")
        self.assertIsNone(response.booking)
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
        ), patch.object(guest_service, "mark_booking_modified"), patch.object(
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
        ), self.assertRaises(HTTPException):
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
