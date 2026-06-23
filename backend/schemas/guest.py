"""Pydantic schemas for guest profiles, visits, and seat bookings."""

from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum

from pydantic import BaseModel, Field

from backend.core.enums import GuestType, VisitPurpose

from typing import Literal

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
    created_at: datetime | None = None
    updated_at: datetime | None = None




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


class GuestWorkflowResponse(BaseModel):
    success: bool
    action: str
    guest_visit_id: str
    booking_id: str | None = None
    message: str

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



class AttachSeatToGuestVisitRequest(BaseModel):
    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)
