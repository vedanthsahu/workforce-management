"""Shared string enums for API-facing state values."""

from __future__ import annotations

from enum import Enum


class LayoutStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


NON_DELETED_LAYOUT_STATUSES: tuple[str, ...] = (
    LayoutStatus.DRAFT.value,
    LayoutStatus.ARCHIVED.value,
    LayoutStatus.PUBLISHED.value,
)

# Every status, including DELETED. Used only by read/list surfaces that show
# a deleted layout as a view-only historical entry — never by anything that
# resolves "the" active layout for a floor or that can act on a layout
# (configure, activate, delete), which must keep using
# NON_DELETED_LAYOUT_STATUSES so a deleted layout behaves as gone.
ALL_LAYOUT_STATUSES: tuple[str, ...] = tuple(status.value for status in LayoutStatus)


class SeatAvailabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BOOKED = "BOOKED"
    BLOCKED = "BLOCKED"
    UNAVAILABLE = "UNAVAILABLE"


class PreferenceMatchStatus(str, Enum):
    FULL_MATCH = "FULL_MATCH"
    PARTIAL_MATCH = "PARTIAL_MATCH"
    NO_MATCH = "NO_MATCH"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class UISeatState(str, Enum):
    AVAILABLE = "AVAILABLE"
    BEST_MATCH = "BEST_MATCH"
    UNAVAILABLE = "UNAVAILABLE"

class RangeAvailabilityStatus(str, Enum):
    FULLY_AVAILABLE = "FULLY_AVAILABLE"
    PARTIALLY_AVAILABLE = "PARTIALLY_AVAILABLE"
    FULLY_UNAVAILABLE = "FULLY_UNAVAILABLE"


class DayAvailabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BOOKED = "BOOKED"
    BLOCKED = "BLOCKED"
    UNAVAILABLE = "UNAVAILABLE"


class GuestType(str, Enum):
    INTERVIEW_CANDIDATE = "INTERVIEW_CANDIDATE"
    CUSTOMER = "CUSTOMER"
    VENDOR = "VENDOR"
    PARTNER = "PARTNER"
    CONTRACTOR = "CONTRACTOR"
    OTHER = "OTHER"


class VisitPurpose(str, Enum):
    INTERVIEW = "INTERVIEW"
    MEETING = "MEETING"
    WORKSHOP = "WORKSHOP"
    VENDOR_VISIT = "VENDOR_VISIT"
    CUSTOMER_VISIT = "CUSTOMER_VISIT"
    OTHER = "OTHER"


class BookingModificationReason(str, Enum):
    """Mirrors chk_booking_modification_reason -- the only values
    bookings.modification_reason accepts besides NULL."""
    USER_REQUEST = "USER_REQUEST"
    ADMIN_MODIFIED = "ADMIN_MODIFIED"
    FACILITATOR_MODIFIED = "FACILITATOR_MODIFIED"
    SEAT_UNAVAILABLE = "SEAT_UNAVAILABLE"
    GUEST_DETAILS_UPDATED = "GUEST_DETAILS_UPDATED"
    DATE_CHANGED = "DATE_CHANGED"
    SYSTEM_REALLOCATION = "SYSTEM_REALLOCATION"
    POLICY_CHANGE = "POLICY_CHANGE"
    OTHER = "OTHER"


class GuestVisitModificationReason(str, Enum):
    """Mirrors chk_guest_visit_modification_reason -- the only values
    guest_visits.modification_reason accepts besides NULL."""
    USER_REQUEST = "USER_REQUEST"
    HOST_CHANGED = "HOST_CHANGED"
    DATE_CHANGED = "DATE_CHANGED"
    TIME_CHANGED = "TIME_CHANGED"
    LOCATION_CHANGED = "LOCATION_CHANGED"
    PURPOSE_CHANGED = "PURPOSE_CHANGED"
    SEAT_REQUIREMENT_CHANGED = "SEAT_REQUIREMENT_CHANGED"
    GUEST_DETAILS_UPDATED = "GUEST_DETAILS_UPDATED"
    ADMIN_MODIFIED = "ADMIN_MODIFIED"
    FACILITATOR_MODIFIED = "FACILITATOR_MODIFIED"
    SYSTEM_UPDATE = "SYSTEM_UPDATE"
    OTHER = "OTHER"
