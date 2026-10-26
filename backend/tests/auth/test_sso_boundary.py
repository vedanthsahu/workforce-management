"""Boundary tests for Microsoft sign-in and the SSO-gateway sign-in
(backend/api/routes/sso.py, backend/core/sso.py).

No network and no database: Microsoft and Graph calls are mocked, and
``get_db`` is replaced. Each failing sign-in must redirect to the login
page with an error code and must not set a session cookie.
``xfail(strict=True)`` marks an open finding.
"""

from __future__ import annotations

import sys
import time
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.security import ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME
from backend.core.sso import GraphAPIError, SSOError, decode_gateway_token
from backend.db.connection import get_db
from backend.main import app


def _graph_token(**claims: Any) -> str:
    body = {"tid": "azure-tenant-1", "oid": "object-1", "exp": int(time.time()) + 600}
    body.update(claims)
    return jwt.encode(body, "graph-signing-key-" + "x" * 32, algorithm="HS256")


def _gateway_token(secret: str = "gateway-secret-" + "y" * 32, **claims: Any) -> str:
    body = {"accessToken": _graph_token(), "exp": int(time.time()) + 600}
    body.update(claims)
    return jwt.encode(body, secret, algorithm="HS256")


class _SsoTestCase(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_db] = lambda: object()
        self.client = TestClient(app, raise_server_exceptions=False, follow_redirects=False)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def assert_login_error(self, response: Any, code: str) -> None:
        self.assertEqual(response.status_code, 302, response.text)
        location = urlparse(response.headers["location"])
        self.assertTrue(location.path.endswith("/login"))
        self.assertEqual(parse_qs(location.query).get("error"), [code])
        cookies = " ".join(response.headers.get_list("set-cookie"))
        self.assertNotIn(f"{ACCESS_TOKEN_COOKIE_NAME}=ey", cookies)
        self.assertNotIn(f"{REFRESH_TOKEN_COOKIE_NAME}=", cookies.replace(f'{REFRESH_TOKEN_COOKIE_NAME}=""', ""))


class MicrosoftCallbackTests(_SsoTestCase):
    def test_provider_error_is_shown_on_the_login_page(self) -> None:
        response = self.client.get("/auth/callback", params={"error": "access_denied", "error_description": "user cancelled"})
        self.assert_login_error(response, "microsoft_auth_error")

    def test_missing_code_is_rejected(self) -> None:
        response = self.client.get("/auth/callback", params={"state": "s"})
        self.assert_login_error(response, "missing_code")

    def test_missing_state_is_rejected(self) -> None:
        response = self.client.get("/auth/callback", params={"code": "c"})
        self.assert_login_error(response, "missing_state")

    def test_state_that_does_not_match_the_cookie_is_rejected(self) -> None:
        self.client.cookies.set("oauth_state", "expected-state")
        with patch("backend.api.routes.sso.exchange_code_for_token") as exchange:
            response = self.client.get("/auth/callback", params={"code": "c", "state": "attacker-state"})
        self.assert_login_error(response, "invalid_state")
        exchange.assert_not_called()

    def test_state_without_a_cookie_is_rejected(self) -> None:
        response = self.client.get("/auth/callback", params={"code": "c", "state": "any"})
        self.assert_login_error(response, "invalid_state")

    def test_invalid_id_token_does_not_create_a_session(self) -> None:
        self.client.cookies.set("oauth_state", "st")
        with (
            patch("backend.api.routes.sso.exchange_code_for_token", return_value={"id_token": "bad"}),
            patch("backend.api.routes.sso.verify_id_token",
                  side_effect=SSOError(status_code=401, code="invalid_id_token", message="bad signature")),
            patch("backend.api.routes.sso.issue_tokens_for_user") as issue,
        ):
            response = self.client.get("/auth/callback", params={"code": "c", "state": "st"})
        self.assertEqual(response.status_code, 302)
        self.assertIn("error=", response.headers["location"])
        issue.assert_not_called()

    def test_id_token_without_tenant_claim_is_rejected(self) -> None:
        self.client.cookies.set("oauth_state", "st")
        with (
            patch("backend.api.routes.sso.exchange_code_for_token", return_value={"id_token": "t"}),
            patch("backend.api.routes.sso.verify_id_token", return_value={"oid": "o"}),
            patch("backend.api.routes.sso.issue_tokens_for_user") as issue,
        ):
            response = self.client.get("/auth/callback", params={"code": "c", "state": "st"})
        self.assert_login_error(response, "missing_tenant_claim")
        issue.assert_not_called()

    def test_unknown_tenant_is_rejected(self) -> None:
        self.client.cookies.set("oauth_state", "st")
        with (
            patch("backend.api.routes.sso.exchange_code_for_token", return_value={"id_token": "t"}),
            patch("backend.api.routes.sso.verify_id_token", return_value={"oid": "o", "tid": "unknown"}),
            patch("backend.api.routes.sso.fetch_active_tenant_for_login", return_value=None),
            patch("backend.api.routes.sso.issue_tokens_for_user") as issue,
        ):
            response = self.client.get("/auth/callback", params={"code": "c", "state": "st"})
        self.assert_login_error(response, "unknown_tenant")
        issue.assert_not_called()

    def test_internal_error_text_is_not_sent_to_the_browser(self) -> None:
        self.client.cookies.set("oauth_state", "st")
        with (
            patch("backend.api.routes.sso.exchange_code_for_token", return_value={"id_token": "t"}),
            patch("backend.api.routes.sso.verify_id_token", return_value={"oid": "o", "tid": "t1"}),
            patch("backend.api.routes.sso.fetch_active_tenant_for_login",
                  side_effect=RuntimeError("connection to server at 10.0.0.5 failed")),
        ):
            response = self.client.get("/auth/callback", params={"code": "c", "state": "st"})
        self.assertEqual(response.status_code, 302)
        self.assertNotIn("10.0.0.5", response.headers["location"])
        self.assertNotIn("10.0.0.5", response.text)


