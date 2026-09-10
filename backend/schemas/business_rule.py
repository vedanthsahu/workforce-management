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
