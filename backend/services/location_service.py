"""Service-layer location lookups and safe admin metadata updates."""

from __future__ import annotations

from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection

from backend.repositories.location_repository import (
    fetch_building_by_id,
    fetch_building_duplicates,
    fetch_buildings_by_site,
    fetch_floor_by_id,
    fetch_floor_duplicates,
    fetch_floors_by_building,
    fetch_seat_configuration,
    fetch_layout_seat_mapping_by_id,
    update_layout_seat_mapping_configuration,
    upsert_operational_seat,
    replace_seat_amenities,
    fetch_seat_amenity_ids,
    fetch_site_by_id,
    fetch_site_duplicates,
    fetch_sites,
    insert_building,
    insert_floor,
    insert_site,
    update_building,
    update_floor,
    update_seat_configuration,
    update_site,
)

from backend.schemas.location import (
    BuildingResponse,
    CreateBuildingRequest,
    CreateFloorRequest,
    CreateSiteRequest,
    FloorResponse,
    LayoutSeatConfigurationResponse,
    LayoutSeatConfigurationUpdateRequest,
    SeatConfigurationResponse,
    SeatConfigurationUpdateRequest,
    SiteDetailsResponse,
    SiteHierarchySummary,
    SiteResponse,
    UpdateBuildingRequest,
    UpdateFloorRequest,
    UpdateSiteRequest,
)

SITE_UPDATE_FIELDS = {
    "site_name",
    "city",
    "country",
    "timezone",
    "address_line1",
    "address_line2",
    "status",
}
SITE_NON_NULL_FIELDS = {"site_name", "city", "country", "timezone", "status"}
SITE_FORBIDDEN_UPDATE_FIELDS = {
    "id",
    "site_id",
    "tenant_id",
    "site_code",
    "created_at",
    "updated_at",
}

BUILDING_UPDATE_FIELDS = {"building_name", "status"}
BUILDING_NON_NULL_FIELDS = {"building_name", "status"}
BUILDING_FORBIDDEN_UPDATE_FIELDS = {
    "id",
    "building_id",
    "site_id",
    "tenant_id",
    "building_code",
    "created_at",
    "updated_at",
}

FLOOR_UPDATE_FIELDS = {"floor_name", "status"}
FLOOR_NON_NULL_FIELDS = {"floor_name", "status"}
FLOOR_FORBIDDEN_UPDATE_FIELDS = {
    "id",
    "floor_id",
    "site_id",
    "building_id",
    "tenant_id",
    "floor_code",
    "created_at",
    "updated_at",
}

SEAT_CONFIGURATION_FIELDS = {"status", "is_bookable"}
SEAT_FORBIDDEN_CONFIGURATION_FIELDS = {
    "site_id",
    "building_id",
    "floor_id",
    "seat_code",
    "layout_id",
    "coordinates",
    "svg_element_id",
    "map_x",
    "map_y",
    "map_width",
    "map_height",
    "rotation_angle",
}


def get_sites(
    conn: PGConnection,
    *,
    tenant_id: str,
    page: int | None = None,
    limit: int | None = None,
    search: str | None = None,
    status_filter: str | None = None,
) -> list[SiteResponse]:
    """Return tenant-scoped sites without changing the legacy list envelope."""
    status_filter = _normalize_status_filter(status_filter)
    try:
        sites = fetch_sites(
            conn,
            tenant_id=tenant_id,
            page=page,
            limit=limit,
            search=search,
            status_filter=status_filter,
        )
    except psycopg2.Error as exc:
        print("DEBUG_DB_ERROR", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "site_lookup_failed",
                "message": "Failed to fetch sites.",
            },
        ) from exc

    return [SiteResponse(**site) for site in sites]


