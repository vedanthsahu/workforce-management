from __future__ import annotations

import math
from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection

from backend.repositories.preferences_repository import (
    fetch_amenities,
    fetch_amenity_by_id,
    fetch_amenity_category_by_id,
    fetch_amenity_duplicates,
    fetch_active_amenities,
    insert_amenity,
    update_amenity,
)
from backend.schemas.preferences import (
    AdminAmenityResponse,
    AmenityListResponse,
    CreateAmenityRequest,
    UpdateAmenityRequest,
)

AMENITY_UPDATE_FIELDS = {
    "amenity_name",
    "description",
    "icon_name",
    "category_id",
    "is_active",
}
AMENITY_NON_NULL_FIELDS = {"amenity_name", "category_id", "is_active"}
AMENITY_FORBIDDEN_UPDATE_FIELDS = {
    "id",
    "amenity_id",
    "tenant_id",
    "amenity_key",
    "created_at",
    "updated_at",
}


def get_preferences(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> dict:

    try:
        amenities = fetch_active_amenities(
            conn,
            tenant_id=tenant_id,
        )

        return {
            "amenities": amenities,
        }

    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "preferences_fetch_failed",
                "message": "Failed to fetch preferences.",
            },
        ) from exc


def create_amenity(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateAmenityRequest,
) -> AdminAmenityResponse:
    """Create a tenant-scoped amenity using the category table."""
    try:
        category = fetch_amenity_category_by_id(
            conn,
            tenant_id=tenant_id,
            category_id=str(payload.category_id),
            active_only=True,
        )
        if category is None:
            _raise_category_not_found()

        if fetch_amenity_duplicates(
            conn,
            tenant_id=tenant_id,
            amenity_key=payload.amenity_key,
        ):
            _raise_duplicate_amenity()

        amenity = insert_amenity(
            conn,
            tenant_id=tenant_id,
            amenity_key=payload.amenity_key,
            amenity_name=payload.amenity_name,
            description=payload.description,
            icon_name=payload.icon_name,
            category_id=str(payload.category_id),
            category_name=str(category["category_name"]),
            is_active=payload.is_active,
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
                "code": "amenity_create_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _raise_amenity_write_error(
            exc,
            fallback_code="amenity_create_failed",
            fallback_message="Failed to create amenity.",
        )

    return AdminAmenityResponse(**amenity)


def update_amenity_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    amenity_id: str,
    payload: UpdateAmenityRequest,
) -> AdminAmenityResponse:
    """Update amenity metadata or active state."""
    _reject_extra_fields(payload, AMENITY_FORBIDDEN_UPDATE_FIELDS)
    updates = _extract_updates(payload, AMENITY_UPDATE_FIELDS)
    _reject_empty_updates(updates)
    _reject_null_updates(updates, AMENITY_NON_NULL_FIELDS)

    try:
        amenity = fetch_amenity_by_id(
            conn,
            tenant_id=tenant_id,
            amenity_id=amenity_id,
        )
        if amenity is None:
            _raise_amenity_not_found()

        if "category_id" in updates:
            category = fetch_amenity_category_by_id(
                conn,
                tenant_id=tenant_id,
                category_id=str(updates["category_id"]),
                active_only=True,
            )
            if category is None:
                _raise_category_not_found()
            updates["category"] = category["category_name"]

        updated_amenity = update_amenity(
            conn,
            tenant_id=tenant_id,
            amenity_id=amenity_id,
            updates=updates,
        )
        if updated_amenity is None:
            _raise_amenity_not_found()
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        _raise_amenity_write_error(
            exc,
            fallback_code="amenity_update_failed",
            fallback_message="Failed to update amenity.",
        )

    return AdminAmenityResponse(**updated_amenity)


def get_amenities(
    conn: PGConnection,
    *,
    tenant_id: str,
    page: int = 1,
    limit: int = 50,
    search: str | None = None,
    status_filter: str | None = None,
) -> AmenityListResponse:
    """Return paginated amenity admin rows with dashboard metrics."""
    is_active = _status_filter_to_bool(status_filter)
    try:
        result = fetch_amenities(
            conn,
            tenant_id=tenant_id,
            page=page,
            limit=limit,
            search=search,
            is_active=is_active,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "amenity_lookup_failed",
                "message": "Failed to fetch amenities.",
            },
        ) from exc

    total = int(result.get("total") or 0)
    total_pages = math.ceil(total / limit) if total else 0
    return AmenityListResponse(
        items=[AdminAmenityResponse(**row) for row in result.get("items", [])],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        total_amenities=int(result.get("total_amenities") or 0),
        active_amenities=int(result.get("active_amenities") or 0),
        inactive_amenities=int(result.get("inactive_amenities") or 0),
        assigned_amenities=int(result.get("assigned_amenities") or 0),
    )


def _status_filter_to_bool(status_filter: str | None) -> bool | None:
    if status_filter is None:
        return None

    normalized = status_filter.strip().upper()
    if normalized == "ACTIVE":
        return True
    if normalized == "INACTIVE":
        return False

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "invalid_status_filter",
            "message": "status must be ACTIVE or INACTIVE.",
        },
    )


def _extract_updates(payload: Any, allowed_fields: set[str]) -> dict[str, Any]:
    raw = payload.model_dump(exclude_unset=True)
    return {
        key: value
        for key, value in raw.items()
        if key in allowed_fields
    }


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


def _raise_duplicate_amenity() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "duplicate_amenity_key",
            "message": "Amenity key already exists for this tenant.",
        },
    )


def _raise_amenity_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "amenity_not_found",
            "message": "Amenity does not exist.",
        },
    )


def _raise_category_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "amenity_category_not_found",
            "message": "Amenity category does not exist.",
        },
    )


def _raise_amenity_write_error(
    exc: psycopg2.Error,
    *,
    fallback_code: str,
    fallback_message: str,
) -> None:
    if exc.pgcode == errorcodes.UNIQUE_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "duplicate_amenity_key",
                "message": "Amenity key already exists for this tenant.",
            },
        ) from exc
    if exc.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "amenity_category_not_found",
                "message": "Amenity category does not exist.",
            },
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "code": fallback_code,
            "message": fallback_message,
        },
    ) from exc
