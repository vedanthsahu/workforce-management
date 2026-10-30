"""Non-mocked tests for idempotency_repository.py -- these run the real
functions against a fake cursor that records (sql, params) from actual
cursor.execute() calls, instead of patching the functions away. A test
that mocks claim_idempotent_operation/etc. entirely would never notice a
wrong column count, wrong param order, or an un-adapted value (the same
class of bug as the chatbot UUID-adaptation fix, commit 53bc944, which
shipped despite a fully-green suite because its tests mocked the
repository layer completely)."""

from __future__ import annotations

import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from psycopg2.extras import Json, RealDictCursor

from backend.repositories.idempotency_repository import (
    claim_idempotent_operation,
    fetch_idempotent_operation,
    mark_idempotent_operation_failed,
    mark_idempotent_operation_succeeded,
    reclaim_failed_operation,
    reclaim_stale_pending_operation,
)

ROW = {
    "id": 42, "tenant_id": "1", "user_id": "7", "idempotency_key": "key-1",
    "operation_type": "BOOKING_CREATE", "payload_hash": "abc123",
    "status": "PENDING", "resource_type": None, "resource_id": None,
    "response_snapshot": None, "error_code": None, "error_message": None,
    "created_at": datetime.now(UTC), "updated_at": datetime.now(UTC),
}


class FakeCursor:
    def __init__(self, row: dict[str, Any] | None = None, rowcount: int = 1) -> None:
        self.executions: list[tuple[str, Any]] = []
        self._row = row
        self.rowcount = rowcount

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, *exc: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchone(self) -> dict[str, Any] | None:
        return self._row


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor
        self.commits = 0
        self.cursor_factories: list[Any] = []

    def cursor(self, **kwargs: Any) -> FakeCursor:
        self.cursor_factories.append(kwargs.get("cursor_factory"))
        return self.cursor_instance

    def commit(self) -> None:
        self.commits += 1