def create_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateSiteRequest,
) -> SiteResponse:
    """Create a tenant-scoped site without cascading child entities."""
    try:
        _raise_site_duplicate_if_needed(
            fetch_site_duplicates(
                conn,
                tenant_id=tenant_id,
                site_code=payload.site_code,
                site_name=payload.site_name,
            ),
            site_code=payload.site_code,
            site_name=payload.site_name,
        )

        site = insert_site(
            conn,
            tenant_id=tenant_id,
            site_code=payload.site_code,
            site_name=payload.site_name,
            city=payload.city,
            country=payload.country,
            timezone=payload.timezone,
            address_line1=payload.address_line1,
            address_line2=payload.address_line2,
            status=payload.status,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "site_create_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="site_duplicate",
            fallback_code="site_create_failed",
            fallback_message="Failed to create site.",
        )

    return SiteResponse(**site)


def update_site_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    payload: UpdateSiteRequest,
) -> SiteResponse:
    """Update site metadata/status only."""
    _reject_extra_fields(payload, SITE_FORBIDDEN_UPDATE_FIELDS)
    updates = _extract_updates(payload, SITE_UPDATE_FIELDS)
    _reject_empty_updates(updates)
    _reject_null_updates(updates, SITE_NON_NULL_FIELDS)

    try:
        site = fetch_site_by_id(conn, tenant_id=tenant_id, site_id=site_id)
        if site is None:
            _raise_not_found("site")

        if "site_name" in updates:
            _raise_site_duplicate_if_needed(
                fetch_site_duplicates(
                    conn,
                    tenant_id=tenant_id,
                    site_name=str(updates["site_name"]),
                    exclude_site_id=site_id,
                ),
                site_name=str(updates["site_name"]),
            )

        updated_site = update_site(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            updates=updates,
        )
        if updated_site is None:
            _raise_not_found("site")
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="site_duplicate",
            fallback_code="site_update_failed",
            fallback_message="Failed to update site.",
        )

    return SiteResponse(**updated_site)



def update_layout_seat_configuration(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_seat_mapping_id: str,
    payload: LayoutSeatConfigurationUpdateRequest,
    current_user: dict[str, Any],
) -> LayoutSeatConfigurationResponse:

    try:

        mapping = fetch_layout_seat_mapping_by_id(
            conn,
            tenant_id=tenant_id,
            layout_seat_mapping_id=layout_seat_mapping_id,
        )

        if mapping is None:
            _raise_not_found("layout seat mapping")

        amenity_ids = payload.amenity_ids or []

        updated_mapping = update_layout_seat_mapping_configuration(
                conn,
                tenant_id=tenant_id,
                layout_seat_mapping_id=layout_seat_mapping_id,
                seat_name=payload.seat_name,
                seat_type=payload.seat_type,
                status=payload.status,
                is_bookable=payload.is_bookable,
                is_reserved=payload.is_reserved,
                amenity_ids=amenity_ids,
                updated_by=str(current_user["user_id"]),
            )

        # seat = upsert_operational_seat(
        #     conn,
        #     tenant_id=tenant_id,
        #     layout_id=str(mapping["layout_id"]),
        #     site_id=str(mapping["site_id"]),
        #     building_id=str(mapping["building_id"]),
        #     floor_id=str(mapping["floor_id"]),
        #     seat_code=str(mapping["seat_code"]),
        #     seat_type=payload.seat_type,
        #     status=payload.status,
        #     is_bookable=payload.is_bookable,
        #     svg_element_id=str(mapping["svg_element_id"]),
        # )

        # replace_seat_amenities(
        #     conn,
        #     tenant_id=tenant_id,
        #     seat_id=str(seat["seat_id"]),
        #     amenity_ids=amenity_ids,
        #     assigned_by_user_id=str(current_user["user_id"]),
        # )

        conn.commit()

        return LayoutSeatConfigurationResponse(
            layout_seat_mapping_id=str(updated_mapping["id"]),
            seat_id=None,
            layout_id=str(mapping["layout_id"]),
            floor_id=str(mapping["floor_id"]),
            seat_code=str(mapping["seat_code"]),
            seat_name=updated_mapping.get("seat_name"),
            seat_type=updated_mapping["seat_type"],
            status=updated_mapping["status"],
            is_bookable=updated_mapping["is_bookable"],
            is_reserved=updated_mapping["is_reserved"],
            is_configured=True,
            configuration_status="COMPLETED",
            amenity_ids=updated_mapping.get("amenity_ids") or [],
        )

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))

        _raise_write_error(
            exc,
            duplicate_code="seat_configuration_conflict",
            fallback_code="seat_configuration_failed",
            fallback_message="Failed to configure layout seat.",
        )


