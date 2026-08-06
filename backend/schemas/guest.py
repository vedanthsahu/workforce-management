"""Pydantic schemas for guest profiles, visits, and seat bookings."""

from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from backend.core.enums import GuestType, GuestVisitModificationReason, VisitPurpose
from backend.schemas.booking import BookingResponse
from backend.schemas.pagination import PaginationMetadata

GuestVisitStatus = Literal[
    "SCHEDULED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "CANCELLED",
    "NO_SHOW",
    "MODIFIED",
]

class CreateGuestRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=100)
    organization: str | None = Field(default=None, max_length=255)


class UpdateGuestRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=100)
    organization: str | None = Field(default=None, max_length=255)


GuestStatus = Literal["ACTIVE", "INACTIVE"]


class UpdateGuestStatusRequest(BaseModel):
    status: GuestStatus
    cancel_future_bookings: bool = False


class GuestResponse(BaseModel):
    guest_id: str
    tenant_id: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    organization: str | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class GuestVisitBase(BaseModel):
    guest_id: int = Field(gt=0)
    host_user_id: int = Field(gt=0)
    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int | None = Field(default=None, gt=0)
    visit_date: date
    guest_type: GuestType
    purpose_of_visit: VisitPurpose | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None


class CreateGuestVisitRequest(GuestVisitBase):
    pass


class CreateGuestBookingRequest(GuestVisitBase):
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)


class GuestVisitResponse(BaseModel):
    guest_visit_id: str
    tenant_id: str
    guest_id: str
    host_user_id: str
    site_id: str
    building_id: str
    floor_id: str | None = None
    visit_date: date
    guest_type: GuestType
    purpose_of_visit: VisitPurpose | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None
    requires_seat: bool
    visit_status: GuestVisitStatus
    created_by_user_id: str | None = None

    modified_from_guest_visit_id: str | None = None
    modification_reason: str | None = None
    is_modified: bool = False

    created_at: datetime | None = None
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def _derive_is_modified(cls, data: Any) -> Any:
        """Default is_modified from modified_from_guest_visit_id when the
        caller (a raw DB row) doesn't set it explicitly."""
        if isinstance(data, dict) and "is_modified" not in data:
            data = {
                **data,
                "is_modified": data.get("modified_from_guest_visit_id") is not None,
            }
        return data


class GuestVisitListItem(BaseModel):

    guest_visit_id: str

    visit_date: date
    start_time: time | None = None
    end_time: time | None = None

    visit_status: GuestVisitStatus
    guest_type: str | None = None
    purpose_of_visit: str | None = None

    requires_seat: bool

    checked_in_at: datetime | None = None
    checked_out_at: datetime | None = None

    modified_from_guest_visit_id: str | None = None
    modification_reason: str | None = None
    is_modified: bool = False

    guest_id: str
    guest_name: str
    guest_email: str | None = None
    guest_phone: str | None = None

    host_user_id: str
    host_name: str
    host_email: str | None = None
    host_phone: str | None = None
    host_department: str | None = None
    host_job_title: str | None = None

    site_id: str
    site_name: str

    building_id: str
    building_name: str

    floor_id: str | None = None
    floor_name: str | None = None

    booking_id: str | None = None
    booking_status: str | None = None

    seat_id: str | None = None
    seat_code: str | None = None
    start_time: time | None = None
    end_time: time | None = None

    guest_type: str | None = None
    purpose_of_visit: str | None = None
    notes: str | None = None

    host_phone: str | None = None

    site_id: str
    site_name: str

    building_id: str
    building_name: str

    floor_id: str | None = None
    floor_name: str | None = None

    seat_code: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _derive_is_modified(cls, data: Any) -> Any:
        """Default is_modified from modified_from_guest_visit_id when the
        caller (a raw DB row) doesn't set it explicitly."""
        if isinstance(data, dict) and "is_modified" not in data:
            data = {
                **data,
                "is_modified": data.get("modified_from_guest_visit_id") is not None,
            }
        return data

class GuestVisitSummary(BaseModel):
    total: int = 0
    scheduled: int = 0
    checked_in: int = 0
    checked_out: int = 0
    cancelled: int = 0
    modified: int = 0
    overdue: int = 2


