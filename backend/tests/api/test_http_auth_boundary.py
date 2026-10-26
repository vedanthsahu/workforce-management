"""HTTP-level tests of the authentication and permission boundary.

These tests send real HTTP requests through the FastAPI application
(routing, dependency resolution, exception handlers) with FastAPI's
TestClient. No database is used: ``get_db`` is replaced by a connection
object that fails the test if any code reaches the database, which proves
that each rejection happens at the boundary, before any business logic.

Tests marked ``xfail(strict=True)`` describe the *expected* secure
behaviour for an open finding. They fail today by design and will turn
into unexpected passes (a red build) when the finding is fixed, so the
marker can then be removed.
"""

from __future__ import annotations

import re
import sys
import time
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

import jwt
import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.deps import get_current_user
from backend.core.config import get_settings
from backend.db.connection import get_db
from backend.main import app

PUBLIC_ROUTES = {
    ("GET", "/"),
    ("GET", "/health"),
    ("GET", "/auth/login"),
    ("GET", "/auth/callback"),
    ("GET", "/auth/sso-gateway-callback"),
    ("POST", "/auth/refresh"),
    ("POST", "/auth/logout"),
}


class _NoDatabase:
    """Stands in for a psycopg2 connection. Any use fails the test."""

    def __getattr__(self, name: str) -> Any:
        raise AssertionError(f"database was used before the auth boundary rejected the request ({name})")


def _api_routes() -> list[tuple[str, str, APIRoute]]:
    out = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            for method in sorted(route.methods):
                out.append((method, route.path, route))
    return out


def _concrete(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "1", path)


def _gate_permissions(route: APIRoute) -> tuple[str, tuple[str, ...]] | None:
    """Return ('strict'|'any', permissions) for a permission-gated route."""
    for dep in route.dependant.dependencies:
        name = getattr(dep.call, "__qualname__", "")
        cells = [c.cell_contents for c in (getattr(dep.call, "__closure__", None) or [])]
        if name.startswith("require_permission."):
            return "strict", tuple(c for c in cells if isinstance(c, str))
        if name.startswith("require_any_permission."):
            perms = next(c for c in cells if isinstance(c, tuple))
            return "any", perms
    return None


def _user(role: str, permissions: list[str] | None = None, user_id: str = "10") -> dict[str, Any]:
    return {
        "user_id": user_id,
        "tenant_id": "3",
        "email": "tester@example.com",
        "full_name": "Test User",
        "role": role,
        "role_name": role,
        "status": "ACTIVE",
        "permissions": permissions or [],
    }


def _token(**overrides: Any) -> str:
    now = int(time.time())
    payload = {"user_id": "10", "sub": "10", "tenant_id": "3", "session_id": "s-1",
               "iat": now, "exp": now + 600}
    payload.update(overrides)
    settings = get_settings()
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


class _AppTestCase(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_db] = lambda: _NoDatabase()
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def as_user(self, user: dict[str, Any]) -> None:
        app.dependency_overrides[get_current_user] = lambda: user


class RouteInventoryTests(unittest.TestCase):
    def test_inventory_size_matches_documentation(self) -> None:
        # docs/api/endpoint-inventory.md documents exactly this set. A change
        # here means the inventory and the traceability matrix need updating.
        self.assertEqual(len(_api_routes()), 100)

    def test_every_non_public_route_requires_authentication(self) -> None:
        for method, path, route in _api_routes():
            if (method, path) in PUBLIC_ROUTES:
                continue
            with self.subTest(route=f"{method} {path}"):
                names = {getattr(d.call, "__name__", "") for d in route.dependant.dependencies}
                qual = {getattr(d.call, "__qualname__", "") for d in route.dependant.dependencies}
                self.assertTrue(
                    "get_current_user" in names or any(q.startswith(("require_permission", "require_any_permission")) for q in qual),
                    "route has no authentication dependency",
                )


class UnauthenticatedRequestTests(_AppTestCase):
    def test_every_protected_route_rejects_a_request_without_credentials(self) -> None:
        for method, path, _ in _api_routes():
            if (method, path) in PUBLIC_ROUTES:
                continue
            with self.subTest(route=f"{method} {path}"):
                response = self.client.request(method, _concrete(path), json={})
                self.assertEqual(response.status_code, 401, response.text)
                self.assertEqual(response.json()["error"]["code"], "missing_access_token")

    def test_authentication_is_checked_before_body_validation(self) -> None:
        # An invalid body must not leak a 422 schema description to an
        # anonymous caller.
        response = self.client.post("/bookings", json={"seat_id": "not-a-number"})
        self.assertEqual(response.status_code, 401)


