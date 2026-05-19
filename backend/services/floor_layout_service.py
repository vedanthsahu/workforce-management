"""
Service layer for floor layout workflows.
"""

from __future__ import annotations

from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.core.enums import LayoutStatus
from backend.repositories.floor_layout_repository import (
    activate_floor_layout as activate_floor_layout_record,
    archive_existing_published_layout,
    archive_existing_published_layouts,
    fetch_floor_for_layout,
    fetch_floor_layout_by_id,
    fetch_floor_layouts_by_floor,
    get_next_layout_version,
    insert_floor_layout,
)
from backend.schemas.floor_layout import (
    CreateFloorLayoutRequest,
    FloorLayoutResponse,
)


def create_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateFloorLayoutRequest,
) -> FloorLayoutResponse:

    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    try:
        floor = fetch_floor_for_layout(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
        )

        if floor is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_floor_hierarchy",
                    "message": "Floor does not belong to provided hierarchy.",
                },
            )

        if payload.status == "PUBLISHED":
            archive_existing_published_layout(
                conn,
                tenant_id=tenant_id,
                floor_id=str(payload.floor_id),
            )

        version_no = get_next_layout_version(
            conn,
            tenant_id=tenant_id,
            floor_id=str(payload.floor_id),
        )

        created_layout = insert_floor_layout(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            layout_name=payload.layout_name,
            layout_file_url=payload.layout_file_url,
            version_no=version_no,
            status=payload.status,
            layout_metadata=payload.layout_metadata,
            uploaded_by_user_id=user_id,
        )

        conn.commit()

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_create_failed",
                "message": "Failed to create floor layout.",
            },
        ) from exc

    return FloorLayoutResponse(**created_layout)


def get_floor_layouts_by_floor(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    floor_id: str,
) -> list[FloorLayoutResponse]:
    """Return all layouts for one tenant-scoped floor."""
    try:
        layouts = fetch_floor_layouts_by_floor(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            floor_id=floor_id,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_lookup_failed",
                "message": "Failed to fetch floor layouts.",
            },
        ) from exc

    return [FloorLayoutResponse(**layout) for layout in layouts]


def activate_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout_id: str,
) -> FloorLayoutResponse:
    """Publish one layout and archive any currently active layout on the floor."""
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    try:
        layout = fetch_floor_layout_by_id(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
        )

        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )

        if (
            layout.get("is_published") is True
            and layout.get("status") == LayoutStatus.PUBLISHED.value
        ):
            return FloorLayoutResponse(**layout)

        archive_existing_published_layouts(
            conn,
            tenant_id=tenant_id,
            floor_id=str(layout["floor_id"]),
        )

        activated_layout = activate_floor_layout_record(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
            published_by_user_id=user_id,
        )

        if activated_layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )

        conn.commit()

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_activate_failed",
                "message": "Failed to activate floor layout.",
            },
        ) from exc

    return FloorLayoutResponse(**activated_layout)
