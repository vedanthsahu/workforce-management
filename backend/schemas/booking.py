"""Pydantic schemas for employee and guest booking records."""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field

from backend.core.enums import (
    DayAvailabilityStatus,
    GuestType,
    PreferenceMatchStatus,
    RangeAvailabilityStatus,
    VisitPurpose,
)


class CreateBookingRequest(BaseModel):
    """Request body for creating one employee seat booking."""

    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)
    booked_for_user_id: int | None = Field(default=None, gt=0)
    booking_date: date


class CancelBookingRequest(BaseModel):
    cancellation_reason: str | None = None


class ModifyBookingRequest(BaseModel):
    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)
    booking_date: date


class BookingResponse(BaseModel):
    """Public representation of a schema-native booking."""

    booking_id: str
    tenant_id: str
    booked_for_user_id: str | None = None
    booked_for_guest_id: str | None = None
    booked_by_user_id: str
    guest_visit_id: str | None = None
    booking_type: Literal["EMPLOYEE", "GUEST"]

    seat_id: str
    site_id: str
    building_id: str
    floor_id: str
    seat_code: str | None = None
    site_name: str | None = None
    building_name: str | None = None
    floor_name: str | None = None

    booking_date: date
    booking_status: str
    source_channel: str | None = None
    check_in_at: datetime | None = None
    checked_out_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    guest_name: str | None = None
    guest_email: str | None = None
    guest_phone: str | None = None
    guest_organization: str | None = None
    guest_type: GuestType | None = None
    purpose_of_visit: VisitPurpose | None = None
    visit_status: str | None = None
    host_user_id: str | None = None
    host_name: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None
    requires_seat: bool | None = None


class SeatAvailabilityDay(BaseModel):
    booking_date: date
    status: DayAvailabilityStatus


class SeatAvailabilitySummary(BaseModel):
    status: RangeAvailabilityStatus
    available_dates: list[date] = Field(default_factory=list)
    unavailable_dates: list[date] = Field(default_factory=list)
    booked_dates: list[date] = Field(default_factory=list)
    blocked_dates: list[date] = Field(default_factory=list)
    daily_statuses: list[SeatAvailabilityDay] = Field(default_factory=list)
    total_requested_days: int
    total_available_days: int
    availability_percentage: float


class AvailableSeatResponse(BaseModel):
    seat_id: str
    seat_code: str
    tenant_id: str | None = None
    site_id: str | None = None
    building_id: str | None = None
    floor_id: str
    code: str | None = None
    seat_type: str | None = None
    seat_neighborhood: str | None = None
    is_bookable: bool | None = None
    x: float | None = None
    y: float | None = None
    w: float | None = None
    h: float | None = None
    rotation_angle: float | None = None
    matched_amenities: list[str] = Field(default_factory=list)
    matched_amenity_count: int = 0
    requested_amenity_count: int = 0
    preference_match_status: PreferenceMatchStatus = (
        PreferenceMatchStatus.NOT_APPLICABLE
    )
    availability: SeatAvailabilitySummary


class BookingEligibilityRequest(BaseModel):
    start_date: date
    end_date: date
    is_guest_booking: bool = False

    booked_for_user_id: int | None = Field(
        default=None,
        gt=0,
    )

    booked_for_guest_id: int | None = Field(
        default=None,
        gt=0,
    )

    exclude_booking_id: str | None = None

class BookingEligibilityResponse(BaseModel):
    eligible: bool
    message: str
