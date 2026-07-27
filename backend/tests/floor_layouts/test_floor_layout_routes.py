from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.routes.floor_layouts import router as floor_layouts_router


class FloorLayoutRouteTests(unittest.TestCase):
    def test_delete_route_is_registered(self) -> None:
        route_map = {
            (next(iter(route.methods)), route.path)
            for route in floor_layouts_router.routes
            if isinstance(route, APIRoute)
        }

        self.assertIn(
            ("DELETE", "/admin/floor-layouts/{layout_id}"),
            route_map,
        )


if __name__ == "__main__":
    unittest.main()