def get_site_details(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
) -> SiteDetailsResponse:
    """Return one site plus an additive hierarchy summary."""
    try:
        site = fetch_site_by_id(conn, tenant_id=tenant_id, site_id=site_id)
    except psycopg2.Error as exc:
        print("DEBUG_DB_ERROR", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "site_lookup_failed",
                "message": "Failed to fetch site.",
            },
        ) from exc

    if site is None:
        _raise_not_found("site")

    summary = SiteHierarchySummary(
        building_count=int(site.get("building_count") or 0),
        floor_count=int(site.get("floor_count") or 0),
        seat_count=int(site.get("seat_count") or 0),
        active_seat_count=int(site.get("active_seat_count") or 0),
        bookable_seat_count=int(site.get("bookable_seat_count") or 0),
    )
    return SiteDetailsResponse(**site, hierarchy_summary=summary)


def get_buildings_by_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str | None = None,
    page: int | None = None,
    limit: int | None = None,
    search: str | None = None,
    status_filter: str | None = None,
) -> list[BuildingResponse]:
    """Return tenant-scoped active buildings for one site."""
    status_filter = _normalize_status_filter(status_filter)
    try:
        buildings = fetch_buildings_by_site(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            page=page,
            limit=limit,
            search=search,
            status_filter=status_filter,
        )
    except psycopg2.Error as exc:
        print("DEBUG_DB_ERROR", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "building_lookup_failed",
                "message": "Failed to fetch buildings.",
            },
        ) from exc

    return [BuildingResponse(**building) for building in buildings]


def create_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateBuildingRequest,
) -> BuildingResponse:
    """Create a building under an existing tenant-scoped site."""
    site_id = str(payload.site_id)
    try:
        site = fetch_site_by_id(conn, tenant_id=tenant_id, site_id=site_id)
        if site is None:
            _raise_not_found("site")

        _raise_building_duplicate_if_needed(
            fetch_building_duplicates(
                conn,
                site_id=site_id,
                building_code=payload.building_code,
                building_name=payload.building_name,
            ),
            building_code=payload.building_code,
            building_name=payload.building_name,
        )

        building = insert_building(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            building_code=payload.building_code,
            building_name=payload.building_name,
            status=payload.status,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "building_create_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="building_duplicate",
            fallback_code="building_create_failed",
            fallback_message="Failed to create building.",
        )

    return BuildingResponse(**building)


def update_building_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
    payload: UpdateBuildingRequest,
) -> BuildingResponse:
    """Update building metadata/status only."""
    _reject_extra_fields(payload, BUILDING_FORBIDDEN_UPDATE_FIELDS)
    updates = _extract_updates(payload, BUILDING_UPDATE_FIELDS)
    _reject_empty_updates(updates)
    _reject_null_updates(updates, BUILDING_NON_NULL_FIELDS)

    try:
        building = fetch_building_by_id(
            conn,
            tenant_id=tenant_id,
            building_id=building_id,
        )
        if building is None:
            _raise_not_found("building")

        if "building_name" in updates:
            _raise_building_duplicate_if_needed(
                fetch_building_duplicates(
                    conn,
                    site_id=str(building["site_id"]),
                    building_name=str(updates["building_name"]),
                    exclude_building_id=building_id,
                ),
                building_name=str(updates["building_name"]),
            )

        updated_building = update_building(
            conn,
            tenant_id=tenant_id,
            building_id=building_id,
            updates=updates,
        )
        if updated_building is None:
            _raise_not_found("building")
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="building_duplicate",
            fallback_code="building_update_failed",
            fallback_message="Failed to update building.",
        )

    return BuildingResponse(**updated_building)