class IdempotencyRepositoryTests(unittest.TestCase):
    def test_claim_inserts_expected_columns_in_order_and_commits(self) -> None:
        cursor = FakeCursor(row=dict(ROW))
        conn = FakeConnection(cursor)

        row = claim_idempotent_operation(
            conn, tenant_id="1", user_id="7", idempotency_key="key-1",
            operation_type="BOOKING_CREATE", payload_hash="abc123",
        )

        self.assertEqual(len(cursor.executions), 1)
        sql, params = cursor.executions[0]
        self.assertIn("INSERT INTO idempotent_operations", sql)
        self.assertEqual(params, ("1", "7", "key-1", "BOOKING_CREATE", "abc123"))
        self.assertEqual(conn.commits, 1)
        self.assertEqual(row["id"], 42)
        self.assertIs(conn.cursor_factories[0], RealDictCursor)

    def test_fetch_filters_on_tenant_user_and_key(self) -> None:
        cursor = FakeCursor(row=dict(ROW))
        conn = FakeConnection(cursor)

        fetch_idempotent_operation(conn, tenant_id="1", user_id="7", idempotency_key="key-1")

        sql, params = cursor.executions[0]
        self.assertIn(
            "WHERE tenant_id = %s AND user_id = %s AND idempotency_key = %s", sql,
        )
        self.assertEqual(params, ("1", "7", "key-1"))

    def test_fetch_returns_none_on_no_row_without_erroring(self) -> None:
        cursor = FakeCursor(row=None)
        conn = FakeConnection(cursor)

        result = fetch_idempotent_operation(
            conn, tenant_id="1", user_id="7", idempotency_key="missing",
        )

        self.assertIsNone(result)

    def test_reclaim_stale_pending_scopes_on_id_status_and_staleness(self) -> None:
        cursor = FakeCursor(row=dict(ROW))
        conn = FakeConnection(cursor)
        stale_before = datetime.now(UTC)

        reclaim_stale_pending_operation(conn, operation_id=42, stale_before=stale_before)

        sql, params = cursor.executions[0]
        self.assertIn("status = 'PENDING'", sql)
        self.assertEqual(params, (42, stale_before))
        self.assertEqual(conn.commits, 1)

    def test_reclaim_failed_scopes_on_id_and_status(self) -> None:
        cursor = FakeCursor(row=dict(ROW))
        conn = FakeConnection(cursor)

        reclaim_failed_operation(conn, operation_id=42)

        sql, params = cursor.executions[0]
        self.assertIn("status = 'FAILED'", sql)
        self.assertEqual(params, (42,))
        self.assertEqual(conn.commits, 1)

    def test_mark_succeeded_binds_json_snapshot_scopes_on_updated_at_and_does_not_commit(self) -> None:
        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        claimed_at = datetime.now(UTC)

        result = mark_idempotent_operation_succeeded(
            conn, operation_id=42, resource_type="booking", resource_id=99,
            response_snapshot={"booking_id": "99"}, expected_updated_at=claimed_at,
        )

        sql, params = cursor.executions[0]
        self.assertIn("SET status = 'SUCCEEDED'", sql)
        self.assertIn("WHERE id = %s AND updated_at = %s", sql)
        self.assertEqual(params[0], "booking")
        self.assertEqual(params[1], "99")  # resource_id must be str()'d, not passed raw
        self.assertIsInstance(params[2], Json)
        self.assertEqual(params[2].adapted, {"booking_id": "99"})
        self.assertEqual(params[3], 42)
        self.assertEqual(params[4], claimed_at)
        self.assertTrue(result)
        # Caller folds this into its own transaction -- must NOT commit here.
        self.assertEqual(conn.commits, 0)

    def test_mark_succeeded_is_a_silent_noop_when_the_claim_was_reclaimed(self) -> None:
        """Reproduces the ledger-drift race: a slow original request
        finishes and tries to record SUCCEEDED after a retry has already
        reclaimed the same row (because it looked stale). The UPDATE's
        WHERE id = %s AND updated_at = %s then matches zero rows -- this
        must come back False instead of raising, and must NOT have
        clobbered the reclaiming caller's own in-flight attempt."""
        cursor = FakeCursor(rowcount=0)
        conn = FakeConnection(cursor)
        stale_claimed_at = datetime.now(UTC) - timedelta(minutes=5)

        result = mark_idempotent_operation_succeeded(
            conn, operation_id=42, resource_type="booking", resource_id=99,
            response_snapshot={"booking_id": "99"}, expected_updated_at=stale_claimed_at,
        )

        self.assertFalse(result)
        self.assertEqual(conn.commits, 0)

    def test_mark_failed_commits_its_own_statement_and_scopes_on_updated_at(self) -> None:
        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        claimed_at = datetime.now(UTC)

        result = mark_idempotent_operation_failed(
            conn, operation_id=42, error_code="boom", error_message="it broke",
            expected_updated_at=claimed_at,
        )

        sql, params = cursor.executions[0]
        self.assertIn("SET status = 'FAILED'", sql)
        self.assertIn("WHERE id = %s AND updated_at = %s", sql)
        self.assertEqual(params, ("boom", "it broke", 42, claimed_at))
        self.assertTrue(result)
        self.assertEqual(conn.commits, 1)

    def test_mark_failed_is_a_silent_noop_when_the_claim_was_reclaimed(self) -> None:
        cursor = FakeCursor(rowcount=0)
        conn = FakeConnection(cursor)
        stale_claimed_at = datetime.now(UTC) - timedelta(minutes=5)

        result = mark_idempotent_operation_failed(
            conn, operation_id=42, error_code="boom", error_message="it broke",
            expected_updated_at=stale_claimed_at,
        )

        self.assertFalse(result)
        # Still its own fresh, separately-committed statement either way --
        # only the row match is what determines whether it had any effect.
        self.assertEqual(conn.commits, 1)


if __name__ == "__main__":
    unittest.main()
