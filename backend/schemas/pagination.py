from __future__ import annotations

from pydantic import BaseModel


class PaginationMetadata(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
