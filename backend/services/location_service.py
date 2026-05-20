"""Service-layer location lookups scoped by tenant."""

from __future__ import annotations

from datetime import date

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.location_repository import (
    fetch_buildings_by_site,
    fetch_floors_by_building,
    fetch_sites,
)
from backend.schemas.location import BuildingResponse, FloorResponse, SeatResponse, SiteResponse


def get_sites(conn: PGConnection, *, tenant_id: str) -> list[SiteResponse]:
    """Return tenant-scoped active sites."""
    try:
        sites = fetch_sites(conn, tenant_id=tenant_id)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "site_lookup_failed",
                "message": "Failed to fetch sites.",
            },
        ) from exc

    return [SiteResponse(**site) for site in sites]


def get_buildings_by_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
) -> list[BuildingResponse]:
    """Return tenant-scoped active buildings for one site."""
    try:
        buildings = fetch_buildings_by_site(conn, tenant_id=tenant_id, site_id=site_id)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "building_lookup_failed",
                "message": "Failed to fetch buildings.",
            },
        ) from exc

    return [BuildingResponse(**building) for building in buildings]


def get_floors_by_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
) -> list[FloorResponse]:
    """Return tenant-scoped floors for one site through the full hierarchy."""
    try:
        floors = fetch_floors_by_building(conn, tenant_id=tenant_id, building_id=building_id)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_lookup_failed",
                "message": "Failed to fetch floors.",
            },
        ) from exc

    return [_build_floor_response(floor) for floor in floors]



def _build_floor_response(floor: dict[str, object]) -> FloorResponse:
    active_layout = None
    layout_id = floor.get("layout_id")
    layout_is_published = floor.get("layout_is_published")
    layout_status = floor.get("layout_status")

    if (
        layout_id is not None
        and layout_is_published is True
        and layout_status == "PUBLISHED"
    ):
        active_layout = {
            "layout_id": layout_id,
            "layout_name": floor.get("layout_name"),
            "layout_file_url": floor.get("layout_file_url"),
        }

    response_data = dict(floor)
    response_data["active_layout"] = active_layout

    return FloorResponse(**response_data)
