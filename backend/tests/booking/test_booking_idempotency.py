from __future__ import annotations

import sys
import unittest
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

import psycopg2
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.schemas.booking import CreateBookingRequest
from backend.services.booking_service import book_seat, reconcile_stale_booking_create
from backend.services.idempotency_service import IdempotentClaim

TOMORROW = date.today() + timedelta(days=1)
EMPLOYEE_CALLER = {"tenant_id": "1", "user_id": "7", "role_name": "EMPLOYEE"}


class FakeConnection:
    def cursor(self, *args, **kwargs):
        raise AssertionError("business logic must not run on a replayed response")

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


class TrackingConnection:
    """Records commit/rollback calls instead of touching a real DB, for
    tests that need to assert which one happened (and how many times)
    rather than just that neither crashes."""

    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def cursor(self, *args, **kwargs):
        raise AssertionError("this test mocks every DB-touching call directly")

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _payload() -> CreateBookingRequest:
    return CreateBookingRequest(
        site_id=1, building_id=1, floor_id=1, seat_id=1,
        booking_date=TOMORROW, start_time=time(9, 0), end_time=time(18, 0),
    )


class BookSeatIdempotencyTests(unittest.TestCase):
    def test_a_replayed_claim_short_circuits_before_any_db_write(self) -> None:
        """A retry with a key already SUCCEEDED must return the stored
        response without re-running the booking logic at all -- proven
        here by a conn.cursor() that raises if it's ever called."""
        with patch(
            "backend.services.booking_service.begin_idempotent_operation",
            return_value=IdempotentClaim(
                operation_id=None,
                replay_response={"booking_type": "EMPLOYEE", "booking_id": "99"},
            ),
        ):
            result = book_seat(
                conn=FakeConnection(),
                current_user=EMPLOYEE_CALLER,
                payload=_payload(),
                idempotency_key="retry-key",
            )

        self.assertEqual(result.booking_id, "99")

    def test_a_failure_after_a_fresh_claim_records_it_as_failed(self) -> None:
        """A claimed operation that then fails downstream must be marked
        FAILED so a retry with the same key can be safely reclaimed,
        rather than being stuck reporting in-progress forever. The mark
        must be scoped to the updated_at read at claim time, so a reclaimed
        (no longer owned) claim can't clobber whoever reclaimed it."""
        claimed_at = datetime.now(UTC)
        with (
            patch(
                "backend.services.booking_service.begin_idempotent_operation",
                return_value=IdempotentClaim(operation_id=42, replay_response=None, claimed_at=claimed_at),
            ),
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                side_effect=HTTPException(status_code=400, detail={"code": "boom", "message": "boom"}),
            ),
            patch("backend.services.booking_service.mark_idempotent_operation_failed") as mock_fail,
            self.assertRaises(HTTPException),
        ):
            book_seat(
                conn=FakeConnection(),
                current_user=EMPLOYEE_CALLER,
                payload=_payload(),
                idempotency_key="fresh-key",
            )

        mock_fail.assert_called_once()
        self.assertEqual(mock_fail.call_args.kwargs["operation_id"], 42)
        self.assertEqual(mock_fail.call_args.kwargs["error_code"], "boom")
        self.assertEqual(mock_fail.call_args.kwargs["expected_updated_at"], claimed_at)

    def test_a_superseded_claim_rolls_back_instead_of_committing(self) -> None:
        """If mark_idempotent_operation_succeeded() reports the ledger row
        no longer matches the version this execution claimed -- someone
        else (a reconciler, or a retry that reclaimed it as abandoned)
        already resolved this operation while this execution was still
        running -- the booking/audit-log writes already made earlier in
        this same transaction must be rolled back, not committed.
        See dev-notes/backend/idempotency_recovery_design.md, decisions
        11-13: this is the actual ownership check, not the earlier claim,
        precisely because it's the last thing before commit."""
        claimed_at = datetime.now(UTC)
        fake_seat = {"tenant_id": "1", "status": "ACTIVE", "is_bookable": True}
        fake_booking = {
            "booking_id": "123", "booking_type": "EMPLOYEE",
            "booking_date": TOMORROW, "seat_code": "A-1",
        }
        conn = TrackingConnection()

        with (
            patch(
                "backend.services.booking_service.begin_idempotent_operation",
                return_value=IdempotentClaim(operation_id=42, replay_response=None, claimed_at=claimed_at),
            ),
            patch(
                "backend.services.booking_service.resolve_booking_advance_days",
                return_value={"employee_max_advance_days": 365},
            ),
            patch(
                "backend.services.booking_service._resolve_booked_for_user",
                return_value={"email": "x@example.com"},
            ),
            patch(
                "backend.services.booking_service.fetch_seat_for_booking",
                return_value=fake_seat,
            ),
            patch("backend.services.booking_service.acquire_booking_slot_locks"),
            patch(
                "backend.services.booking_service.user_has_active_booking_on_date",
                return_value=False,
            ),
            patch(
                "backend.services.booking_service.has_active_booking_conflict",
                return_value=False,
            ),
            patch(
                "backend.services.booking_service.seat_has_active_block_in_range",
                return_value=False,
            ),
            patch(
                "backend.services.booking_service.insert_booking",
                return_value=fake_booking,
            ),
            patch("backend.services.booking_service.write_audit_log"),
            patch("backend.services.booking_service.safe_write_audit_log"),
            patch(
                "backend.services.booking_service.mark_idempotent_operation_succeeded",
                return_value=False,
            ) as mock_succeeded,
            patch("backend.services.booking_service.mark_idempotent_operation_failed") as mock_fail,
            self.assertRaises(HTTPException) as ctx,
        ):
            book_seat(
                conn=conn,
                current_user=EMPLOYEE_CALLER,
                payload=_payload(),
                idempotency_key="superseded-key",
            )

        self.assertEqual(ctx.exception.detail["code"], "operation_superseded")
        mock_succeeded.assert_called_once()
        mock_fail.assert_called_once()
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)


