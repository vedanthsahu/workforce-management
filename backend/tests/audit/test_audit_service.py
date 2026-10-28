from datetime import UTC, datetime
from unittest.mock import Mock, patch

from backend.services.audit_service import (
    _apply_audit_display_names,
    _prepare_audit_row,
    get_audit_logs,
)
from backend.repositories.audit_repository import _build_audit_log_filters


def _list_row(status: str = "SUCCESS") -> dict:
    return {
        "id": "1",
        "actor_user_id": "7",
        "actor_name": "Admin User",
        "actor_email": "admin@example.com",
        "actor_role": "TENANT_ADMIN",
        "action": "building.updated",
        "module": "LOCATION",
        "entity_type": "building",
        "entity_id": "84",
        "event_status": status,
        "request_method": "PATCH",
        "source_channel": "WEB",
        "occurred_at": datetime.now(UTC),
    }


def test_failed_row_uses_safe_summary_instead_of_stored_error() -> None:
    row = {
        **_list_row("FAILURE"),
        "failure_reason": "Traceback: password=secret-token",
        "failure_code": "psycopg2.InternalError",
    }

    prepared = _prepare_audit_row(row)

    assert prepared["failure_summary"] == "The action could not be completed."
    assert "failure_reason" not in prepared
    assert "failure_code" not in prepared


def test_detail_redacts_sensitive_before_and_after_values_recursively() -> None:
    row = {
        **_list_row(),
        "old_values": {"name": "Old", "api_token": "abc"},
        "new_values": {"nested": {"password": "xyz"}, "name": "New"},
    }

    prepared = _prepare_audit_row(row, detail=True)

    assert prepared["old_values"] == {"name": "Old", "api_token": "[REDACTED]"}
    assert prepared["new_values"] == {
        "nested": {"password": "[REDACTED]"},
        "name": "New",
    }


@patch("backend.services.audit_service.fetch_audit_log_filter_options", return_value=[])
@patch("backend.services.audit_service.fetch_audit_logs_summary")
@patch("backend.services.audit_service.fetch_audit_logs")
def test_admin_listing_enforces_success_for_items_counts_and_pagination(
    fetch_logs: Mock,
    fetch_summary: Mock,
    _fetch_options: Mock,
) -> None:
    fetch_logs.return_value = ([_list_row()], 11)
    fetch_summary.return_value = {
        "total_events": 11,
        "successful_events": 0,
        "unique_users": 2,
    }

    result = get_audit_logs(
        Mock(), tenant_id="4", category="BUSINESS", search=" admin ", page=2, limit=10
    )

    assert fetch_logs.call_args.kwargs["event_status"] == "SUCCESS"
    assert fetch_summary.call_args.kwargs["event_status"] == "SUCCESS"
    assert fetch_logs.call_args.kwargs["search"] == "admin"
    assert fetch_summary.call_args.kwargs["search"] == "admin"
    assert fetch_logs.call_args.kwargs["category"] == "BUSINESS"
    assert "category" not in fetch_summary.call_args.kwargs
    assert result.pagination.total == 11
    assert result.pagination.page == 2
    assert result.pagination.total_pages == 2
    assert result.items[0].failure_summary is None


def test_activity_category_filters_are_mutually_exclusive() -> None:
    access_sql, _ = _build_audit_log_filters(tenant_id="4", category="ACCESS")
    business_sql, _ = _build_audit_log_filters(tenant_id="4", category="BUSINESS")
    admin_sql, _ = _build_audit_log_filters(tenant_id="4", category="ADMIN")

    assert "user.login" in access_sql and "user.logout" in access_sql
    assert "'BOOKING', 'GUEST'" in business_sql
    assert "NOT IN ('user.login', 'user.logout')" in admin_sql
    assert "NOT IN ('BOOKING', 'GUEST')" in admin_sql


def test_identifier_values_are_replaced_with_display_names_and_keep_fallbacks() -> None:
    values = {"building_id": "93", "floor_id": "999", "amenity_ids": ["4", "8"]}
    display_names = {
        "building_id": {"93": "Pranava One"},
        "floor_id": {},
        "amenity_ids": {"4": "Monitor"},
    }

    assert _apply_audit_display_names(values, display_names) == {
        "building_id": "Pranava One",
        "floor_id": "999",
        "amenity_ids": ["Monitor", "8"],
    }
