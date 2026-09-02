from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import get_current_user, require_permission
from backend.core.audit_actions import (
    AMENITY_CATEGORY_CREATED,
    AMENITY_CATEGORY_UPDATED,
    AMENITY_CREATED,
    AMENITY_UPDATED,
)
from backend.db.connection import get_db
from backend.repositories.audit_repository import safe_write_audit_log
from backend.schemas.preferences import (
    AdminAmenityResponse,
    AmenityCategoryListResponse,
    AmenityCategoryResponse,
    AmenityListResponse,
    CreateAmenityCategoryRequest,
    CreateAmenityRequest,
    MyPreferencesResponse,
    PreferencesResponse,
    UpdateAmenityCategoryRequest,
    UpdateAmenityRequest,
    UpdateMyPreferencesRequest,
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
    update_my_preferences,
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


@router.post(
    "/preferences/me",
    response_model=MyPreferencesResponse,
)
def update_my_preferences_route(
    payload: UpdateMyPreferencesRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> MyPreferencesResponse:

    return update_my_preferences(
        conn,
        current_user=current_user,
        payload=payload,
    )


@router.get("/amenities", response_model=AmenityListResponse)
def amenities(
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity:view"))],
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
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity_category:view"))],
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
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity_category:view"))],
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
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity_category:create"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AmenityCategoryResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = create_amenity_category(conn, tenant_id=tenant_id, payload=payload)
    except HTTPException as he:
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=AMENITY_CATEGORY_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="amenity_category", resource_id=None,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    safe_write_audit_log(
        conn, action=AMENITY_CATEGORY_CREATED, tenant_id=tenant_id,
        current_user=current_user, resource_type="amenity_category", resource_id=str(result.category_id),
        new_values={"category_name": result.category_name},
    )
    return result


@router.patch(
    "/amenity-categories/{category_id}",
    response_model=AmenityCategoryResponse,
)
def update_amenity_category_route(
    category_id: Annotated[int, Path(gt=0)],
    payload: UpdateAmenityCategoryRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity_category:update"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AmenityCategoryResponse:
    sent = payload.model_dump(exclude_unset=True)
    tenant_id = str(current_user["tenant_id"])
    old = get_amenity_category(conn, tenant_id=tenant_id, category_id=str(category_id))
    result = update_amenity_category_metadata(conn, tenant_id=tenant_id, category_id=str(category_id), payload=payload)
    actually_changed = [k for k in sent if getattr(old, k, None) != sent[k]] if old else list(sent.keys())
    safe_write_audit_log(
        conn, action=AMENITY_CATEGORY_UPDATED, tenant_id=tenant_id,
        current_user=current_user, resource_type="amenity_category", resource_id=str(category_id),
        old_values={k: getattr(old, k, None) for k in sent} if old else None,
        new_values=sent,
        changed_fields=actually_changed or None,
    )
    return result


@router.post(
    "/amenities",
    response_model=AdminAmenityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_amenity_route(
    payload: CreateAmenityRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity:create"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AdminAmenityResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = create_amenity(conn, tenant_id=tenant_id, payload=payload)
    except HTTPException as he:
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=AMENITY_CREATED, tenant_id=tenant_id,
            current_user=current_user, resource_type="amenity", resource_id=None,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"), failure_reason=_d.get("message"),
        )
        raise
    safe_write_audit_log(
        conn, action=AMENITY_CREATED, tenant_id=tenant_id,
        current_user=current_user, resource_type="amenity", resource_id=str(result.amenity_id),
        new_values={"amenity_name": result.amenity_name, "category_id": str(result.category_id)},
    )
    return result


@router.get("/amenities/{amenity_id}", response_model=AdminAmenityResponse)
def amenity_detail(
    amenity_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity:view"))],
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
    current_user: Annotated[dict[str, Any], Depends(require_permission("amenity:update"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> AdminAmenityResponse:
    sent = payload.model_dump(exclude_unset=True)
    tenant_id = str(current_user["tenant_id"])
    old = get_amenity(conn, tenant_id=tenant_id, amenity_id=str(amenity_id))
    result = update_amenity_metadata(conn, tenant_id=tenant_id, amenity_id=str(amenity_id), payload=payload)
    actually_changed = [k for k in sent if getattr(old, k, None) != sent[k]] if old else list(sent.keys())
    safe_write_audit_log(
        conn, action=AMENITY_UPDATED, tenant_id=tenant_id,
        current_user=current_user, resource_type="amenity", resource_id=str(amenity_id),
        old_values={k: getattr(old, k, None) for k in sent} if old else None,
        new_values=sent,
        changed_fields=actually_changed or None,
    )
    return result
