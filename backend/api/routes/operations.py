"""HTTP routes for recovering the outcome of an idempotent operation."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.operation import OperationStatusResponse
from backend.services.booking_service import reconcile_stale_booking_create
from backend.services.idempotency_service import ReconcilerFn, get_operation_status

router = APIRouter(prefix="/operations", tags=["operations"])

# operation_type -> the reconciler that knows that operation's business
# locks. A status lookup on a stale PENDING row is reconciled through
# whichever of these matches the row's own operation_type; one entry per
# ledgered operation type added so far.
_RECONCILERS: dict[str, ReconcilerFn] = {
    "BOOKING_CREATE": reconcile_stale_booking_create,
}


@router.get("/{idempotency_key}", response_model=OperationStatusResponse)
def fetch_operation_status(
    idempotency_key: str,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> OperationStatusResponse:
    return get_operation_status(
        conn,
        tenant_id=current_user["tenant_id"],
        user_id=current_user["user_id"],
        idempotency_key=idempotency_key,
        reconcilers=_RECONCILERS,
    )
