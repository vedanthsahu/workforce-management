from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.booking_repository import has_active_booking_conflict
from backend.schemas.booking import BookingResponse
from backend.services.booking_service import _normalize_cancellation_reason


class FakeCursor:
    def __init__(self) -> None:
        self.executions: list[tuple[str, Any]] = []

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchone(self) -> None:
        return None


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class BookingDelegationResponseTests(unittest.TestCase):
    def test_booking_response_keeps_user_id_and_adds_delegation_fields(self) -> None:
        response = BookingResponse(
            booking_id="100",
            tenant_id="1",
            user_id="20",
            booked_for_user_id="20",
            booked_by_user_id="10",
            seat_id="30",
            floor_id="40",
            booking_date=date(2026, 5, 22),
            booking_status="CONFIRMED",
        )

        payload = response.model_dump()
        self.assertEqual(payload["user_id"], "20")
        self.assertEqual(payload["booked_for_user_id"], "20")
        self.assertEqual(payload["booked_by_user_id"], "10")

    def test_seat_conflict_exclusion_uses_string_booking_id_safely(self) -> None:
        cursor = FakeCursor()
        conn = FakeConnection(cursor)

        has_conflict = has_active_booking_conflict(
            conn,
            tenant_id="1",
            seat_id="30",
            booking_date=date(2026, 5, 22),
            exclude_booking_id="100",
        )

        self.assertFalse(has_conflict)
        sql, params = cursor.executions[0]
        self.assertIn("id::text <> %s", sql)
        self.assertEqual(params[-1], "100")

    def test_user_cancellation_cannot_use_modified_audit_reason(self) -> None:
        with self.assertRaises(HTTPException) as context:
            _normalize_cancellation_reason(" modified ")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(
            context.exception.detail["code"],
            "invalid_cancellation_reason",
        )

    def test_empty_cancellation_reason_defaults_to_user_cancelled(self) -> None:
        self.assertEqual(
            _normalize_cancellation_reason("  "),
            "USER_CANCELLED",
        )


if __name__ == "__main__":
    unittest.main()