class InvalidCredentialTests(_AppTestCase):
    def _me(self, token: str) -> Any:
        return self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    def test_garbage_token_is_rejected(self) -> None:
        response = self._me("not-a-jwt")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "invalid_access_token")

    def test_token_signed_with_another_secret_is_rejected(self) -> None:
        forged = jwt.encode({"user_id": "1", "tenant_id": "3", "iat": 1, "exp": 4102444800},
                            "attacker-secret-" + "x" * 32, algorithm="HS256")
        response = self._me(forged)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "invalid_access_token")

    def test_unsigned_alg_none_token_is_rejected(self) -> None:
        unsigned = jwt.encode({"user_id": "1", "tenant_id": "3", "exp": 4102444800}, key=None, algorithm="none")
        response = self._me(unsigned)
        self.assertEqual(response.status_code, 401)

    def test_expired_token_without_refresh_cookie_is_rejected(self) -> None:
        response = self._me(_token(iat=1000, exp=2000))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "missing_refresh_token")

    def test_token_without_tenant_claim_is_rejected(self) -> None:
        response = self._me(_token(tenant_id=""))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "invalid_access_token")

    def test_microsoft_issued_token_is_rejected(self) -> None:
        ms = jwt.encode({"iss": "https://login.microsoftonline.com/abc/v2.0", "aud": "00000003-0000-0000-c000-000000000000",
                         "tid": "abc", "oid": "def", "exp": 4102444800}, "k" * 32, algorithm="HS256")
        response = self._me(ms)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "microsoft_token_not_accepted")

    def test_revoked_session_is_rejected(self) -> None:
        app.dependency_overrides[get_db] = lambda: object()
        with patch("backend.api.deps.fetch_active_session", return_value=None):
            response = self._me(_token())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "session_revoked")

    def test_inactive_user_is_rejected_even_with_a_valid_session(self) -> None:
        class _Conn:
            def commit(self) -> None: ...
            def rollback(self) -> None: ...
            def get_transaction_status(self) -> int: return 0
        app.dependency_overrides[get_db] = lambda: _Conn()
        inactive = {**_user("EMPLOYEE"), "status": "INACTIVE"}
        with (
            patch("backend.api.deps.fetch_active_session", return_value={"session_id": "s-1"}),
            patch("backend.api.deps.extend_session_activity"),
            patch("backend.api.deps.fetch_user_by_id", return_value=inactive),
            patch("backend.api.deps.attach_permissions_to_user", side_effect=lambda conn, u: u),
        ):
            response = self._me(_token())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "inactive_user")

    def test_deleted_user_is_rejected(self) -> None:
        class _Conn:
            def commit(self) -> None: ...
            def rollback(self) -> None: ...
            def get_transaction_status(self) -> int: return 0
        app.dependency_overrides[get_db] = lambda: _Conn()
        with (
            patch("backend.api.deps.fetch_active_session", return_value={"session_id": "s-1"}),
            patch("backend.api.deps.extend_session_activity"),
            patch("backend.api.deps.fetch_user_by_id", return_value=None),
        ):
            response = self._me(_token())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "user_not_found")


class PermissionGateTests(_AppTestCase):
    def _gated(self) -> list[tuple[str, str, str, tuple[str, ...]]]:
        out = []
        for method, path, route in _api_routes():
            gate = _gate_permissions(route)
            if gate:
                out.append((method, path, gate[0], gate[1]))
        return out

    def test_there_are_gated_routes_of_both_kinds(self) -> None:
        kinds = {kind for *_, kind, _ in self._gated()}
        self.assertEqual(kinds, {"strict", "any"})

    def test_employee_without_permissions_is_forbidden_on_every_gated_route(self) -> None:
        self.as_user(_user("EMPLOYEE"))
        for method, path, _, _ in self._gated():
            with self.subTest(route=f"{method} {path}"):
                response = self.client.request(method, _concrete(path), json={})
                self.assertEqual(response.status_code, 403, response.text)
                self.assertEqual(response.json()["error"]["code"], "insufficient_permissions")

    def test_facilitator_and_front_office_without_permissions_are_forbidden(self) -> None:
        for role in ("FACILITATOR", "FRONT_OFFICE", "MANAGER"):
            self.as_user(_user(role))
            for method, path, _, _ in self._gated():
                with self.subTest(role=role, route=f"{method} {path}"):
                    response = self.client.request(method, _concrete(path), json={})
                    self.assertEqual(response.status_code, 403)

    def test_tenant_admin_without_permission_rows_is_forbidden_on_strict_routes(self) -> None:
        # require_permission has no role bypass. A TENANT_ADMIN in a tenant
        # whose roles/role_permissions rows were never seeded is locked out
        # of every strict route (blocked-seat writes, layouts, guest visits,
        # user access) while still passing every require_any_permission
        # route. Finding QA-SEC-07 (inconsistent admin bypass).
        self.as_user(_user("TENANT_ADMIN"))
        strict = [(m, p) for m, p, kind, _ in self._gated() if kind == "strict"]
        self.assertGreater(len(strict), 0)
        for method, path in strict:
            with self.subTest(route=f"{method} {path}"):
                response = self.client.request(method, _concrete(path), json={})
                self.assertEqual(response.status_code, 403)

    def test_wrong_permission_does_not_open_a_strict_route(self) -> None:
        self.as_user(_user("EMPLOYEE", ["seat:view_all", "booking:view_own"]))
        response = self.client.post("/admin/blocked-seats", json={})
        self.assertEqual(response.status_code, 403)


