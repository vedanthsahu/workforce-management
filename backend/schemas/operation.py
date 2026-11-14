"""Pydantic schemas for the idempotent-operation status endpoint."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class OperationStatusResponse(BaseModel):
    """Status/outcome of one idempotent operation, keyed by its client-supplied key."""

    idempotency_key: str
    operation_type: str
    status: str
    resource_type: str | None
    resource_id: str | None
    response: dict[str, Any] | None
    error_code: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
