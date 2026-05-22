"""
Routes for floor layout management.
"""

from __future__ import annotations

import json
from typing import Any, Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Path,
    UploadFile,
    status,
)
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_permission
from backend.db.connection import get_db
from backend.schemas.floor_layout import (
    CreateFloorLayoutRequest,
    FloorLayoutResponse,
)
from backend.services.floor_layout_service import (
    activate_floor_layout,
    create_floor_layout,
    get_floor_layouts_by_floor,
)
router = APIRouter(
    prefix="/admin/floor-layouts",
    tags=["floor-layouts"],
)

@router.post(
    "",
    response_model=FloorLayoutResponse,
    status_code=201,
)
def create_floor_layout_route(
    background_tasks: BackgroundTasks,

    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("layout:upload")),
    ],

    conn: Annotated[PGConnection, Depends(get_db)],

    file: UploadFile = File(...),
    site_id: int = Form(gt=0),
    building_id: int = Form(gt=0),
    floor_id: int = Form(gt=0),
    layout_name: str = Form(min_length=1, max_length=255),
    status: str = Form(pattern="^(DRAFT|PUBLISHED)$"),
    layout_metadata: str | None = Form(default=None),
) -> FloorLayoutResponse:

    payload = CreateFloorLayoutRequest(
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
        layout_name=layout_name,
        status=status,
        layout_metadata=_parse_layout_metadata(layout_metadata),
    )

    return create_floor_layout(
        conn,
        current_user=current_user,
        payload=payload,
        file=file,
        background_tasks=background_tasks,
    )


@router.get(
    "/floors/{floor_id}",
    response_model=list[FloorLayoutResponse],
)
def list_floor_layouts_route(
    floor_id: Annotated[int, Path(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("layout:upload")),
    ],

    conn: Annotated[PGConnection, Depends(get_db)],
) -> list[FloorLayoutResponse]:

    return get_floor_layouts_by_floor(
        conn,
        current_user=current_user,
        floor_id=str(floor_id),
    )


@router.post(
    "/{layout_id}/activate",
    response_model=FloorLayoutResponse,
)
def activate_floor_layout_route(
    layout_id: Annotated[int, Path(gt=0)],

    background_tasks: BackgroundTasks,

    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("layout:publish")),
    ],

    conn: Annotated[PGConnection, Depends(get_db)],
) -> FloorLayoutResponse:

    return activate_floor_layout(
        conn,
        current_user=current_user,
        layout_id=str(layout_id),
        background_tasks=background_tasks,
    )


def _parse_layout_metadata(
    layout_metadata: str | None,
) -> dict[str, Any] | None:
    if layout_metadata is None or layout_metadata.strip() == "":
        return None

    try:
        parsed_metadata = json.loads(layout_metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_layout_metadata",
                "message": "layout_metadata must be valid JSON.",
            },
        ) from exc

    if not isinstance(parsed_metadata, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_layout_metadata",
                "message": "layout_metadata must be a JSON object.",
            },
        )

    return parsed_metadata
