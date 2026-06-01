"""
Schemas for floor layout upload and persistence.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

class CreateFloorLayoutRequest(BaseModel):
    site_id: int = Field(gt=0)

    building_id: int = Field(gt=0)

    floor_id: int = Field(gt=0)

    layout_name: str = Field(
        min_length=1,
        max_length=255,
    )

    status: str = Field(
        pattern="^(DRAFT|PUBLISHED)$",
    )

    layout_metadata: dict[str, Any] | None = None

    seat_ids: list[str] = Field(
        min_length=1,
    )
class FloorLayoutResponse(BaseModel):
    layout_id: str

    tenant_id: str

    site_id: str
    building_id: str
    floor_id: str
    site_name: str | None = None
    building_name: str | None = None
    floor_name: str | None = None

    layout_name: str
    layout_file_url: str

    file_storage_provider: str
    layout_type: str

    version_no: int

    is_published: bool

    layout_metadata: dict[str, Any] | None = None

    uploaded_by_user_id: str
    uploaded_by_name: str | None = None
    uploaded_by_email: str | None = None
    uploaded_by_role: str | None = None
    uploaded_by_department: str | None = None
    uploaded_by_job_title: str | None = None

    published_by_user_id: str | None = None

    published_at: datetime | None = None

    status: str

    created_at: datetime
    updated_at: datetime

    
class LayoutSeatResponse(BaseModel):

    layout_seat_mapping_id: str

    layout_id: str

    site_id: str
    building_id: str
    floor_id: str

    seat_id: str | None = None

    svg_element_id: str

    seat_code: str

    seat_name: str | None = None

    seat_type: str | None = None

    status: str

    is_bookable: bool

    is_reserved: bool

    is_configured: bool

    configuration_status: str

    notes: str | None = None

    amenity_ids: list[int]

    created_at: datetime

    updated_at: datetime




class LayoutSeatListResponse(BaseModel):

    layout_id: str

    total_seats: int

    configured_seats: int

    pending_seats: int

    items: list[LayoutSeatResponse]