class GatewayTokenTests(unittest.TestCase):
    def test_missing_token_is_rejected(self) -> None:
        with self.assertRaises(SSOError) as caught:
            decode_gateway_token("")
        self.assertEqual(caught.exception.code, "missing_gateway_token")

    def test_unparseable_token_is_rejected(self) -> None:
        with self.assertRaises(SSOError) as caught:
            decode_gateway_token("not.a.jwt")
        self.assertEqual(caught.exception.code, "invalid_gateway_token")

    def test_expired_wrapper_is_rejected(self) -> None:
        with self.assertRaises(SSOError) as caught:
            decode_gateway_token(_gateway_token(exp=int(time.time()) - 10))
        self.assertEqual(caught.exception.code, "expired_gateway_token")

    def test_wrapper_without_graph_token_is_rejected(self) -> None:
        with self.assertRaises(SSOError) as caught:
            decode_gateway_token(_gateway_token(accessToken=""))
        self.assertEqual(caught.exception.code, "missing_graph_access_token")

    def test_graph_token_without_tenant_is_rejected(self) -> None:
        with self.assertRaises(SSOError) as caught:
            decode_gateway_token(_gateway_token(accessToken=_graph_token(tid="")))
        self.assertEqual(caught.exception.code, "missing_tenant_claim")

    @pytest.mark.xfail(strict=True, reason="QA-SEC-04: the gateway wrapper token's signature is never verified")
    def test_wrapper_signed_by_an_unknown_party_is_rejected(self) -> None:
        forged = _gateway_token(secret="attacker-chosen-secret-" + "z" * 32)
        with self.assertRaises(SSOError):
            decode_gateway_token(forged)


class GatewayCallbackTests(_SsoTestCase):
    def test_graph_rejecting_the_embedded_token_creates_no_session(self) -> None:
        with (
            patch("backend.api.routes.sso.fetch_graph_me",
                  side_effect=GraphAPIError(status_code=401, code="graph_unauthorized", message="InvalidAuthenticationToken")),
            patch("backend.api.routes.sso.issue_tokens_for_user") as issue,
        ):
            response = self.client.get("/auth/sso-gateway-callback", params={"token": _gateway_token()})
        self.assertEqual(response.status_code, 302)
        self.assertIn("error=", response.headers["location"])
        issue.assert_not_called()

    def test_missing_gateway_token_creates_no_session(self) -> None:
        with patch("backend.api.routes.sso.issue_tokens_for_user") as issue:
            response = self.client.get("/auth/sso-gateway-callback")
        self.assert_login_error(response, "missing_gateway_token")
        issue.assert_not_called()


if __name__ == "__main__":
    unittest.main()
