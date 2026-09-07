from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.routes.locations import router as locations_router
from backend.api.routes.preferences import router as preferences_router


def _closure_value(func, name):
    """Read a free variable captured in a closure, or None if not present."""
    code = getattr(func, "__code__", None)
    if code is None or name not in code.co_freevars:
        return None
    index = code.co_freevars.index(name)
    return func.__closure__[index].cell_contents


def _required_permissions(route: APIRoute) -> tuple[str, ...] | None:
    """Return the permission list a route's endpoint dependency was built
    with, by inspecting the `require_permission`/`require_any_permission`
    closure attached as a direct dependency of the route.

    Both `deps.require_permission` and `deps.require_any_permission` return
    an inner function literally named `dependency`; they are distinguished
    by which free variable they close over (`permission` vs.
    `required_permissions`). Returns None if the route has no such
    dependency (e.g. it only depends on plain `get_current_user`).
    """
    for sub in route.dependant.dependencies:
        call = sub.call
        if getattr(call, "__name__", None) != "dependency":
            continue

        any_perms = _closure_value(call, "required_permissions")
        if any_perms is not None:
            return tuple(any_perms)

        single_perm = _closure_value(call, "permission")
        if single_perm is not None:
            return (single_perm,)

    return None


def _route(router, method: str, path: str) -> APIRoute:
    for route in router.routes:
        if (
            isinstance(route, APIRoute)
            and method in route.methods
            and route.path == path
        ):
            return route
    raise AssertionError(f"Route {method} {path} is not registered")


class AdminManagementRouteTests(unittest.TestCase):
    def test_location_management_routes_are_registered(self) -> None:
        route_map = {
            (next(iter(route.methods)), route.path)
            for route in locations_router.routes
            if isinstance(route, APIRoute)
        }

        self.assertIn(("POST", "/sites"), route_map)
        self.assertIn(("PATCH", "/sites/{site_id}"), route_map)
        self.assertIn(("GET", "/sites/{site_id}"), route_map)
        self.assertIn(("POST", "/buildings"), route_map)
        self.assertIn(("PATCH", "/buildings/{building_id}"), route_map)
        self.assertIn(("POST", "/floors"), route_map)
        self.assertIn(("PATCH", "/floors/{floor_id}"), route_map)
        self.assertIn(("GET", "/offices/{office_id}/floors"), route_map)
        self.assertIn(("PATCH", "/seats/{seat_id}/configuration"), route_map)
        self.assertIn(("PATCH", "/seats/bulk-configuration"), route_map)
        self.assertIn(("PATCH", "/layout-seats/{layout_seat_mapping_id}/configuration"), route_map)
        self.assertIn(("PATCH", "/layout-seats/bulk-configuration"), route_map)

    def test_amenity_management_routes_are_registered(self) -> None:
        route_map = {
            (next(iter(route.methods)), route.path)
            for route in preferences_router.routes
            if isinstance(route, APIRoute)
        }

        self.assertIn(("GET", "/amenities"), route_map)
        self.assertIn(("POST", "/amenities"), route_map)
        self.assertIn(("PATCH", "/amenities/{amenity_id}"), route_map)


class LocationMutationsRequirePermissionTests(unittest.TestCase):
    """Regression coverage for the broken-access-control fix: every
    structural-mutation route in locations.py must require location:manage
    (or layout:upload for seat/layout-seat configuration), not just an
    authenticated session. Read (GET) routes remain open to any user."""

    MUTATING_ROUTES = [
        ("POST", "/sites"),
        ("PATCH", "/sites/{site_id}"),
        ("POST", "/buildings"),
        ("PATCH", "/buildings/{building_id}"),
        ("POST", "/floors"),
        ("PATCH", "/floors/{floor_id}"),
        ("PATCH", "/seats/{seat_id}/configuration"),
        ("PATCH", "/seats/bulk-configuration"),
        ("PATCH", "/layout-seats/{layout_seat_mapping_id}/configuration"),
        ("PATCH", "/layout-seats/bulk-configuration"),
    ]

    READ_ROUTES = [
        ("GET", "/sites"),
        ("GET", "/sites/{site_id}"),
        ("GET", "/buildings"),
        ("GET", "/buildings/{building_id}/floors"),
        ("GET", "/floors/{floor_id}/seats"),
    ]

    def test_every_mutating_route_requires_a_permission(self) -> None:
        for method, path in self.MUTATING_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(locations_router, method, path)
                required = _required_permissions(route)
                self.assertIsNotNone(
                    required,
                    f"{method} {path} has no require_permission/"
                    "require_any_permission dependency -- any authenticated "
                    "user could call it.",
                )
                self.assertIn("location:manage", required)

    def test_seat_and_layout_seat_configuration_also_accept_layout_upload(
        self,
    ) -> None:
        for method, path in (
            ("PATCH", "/seats/{seat_id}/configuration"),
            ("PATCH", "/seats/bulk-configuration"),
            ("PATCH", "/layout-seats/{layout_seat_mapping_id}/configuration"),
            ("PATCH", "/layout-seats/bulk-configuration"),
        ):
            with self.subTest(route=f"{method} {path}"):
                required = _required_permissions(
                    _route(locations_router, method, path)
                )
                self.assertIn("layout:upload", required)

    def test_read_routes_do_not_require_a_permission(self) -> None:
        for method, path in self.READ_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(locations_router, method, path)
                self.assertIsNone(
                    _required_permissions(route),
                    f"{method} {path} should remain open to any "
                    "authenticated user.",
                )


class AmenityMutationsRequirePermissionTests(unittest.TestCase):
    """Regression coverage for the amenity-taxonomy authorization gap: any
    authenticated employee could previously create/update amenities and
    amenity categories."""

    MUTATING_ROUTES = [
        ("POST", "/amenity-categories"),
        ("PATCH", "/amenity-categories/{category_id}"),
        ("POST", "/amenities"),
        ("PATCH", "/amenities/{amenity_id}"),
    ]

    READ_ROUTES = [
        ("GET", "/amenities"),
        ("GET", "/amenities/{amenity_id}"),
        ("GET", "/amenity-categories"),
        ("GET", "/amenity-categories/{category_id}"),
    ]

    def test_every_mutating_route_requires_amenities_manage(self) -> None:
        for method, path in self.MUTATING_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(preferences_router, method, path)
                required = _required_permissions(route)
                self.assertIsNotNone(
                    required,
                    f"{method} {path} has no permission dependency -- any "
                    "authenticated user could edit the amenity catalog.",
                )
                self.assertIn("amenities:manage", required)

    def test_read_routes_do_not_require_a_permission(self) -> None:
        for method, path in self.READ_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(preferences_router, method, path)
                self.assertIsNone(_required_permissions(route))


if __name__ == "__main__":
    unittest.main()
