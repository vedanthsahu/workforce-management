"""
Schemas for the read-only business-rule policy endpoints.

These expose the *resolved* values (tenant override applied where one
exists, falling back to the catalog default) that used to be hardcoded
separately in the frontend -- not the raw business_rules/tenant_business_
rules catalog rows.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


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


class ActivityPolicyResponse(BaseModel):
    # Rows shown in the admin dashboard's Recent Activities table.
    record_count: int


class BlockedSeatPolicyResponse(BaseModel):
    # A block is flagged Upcoming/Expiring Soon if it starts/ends within
    # this many days of today.
    upcoming_days: int
    expiring_soon_days: int
    # The Expired tab only shows records from the previous N days.
    expired_window_days: int
    # How many days ahead a block can be created, modified or re-blocked.
    max_advance_days: int


class ChatbotPolicyResponse(BaseModel):
    employee_access_enabled: bool


class BusinessRuleUpdateItem(BaseModel):
    """One setting change. `id` is a stable dotted key -- see
    business_rule_service.BUSINESS_RULE_SETTER_IDS for the full list
    (e.g. "booking_policy.guest_max_advance_days",
    "layout_policy.visibility_days.draft",
    "chatbot_policy.employee_access_enabled")."""

    id: str
    value: Any


class UpdateBusinessRulesRequest(BaseModel):
    """Replaces the old one-PATCH-per-policy shape: a caller sends only
    the specific settings it's changing, by id, in one request -- same
    "update just what you're touching" contract as before, just not
    bound to one policy area per call."""

    updates: list[BusinessRuleUpdateItem] = Field(min_length=1)


class BusinessRulesResponse(BaseModel):
    """The tenant's full resolved business-rule state across all policy
    areas -- returned after POST /business-rules so the caller can
    refresh every dependent field from one response, instead of the
    old pattern of re-fetching a second policy's GET after changing a
    value it derives from (see ConfigurationsListPage.tsx's old
    fetchLayoutPolicy() follow-up call after a booking-policy save)."""

    booking_policy: BookingPolicyResponse
    layout_policy: LayoutPolicyResponse
    activity_policy: ActivityPolicyResponse
    blocked_seat_policy: BlockedSeatPolicyResponse
    chatbot_policy: ChatbotPolicyResponse
