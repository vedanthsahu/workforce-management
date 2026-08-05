from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from psycopg2.extensions import TRANSACTION_STATUS_IDLE

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.services.auth_service import refresh_auth_tokens

REFRESH_TOKEN = "1.7.session-abc.some-opaque-secret"


class FakeConnection:
    closed = False

    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1

    def get_transaction_status(self) -> int:
        return TRANSACTION_STATUS_IDLE


class RefreshTokenReuseDetectionTests(unittest.TestCase):
    """A refresh token that doesn't match its session's current stored hash
    is either bogus or a replay of a token that was already rotated past.
    If the session is still active, that's reuse -- the stolen/superseded
    token proves the session leaked, so it must be killed immediately
    rather than just rejecting this one request."""

    def test_reused_stale_token_revokes_the_session(self) -> None:
        conn = FakeConnection()

        with (
            patch(
                "backend.services.auth_service.fetch_session_by_refresh_token",
                return_value=None,
            ),
            patch(
                "backend.services.auth_service.fetch_active_session",
                return_value={"session_id": "session-abc", "revoked_at": None},
            ),
            patch("backend.services.auth_service.revoke_user_session") as mock_revoke,
            patch("backend.services.auth_service.record_auth_event") as mock_record,
        ):
            with self.assertRaises(HTTPException) as context:
                refresh_auth_tokens(conn, REFRESH_TOKEN)

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail["code"], "invalid_refresh_token")

        mock_revoke.assert_called_once_with(
            conn, tenant_id="1", user_id="7", session_id="session-abc",
        )
        mock_record.assert_called_once()
        self.assertEqual(
            mock_record.call_args.kwargs["event_type"], "REFRESH_TOKEN_REUSE_DETECTED",
        )
        self.assertEqual(conn.commits, 1)

    def test_genuinely_unknown_token_does_not_revoke_anything(self) -> None:
        """No session exists at all for this session_id -- nothing to
        protect, so no revocation should be attempted."""
        conn = FakeConnection()

        with (
            patch(
                "backend.services.auth_service.fetch_session_by_refresh_token",
                return_value=None,
            ),
            patch(
                "backend.services.auth_service.fetch_active_session",
                return_value=None,
            ),
            patch("backend.services.auth_service.revoke_user_session") as mock_revoke,
            patch("backend.services.auth_service.record_auth_event") as mock_record,
        ):
            with self.assertRaises(HTTPException) as context:
                refresh_auth_tokens(conn, REFRESH_TOKEN)

        self.assertEqual(context.exception.status_code, 401)
        mock_revoke.assert_not_called()
        mock_record.assert_not_called()
        self.assertEqual(conn.commits, 0)

    def test_valid_matching_token_still_rotates_normally(self) -> None:
        """Regression guard: the new reuse-detection branch must not run
        (or interfere) when the presented token actually matches."""
        conn = FakeConnection()
        future_expiry = datetime.now(timezone.utc) + timedelta(days=1)

        with (
            patch(
                "backend.services.auth_service.fetch_session_by_refresh_token",
                return_value={
                    "is_revoked": False,
                    "expires_at": future_expiry,
                },
            ),
            patch("backend.services.auth_service.fetch_active_session") as mock_active,
            patch("backend.services.auth_service.revoke_user_session") as mock_revoke,
            patch(
                "backend.services.auth_service.fetch_user_by_id",
                return_value={"status": "ACTIVE", "user_id": "7", "email": "a@b.com"},
            ),
            patch(
                "backend.services.auth_service.rotate_refresh_token",
                return_value={"session_id": "session-abc"},
            ),
            patch("backend.services.auth_service.record_auth_event"),
            patch("backend.services.auth_service._build_access_token_for_user", return_value="jwt"),
        ):
            tokens = refresh_auth_tokens(conn, REFRESH_TOKEN)

        self.assertEqual(tokens.access_token, "jwt")
        mock_active.assert_not_called()
        mock_revoke.assert_not_called()


if __name__ == "__main__":
    unittest.main()
