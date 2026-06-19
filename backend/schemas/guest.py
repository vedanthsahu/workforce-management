"""Pydantic schemas for guest profiles, visits, and seat bookings."""

from __future__ import annotations

from datetime import date, datetime, time

from pydantic import BaseModel, Field

from backend.core.enums import GuestType, VisitPurpose

from typing import Literal

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
    visit_status: str
    created_by_user_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None




class GuestVisitListItem(BaseModel):

    guest_visit_id: str

    visit_date: date
    start_time: time | None = None
    end_time: time | None = None

    visit_status: str
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

class GuestVisitListResponse(BaseModel):
    items: list[GuestVisitListItem]


class GuestVisitStatusUpdateResponse(BaseModel):
    guest_visit_id: str
    visit_status: str
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

