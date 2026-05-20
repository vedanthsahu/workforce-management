"""Pydantic schemas for day-based booking flows."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from backend.core.enums import (
    PreferenceMatchStatus,
    UISeatState,
    DayAvailabilityStatus,
    RangeAvailabilityStatus
)


class CreateBookingRequest(BaseModel):
    """Request body for creating one seat booking for one day."""

    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)
    booked_for_user_id: int = Field(gt=0)
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
    """Public representation of a booking returned by the API."""

    booking_id: str
    tenant_id: str
    user_id: str
    seat_id: str
    site_id: str | None = None
    building_id: str | None = None
    floor_id: str | None = None
    seat_code: str | None = None
    site_name: str | None = None
    building_name: str | None = None
    floor_name: str | None = None
    booking_date: date
    booking_status: str
    source_channel: str | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    created_at: datetime | None = None



class AvailableSeatResponse(BaseModel):

    seat_id: str

    id: str | None = None

    tenant_id: str | None = None

    site_id: str | None = None

    building_id: str | None = None

    floor_id: str

    seat_code: str | None = None

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
