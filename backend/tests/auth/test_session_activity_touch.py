from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import psycopg2
from psycopg2.extensions import TRANSACTION_STATUS_IDLE, TRANSACTION_STATUS_INTRANS

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.deps import SESSION_ACTIVITY_TOUCH_INTERVAL_SECONDS, get_auth_context

VALID_CLAIMS = {
    "user_id": "7",
    "sub": "7",
    "tenant_id": "1",
    "session_id": "session-abc",
    "exp": 9999999999,
}


class FakeConnection:
    def __init__(self, *, transaction_status: int = TRANSACTION_STATUS_IDLE) -> None:
        self.commits = 0
        self.rollbacks = 0
        self._transaction_status = transaction_status

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1

    def get_transaction_status(self) -> int:
        return self._transaction_status


def _fake_request() -> MagicMock:
    request = MagicMock()
    request.cookies = {"access_token": "valid-token"}
    request.headers = {}
    return request


class SessionActivityTouchTests(unittest.TestCase):
    """A request under a still-valid access token must extend the session's
    expiry (throttled), not just leave user_sessions untouched until the
    access token happens to expire -- otherwise an actively-used session
    would only ever slide forward in ~jwt_access_token_ttl-sized jumps."""

    def test_active_session_gets_touched_and_committed(self) -> None:
        conn = FakeConnection()

        with (
            patch("backend.api.deps.decode_token", return_value=VALID_CLAIMS),
            patch("backend.api.deps.is_microsoft_token", return_value=False),
            patch(
                "backend.api.deps.fetch_active_session",
                return_value={"session_id": "session-abc", "revoked_at": None},
            ),
            patch("backend.api.deps.extend_session_activity") as mock_touch,
        ):
            get_auth_context(_fake_request(), MagicMock(), conn)

        mock_touch.assert_called_once()
        kwargs = mock_touch.call_args.kwargs
        self.assertEqual(kwargs["tenant_id"], "1")
        self.assertEqual(kwargs["user_id"], "7")
        self.assertEqual(kwargs["session_id"], "session-abc")
        self.assertEqual(kwargs["min_touch_interval_seconds"], SESSION_ACTIVITY_TOUCH_INTERVAL_SECONDS)
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_touch_failure_is_swallowed_and_does_not_fail_the_request(self) -> None:
        """This is a best-effort extension riding along with the real
        request -- a DB hiccup here must not turn an otherwise-successful
        request into a 500."""
        conn = FakeConnection(transaction_status=TRANSACTION_STATUS_INTRANS)

        with (
            patch("backend.api.deps.decode_token", return_value=VALID_CLAIMS),
            patch("backend.api.deps.is_microsoft_token", return_value=False),
            patch(
                "backend.api.deps.fetch_active_session",
                return_value={"session_id": "session-abc", "revoked_at": None},
            ),
            patch(
                "backend.api.deps.extend_session_activity",
                side_effect=psycopg2.Error("connection hiccup"),
            ),
        ):
            result = get_auth_context(_fake_request(), MagicMock(), conn)

        self.assertEqual(result["claims"]["session_id"], "session-abc")
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)


if __name__ == "__main__":
    unittest.main()
