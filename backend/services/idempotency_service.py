"""Idempotent request handling for state-changing APIs.

Request flow for a caller that supplies an Idempotency-Key:

1. begin_idempotent_operation() claims the key (its own immediate commit)
   or, if it's already claimed, decides what to do with the existing row:
   replay the stored response, reject a payload mismatch, report
   in-progress, report a known-failed outcome, or reconcile an abandoned
   attempt.
2. The caller runs its business write and calls
   idempotency_repository.mark_idempotent_operation_succeeded() as part of
   the SAME transaction it commits for that write.
3. On failure, after the caller's own rollback, the caller calls
   idempotency_repository.mark_idempotent_operation_failed() (a fresh,
   separately-committed statement, same pattern as safe_write_audit_log).

4. get_operation_status() -- a GET, not a POST retry -- triggers the
   exact same reconciliation when it finds a stale PENDING row. This is
   deliberate, not a second recovery path: "resolved lazily on next
   lookup of that key" always meant either kind of lookup. It gives an
   otherwise read-only endpoint a controlled write side effect (it can
   acquire business locks and write a FAILED outcome) -- documented here
   so it isn't mistaken for an accident later.

A missing/empty idempotency_key is a no-op here -- callers that don't
pass one get today's behaviour, unchanged.

Fail-closed, by design (dev-notes/backend/idempotency_recovery_design.md,
decision 10): a reclaimed/abandoned row is never handed back to the
caller as something to execute. The only way this function returns a
claim with operation_id set for the caller to act on is a genuinely
fresh key with no prior row at all. Everything else -- a stale PENDING
row, an already-FAILED row -- resolves to either a replay or a raised
error; it is reconciled and reported, never blindly retried or
recreated. See _resolve_via_reconciliation and ReconciliationOutcome.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from fastapi import HTTPException, status
from psycopg2.errors import UniqueViolation
from psycopg2.extensions import connection as PGConnection

from backend.repositories.idempotency_repository import (
    claim_idempotent_operation,
    fetch_idempotent_operation,
    reclaim_stale_pending_operation,
)
from backend.schemas.operation import OperationStatusResponse

STALE_AFTER_SECONDS = 60


@dataclass
class IdempotentClaim:
    # None means "no key supplied, or already resolved by a replay/error" --
    # callers only need to record an outcome when this is set.
    operation_id: int | None
    # Set when an existing SUCCEEDED row already has the answer (either a
    # direct replay, or reconciliation determined the original committed);
    # callers should return this immediately instead of doing any work.
    replay_response: dict[str, Any] | None = None
    # The row's updated_at as of this claim. Callers must pass this back as
    # expected_updated_at to mark_idempotent_operation_succeeded/_failed, so
    # a stale write (this claim got reclaimed out from under a slow caller
    # before it finished) becomes a no-op instead of overwriting whatever
    # reclaimed it.
    claimed_at: datetime | None = None


@dataclass
class ReconciliationOutcome:
    """What reconciliation (see _resolve_via_reconciliation) determined
    about one stale/ambiguous ledger row -- never an instruction to
    execute anything. SUCCEEDED/FAILED mean the outcome was established
    with certainty (lock acquired, ledger re-read while holding it, or
    already a terminal status); UNKNOWN means it genuinely could not be
    determined right now (e.g. the lock is still actively held) and must
    not be guessed in either direction."""
    status: Literal["SUCCEEDED", "FAILED", "UNKNOWN"]
    response_snapshot: dict[str, Any] | None = None
    error_code: str | None = None
    error_message: str | None = None


# A reconciler is operation-specific (it has to know which business locks
# to acquire -- e.g. seat+date for a booking) while this module stays
# generic; callers supply one via begin_idempotent_operation's reconcile
# parameter. See booking_service.reconcile_stale_booking_create for the
# one CREATE uses.
ReconcilerFn = Callable[[PGConnection, dict[str, Any]], ReconciliationOutcome]


def canonicalize_payload(payload: Any) -> Any:
    """The same normalized representation hash_payload() hashes -- also
    stored verbatim as the ledger's payload_snapshot (see
    begin_idempotent_operation), so the hash and the snapshot can never
    diverge: both are derived from this one call, not recomputed
    separately. payload_hash alone can't be reversed to recover the
    original resource identities reconciliation needs."""
    return payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload


def _hash_canonical_payload(canonical: Any) -> str:
    serialized = json.dumps(canonical, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def hash_payload(payload: Any) -> str:
    return _hash_canonical_payload(canonicalize_payload(payload))


def _in_progress() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "operation_in_progress",
            "message": "This operation is already being processed. Check its status before retrying.",
        },
    )


def _previous_attempt_failed(error_code: str | None, error_message: str | None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": error_code or "operation_previously_failed",
            "message": error_message or (
                "A previous attempt with this idempotency key did not "
                "complete successfully. Submit a new request with a new "
                "idempotency key to try again."
            ),
        },
    )


def _resolve_via_reconciliation(
    conn: PGConnection, row: dict[str, Any], reconcile: ReconcilerFn | None,
) -> IdempotentClaim:
    """A reclaimed stale row is never executed again on this request.
    With no reconciler supplied, the safest default is to report
    in-progress rather than guess -- the caller gets exactly today's
    behaviour minus the blind retry."""
    if reconcile is None:
        raise _in_progress()

    outcome = reconcile(conn, row)
    if outcome.status == "SUCCEEDED":
        return IdempotentClaim(operation_id=None, replay_response=outcome.response_snapshot)
    if outcome.status == "FAILED":
        raise _previous_attempt_failed(outcome.error_code, outcome.error_message)
    # UNKNOWN -- genuinely still in progress, or undeterminable right now.
    # Never guessed in either direction.
    raise _in_progress()


def begin_idempotent_operation(
    conn: PGConnection,
    *,
    tenant_id: int | str,
    user_id: int | str,
    idempotency_key: str | None,
    operation_type: str,
    payload: Any,
    stale_after_seconds: int = STALE_AFTER_SECONDS,
    reconcile: ReconcilerFn | None = None,
) -> IdempotentClaim:
    if not idempotency_key:
        return IdempotentClaim(operation_id=None)

    payload_snapshot = canonicalize_payload(payload)
    payload_hash = _hash_canonical_payload(payload_snapshot)

    try:
        row = claim_idempotent_operation(
            conn, tenant_id=tenant_id, user_id=user_id,
            idempotency_key=idempotency_key, operation_type=operation_type,
            payload_hash=payload_hash, payload_snapshot=payload_snapshot,
        )
        return IdempotentClaim(operation_id=row["id"], claimed_at=row["updated_at"])
    except UniqueViolation:
        conn.rollback()

    existing = fetch_idempotent_operation(
        conn, tenant_id=tenant_id, user_id=user_id, idempotency_key=idempotency_key,
    )
    if existing is None:
        # The row that caused the conflict is gone (never happens today --
        # nothing deletes these rows) -- surface as in-progress rather than
        # silently re-attempting the write with no claim at all.
        raise _in_progress()

    if existing["payload_hash"] != payload_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "idempotency_key_payload_mismatch",
                "message": "This idempotency key was already used with a different request body.",
            },
        )

    if existing["status"] == "SUCCEEDED":
        return IdempotentClaim(operation_id=None, replay_response=existing["response_snapshot"])

    if existing["status"] == "FAILED":
        # Already a known, terminal outcome -- nothing ambiguous to
        # reconcile, no lock to probe. Report it; a genuinely new attempt
        # must use a new idempotency key (fail-closed: never silently
        # retried on this same key/row).
        raise _previous_attempt_failed(existing.get("error_code"), existing.get("error_message"))

    # status == "PENDING"
    stale_before = datetime.now(UTC) - timedelta(seconds=stale_after_seconds)
    if existing["updated_at"] >= stale_before:
        raise _in_progress()

    reclaimed = reclaim_stale_pending_operation(
        conn, operation_id=existing["id"], stale_before=stale_before,
    )
    if reclaimed is None:
        raise _in_progress()
    return _resolve_via_reconciliation(conn, reclaimed, reconcile)


def _reconcile_via_status_lookup(
    conn: PGConnection, row: dict[str, Any], *, stale_before: datetime, reconcile: ReconcilerFn | None,
) -> dict[str, Any]:
    """Lazy reconciliation triggered by a GET, not just a POST retry --
    the v1 design always intended both halves of this: "stale
    reconciliation resolved lazily on next lookup of that key (on retry
    or status check)." Reuses the exact same ledger-claim (decision 6)
    and reconciler (R2) the POST path uses -- not a second recovery
    implementation.

    Deliberate, documented side effect: this makes an otherwise
    read-only GET able to acquire business locks and write a FAILED
    outcome. That's the lazy-reconciliation contract working as
    designed, not an accident of a status route doing writes.
    """
    if reconcile is None:
        # No reconciler registered for this operation_type -- same safe
        # default begin_idempotent_operation uses: never guess, and
        # don't even consume a reclaim attempt for nothing.
        return dict(row, status="UNKNOWN")

    reclaimed = reclaim_stale_pending_operation(
        conn, operation_id=row["id"], stale_before=stale_before,
    )
    if reclaimed is None:
        # Someone else (another GET, or a POST retry) already won the
        # claim for this exact row -- constraint: concurrent GETs must
        # never independently resolve the same operation. Report
        # whatever is actually there right now rather than probing
        # ourselves.
        current = fetch_idempotent_operation(
            conn, tenant_id=row["tenant_id"], user_id=row["user_id"],
            idempotency_key=row["idempotency_key"],
        )
        return current if current is not None else row

    outcome = reconcile(conn, reclaimed)
    if outcome.status == "UNKNOWN":
        # Lock still held, or genuinely undeterminable -- left exactly as
        # the reconciler left it (unresolved), never guessed as failed.
        return dict(row, status="UNKNOWN")

    # SUCCEEDED or FAILED: the reconciler already wrote and committed
    # that outcome. Re-fetch rather than reconstruct the response from
    # the narrower ReconciliationOutcome, so GET reports exactly what's
    # actually persisted -- same contract a POST retry would see.
    current = fetch_idempotent_operation(
        conn, tenant_id=row["tenant_id"], user_id=row["user_id"],
        idempotency_key=row["idempotency_key"],
    )
    return current if current is not None else dict(row, status=outcome.status)


def get_operation_status(
    conn: PGConnection,
    *,
    tenant_id: int | str,
    user_id: int | str,
    idempotency_key: str,
    reconcilers: dict[str, ReconcilerFn] | None = None,
    stale_after_seconds: int = STALE_AFTER_SECONDS,
) -> OperationStatusResponse:
    """Look up the recorded outcome of one of the current user's own
    idempotent operations, so a client that timed out can recover the real
    result without resubmitting the logical request.

    A stale PENDING row triggers reconciliation right here, the same as
    a POST retry would -- a client that only ever polls status (per the
    documented recovery contract) must not see a stale row reported
    forever just because it never re-POSTed. reconcilers maps
    operation_type -> the reconciler that knows that operation's business
    locks (see booking_service.reconcile_stale_booking_create); with
    none registered for this row's operation_type, the safe default is
    UNKNOWN, never a guess.
    """
    row = fetch_idempotent_operation(
        conn, tenant_id=tenant_id, user_id=user_id, idempotency_key=idempotency_key,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "operation_not_found", "message": "No operation found for this idempotency key."},
        )

    if row["status"] == "PENDING":
        stale_before = datetime.now(UTC) - timedelta(seconds=stale_after_seconds)
        if row["updated_at"] < stale_before:
            row = _reconcile_via_status_lookup(
                conn, row, stale_before=stale_before,
                reconcile=(reconcilers or {}).get(row["operation_type"]),
            )

    return OperationStatusResponse(
        idempotency_key=row["idempotency_key"],
        operation_type=row["operation_type"],
        status=row["status"],
        resource_type=row.get("resource_type"),
        resource_id=str(row["resource_id"]) if row.get("resource_id") is not None else None,
        response=row.get("response_snapshot"),
        error_code=row.get("error_code"),
        error_message=row.get("error_message"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
