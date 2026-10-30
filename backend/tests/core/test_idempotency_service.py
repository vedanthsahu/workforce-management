from __future__ import annotations

import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from psycopg2.errors import UniqueViolation

from backend.services.idempotency_service import (
    begin_idempotent_operation,
    hash_payload,
)

MODULE = "backend.services.idempotency_service"


class HashPayloadTests(unittest.TestCase):
    def test_same_fields_same_order_hash_equal(self) -> None:
        self.assertEqual(hash_payload({"a": 1, "b": 2}), hash_payload({"b": 2, "a": 1}))

    def test_different_values_hash_differ(self) -> None:
        self.assertNotEqual(hash_payload({"a": 1}), hash_payload({"a": 2}))


class BeginIdempotentOperationTests(unittest.TestCase):
    def test_no_key_is_a_no_op(self) -> None:
        with patch(f"{MODULE}.claim_idempotent_operation") as mock_claim:
            claim = begin_idempotent_operation(
                conn=MagicMock(),
                tenant_id=1, user_id=7, idempotency_key=None,
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertIsNone(claim.operation_id)
        self.assertIsNone(claim.replay_response)
        mock_claim.assert_not_called()

    def test_fresh_key_claims_a_new_row(self) -> None:
        claimed_at = datetime.now(UTC)
        with patch(
            f"{MODULE}.claim_idempotent_operation", return_value={"id": 42, "updated_at": claimed_at},
        ) as mock_claim:
            claim = begin_idempotent_operation(
                conn=MagicMock(),
                tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertEqual(claim.operation_id, 42)
        self.assertIsNone(claim.replay_response)
        self.assertEqual(claim.claimed_at, claimed_at)
        mock_claim.assert_called_once()

    def test_retrying_a_succeeded_key_replays_the_stored_response(self) -> None:
        conn = MagicMock()
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "SUCCEEDED", "response_snapshot": {"booking_id": "99"},
        }
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
        ):
            claim = begin_idempotent_operation(
                conn=conn, tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertIsNone(claim.operation_id)
        self.assertEqual(claim.replay_response, {"booking_id": "99"})
        conn.rollback.assert_called_once()

    def test_reusing_a_key_with_a_different_payload_is_rejected(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "SUCCEEDED", "response_snapshot": {"booking_id": "99"},
        }
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            self.assertRaises(HTTPException) as context,
        ):
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 2},
            )
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "idempotency_key_payload_mismatch")

    def test_a_fresh_pending_claim_reports_in_progress(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING", "updated_at": datetime.now(UTC),
        }
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            self.assertRaises(HTTPException) as context,
        ):
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "operation_in_progress")

    def test_a_stale_pending_claim_is_reclaimed_and_retried(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING",
            "updated_at": datetime.now(UTC) - timedelta(minutes=5),
        }
        reclaimed_at = datetime.now(UTC)
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(
                f"{MODULE}.reclaim_stale_pending_operation",
                return_value={"id": 42, "updated_at": reclaimed_at},
            ) as mock_reclaim,
        ):
            claim = begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertEqual(claim.operation_id, 42)
        self.assertEqual(claim.claimed_at, reclaimed_at)
        mock_reclaim.assert_called_once()

    def test_losing_the_stale_reclaim_race_reports_in_progress(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING",
            "updated_at": datetime.now(UTC) - timedelta(minutes=5),
        }
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(f"{MODULE}.reclaim_stale_pending_operation", return_value=None),
            self.assertRaises(HTTPException) as context,
        ):
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertEqual(context.exception.detail["code"], "operation_in_progress")

    def test_a_failed_claim_is_reclaimed_and_retried(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}), "status": "FAILED",
        }
        reclaimed_at = datetime.now(UTC)
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(
                f"{MODULE}.reclaim_failed_operation",
                return_value={"id": 42, "updated_at": reclaimed_at},
            ) as mock_reclaim,
        ):
            claim = begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertEqual(claim.operation_id, 42)
        self.assertEqual(claim.claimed_at, reclaimed_at)
        mock_reclaim.assert_called_once()


if __name__ == "__main__":
    unittest.main()
