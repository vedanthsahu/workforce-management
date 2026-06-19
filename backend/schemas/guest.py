"""Pydantic schemas for guest profiles, visits, and seat bookings."""

from __future__ import annotations

from datetime import date, datetime, time

from pydantic import BaseModel, Field

from backend.core.enums import GuestType, VisitPurpose


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
