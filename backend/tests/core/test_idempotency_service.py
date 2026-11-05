from __future__ import annotations

import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from psycopg2.errors import UniqueViolation

from backend.services.idempotency_service import (
    ReconciliationOutcome,
    begin_idempotent_operation,
    canonicalize_payload,
    get_operation_status,
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

    def test_the_stored_snapshot_and_hash_are_derived_from_the_same_canonical_payload(self) -> None:
        """Task 2 consistency requirement: payload_snapshot must correspond
        to the exact same canonical request used for payload_hash -- by
        construction, not by convention. Proven by capturing what's
        actually passed to claim_idempotent_operation."""
        payload = {"b": 2, "a": 1}
        with patch(
            f"{MODULE}.claim_idempotent_operation",
            return_value={"id": 42, "updated_at": datetime.now(UTC)},
        ) as mock_claim:
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload=payload,
            )
        sent_snapshot = mock_claim.call_args.kwargs["payload_snapshot"]
        sent_hash = mock_claim.call_args.kwargs["payload_hash"]
        self.assertEqual(sent_snapshot, canonicalize_payload(payload))
        self.assertEqual(sent_hash, hash_payload(payload))

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

    def test_a_stale_pending_claim_without_a_reconciler_reports_in_progress(self) -> None:
        """Fail-closed default: with no reconciler supplied, a reclaimed
        stale row must never be handed back as something to execute --
        the safest fallback is reporting in-progress, same as today's
        behaviour minus the blind retry."""
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING",
            "updated_at": datetime.now(UTC) - timedelta(minutes=5),
        }
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(
                f"{MODULE}.reclaim_stale_pending_operation",
                return_value={"id": 42, "updated_at": datetime.now(UTC)},
            ),
            self.assertRaises(HTTPException) as context,
        ):
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
            )
        self.assertEqual(context.exception.detail["code"], "operation_in_progress")

    def test_a_stale_pending_claim_is_reconciled_not_retried(self) -> None:
        """The reclaim itself is just claiming the right to reconcile
        (decision 6) -- it must never again be handed to the caller as an
        executable claim. The supplied reconciler decides the real
        outcome; here it determines the original actually committed."""
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING",
            "updated_at": datetime.now(UTC) - timedelta(minutes=5),
        }
        reclaimed_row = {"id": 42, "updated_at": datetime.now(UTC)}
        reconcile = MagicMock(
            return_value=ReconciliationOutcome(status="SUCCEEDED", response_snapshot={"booking_id": "99"}),
        )
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(f"{MODULE}.reclaim_stale_pending_operation", return_value=reclaimed_row),
        ):
            conn = MagicMock()
            claim = begin_idempotent_operation(
                conn=conn, tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
                reconcile=reconcile,
            )
        self.assertIsNone(claim.operation_id)  # never an executable claim
        self.assertEqual(claim.replay_response, {"booking_id": "99"})
        reconcile.assert_called_once_with(conn, reclaimed_row)

    def test_reconciliation_determining_failure_raises_instead_of_retrying(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING",
            "updated_at": datetime.now(UTC) - timedelta(minutes=5),
        }
        reconcile = MagicMock(
            return_value=ReconciliationOutcome(
                status="FAILED", error_code="operation_abandoned", error_message="never committed",
            ),
        )
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(
                f"{MODULE}.reclaim_stale_pending_operation",
                return_value={"id": 42, "updated_at": datetime.now(UTC)},
            ),
            self.assertRaises(HTTPException) as context,
        ):
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
                reconcile=reconcile,
            )
        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail["code"], "operation_abandoned")
        self.assertEqual(context.exception.detail["message"], "never committed")

    def test_reconciliation_reporting_unknown_reports_in_progress_not_a_guess(self) -> None:
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}),
            "status": "PENDING",
            "updated_at": datetime.now(UTC) - timedelta(minutes=5),
        }
        reconcile = MagicMock(return_value=ReconciliationOutcome(status="UNKNOWN"))
        with (
            patch(f"{MODULE}.claim_idempotent_operation", side_effect=UniqueViolation()),
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=existing),
            patch(
                f"{MODULE}.reclaim_stale_pending_operation",
                return_value={"id": 42, "updated_at": datetime.now(UTC)},
            ),
            self.assertRaises(HTTPException) as context,
        ):
            begin_idempotent_operation(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                operation_type="BOOKING_CREATE", payload={"seat_id": 1},
                reconcile=reconcile,
            )
        self.assertEqual(context.exception.detail["code"], "operation_in_progress")

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

    def test_a_failed_claim_is_reported_not_reclaimed(self) -> None:
        """Fail-closed: a FAILED row is already a known, terminal outcome
        -- nothing to reconcile, and no silent retry on the same key. The
        caller must submit a new request with a new idempotency key."""
        existing = {
            "id": 42, "payload_hash": hash_payload({"seat_id": 1}), "status": "FAILED",
            "error_code": "booking_hierarchy_invalid", "error_message": "bad seat",
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
        self.assertEqual(context.exception.detail["code"], "booking_hierarchy_invalid")
        self.assertEqual(context.exception.detail["message"], "bad seat")


def _row(**overrides: object) -> dict[str, object]:
    base = {
        "id": 42, "tenant_id": "1", "user_id": "7", "idempotency_key": "key-1",
        "operation_type": "BOOKING_CREATE", "payload_hash": "abc", "payload_snapshot": {},
        "status": "PENDING", "resource_type": None, "resource_id": None,
        "response_snapshot": None, "error_code": None, "error_message": None,
        "created_at": datetime.now(UTC), "updated_at": datetime.now(UTC),
    }
    base.update(overrides)
    return base


class GetOperationStatusTests(unittest.TestCase):
    """GET-triggered reconciliation (dev-notes/backend/
    idempotency_recovery_design.md): the v1 design always intended
    lazy reconciliation on either kind of lookup, POST retry or status
    check -- this closes the half that wasn't wired in yet."""

    def test_fresh_pending_is_reported_as_is_without_triggering_reconciliation(self) -> None:
        row = _row(status="PENDING", updated_at=datetime.now(UTC))
        with (
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=row),
            patch(f"{MODULE}.reclaim_stale_pending_operation") as mock_reclaim,
        ):
            result = get_operation_status(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                reconcilers={"BOOKING_CREATE": MagicMock()},
            )
        self.assertEqual(result.status, "PENDING")
        mock_reclaim.assert_not_called()

    def test_stale_pending_triggers_reconciliation_and_reports_succeeded(self) -> None:
        stale_row = _row(status="PENDING", updated_at=datetime.now(UTC) - timedelta(minutes=5))
        reclaimed = _row(status="PENDING", updated_at=datetime.now(UTC))
        resolved = _row(status="SUCCEEDED", response_snapshot={"booking_id": "9"})
        reconcile = MagicMock(
            return_value=ReconciliationOutcome(status="SUCCEEDED", response_snapshot={"booking_id": "9"}),
        )
        with (
            patch(f"{MODULE}.fetch_idempotent_operation", side_effect=[stale_row, resolved]),
            patch(f"{MODULE}.reclaim_stale_pending_operation", return_value=reclaimed) as mock_reclaim,
        ):
            result = get_operation_status(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                reconcilers={"BOOKING_CREATE": reconcile},
            )
        self.assertEqual(result.status, "SUCCEEDED")
        self.assertEqual(result.response, {"booking_id": "9"})
        mock_reclaim.assert_called_once()
        reconcile.assert_called_once()

    def test_interrupted_reconciliation_reports_unknown_not_failed(self) -> None:
        """Constraint: a lock timeout or otherwise-interrupted
        reconciliation must leave the operation unresolved -- never
        falsely reported as failed."""
        stale_row = _row(status="PENDING", updated_at=datetime.now(UTC) - timedelta(minutes=5))
        reclaimed = _row(status="PENDING", updated_at=datetime.now(UTC))
        reconcile = MagicMock(return_value=ReconciliationOutcome(status="UNKNOWN"))
        with (
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=stale_row),
            patch(f"{MODULE}.reclaim_stale_pending_operation", return_value=reclaimed),
        ):
            result = get_operation_status(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                reconcilers={"BOOKING_CREATE": reconcile},
            )
        self.assertEqual(result.status, "UNKNOWN")

    def test_concurrent_get_losing_the_claim_race_reports_current_state_without_probing(self) -> None:
        """Constraint: concurrent GETs must not independently resolve the
        same operation. The loser must not call the reconciler at all --
        it reports whatever the winner (another GET, or a POST retry)
        has actually recorded."""
        stale_row = _row(status="PENDING", updated_at=datetime.now(UTC) - timedelta(minutes=5))
        winners_result = _row(status="SUCCEEDED", response_snapshot={"booking_id": "9"})
        reconcile = MagicMock()
        with (
            patch(f"{MODULE}.fetch_idempotent_operation", side_effect=[stale_row, winners_result]),
            patch(f"{MODULE}.reclaim_stale_pending_operation", return_value=None),
        ):
            result = get_operation_status(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                reconcilers={"BOOKING_CREATE": reconcile},
            )
        self.assertEqual(result.status, "SUCCEEDED")
        reconcile.assert_not_called()

    def test_no_registered_reconciler_reports_unknown_without_consuming_a_reclaim(self) -> None:
        stale_row = _row(status="PENDING", updated_at=datetime.now(UTC) - timedelta(minutes=5))
        with (
            patch(f"{MODULE}.fetch_idempotent_operation", return_value=stale_row),
            patch(f"{MODULE}.reclaim_stale_pending_operation") as mock_reclaim,
        ):
            result = get_operation_status(
                conn=MagicMock(), tenant_id=1, user_id=7, idempotency_key="key-1",
                reconcilers={},
            )
        self.assertEqual(result.status, "UNKNOWN")
        mock_reclaim.assert_not_called()


if __name__ == "__main__":
    unittest.main()
