"""Adversarial tests for tenant configuration updates
(``POST /business-rules`` -> backend/services/business_rule_service.py
``update_business_rules``).

These rules change booking windows, layout scheduling, blocking windows
and chatbot access for every user of a tenant, so batch consistency and
traceability are tested here. ``xfail(strict=True)`` marks open findings.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.services import business_rule_service


class RecordingCursor:
    def __init__(self, conn: RecordingConnection) -> None:
        self.conn = conn
        self.rowcount = 1

    def __enter__(self) -> RecordingCursor:
        return self

    def __exit__(self, *exc: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.conn.statements.append(" ".join(str(sql).split()))

    def fetchone(self) -> None:
        return None

    def fetchall(self) -> list:
        return []


class RecordingConnection:
    def __init__(self) -> None:
        self.statements: list[str] = []
        self.commits = 0
        self.rollbacks = 0

    def cursor(self, *args: Any, **kwargs: Any) -> RecordingCursor:
        return RecordingCursor(self)

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


@pytest.fixture
def conn():
    connection = RecordingConnection()
    with (
        patch.object(business_rule_service, "upsert_tenant_business_rule"),
        patch.object(business_rule_service, "get_all_business_rules", return_value={}),
    ):
        yield connection


def test_unknown_setting_id_is_rejected_with_400(conn: RecordingConnection) -> None:
    with pytest.raises(HTTPException) as caught:
        business_rule_service.update_business_rules(
            conn, tenant_id="3", updates=[("no.such.rule", 1)], updated_by_user_id="1"
        )
    assert caught.value.status_code == 400
    assert caught.value.detail["code"] == "unknown_business_rule_id"
    assert conn.commits == 0


def test_invalid_value_is_rejected_before_any_write(conn: RecordingConnection) -> None:
    with pytest.raises(HTTPException) as caught:
        business_rule_service.update_business_rules(
            conn, tenant_id="3", updates=[("booking_policy.employee_max_advance_days", 0)], updated_by_user_id="1"
        )
    assert caught.value.status_code == 400
    business_rule_service.upsert_tenant_business_rule.assert_not_called()
    assert conn.commits == 0


def test_valid_single_update_is_written_and_committed(conn: RecordingConnection) -> None:
    business_rule_service.update_business_rules(
        conn, tenant_id="3", updates=[("booking_policy.employee_max_advance_days", 14)], updated_by_user_id="1"
    )
    business_rule_service.upsert_tenant_business_rule.assert_called_once()
    assert conn.commits == 1


@pytest.mark.xfail(strict=True, reason="QA-DAT-03: a batch is applied item by item; a later invalid item leaves earlier items committed")
def test_a_batch_with_one_invalid_item_changes_nothing(conn: RecordingConnection) -> None:
    with pytest.raises(HTTPException):
        business_rule_service.update_business_rules(
            conn,
            tenant_id="3",
            updates=[("booking_policy.employee_max_advance_days", 14), ("no.such.rule", 1)],
            updated_by_user_id="1",
        )
    assert conn.commits == 0


@pytest.mark.xfail(strict=True, reason="QA-SEC-09: configuration changes are not written to audit_logs")
def test_configuration_change_is_audited(conn: RecordingConnection) -> None:
    business_rule_service.update_business_rules(
        conn, tenant_id="3", updates=[("booking_policy.employee_max_advance_days", 14)], updated_by_user_id="1"
    )
    assert any("audit_logs" in sql for sql in conn.statements)
