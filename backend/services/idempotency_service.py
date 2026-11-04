"""Idempotent request handling for state-changing APIs.

Request flow for a caller that supplies an Idempotency-Key:

1. begin_idempotent_operation() claims the key (its own immediate commit)
   or, if it's already claimed, decides what to do with the existing row:
   replay the stored response, reject a payload mismatch, report
   in-progress, or reclaim an abandoned/failed attempt.
2. The caller runs its business write and calls
   idempotency_repository.mark_idempotent_operation_succeeded() as part of
   the SAME transaction it commits for that write.
3. On failure, after the caller's own rollback, the caller calls
   idempotency_repository.mark_idempotent_operation_failed() (a fresh,
   separately-committed statement, same pattern as safe_write_audit_log).

A missing/empty idempotency_key is a no-op here -- callers that don't
pass one get today's behaviour, unchanged.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from psycopg2.errors import UniqueViolation
from psycopg2.extensions import connection as PGConnection

from backend.repositories.idempotency_repository import (
    claim_idempotent_operation,
    fetch_idempotent_operation,
    reclaim_failed_operation,
    reclaim_stale_pending_operation,
)
from backend.schemas.operation import OperationStatusResponse

STALE_AFTER_SECONDS = 60


@dataclass
class IdempotentClaim:
    # None means "no key supplied, or already resolved by a replay" --
    # callers only need to record an outcome when this is set.
    operation_id: int | None
    # Set when an existing SUCCEEDED row already has the answer; callers
    # should return this immediately instead of doing any work.
    replay_response: dict[str, Any] | None = None
    # The row's updated_at as of this claim/reclaim. Callers must pass this
    # back as expected_updated_at to mark_idempotent_operation_succeeded/
    # _failed, so a stale write (this claim got reclaimed out from under a
    # slow caller before it finished) becomes a no-op instead of
    # overwriting the reclaiming caller's own outcome.
    claimed_at: datetime | None = None


def hash_payload(payload: Any) -> str:
    data = payload.model_dump(mode="json") if hasattr(payload, "model_dump") else payload
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _in_progress() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "operation_in_progress",
            "message": "This operation is already being processed. Check its status before retrying.",
        },
    )


def begin_idempotent_operation(
    conn: PGConnection,
    *,
    tenant_id: int | str,
    user_id: int | str,
    idempotency_key: str | None,
    operation_type: str,
    payload: Any,
    stale_after_seconds: int = STALE_AFTER_SECONDS,
) -> IdempotentClaim:
    if not idempotency_key:
        return IdempotentClaim(operation_id=None)

    payload_hash = hash_payload(payload)

    try:
        row = claim_idempotent_operation(
            conn, tenant_id=tenant_id, user_id=user_id,
            idempotency_key=idempotency_key, operation_type=operation_type,
            payload_hash=payload_hash,
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
        reclaimed = reclaim_failed_operation(conn, operation_id=existing["id"])
        if reclaimed is None:
            raise _in_progress()
        return IdempotentClaim(operation_id=reclaimed["id"], claimed_at=reclaimed["updated_at"])

    # status == "PENDING"
    stale_before = datetime.now(UTC) - timedelta(seconds=stale_after_seconds)
    if existing["updated_at"] >= stale_before:
        raise _in_progress()

    reclaimed = reclaim_stale_pending_operation(
        conn, operation_id=existing["id"], stale_before=stale_before,
    )
    if reclaimed is None:
        raise _in_progress()
    return IdempotentClaim(operation_id=reclaimed["id"], claimed_at=reclaimed["updated_at"])


def get_operation_status(
    conn: PGConnection, *, tenant_id: int | str, user_id: int | str, idempotency_key: str,
) -> OperationStatusResponse:
    """Look up the recorded outcome of one of the current user's own
    idempotent operations, so a client that timed out can recover the real
    result without resubmitting the logical request."""
    row = fetch_idempotent_operation(
        conn, tenant_id=tenant_id, user_id=user_id, idempotency_key=idempotency_key,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "operation_not_found", "message": "No operation found for this idempotency key."},
        )
    return OperationStatusResponse(
        idempotency_key=row["idempotency_key"],
        operation_type=row["operation_type"],
        status=row["status"],
        resource_type=row["resource_type"],
        resource_id=str(row["resource_id"]) if row["resource_id"] is not None else None,
        response=row["response_snapshot"],
        error_code=row["error_code"],
        error_message=row["error_message"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
