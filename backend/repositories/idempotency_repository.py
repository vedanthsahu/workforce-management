"""Repository helpers for idempotent_operations.

The claim/replay dance this backs: a client-supplied idempotency key is
first claimed with its own immediate commit (so a concurrent retry can see
"already in progress" instead of racing the same write), then the real
business write and the row's SUCCEEDED/resource_id update commit together
in the caller's transaction -- that's what makes the business change and
the recorded outcome atomic on the success path. Failure is recorded in a
fresh, separately-committed statement after the caller's rollback, the
same way safe_write_audit_log records a failed action after one.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import Json, RealDictCursor


def claim_idempotent_operation(
    conn: PGConnection,
    *,
    tenant_id: int | str,
    user_id: int | str,
    idempotency_key: str,
    operation_type: str,
    payload_hash: str,
    payload_snapshot: Any = None,
) -> dict[str, Any]:
    """Insert a new PENDING claim and commit immediately.

    Raises psycopg2.errors.UniqueViolation if the key is already claimed --
    callers must catch that, roll back, and look at the existing row.

    payload_snapshot is write-once: nothing in this module ever includes
    it in an UPDATE's SET clause, by design -- see mark_idempotent_
    operation_succeeded/_failed and the two reclaim functions below,
    none of which touch it. It must stay derived from the exact same
    canonical payload used for payload_hash (see idempotency_service.
    canonicalize_payload) so reconciliation can trust it later.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO idempotent_operations (
                tenant_id, user_id, idempotency_key, operation_type,
                payload_hash, payload_snapshot
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, tenant_id, user_id, idempotency_key, operation_type,
                      payload_hash, payload_snapshot, status, resource_type,
                      resource_id, response_snapshot, error_code,
                      error_message, created_at, updated_at
            """,
            (
                tenant_id, user_id, idempotency_key, operation_type,
                payload_hash, Json(payload_snapshot) if payload_snapshot is not None else None,
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return dict(row)


def fetch_idempotent_operation(
    conn: PGConnection, *, tenant_id: int | str, user_id: int | str, idempotency_key: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, tenant_id, user_id, idempotency_key, operation_type,
                   payload_hash, payload_snapshot, status, resource_type,
                   resource_id, response_snapshot, error_code, error_message,
                   created_at, updated_at
            FROM idempotent_operations
            WHERE tenant_id = %s AND user_id = %s AND idempotency_key = %s
            """,
            (tenant_id, user_id, idempotency_key),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def reclaim_stale_pending_operation(
    conn: PGConnection, *, operation_id: int, stale_before: datetime,
) -> dict[str, Any] | None:
    """Re-claim an abandoned PENDING row (its owning request likely died
    without ever reaching the failure handler). Commits immediately; a
    None return means someone else reclaimed it first.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE idempotent_operations
            SET updated_at = NOW()
            WHERE id = %s AND status = 'PENDING' AND updated_at < %s
            RETURNING id, tenant_id, user_id, idempotency_key, operation_type,
                      payload_hash, payload_snapshot, status, resource_type,
                      resource_id, response_snapshot, error_code,
                      error_message, created_at, updated_at
            """,
            (operation_id, stale_before),
        )
        row = cur.fetchone()
    conn.commit()
    return dict(row) if row else None


def mark_idempotent_operation_succeeded(
    conn: PGConnection,
    *,
    operation_id: int,
    resource_type: str,
    resource_id: int | str,
    response_snapshot: dict[str, Any],
    expected_updated_at: datetime,
) -> bool:
    """Does NOT commit -- the caller folds this into the same transaction
    as the business write it's recording the outcome of.

    Scoped to the updated_at value read when this operation was
    claimed/reclaimed: if a retry has since reclaimed the same row (because
    this caller's own request looked stale to it), that WHERE clause
    matches zero rows and this becomes a silent no-op instead of
    clobbering whatever the retry already recorded. Returns False in that
    case so the caller can tell the write didn't land.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE idempotent_operations
            SET status = 'SUCCEEDED', resource_type = %s, resource_id = %s,
                response_snapshot = %s, updated_at = NOW()
            WHERE id = %s AND updated_at = %s
            """,
            (resource_type, str(resource_id), Json(response_snapshot), operation_id, expected_updated_at),
        )
        return cur.rowcount > 0


def mark_idempotent_operation_failed(
    conn: PGConnection,
    *,
    operation_id: int,
    error_code: str | None,
    error_message: str | None,
    expected_updated_at: datetime,
) -> bool:
    """Best-effort: records failure and commits in its own fresh statement,
    called after the caller has already rolled back its failed attempt.

    Same version-stamp scoping as mark_idempotent_operation_succeeded --
    see that docstring.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE idempotent_operations
            SET status = 'FAILED', error_code = %s, error_message = %s, updated_at = NOW()
            WHERE id = %s AND updated_at = %s
            """,
            (error_code, error_message, operation_id, expected_updated_at),
        )
        affected = cur.rowcount > 0
    conn.commit()
    return affected
