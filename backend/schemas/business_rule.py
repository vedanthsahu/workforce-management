"""
Schemas for the read-only business-rule policy endpoints.

These expose the *resolved* values (tenant override applied where one
exists, falling back to the catalog default) that used to be hardcoded
separately in the frontend -- not the raw business_rules/tenant_business_
rules catalog rows.
"""

from __future__ import annotations

from pydantic import BaseModel


class BookingPolicyResponse(BaseModel):
    employee_max_advance_days: int
    guest_max_advance_days: int


class LayoutVisibilityDaysResponse(BaseModel):
    draft: int
    archived: int
    deleted: int


class LayoutPolicyResponse(BaseModel):
    employee_max_advance_days: int
    buffer_days: int
    # The earliest a new layout can be scheduled to take effect, in days
    # from today -- employee_max_advance_days + buffer_days combined.
    min_advance_days: int
    visibility_days: LayoutVisibilityDaysResponse


class UpdateBookingPolicyRequest(BaseModel):
    """Each field is optional so a caller can update just one rule without
    resending values it isn't touching."""

    employee_max_advance_days: int | None = None
    guest_max_advance_days: int | None = None


class UpdateLayoutVisibilityDaysRequest(BaseModel):
    draft: int | None = None
    archived: int | None = None
    deleted: int | None = None


class UpdateLayoutPolicyRequest(BaseModel):
    buffer_days: int | None = None
    visibility_days: UpdateLayoutVisibilityDaysRequest | None = None


class BlockedSeatPolicyResponse(BaseModel):
    # A block is flagged Upcoming/Expiring Soon if it starts/ends within
    # this many days of today.
    upcoming_days: int
    expiring_soon_days: int
    # The Expired tab only shows records from the previous N days.
    expired_window_days: int


class UpdateBlockedSeatPolicyRequest(BaseModel):
    upcoming_days: int | None = None
    expiring_soon_days: int | None = None
    expired_window_days: int | None = None