class GuestVisitListResponse(BaseModel):
    summary: GuestVisitSummary = Field(default_factory=GuestVisitSummary)
    items: list[GuestVisitListItem]
    pagination: PaginationMetadata | None = None


class GuestVisitStatusUpdateResponse(BaseModel):
    guest_visit_id: str
    visit_status: GuestVisitStatus
    checked_in_at: datetime | None = None
    checked_out_at: datetime | None = None


GuestVisitScope = Literal[
    "CURRENT",
    "UPCOMING",
    "PAST",
]

class AttachSeatToGuestVisitRequest(BaseModel):
    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)


class GuestWorkflowAction(str, Enum):
    MODIFY_VISIT_ONLY = "MODIFY_VISIT_ONLY"
    MODIFY_VISIT_AND_BOOKING = "MODIFY_VISIT_AND_BOOKING"
    ADD_BOOKING = "ADD_BOOKING"
    CANCEL_BOOKING = "CANCEL_BOOKING"
    CANCEL_VISIT = "CANCEL_VISIT"


class GuestWorkflowRequest(BaseModel):
    action: GuestWorkflowAction

    host_user_id: int = Field(gt=0)

    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int | None = Field(default=None, gt=0)

    visit_date: date

    guest_type: GuestType

    purpose_of_visit: VisitPurpose | None = None

    start_time: time | None = None
    end_time: time | None = None

    notes: str | None = None

    seat_id: int | None = Field(default=None, gt=0)

    cancellation_reason: str | None = None
    modification_reason: GuestVisitModificationReason | None = None


class GuestWorkflowResponse(BaseModel):
    success: bool
    action: str
    message: str
    guest_visit: GuestVisitResponse
    booking: BookingResponse | None = None

class CancelGuestVisitRequest(BaseModel):
    cancellation_reason: str | None = None


class ModifyGuestVisitRequest(BaseModel):
    host_user_id: int = Field(gt=0)

    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int | None = Field(default=None, gt=0)

    visit_date: date

    guest_type: GuestType

    purpose_of_visit: VisitPurpose | None = None

    start_time: time | None = None
    end_time: time | None = None

    notes: str | None = None
    modification_reason: GuestVisitModificationReason | None = None



class AttachSeatToGuestVisitRequest(BaseModel):
    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)

class CancelledGuestVisitItem(BaseModel):
    guest_visit_id: str

    guest_id: str
    guest_name: str
    guest_email: str | None = None
    guest_phone: str | None = None

    created_by_user_id: str
    created_by_name: str | None = None

    host_user_id: str
    host_name: str
    host_email: str | None = None

    visit_date: date

    guest_type: str | None = None
    purpose_of_visit: str | None = None

    visit_status: str

    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None

    updated_at: datetime


class CancelledGuestVisitResponse(BaseModel):
    items: list[CancelledGuestVisitItem]


class GuestVisitHistorySummary(BaseModel):
    total_visits: int = 0
    total_bookings: int = 0
    scheduled: int = 0
    checked_in: int = 0
    checked_out: int = 0
    cancelled: int = 0
    modified: int = 0
    requires_seat_count: int = 0


class GuestVisitHistoryItem(BaseModel):
    guest_visit_id: str
    visit_date: date
    visit_status: GuestVisitStatus
    guest_type: str | None = None
    purpose_of_visit: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None
    requires_seat: bool
    checked_in_at: datetime | None = None
    checked_out_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None

    host_user_id: str | None = None
    host_name: str | None = None
    host_email: str | None = None

    site_id: str
    site_name: str
    building_id: str
    building_name: str
    floor_id: str | None = None
    floor_name: str | None = None

    booking_id: str | None = None
    booking_status: str | None = None
    seat_id: str | None = None
    seat_code: str | None = None
    booking_date: date | None = None


class GuestVisitHistoryResponse(BaseModel):
    guest: GuestResponse
    summary: GuestVisitHistorySummary = Field(default_factory=GuestVisitHistorySummary)
    items: list[GuestVisitHistoryItem]
    pagination: PaginationMetadata
