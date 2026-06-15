"""Shared string enums for API-facing state values."""

from __future__ import annotations

from enum import Enum


class LayoutStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


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