def get_floors_by_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
    page: int | None = None,
    limit: int | None = None,
    search: str | None = None,
    status_filter: str | None = None,
) -> list[FloorResponse]:
    """Return tenant-scoped floors for one site through the full hierarchy."""
    status_filter = _normalize_status_filter(status_filter)
    try:
        floors = fetch_floors_by_building(
            conn,
            tenant_id=tenant_id,
            building_id=building_id,
            page=page,
            limit=limit,
            search=search,
            status_filter=status_filter,
        )
    except psycopg2.Error as exc:
        print("DEBUG_DB_ERROR", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_lookup_failed",
                "message": "Failed to fetch floors.",
            },
        ) from exc

    return [_build_floor_response(floor) for floor in floors]


def create_floor(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateFloorRequest,
) -> FloorResponse:
    """Create a floor under an existing building without seat/layout side effects."""
    building_id = str(payload.building_id)
    site_id = str(payload.site_id)
    try:
        building = fetch_building_by_id(
            conn,
            tenant_id=tenant_id,
            building_id=building_id,
        )
        if building is None:
            _raise_not_found("building")
        if str(building["site_id"]) != site_id:
            _raise_invalid_hierarchy(
                "building_id does not belong to the supplied site_id.",
            )

        _raise_floor_duplicate_if_needed(
            fetch_floor_duplicates(
                conn,
                building_id=building_id,
                floor_code=payload.floor_code,
                floor_name=payload.floor_name,
            ),
            floor_code=payload.floor_code,
            floor_name=payload.floor_name,
        )

        floor = insert_floor(
            conn,
            tenant_id=tenant_id,
            site_id=site_id,
            building_id=building_id,
            floor_code=payload.floor_code,
            floor_name=payload.floor_name,
            status=payload.status,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_create_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="floor_duplicate",
            fallback_code="floor_create_failed",
            fallback_message="Failed to create floor.",
        )

    return _build_floor_response(floor)


def update_floor_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    payload: UpdateFloorRequest,
) -> FloorResponse:
    """Update floor metadata/status only."""
    _reject_extra_fields(payload, FLOOR_FORBIDDEN_UPDATE_FIELDS)
    updates = _extract_updates(payload, FLOOR_UPDATE_FIELDS)
    _reject_empty_updates(updates)
    _reject_null_updates(updates, FLOOR_NON_NULL_FIELDS)

    try:
        floor = fetch_floor_by_id(conn, tenant_id=tenant_id, floor_id=floor_id)
        if floor is None:
            _raise_not_found("floor")

        if "floor_name" in updates:
            _raise_floor_duplicate_if_needed(
                fetch_floor_duplicates(
                    conn,
                    building_id=str(floor["building_id"]),
                    floor_name=str(updates["floor_name"]),
                    exclude_floor_id=floor_id,
                ),
                floor_name=str(updates["floor_name"]),
            )

        updated_floor = update_floor(
            conn,
            tenant_id=tenant_id,
            floor_id=floor_id,
            updates=updates,
        )
        if updated_floor is None:
            _raise_not_found("floor")
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="floor_duplicate",
            fallback_code="floor_update_failed",
            fallback_message="Failed to update floor.",
        )

    return _build_floor_response(updated_floor)


def update_seat_configuration_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_id: str,
    payload: SeatConfigurationUpdateRequest,
) -> SeatConfigurationResponse:
    """Update seat status/bookability without touching hierarchy or layout fields."""
    _reject_extra_fields(payload, SEAT_FORBIDDEN_CONFIGURATION_FIELDS)
    updates = _extract_updates(payload, SEAT_CONFIGURATION_FIELDS)
    _reject_empty_updates(updates)
    _reject_null_updates(updates, {"status", "is_bookable"})

    try:
        seat = fetch_seat_configuration(
            conn,
            tenant_id=tenant_id,
            seat_id=seat_id,
        )
        if seat is None:
            _raise_not_found("seat")

        updated_seat = update_seat_configuration(
            conn,
            tenant_id=tenant_id,
            seat_id=seat_id,
            updates=updates,
        )
        if updated_seat is None:
            _raise_not_found("seat")
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        print("DEBUG_DB_ERROR", repr(exc))
        _raise_write_error(
            exc,
            duplicate_code="seat_conflict",
            fallback_code="seat_configuration_update_failed",
            fallback_message="Failed to update seat configuration.",
        )

    return SeatConfigurationResponse(**updated_seat)



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


