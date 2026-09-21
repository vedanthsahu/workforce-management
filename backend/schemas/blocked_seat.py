"""Request and response contracts for blocked-seat administration."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.schemas.pagination import PaginationMetadata

BlockedSeatCategory = Literal["active", "today", "upcoming", "expiring", "expired"]
BlockedSeatType = Literal["MAINTENANCE", "RESERVED", "ADMIN_BLOCK"]
BlockedSeatDisplayStatus = Literal["ACTIVE", "UPCOMING", "EXPIRED"]


class BlockedSeatListQuery(BaseModel):
    category: BlockedSeatCategory = "active"
    search: str | None = None
    site_id: int | None = Field(default=None, gt=0)
    building_id: int | None = Field(default=None, gt=0)
    floor_id: int | None = Field(default=None, gt=0)
    block_type: BlockedSeatType | None = None
    selected_date: date | None = None


class BlockedSeatActorResponse(BaseModel):
    user_id: str | None = None
    name: str | None = None


class BlockedSeatResponse(BaseModel):
    block_id: str
    seat_id: str
    seat_code: str
    site_id: str
    site_name: str
    building_id: str
    building_name: str
    floor_id: str
    floor_name: str
    blocked_from: date
    blocked_to: date
    block_type: BlockedSeatType
    reason: str
    display_status: BlockedSeatDisplayStatus
    blocked_by: BlockedSeatActorResponse
    created_at: datetime


class BlockedSeatSummaryResponse(BaseModel):
    active_blocks: int = 0
    seats_blocked_today: int = 0
    upcoming_blocks: int = 0
    expiring_soon: int = 0
    expired: int = 0


class BlockedSeatListResponse(BaseModel):
    items: list[BlockedSeatResponse]
    summary: BlockedSeatSummaryResponse
    pagination: PaginationMetadata


class CreateBlockedSeatsRequest(BaseModel):
    seat_ids: list[int] = Field(min_length=1, max_length=200)
    block_type: BlockedSeatType
    blocked_from: date
    blocked_to: date
    reason: str = Field(min_length=1, max_length=500)

    @field_validator("seat_ids")
    @classmethod
    def reject_duplicate_seats(cls, value: list[int]) -> list[int]:
        if any(seat_id <= 0 for seat_id in value):
            raise ValueError("seat_ids must contain positive IDs.")
        if len(set(value)) != len(value):
            raise ValueError("seat_ids must not contain duplicates.")
        return value

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("reason is required.")
        return normalized

    @model_validator(mode="after")
    def validate_date_range(self) -> CreateBlockedSeatsRequest:
        if self.blocked_to < self.blocked_from:
            raise ValueError("blocked_to must be on or after blocked_from.")
        return self


class CreateBlockedSeatsResponse(BaseModel):
    message: str
    created_count: int
    items: list[BlockedSeatResponse]


class UpdateBlockedSeatRequest(BaseModel):
    block_type: BlockedSeatType | None = None
    blocked_from: date | None = None
    blocked_to: date | None = None
    reason: str | None = Field(default=None, min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def trim_optional_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("reason must not be empty.")
        return normalized

    @model_validator(mode="after")
    def require_change(self) -> UpdateBlockedSeatRequest:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self


class BlockedSeatHistoryItemResponse(BaseModel):
    id: str
    action: str
    actor_name: str | None = None
    actor_email: str | None = None
    old_values: dict[str, object] | None = None
    new_values: dict[str, object] | None = None
    changed_fields: list[str] | None = None
    occurred_at: datetime


class BlockedSeatHistoryResponse(BaseModel):
    items: list[BlockedSeatHistoryItemResponse]


class BlockableResourceResponse(BaseModel):
    resource_id: str
    resource_code: str
    resource_name: str | None = None
    resource_type: str
    svg_element_id: str
    capacity: int | None = None
    is_bookable: bool
    is_active: bool
    has_booking: bool
    has_block: bool


class BlockedSeatConflictResponse(BaseModel):
    booking_id: str
    seat_id: str
    site_id: str
    building_id: str
    floor_id: str
    seat_code: str
    booking_date: date
    booking_type: str
    booking_status: str
    booked_for_name: str | None = None


class FloorLayoutScheduleItemResponse(BaseModel):
    layout_id: str
    layout_name: str
    status: str
    effective_from: date | None = None
    effective_till: date | None = None


class FloorLayoutScheduleResponse(BaseModel):
    layouts: list[FloorLayoutScheduleItemResponse]


class BlockableFloorLayoutResponse(BaseModel):
    layout_id: str
    layout_name: str
    layout_file_url: str
    effective_from: datetime | None = None
    effective_till: datetime | None = None
    resources: list[BlockableResourceResponse]
    conflicts: list[BlockedSeatConflictResponse] = Field(default_factory=list)
    has_more_conflicts: bool = False


class CancelBlockedSeatRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("reason is required.")
        return normalized


class CancelBlockedSeatResponse(BaseModel):
    message: str
    block_id: str
    status: Literal["CANCELLED"]
