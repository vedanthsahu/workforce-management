"""Pydantic schemas for employee and guest booking records."""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic import BaseModel, Field

from backend.core.enums import (
    DayAvailabilityStatus,
    GuestType,
    PreferenceMatchStatus,
    RangeAvailabilityStatus,
    VisitPurpose,
)
from backend.schemas.pagination import PaginationMetadata


class CreateBookingRequest(BaseModel):
    """Request body for creating one employee seat booking."""

    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)
    booked_for_user_id: int | None = Field(default=None, gt=0)
    booked_for_user_id: int | None = Field(default=None, gt=0)
    booking_date: date
    start_time: time = time(9, 0)
    end_time: time = time(18, 0)



class CancelBookingRequest(BaseModel):
    cancellation_reason: str | None = None



class ModifyBookingRequest(BaseModel):
    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_id: int = Field(gt=0)
    seat_id: int = Field(gt=0)
    booking_date: date
    modification_reason: str | None = None



class BookingResponse(BaseModel):
    """Public representation of a schema-native booking."""

    activity_source: str | None = None
    booking_id: str | None = None
    tenant_id: str | None = None

    booked_for_user_id: str | None = None
    booked_for_guest_id: str | None = None

    booked_by_user_id: str | None = None

    # NEW
    booked_by_name: str | None = None
    booked_by_email: str | None = None

    # NEW
    booked_for_name: str | None = None
    booked_for_email: str | None = None
    booked_for_phone: str | None = None
    booked_for_organization: str | None = None

    guest_visit_id: str | None = None
    booking_type: Literal["EMPLOYEE", "GUEST"]

    seat_id: str | None = None
    site_id: str | None = None
    building_id: str | None = None
    floor_id: str | None = None

    seat_code: str | None = None
    site_name: str | None = None
    building_name: str | None = None
    floor_name: str | None = None

    booking_date: date | None = None
    booking_status: str | None = None
    source_channel: str | None = None

    check_in_at: datetime | None = None
    checked_out_at: datetime | None = None
    cancelled_at: datetime | None = None

    cancellation_reason: str | None = None

    modified_from_booking_id: str | None = None
    modification_reason: str | None = None
    is_modified: bool = False

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
    host_email: str | None = None

    start_time: time | None = None
    end_time: time | None = None

    desk_type: str | None = None

    notes: str | None = None
    requires_seat: bool | None = None

    amenities: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _derive_is_modified(cls, data: Any) -> Any:
        """Default is_modified from modified_from_booking_id when the
        caller (a raw DB row) doesn't set it explicitly."""
        if isinstance(data, dict) and "is_modified" not in data:
            data = {
                **data,
                "is_modified": data.get("modified_from_booking_id") is not None,
            }
        return data


class PaginatedBookingResponse(BaseModel):
    items: list[BookingResponse]
    pagination: PaginationMetadata


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


class AvailableSeatListSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    available_seats: int = Field(alias="availableSeats")


class AvailableSeatListResponse(BaseModel):
    summary: AvailableSeatListSummary
    items: list[AvailableSeatResponse]


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


AdminBookingType = Literal["EMPLOYEE", "GUEST"]
AdminBookingStatus = Literal[
    "CONFIRMED",
    "CANCELLED",
    "MODIFIED",
    "COMPLETED",
    "NO_SHOW",
]


class AdminBookingListQuery(BaseModel):
    """Validated filters for the admin booking management listing."""

    start_date: date | None = None
    end_date: date | None = None

    site_id: int | None = Field(default=None, gt=0)
    building_id: int | None = Field(default=None, gt=0)
    floor_id: int | None = Field(default=None, gt=0)

    booking_type: AdminBookingType | None = None
    booking_status: AdminBookingStatus | None = None

    search: str | None = Field(default=None, min_length=1)
    seat_code: str | None = Field(default=None, min_length=1)
    booked_by_user_id: int | None = Field(default=None, gt=0)


class AdminBookingSummary(BaseModel):
    """Aggregate counts over the filtered (not paginated) admin booking dataset."""

    total_bookings: int = 0
    confirmed_bookings: int = 0
    cancelled_bookings: int = 0
    modified_bookings: int = 0
    completed_bookings: int = 0
    no_show_bookings: int = 0
    employee_bookings: int = 0
    guest_bookings: int = 0
    checked_in_bookings: int = 0
    checked_out_bookings: int = 0


class AdminBookingListResponse(BaseModel):
    items: list[BookingResponse]
    summary: AdminBookingSummary
    pagination: PaginationMetadata
