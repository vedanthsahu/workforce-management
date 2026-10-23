"""Regression coverage for the tenant-level employee chatbot toggle."""

from unittest.mock import ANY, MagicMock, patch

from backend.api.routes.business_rules import router
from backend.services.business_rule_service import (
    BUSINESS_RULE_SETTERS,
    CHATBOT_EMPLOYEE_ACCESS_KEY,
    resolve_chatbot_employee_access,
    update_chatbot_employee_access,
)


def test_chatbot_policy_routes_are_registered() -> None:
    operations = {
        (method, route.path)
        for route in router.routes
        for method in route.methods
    }

    # The chatbot policy's write used to have its own PATCH route with its
    # own admin-only role gate, separate from the other four policies'
    # admin_dashboard:view gate. Both are now one uniform POST
    # /business-rules (see business_rules.py's module docstring) --
    # chatbot_policy.employee_access_enabled is just one more id in
    # BUSINESS_RULE_SETTERS, gated the same as every other setting.
    assert ("GET", "/business-rules/chatbot-policy") in operations
    assert ("POST", "/business-rules") in operations
    assert ("PATCH", "/business-rules/chatbot-policy") not in operations
    assert "chatbot_policy.employee_access_enabled" in BUSINESS_RULE_SETTERS


@patch("backend.services.business_rule_service.fetch_business_rule_value")
def test_chatbot_policy_defaults_to_disabled_when_rule_is_unseeded(fetch_value) -> None:
    fetch_value.return_value = False

    assert resolve_chatbot_employee_access(MagicMock(), tenant_id="3") is False
    fetch_value.assert_called_once_with(
        ANY,
        tenant_id="3",
        business_rule_key=CHATBOT_EMPLOYEE_ACCESS_KEY,
        default=False,
    )


@patch("backend.services.business_rule_service._upsert_or_500")
def test_enabling_chatbot_persists_boolean_override(upsert) -> None:
    conn = MagicMock()

    update_chatbot_employee_access(
        conn,
        tenant_id="3",
        enabled=True,
        updated_by_user_id="10",
    )

    upsert.assert_called_once_with(
        conn,
        tenant_id="3",
        business_rule_key=CHATBOT_EMPLOYEE_ACCESS_KEY,
        value="true",
        updated_by_user_id="10",
    )
    conn.commit.assert_called_once_with()


@patch("backend.services.business_rule_service._upsert_or_500")
def test_disabling_chatbot_persists_boolean_override(upsert) -> None:
    conn = MagicMock()

    update_chatbot_employee_access(
        conn,
        tenant_id="3",
        enabled=False,
        updated_by_user_id="10",
    )

    assert upsert.call_args.kwargs["value"] == "false"
    conn.commit.assert_called_once_with()