class ReconcileStaleBookingCreateTests(unittest.TestCase):
    """Task 3: reconciliation for a stale/abandoned BOOKING_CREATE row.
    See dev-notes/backend/idempotency_recovery_design.md for the full
    protocol these mirror."""

    ROW = {
        "id": 42, "tenant_id": "1", "user_id": "7", "idempotency_key": "stale-key",
        "payload_snapshot": {"seat_id": 2999, "booking_date": "2026-11-05"},
    }

    def test_missing_snapshot_reports_unknown_without_probing_anything(self) -> None:
        row = dict(self.ROW, payload_snapshot=None)
        with patch("backend.services.booking_service.acquire_booking_slot_locks") as mock_lock:
            outcome = reconcile_stale_booking_create(MagicMock(), row)
        self.assertEqual(outcome.status, "UNKNOWN")
        mock_lock.assert_not_called()

    def test_malformed_booking_date_reports_unknown(self) -> None:
        row = dict(self.ROW, payload_snapshot={"seat_id": 2999, "booking_date": "not-a-date"})
        with patch("backend.services.booking_service.acquire_booking_slot_locks") as mock_lock:
            outcome = reconcile_stale_booking_create(MagicMock(), row)
        self.assertEqual(outcome.status, "UNKNOWN")
        mock_lock.assert_not_called()

    def test_lock_still_actively_held_reports_unknown_not_failed(self) -> None:
        """An active holder means genuinely still in progress -- must
        never be guessed as failed just because reconciliation couldn't
        get in."""
        conn = MagicMock()
        with (
            patch(
                "backend.services.booking_service.acquire_booking_slot_locks",
                side_effect=psycopg2.errors.LockNotAvailable(),
            ) as mock_lock,
            patch("backend.services.booking_service.mark_idempotent_operation_failed") as mock_fail,
        ):
            outcome = reconcile_stale_booking_create(conn, dict(self.ROW))
        self.assertEqual(outcome.status, "UNKNOWN")
        mock_lock.assert_called_once()
        mock_fail.assert_not_called()
        conn.rollback.assert_called_once()

    def test_lock_identities_and_order_match_what_book_seat_itself_would_use(self) -> None:
        """Decision 5: reconciliation must probe the exact same lock
        identities book_seat() would, via the same shared helper -- not a
        reimplementation that could drift out of sync with it."""
        row = dict(self.ROW, payload_snapshot={
            "seat_id": 2999, "booking_date": "2026-11-05", "booked_for_user_id": "50",
        })
        conn = MagicMock()
        with (
            patch("backend.services.booking_service.acquire_booking_slot_locks") as mock_lock,
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                return_value={"status": "SUCCEEDED", "response_snapshot": {}},
            ),
        ):
            reconcile_stale_booking_create(conn, row)
        mock_lock.assert_called_once_with(
            conn, tenant_id="1", seat_id="2999", subject_id="50", booking_date=date(2026, 11, 5),
        )

    def test_unspecified_subject_falls_back_to_the_ledgers_own_user_id(self) -> None:
        """The original request left booked_for_user_id unset, meaning
        "book for the caller" -- book_seat resolves that to current_user,
        and the ledger's own user_id column is that same caller.
        Reconciliation must mirror that resolution, not pass None
        through and probe the wrong lock."""
        row = dict(self.ROW, payload_snapshot={"seat_id": 2999, "booking_date": "2026-11-05"})
        conn = MagicMock()
        with (
            patch("backend.services.booking_service.acquire_booking_slot_locks") as mock_lock,
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                return_value={"status": "SUCCEEDED", "response_snapshot": {}},
            ),
        ):
            reconcile_stale_booking_create(conn, row)
        self.assertEqual(mock_lock.call_args.kwargs["subject_id"], "7")

    def test_the_ledger_is_re_read_only_after_the_lock_is_acquired(self) -> None:
        """Decision 7: the re-read must happen after the lock, not
        before -- proven here by asserting call order, not just that
        both calls happened."""
        calls: list[str] = []
        conn = MagicMock()
        with (
            patch(
                "backend.services.booking_service.acquire_booking_slot_locks",
                side_effect=lambda *a, **k: calls.append("lock"),
            ),
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                side_effect=lambda *a, **k: calls.append("reread") or {
                    "status": "SUCCEEDED", "response_snapshot": {},
                },
            ),
        ):
            reconcile_stale_booking_create(conn, dict(self.ROW))
        self.assertEqual(calls, ["lock", "reread"])

    def test_commit_right_before_the_lock_probe_is_not_marked_failed(self) -> None:
        """The core timeline this protocol exists for: the original
        committed in the gap between the reconciler's ledger-claim and
        its own lock acquisition. The mandatory re-read after getting
        the lock must see SUCCEEDED and defer to it instead of declaring
        the operation failed."""
        conn = MagicMock()
        with (
            patch("backend.services.booking_service.acquire_booking_slot_locks"),
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                return_value={"status": "SUCCEEDED", "response_snapshot": {"booking_id": "123"}},
            ),
            patch("backend.services.booking_service.mark_idempotent_operation_failed") as mock_fail,
        ):
            outcome = reconcile_stale_booking_create(conn, dict(self.ROW))
        self.assertEqual(outcome.status, "SUCCEEDED")
        self.assertEqual(outcome.response_snapshot, {"booking_id": "123"})
        mock_fail.assert_not_called()
        conn.rollback.assert_called_once()

    def test_already_failed_is_reported_without_re_marking_it(self) -> None:
        conn = MagicMock()
        with (
            patch("backend.services.booking_service.acquire_booking_slot_locks"),
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                return_value={"status": "FAILED", "error_code": "boom", "error_message": "already failed"},
            ),
            patch("backend.services.booking_service.mark_idempotent_operation_failed") as mock_fail,
        ):
            outcome = reconcile_stale_booking_create(conn, dict(self.ROW))
        self.assertEqual(outcome.status, "FAILED")
        self.assertEqual(outcome.error_code, "boom")
        mock_fail.assert_not_called()

    def test_still_pending_with_the_lock_free_is_proven_not_committed_and_marked_failed(self) -> None:
        """The actual proof, not a guess: the lock is free (nobody holds
        it) and the ledger still says PENDING -- the atomic succeed-
        marking design guarantees a real commit would already show as
        SUCCEEDED, so this combination means it definitely never
        committed."""
        conn = MagicMock()
        updated_at = datetime.now(UTC)
        with (
            patch("backend.services.booking_service.acquire_booking_slot_locks"),
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                return_value={"status": "PENDING", "updated_at": updated_at},
            ),
            patch(
                "backend.services.booking_service.mark_idempotent_operation_failed",
                return_value=True,
            ) as mock_fail,
        ):
            outcome = reconcile_stale_booking_create(conn, dict(self.ROW))
        self.assertEqual(outcome.status, "FAILED")
        self.assertEqual(outcome.error_code, "operation_abandoned")
        mock_fail.assert_called_once()
        self.assertEqual(mock_fail.call_args.kwargs["operation_id"], 42)
        self.assertEqual(mock_fail.call_args.kwargs["expected_updated_at"], updated_at)

    def test_losing_the_mark_failed_race_rechecks_instead_of_assuming(self) -> None:
        """Should be unreachable in practice (decision 6 means only one
        reconciler ever wins the ledger claim for a row), but if it ever
        happens, re-check reality rather than assume either outcome."""
        conn = MagicMock()
        with (
            patch("backend.services.booking_service.acquire_booking_slot_locks"),
            patch(
                "backend.services.booking_service.fetch_idempotent_operation",
                side_effect=[
                    {"status": "PENDING", "updated_at": datetime.now(UTC)},
                    {"status": "SUCCEEDED", "response_snapshot": {"booking_id": "9"}},
                ],
            ),
            patch(
                "backend.services.booking_service.mark_idempotent_operation_failed",
                return_value=False,
            ),
        ):
            outcome = reconcile_stale_booking_create(conn, dict(self.ROW))
        self.assertEqual(outcome.status, "SUCCEEDED")
        self.assertEqual(outcome.response_snapshot, {"booking_id": "9"})


if __name__ == "__main__":
    unittest.main()
