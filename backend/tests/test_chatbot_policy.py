"""Regression coverage for the tenant-level employee chatbot toggle."""

from unittest.mock import ANY, MagicMock, patch

import pytest
from fastapi import HTTPException

from backend.api.routes.business_rules import (
    require_chatbot_configuration_admin,
    router,
)
from backend.services.business_rule_service import (
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

    assert ("GET", "/business-rules/chatbot-policy") in operations
    assert ("PATCH", "/business-rules/chatbot-policy") in operations


@pytest.mark.parametrize("role", ["TENANT_ADMIN", "PRODUCT_ADMIN"])
def test_chatbot_policy_write_accepts_admin_roles(role: str) -> None:
    user = {"role_name": role}
    assert require_chatbot_configuration_admin(user) is user


@pytest.mark.parametrize("role", ["EMPLOYEE", "FACILITATOR", "MANAGER", "FRONT_OFFICE"])
def test_chatbot_policy_write_rejects_non_admin_roles(role: str) -> None:
    with pytest.raises(HTTPException) as exc_info:
        require_chatbot_configuration_admin({"role_name": role})
    assert exc_info.value.status_code == 403


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
