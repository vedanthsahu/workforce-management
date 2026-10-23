"""Validation coverage for editable Configuration business-rule values.

Each setting's real range check lives in its own update_* function in
business_rule_service.py (unchanged by the PATCH -> POST consolidation) --
this exercises that validation through the same id -> setter dispatch
POST /business-rules now uses (BUSINESS_RULE_SETTERS / update_business_rules),
instead of through the old per-policy Pydantic request schemas, which no
longer exist now that there's no per-policy route left to attach them to.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from backend.services.business_rule_service import update_business_rules

ZERO_REJECTING_IDS = [
    "booking_policy.employee_max_advance_days",
    "booking_policy.guest_max_advance_days",
    "layout_policy.buffer_days",
    "layout_policy.visibility_days.draft",
    "layout_policy.visibility_days.archived",
    "layout_policy.visibility_days.deleted",
    "activity_policy.record_count",
    "blocked_seat_policy.upcoming_days",
    "blocked_seat_policy.expiring_soon_days",
    "blocked_seat_policy.expired_window_days",
    "blocked_seat_policy.max_advance_days",
]


def _patched_update_business_rules(setting_id: str, value: object):
    with patch(
        "backend.services.business_rule_service._upsert_or_500",
    ), patch(
        "backend.services.business_rule_service.get_all_business_rules",
        return_value={},
    ):
        return update_business_rules(
            MagicMock(),
            tenant_id="3",
            updates=[(setting_id, value)],
            updated_by_user_id="10",
        )


@pytest.mark.parametrize("setting_id", ZERO_REJECTING_IDS)
def test_configuration_fields_reject_zero(setting_id: str) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _patched_update_business_rules(setting_id, 0)
    assert exc_info.value.status_code == 400


@pytest.mark.parametrize("setting_id", ZERO_REJECTING_IDS)
def test_configuration_fields_accept_positive_values(setting_id: str) -> None:
    _patched_update_business_rules(setting_id, 1)


def test_blocked_seat_max_advance_days_rejects_above_730() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _patched_update_business_rules("blocked_seat_policy.max_advance_days", 731)
    assert exc_info.value.status_code == 400


def test_chatbot_employee_access_requires_a_boolean() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _patched_update_business_rules("chatbot_policy.employee_access_enabled", "yes")
    assert exc_info.value.status_code == 400


def test_chatbot_employee_access_accepts_a_boolean() -> None:
    _patched_update_business_rules("chatbot_policy.employee_access_enabled", True)


def test_unknown_setting_id_is_rejected() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _patched_update_business_rules("booking_policy.not_a_real_setting", 1)
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "unknown_business_rule_id"
