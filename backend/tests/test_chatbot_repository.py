"""Non-mocked tests for chatbot_repository.py -- run the real functions
against a fake cursor recording actual cursor.execute() calls, instead of
mocking them away. This is the exact file the UUID-adaptation bug lived in
(commit 53bc944, "cast UUID params to str() so psycopg2 can adapt them"):
a fully-mocked test suite would never notice session_id being passed as a
raw uuid.UUID instead of str() again."""

from __future__ import annotations

import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import unittest

from psycopg2.extras import RealDictCursor

from backend.repositories.chatbot_repository import (
    fetch_chatbot_session,
    insert_chatbot_session,
)

SESSION_ID = uuid.uuid4()
ROW = {
    "id": SESSION_ID, "tenant_id": 1, "user_name": "Jane",
    "state": "INITIATED", "current_node": "MAIN_MENU",
    "current_menu_id": None, "context_data": {},
    "created_at": datetime.now(UTC), "updated_at": datetime.now(UTC),
}


class FakeCursor:
    def __init__(self, row: dict[str, Any] | None = None) -> None:
        self.executions: list[tuple[str, Any]] = []
        self._row = row

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, *exc: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchone(self) -> dict[str, Any] | None:
        return self._row


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor
        self.commits = 0
        self.cursor_factories: list[Any] = []

    def cursor(self, **kwargs: Any) -> FakeCursor:
        self.cursor_factories.append(kwargs.get("cursor_factory"))
        return self.cursor_instance

    def commit(self) -> None:
        self.commits += 1


class ChatbotRepositoryTests(unittest.TestCase):
    def test_insert_session_passes_session_id_as_str_not_raw_uuid(self) -> None:
        """psycopg2 cannot adapt a bare uuid.UUID without
        psycopg2.extras.register_uuid(), which this codebase never calls --
        the id must cross the query boundary as str()."""
        cursor = FakeCursor(row=dict(ROW))
        conn = FakeConnection(cursor)

        insert_chatbot_session(
            conn, session_id=SESSION_ID, tenant_id=1, user_name="Jane",
            state="INITIATED", current_node="MAIN_MENU",
            created_at=ROW["created_at"], updated_at=ROW["updated_at"],
            context_data={},
        )

        sql, params = cursor.executions[0]
        self.assertIn("INSERT INTO chatbot_sessions", sql)
        # expires_at is gone -- 8 columns, 8 placeholders, 8 params.
        self.assertEqual(sql.count("%s"), 8)
        self.assertEqual(len(params), 8)
        self.assertIsInstance(params[0], str)
        self.assertEqual(params[0], str(SESSION_ID))
        self.assertEqual(conn.commits, 1)
        self.assertIs(conn.cursor_factories[0], RealDictCursor)

    def test_fetch_session_passes_session_id_as_str_not_raw_uuid(self) -> None:
        cursor = FakeCursor(row=dict(ROW))
        conn = FakeConnection(cursor)

        fetch_chatbot_session(conn, session_id=SESSION_ID)

        sql, params = cursor.executions[0]
        self.assertIn("SELECT", sql)
        self.assertIn("FROM chatbot_sessions", sql)
        self.assertNotIn("expires_at", sql)
        self.assertEqual(params, (str(SESSION_ID),))


if __name__ == "__main__":
    unittest.main()