class RoleBypassUnitTests(unittest.TestCase):
    """The admin bypass lives inside the dependency closure; test it directly."""

    def test_require_any_permission_admits_tenant_admin_without_permissions(self) -> None:
        from backend.api.deps import require_any_permission
        dependency = require_any_permission(["admin_dashboard:view"])
        user = _user("TENANT_ADMIN")
        self.assertIs(dependency(current_user=user), user)

    def test_require_any_permission_admits_any_listed_permission(self) -> None:
        from backend.api.deps import require_any_permission
        dependency = require_any_permission(["a:x", "b:y"])
        user = _user("FRONT_OFFICE", ["b:y"])
        self.assertIs(dependency(current_user=user), user)

    def test_require_any_permission_rejects_empty_configuration(self) -> None:
        from backend.api.deps import require_any_permission
        with self.assertRaises(ValueError):
            require_any_permission([])

    def test_require_permission_has_no_role_bypass(self) -> None:
        from fastapi import HTTPException

        from backend.api.deps import require_permission
        dependency = require_permission("seat:block")
        with self.assertRaises(HTTPException) as caught:
            dependency(current_user=_user("TENANT_ADMIN"))
        self.assertEqual(caught.exception.status_code, 403)


class CrossSiteRequestTests(_AppTestCase):
    """Auth cookies are SameSite=None (template.yaml AUTH_COOKIE_SAMESITE),
    so a browser attaches them to cross-site requests. Routes that accept a
    CORS 'simple request' (no JSON body) need an Origin check."""

    @pytest.mark.xfail(strict=True, reason="QA-SEC-02: no Origin/CSRF check on cookie-authenticated state changes")
    def test_cross_origin_logout_is_refused(self) -> None:
        response = self.client.post("/auth/logout", headers={"Origin": "https://attacker.example"})
        self.assertEqual(response.status_code, 403)

    def test_json_body_routes_refuse_a_form_encoded_cross_site_body(self) -> None:
        # A cross-site HTML form can only send text/plain, urlencoded or
        # multipart bodies. FastAPI does not parse those as JSON, so JSON
        # routes are not reachable by a simple cross-site form.
        self.as_user(_user("EMPLOYEE"))
        with patch("backend.api.routes.bookings.book_seat") as book_seat:
            response = self.client.post(
                "/bookings",
                content='{"site_id":1,"building_id":1,"floor_id":1,"seat_id":1,"booking_date":"2030-01-01"}',
                headers={"Content-Type": "text/plain"},
            )
        self.assertEqual(response.status_code, 422)
        book_seat.assert_not_called()


class ChatbotPolicyTests(_AppTestCase):
    """The admin 'employee chatbot access' setting (GET/POST business-rules)
    controls only whether the frontend renders the chat panel."""

    def _patch_policy_everywhere(self, value: bool):
        patches = []
        for module in list(sys.modules.values()):
            if module and getattr(module, "__name__", "").startswith("backend.") and hasattr(module, "resolve_chatbot_employee_access"):
                patches.append(patch.object(module, "resolve_chatbot_employee_access", return_value=value))
        return patches

    @pytest.mark.xfail(strict=True, reason="QA-SEC-03: /api/chat/* ignores the chatbot access policy")
    def test_employee_cannot_start_a_chat_when_the_policy_is_off(self) -> None:
        self.as_user(_user("EMPLOYEE"))
        app.dependency_overrides[get_db] = lambda: object()
        patches = self._patch_policy_everywhere(False)
        for p in patches:
            p.start()
        try:
            with patch("backend.api.routes.chatbot.chat_adapter_service.create_session") as create:
                async def _fake(*args: Any, **kwargs: Any) -> dict[str, Any]:
                    return {"session_id": "s", "user_name": "u", "current_node": "root", "state": "ACTIVE"}
                create.side_effect = _fake
                response = self.client.post("/api/chat/session", json={})
        finally:
            for p in patches:
                p.stop()
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
