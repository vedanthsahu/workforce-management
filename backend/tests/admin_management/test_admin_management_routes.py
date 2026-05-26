from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.routes.locations import router as locations_router
from backend.api.routes.preferences import router as preferences_router


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

    def test_amenity_management_routes_are_registered(self) -> None:
        route_map = {
            (next(iter(route.methods)), route.path)
            for route in preferences_router.routes
            if isinstance(route, APIRoute)
        }

        self.assertIn(("GET", "/amenities"), route_map)
        self.assertIn(("POST", "/amenities"), route_map)
        self.assertIn(("PATCH", "/amenities/{amenity_id}"), route_map)


if __name__ == "__main__":
    unittest.main()
