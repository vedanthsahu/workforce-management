from __future__ import annotations

from typing import Any, Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user
from backend.db.connection import get_db
from backend.schemas.preferences import (
    AdminAmenityResponse,
    AmenityListResponse,
    CreateAmenityRequest,
    PreferencesResponse,
    UpdateAmenityRequest,
)
from backend.services.preferences_service import (
    create_amenity,
    get_amenities,
    get_preferences,
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
