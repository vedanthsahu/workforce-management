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
    structural-mutation route in locations.py must require its resource's
    specific granular permission (office/building/floor/seat), not just an
    authenticated session. Superseded the old "location:manage" coarse
    permission once the granular catalog rolled out -- see
    Trial_003_seed_permissions.sql. GET /floors/{floor_id}/seats (seat
    availability for booking) deliberately stays open to any authenticated
    user; every other route, including the other reads, now requires its
    own :view permission -- reads were deliberately gated too."""

    MUTATING_ROUTES = [
        ("POST", "/sites", "office:create"),
        ("PATCH", "/sites/{site_id}", "office:update"),
        ("POST", "/buildings", "building:create"),
        ("PATCH", "/buildings/{building_id}", "building:update"),
        ("POST", "/floors", "floor:create"),
        ("PATCH", "/floors/{floor_id}", "floor:update"),
        ("PATCH", "/seats/{seat_id}/configuration", "layout_seat:update"),
        ("PATCH", "/seats/bulk-configuration", "layout_seat:bulk_update"),
        ("PATCH", "/layout-seats/{layout_seat_mapping_id}/configuration", "layout_seat:update"),
        ("PATCH", "/layout-seats/bulk-configuration", "layout_seat:bulk_update"),
    ]

    READ_ROUTES = [
        ("GET", "/sites", "office:view"),
        ("GET", "/sites/{site_id}", "office:view"),
        ("GET", "/buildings", "building:view"),
        ("GET", "/buildings/{building_id}/floors", "floor:view"),
    ]

    OPEN_READ_ROUTES = [
        ("GET", "/floors/{floor_id}/seats"),
    ]

    def test_every_mutating_route_requires_a_permission(self) -> None:
        for method, path, expected_permission in self.MUTATING_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(locations_router, method, path)
                required = _required_permissions(route)
                self.assertIsNotNone(
                    required,
                    f"{method} {path} has no require_permission/"
                    "require_any_permission dependency -- any authenticated "
                    "user could call it.",
                )
                self.assertIn(expected_permission, required)

    # PENDING DECISION (not fixed): whether PATCH /seats/*configuration and
    # /layout-seats/*configuration should ALSO accept layout:upload as an
    # alternate permission (i.e. require_any_permission rather than the
    # single require_permission they use today) -- someone who can upload a
    # whole new layout currently cannot also configure individual seats
    # through these routes unless they separately hold layout_seat:update/
    # layout_seat:bulk_update. Left unimplemented pending a decision on
    # whether that's the intended relationship between the two permissions.

    def test_read_routes_require_their_view_permission(self) -> None:
        for method, path, expected_permission in self.READ_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(locations_router, method, path)
                required = _required_permissions(route)
                self.assertIsNotNone(
                    required,
                    f"{method} {path} has no permission dependency.",
                )
                self.assertIn(expected_permission, required)

    def test_seat_availability_route_stays_open_to_any_authenticated_user(self) -> None:
        for method, path in self.OPEN_READ_ROUTES:
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
    amenity categories. Uses the granular per-resource permissions from the
    group-permission catalog (amenities:manage was the pre-rollout coarse
    name); reads are gated too, not left open."""

    MUTATING_ROUTES = [
        ("POST", "/amenity-categories", "amenity_category:create"),
        ("PATCH", "/amenity-categories/{category_id}", "amenity_category:update"),
        ("POST", "/amenities", "amenity:create"),
        ("PATCH", "/amenities/{amenity_id}", "amenity:update"),
    ]

    READ_ROUTES = [
        ("GET", "/amenities", "amenity:view"),
        ("GET", "/amenities/{amenity_id}", "amenity:view"),
        ("GET", "/amenity-categories", "amenity_category:view"),
        ("GET", "/amenity-categories/{category_id}", "amenity_category:view"),
    ]

    def test_every_mutating_route_requires_its_permission(self) -> None:
        for method, path, expected_permission in self.MUTATING_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(preferences_router, method, path)
                required = _required_permissions(route)
                self.assertIsNotNone(
                    required,
                    f"{method} {path} has no permission dependency -- any "
                    "authenticated user could edit the amenity catalog.",
                )
                self.assertIn(expected_permission, required)

    def test_read_routes_require_their_view_permission(self) -> None:
        for method, path, expected_permission in self.READ_ROUTES:
            with self.subTest(route=f"{method} {path}"):
                route = _route(preferences_router, method, path)
                required = _required_permissions(route)
                self.assertIsNotNone(
                    required,
                    f"{method} {path} has no permission dependency.",
                )
                self.assertIn(expected_permission, required)


if __name__ == "__main__":
    unittest.main()
