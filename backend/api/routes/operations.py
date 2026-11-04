"""HTTP routes for recovering the outcome of an idempotent operation."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.operation import OperationStatusResponse
from backend.services.idempotency_service import get_operation_status

router = APIRouter(prefix="/operations", tags=["operations"])


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
    )