def _extract_updates(payload: Any, allowed_fields: set[str]) -> dict[str, Any]:
    raw = payload.model_dump(exclude_unset=True)
    return {
        key: value
        for key, value in raw.items()
        if key in allowed_fields
    }


def _normalize_status_filter(status_filter: str | None) -> str | None:
    if status_filter is None:
        return None

    normalized = status_filter.strip().upper()
    if not normalized:
        return None
    if normalized in {"ACTIVE", "INACTIVE"}:
        return normalized

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "invalid_status_filter",
            "message": "status must be ACTIVE or INACTIVE.",
        },
    )


def _reject_extra_fields(payload: Any, forbidden_fields: set[str]) -> None:
    extra_fields = set(payload.model_extra or {})
    if not extra_fields:
        return

    forbidden = sorted(extra_fields & forbidden_fields)
    invalid = sorted(extra_fields - forbidden_fields)
    detail = forbidden or invalid
    code = "immutable_field_update" if forbidden else "invalid_update_field"
    message = (
        f"Fields cannot be updated: {', '.join(detail)}."
        if forbidden
        else f"Unsupported update fields: {', '.join(detail)}."
    )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": code,
            "message": message,
        },
    )


def _reject_empty_updates(updates: dict[str, Any]) -> None:
    if updates:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "no_update_fields",
            "message": "At least one mutable field is required.",
        },
    )


def _reject_null_updates(updates: dict[str, Any], non_null_fields: set[str]) -> None:
    null_fields = sorted(
        field_name
        for field_name in non_null_fields
        if field_name in updates and updates[field_name] is None
    )
    if not null_fields:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "invalid_null_update",
            "message": f"Fields cannot be null: {', '.join(null_fields)}.",
        },
    )


def _raise_site_duplicate_if_needed(
    duplicates: list[dict[str, Any]],
    *,
    site_code: str | None = None,
    site_name: str | None = None,
) -> None:
    for row in duplicates:
        if site_code is not None and row.get("site_code") == site_code:
            _raise_duplicate("site_code", "Site code already exists for this tenant.")
        if site_name is not None and row.get("site_name") == site_name:
            _raise_duplicate("site_name", "Site name already exists for this tenant.")


def _raise_building_duplicate_if_needed(
    duplicates: list[dict[str, Any]],
    *,
    building_code: str | None = None,
    building_name: str | None = None,
) -> None:
    for row in duplicates:
        if building_code is not None and row.get("building_code") == building_code:
            _raise_duplicate("building_code", "Building code already exists for this site.")
        if building_name is not None and row.get("building_name") == building_name:
            _raise_duplicate("building_name", "Building name already exists for this site.")


def _raise_floor_duplicate_if_needed(
    duplicates: list[dict[str, Any]],
    *,
    floor_code: str | None = None,
    floor_name: str | None = None,
) -> None:
    for row in duplicates:
        if floor_code is not None and row.get("floor_code") == floor_code:
            _raise_duplicate("floor_code", "Floor code already exists for this building.")
        if floor_name is not None and row.get("floor_name") == floor_name:
            _raise_duplicate("floor_name", "Floor name already exists for this building.")


def _raise_duplicate(field_name: str, message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": f"duplicate_{field_name}",
            "message": message,
        },
    )


def _raise_not_found(entity_name: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": f"{entity_name}_not_found",
            "message": f"{entity_name.replace('_', ' ').title()} does not exist.",
        },
    )


def _raise_invalid_hierarchy(message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "invalid_hierarchy",
            "message": message,
        },
    )


def _raise_write_error(
    exc: psycopg2.Error,
    *,
    duplicate_code: str,
    fallback_code: str,
    fallback_message: str,
) -> None:
    if exc.pgcode == errorcodes.UNIQUE_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": duplicate_code,
                "message": "A record with the same unique value already exists.",
            },
        ) from exc
    if exc.pgcode == errorcodes.CHECK_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_status",
                "message": "Status must be ACTIVE or INACTIVE.",
            },
        ) from exc
    if exc.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "reference_not_found",
                "message": "Referenced hierarchy record does not exist.",
            },
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "code": fallback_code,
            "message": fallback_message,
        },
    ) from exc
