from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.repositories.guest_repository import search_guests


class FakeCursor:
    def __init__(self, *, fetchall_result=None) -> None:
        self.executions: list[tuple[str, Any]] = []
        self._fetchall_result = fetchall_result or []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchall(self):
        return self._fetchall_result


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


class SearchGuestsRankingTests(unittest.TestCase):
    """Same match_position ranking as search_users/search_team_members:
    a word matching earlier in the name (e.g. the first name) ranks the
    whole result earlier, instead of the previous 'does the full string
    start with this' check, which only worked when the match happened to
    land on the first word anyway and gave up entirely for a match
    elsewhere in the name (e.g. searching a last name)."""

    def test_orders_by_earliest_matching_word_position(self) -> None:
        cursor = FakeCursor()
        search_guests(
            FakeConnection(cursor), tenant_id="1", search_text="K", limit=20,
        )

        sql, params = cursor.executions[0]
        self.assertIn("WITH ORDINALITY", sql)
        self.assertIn("word LIKE %s || '%%'", sql)
        self.assertIn("COALESCE(mp.match_position, 999)", sql)
        self.assertIn("mp.match_position IS NOT NULL", sql)
        # LATERAL's search_text param comes first (earliest in the SQL
        # text), then tenant_id, then the phone/email WHERE clauses.
        self.assertEqual(params, ("k", "1", "k", "k", 20))

    def test_active_only_by_default(self) -> None:
        cursor = FakeCursor()
        search_guests(FakeConnection(cursor), tenant_id="1", search_text="k")

        sql, _ = cursor.executions[0]
        self.assertIn("g.status = 'ACTIVE'", sql)

    def test_include_inactive_drops_status_filter(self) -> None:
        cursor = FakeCursor()
        search_guests(
            FakeConnection(cursor),
            tenant_id="1",
            search_text="k",
            include_inactive=True,
        )

        sql, _ = cursor.executions[0]
        self.assertNotIn("g.status = 'ACTIVE'", sql)


if __name__ == "__main__":
    unittest.main()
