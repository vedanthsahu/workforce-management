from __future__ import annotations

from typing import Any, Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.preferences import (
    AdminAmenityResponse,
    AmenityCategoryListResponse,
    AmenityCategoryResponse,
    AmenityListResponse,
    CreateAmenityCategoryRequest,
    CreateAmenityRequest,
    PreferencesResponse,
    UpdateAmenityCategoryRequest,
    UpdateAmenityRequest,
)
from backend.services.preferences_service import (
    create_amenity,
    create_amenity_category,
    get_amenities,
    get_amenity,
    get_amenity_categories,
    get_amenity_category,
    get_preferences,
    update_amenity_category_metadata,
    update_amenity_metadata,
)

router = APIRouter(tags=["preferences"])


@router.get(
    "/preferences",
    response_model=PreferencesResponse,
)
def preferences(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> PreferencesResponse:

    payload = get_preferences(
        conn,
        tenant_id=current_user["tenant_id"],
    )

    return PreferencesResponse(**payload)


@router.get("/amenities", response_model=AmenityListResponse)
def amenities(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> AmenityListResponse:
    return get_amenities(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        page=page,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.get(
    "/amenity-categories",
    response_model=AmenityCategoryListResponse,
)
def amenity_categories(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> AmenityCategoryListResponse:
    return get_amenity_categories(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        page=page,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.get(
    "/amenity-categories/{category_id}",
    response_model=AmenityCategoryResponse,
)
def amenity_category(
    category_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AmenityCategoryResponse:
    return get_amenity_category(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        category_id=str(category_id),
    )


@router.post(
    "/amenity-categories",
    response_model=AmenityCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_amenity_category_route(
    payload: CreateAmenityCategoryRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AmenityCategoryResponse:
    return create_amenity_category(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        payload=payload,
    )


@router.patch(
    "/amenity-categories/{category_id}",
    response_model=AmenityCategoryResponse,
)
def update_amenity_category_route(
    category_id: Annotated[int, Path(gt=0)],
    payload: UpdateAmenityCategoryRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AmenityCategoryResponse:
    return update_amenity_category_metadata(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        category_id=str(category_id),
        payload=payload,
    )


@router.post(
    "/amenities",
    response_model=AdminAmenityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_amenity_route(
    payload: CreateAmenityRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AdminAmenityResponse:
    return create_amenity(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        payload=payload,
    )


@router.get("/amenities/{amenity_id}", response_model=AdminAmenityResponse)
def amenity_detail(
    amenity_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AdminAmenityResponse:
    return get_amenity(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        amenity_id=str(amenity_id),
    )


@router.patch("/amenities/{amenity_id}", response_model=AdminAmenityResponse)
def update_amenity_route(
    amenity_id: Annotated[int, Path(gt=0)],
    payload: UpdateAmenityRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AdminAmenityResponse:
    return update_amenity_metadata(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        amenity_id=str(amenity_id),
        payload=payload,
    )
