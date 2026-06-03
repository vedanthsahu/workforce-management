from __future__ import annotations

import math
from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2 import errorcodes
from psycopg2.extensions import connection as PGConnection

from backend.repositories.preferences_repository import (
    count_amenities_for_category,
    fetch_amenities,
    fetch_amenity_by_id,
    fetch_amenity_categories,
    fetch_amenity_category_by_id,
    fetch_amenity_category_duplicates,
    fetch_amenity_category_metrics,
    fetch_amenity_duplicates,
    fetch_active_amenities,
    insert_amenity,
    insert_amenity_category,
    update_amenity,
    update_amenity_category,
)
from backend.schemas.preferences import (
    AdminAmenityResponse,
    AmenityCategoryListResponse,
    AmenityCategoryResponse,
    AmenityListResponse,
    CreateAmenityCategoryRequest,
    CreateAmenityRequest,
    UpdateAmenityCategoryRequest,
    UpdateAmenityRequest,
    generate_amenity_key,
    generate_category_key,
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

CATEGORY_UPDATE_FIELDS = {
    "category_name",
    "description",
    "search_keywords",
    "is_active",
}
CATEGORY_NON_NULL_FIELDS = {"category_name", "is_active"}
CATEGORY_FORBIDDEN_UPDATE_FIELDS = {
    "id",
    "category_id",
    "tenant_id",
    "category_key",
    "created_at",
    "updated_at",
    "is_system_defined",
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


def get_amenity_categories(
    conn: PGConnection,
    *,
    tenant_id: str,
    page: int = 1,
    limit: int = 50,
    search: str | None = None,
    status_filter: str | None = None,
) -> AmenityCategoryListResponse:
    """Return paginated amenity categories with admin metrics."""
    is_active = _status_filter_to_bool(status_filter)
    try:
        result = fetch_amenity_categories(
            conn,
            tenant_id=tenant_id,
            page=page,
            limit=limit,
            search=search,
            is_active=is_active,
        )
        metrics = fetch_amenity_category_metrics(
            conn,
            tenant_id=tenant_id,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "amenity_category_lookup_failed",
                "message": "Failed to fetch amenity categories.",
            },
        ) from exc

    total = int(result.get("total") or 0)
    total_pages = math.ceil(total / limit) if total else 0
    return AmenityCategoryListResponse(
        items=[
            AmenityCategoryResponse(**row)
            for row in result.get("items", [])
        ],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        active_categories=int(metrics.get("active_categories") or 0),
        inactive_categories=int(metrics.get("inactive_categories") or 0),
        system_categories=int(metrics.get("system_categories") or 0),
        tenant_categories=int(metrics.get("tenant_categories") or 0),
    )


def get_amenity_category(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_id: str,
) -> AmenityCategoryResponse:
    """Return one system or tenant category with amenity usage counts."""
    try:
        category = fetch_amenity_category_by_id(
            conn,
            tenant_id=tenant_id,
            category_id=category_id,
            active_only=False,
        )
        if category is None:
            _raise_category_not_found()
        return _build_category_response(
            conn,
            tenant_id=tenant_id,
            category=category,
        )
    except HTTPException:
        raise
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "amenity_category_lookup_failed",
                "message": "Failed to fetch amenity category.",
            },
        ) from exc


def create_amenity_category(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateAmenityCategoryRequest,
) -> AmenityCategoryResponse:
    """Create a tenant-scoped amenity category with a backend-generated key."""
    try:
        category_key = generate_category_key(payload.category_name)
        _raise_category_duplicate_if_needed(
            fetch_amenity_category_duplicates(
                conn,
                tenant_id=tenant_id,
                category_name=payload.category_name,
                category_key=category_key,
            ),
        )

        category = insert_amenity_category(
            conn,
            tenant_id=tenant_id,
            category_key=category_key,
            category_name=payload.category_name,
            description=payload.description,
            search_keywords=payload.search_keywords,
            is_active=payload.is_active,
        )
        category_response = _build_category_response(
            conn,
            tenant_id=tenant_id,
            category=category,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_amenity_category",
                "message": str(exc),
            },
        ) from exc
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "amenity_category_create_failed",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _raise_category_write_error(
            exc,
            fallback_code="amenity_category_create_failed",
            fallback_message="Failed to create amenity category.",
        )

    return category_response


