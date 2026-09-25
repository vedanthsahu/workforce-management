"""Validation coverage for editable Configuration business-rule values."""

import pytest
from pydantic import ValidationError

from backend.schemas.business_rule import (
    UpdateBlockedSeatPolicyRequest,
    UpdateBookingPolicyRequest,
    UpdateLayoutPolicyRequest,
    UpdateLayoutVisibilityDaysRequest,
)


@pytest.mark.parametrize(
    ("schema", "payload"),
    [
        (UpdateBookingPolicyRequest, {"employee_max_advance_days": 0}),
        (UpdateBookingPolicyRequest, {"guest_max_advance_days": 0}),
        (UpdateLayoutPolicyRequest, {"buffer_days": 0}),
        (UpdateLayoutVisibilityDaysRequest, {"draft": 0}),
        (UpdateLayoutVisibilityDaysRequest, {"archived": 0}),
        (UpdateLayoutVisibilityDaysRequest, {"deleted": 0}),
        (UpdateBlockedSeatPolicyRequest, {"upcoming_days": 0}),
        (UpdateBlockedSeatPolicyRequest, {"expiring_soon_days": 0}),
        (UpdateBlockedSeatPolicyRequest, {"expired_window_days": 0}),
    ],
)
def test_configuration_fields_reject_zero(schema, payload) -> None:
    with pytest.raises(ValidationError):
        schema(**payload)


@pytest.mark.parametrize(
    ("schema", "payload"),
    [
        (UpdateBookingPolicyRequest, {"employee_max_advance_days": 1}),
        (UpdateBookingPolicyRequest, {"guest_max_advance_days": 1}),
        (UpdateLayoutPolicyRequest, {"buffer_days": 1}),
        (UpdateLayoutVisibilityDaysRequest, {"draft": 1}),
        (UpdateLayoutVisibilityDaysRequest, {"archived": 1}),
        (UpdateLayoutVisibilityDaysRequest, {"deleted": 1}),
        (UpdateBlockedSeatPolicyRequest, {"upcoming_days": 1}),
        (UpdateBlockedSeatPolicyRequest, {"expiring_soon_days": 1}),
        (UpdateBlockedSeatPolicyRequest, {"expired_window_days": 1}),
    ],
)
def test_configuration_fields_accept_positive_values(schema, payload) -> None:
    assert schema(**payload)