def update_amenity_category_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_id: str,
    payload: UpdateAmenityCategoryRequest,
) -> AmenityCategoryResponse:
    """Update tenant category metadata while protecting system categories."""
    _reject_extra_fields(payload, CATEGORY_FORBIDDEN_UPDATE_FIELDS)
    updates = _extract_updates(payload, CATEGORY_UPDATE_FIELDS)
    _reject_empty_updates(updates)
    _reject_null_updates(updates, CATEGORY_NON_NULL_FIELDS)

    try:
        category = fetch_amenity_category_by_id(
            conn,
            tenant_id=tenant_id,
            category_id=category_id,
            active_only=False,
        )
        if category is None:
            _raise_category_not_found()
        if (
            category.get("is_system_defined") is True
            or category.get("tenant_id") is None
        ):
            _raise_system_category_update_forbidden()

        if "category_name" in updates:
            category_key = generate_category_key(str(updates["category_name"]))
            _raise_category_duplicate_if_needed(
                fetch_amenity_category_duplicates(
                    conn,
                    tenant_id=tenant_id,
                    category_name=str(updates["category_name"]),
                    category_key=category_key,
                    exclude_category_id=category_id,
                ),
            )
            updates["category_key"] = category_key

        updated_category = update_amenity_category(
            conn,
            tenant_id=tenant_id,
            category_id=category_id,
            updates=updates,
        )
        if updated_category is None:
            _raise_category_not_found()
        category_response = _build_category_response(
            conn,
            tenant_id=tenant_id,
            category=updated_category,
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_amenity_category",
                "message": str(exc),
            },
        ) from exc
    except psycopg2.Error as exc:
        conn.rollback()
        _raise_category_write_error(
            exc,
            fallback_code="amenity_category_update_failed",
            fallback_message="Failed to update amenity category.",
        )

    return category_response


def create_amenity(
    conn: PGConnection,
    *,
    tenant_id: str,
    payload: CreateAmenityRequest,
) -> AdminAmenityResponse:
    """Create a tenant-scoped amenity using a backend-generated key."""
    try:
        category = fetch_amenity_category_by_id(
            conn,
            tenant_id=tenant_id,
            category_id=str(payload.category_id),
            active_only=True,
        )
        if category is None:
            _raise_category_not_found()

        amenity_key = generate_amenity_key(payload.amenity_name)
        if fetch_amenity_duplicates(
            conn,
            tenant_id=tenant_id,
            amenity_key=amenity_key,
        ):
            _raise_duplicate_amenity()

        amenity = insert_amenity(
            conn,
            tenant_id=tenant_id,
            amenity_key=amenity_key,
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
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_amenity",
                "message": str(exc),
            },
        ) from exc
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


def get_amenity(
    conn: PGConnection,
    *,
    tenant_id: str,
    amenity_id: str,
) -> AdminAmenityResponse:
    """Return one tenant-scoped amenity for admin detail views."""
    try:
        amenity = fetch_amenity_by_id(
            conn,
            tenant_id=tenant_id,
            amenity_id=amenity_id,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "amenity_lookup_failed",
                "message": "Failed to fetch amenity.",
            },
        ) from exc

    if amenity is None:
        _raise_amenity_not_found()
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


def _build_category_response(
    conn: PGConnection,
    *,
    tenant_id: str,
    category: dict[str, Any],
) -> AmenityCategoryResponse:
    counts = count_amenities_for_category(
        conn,
        tenant_id=tenant_id,
        category_id=str(category["category_id"]),
    )
    return AmenityCategoryResponse(
        **category,
        **counts,
    )


def _status_filter_to_bool(status_filter: str | None) -> bool | None:
    if status_filter is None:
        return None

    normalized = status_filter.strip().upper()
    if not normalized:
        return None
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


def _raise_category_duplicate_if_needed(duplicates: list[dict[str, Any]]) -> None:
    if duplicates:
        _raise_duplicate_amenity_category()


def _raise_duplicate_amenity_category() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "duplicate_amenity_category",
            "message": "Amenity category already exists for this tenant.",
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


def _raise_system_category_update_forbidden() -> None:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "system_category_update_forbidden",
            "message": "System categories cannot be modified.",
        },
    )


def _raise_category_write_error(
    exc: psycopg2.Error,
    *,
    fallback_code: str,
    fallback_message: str,
) -> None:
    if exc.pgcode == errorcodes.UNIQUE_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "duplicate_amenity_category",
                "message": "Amenity category already exists for this tenant.",
            },
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "code": fallback_code,
            "message": fallback_message,
        },
    ) from exc


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
