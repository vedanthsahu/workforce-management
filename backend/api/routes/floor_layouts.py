"""
Routes for floor layout management.
"""

from __future__ import annotations

import json
from typing import Annotated, Any

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
from backend.core.audit_actions import FLOOR_LAYOUT_UPLOADED
from backend.db.connection import get_db
from backend.repositories.audit_repository import safe_write_audit_log
from backend.schemas.floor_layout import (
    CreateFloorLayoutRequest,
    FloorLayoutResponse,
    LayoutSeatListResponse,
)
from backend.services.floor_layout_service import (
    activate_floor_layout,
    create_floor_layout,
    delete_floor_layout,
    get_floor_layout_seats,
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
        Depends(require_permission("layout:create")),
    ],

    conn: Annotated[PGConnection, Depends(get_db)],

    file: UploadFile = File(...),
    site_id: int = Form(gt=0),
    building_id: int = Form(gt=0),
    floor_id: int = Form(gt=0),
    layout_name: str = Form(min_length=1, max_length=255),
    status: str = Form(pattern="^(DRAFT|PUBLISHED)$"),
    layout_metadata: str | None = Form(default=None),
    seat_ids: list[str] = Form(...),
) -> FloorLayoutResponse:

    payload = CreateFloorLayoutRequest(
    site_id=site_id,
    building_id=building_id,
    floor_id=floor_id,
    layout_name=layout_name,
    status=status,
    layout_metadata=_parse_layout_metadata(layout_metadata),
    seat_ids=seat_ids,
    )


    try:
        result = create_floor_layout(
            conn,
            current_user=current_user,
            payload=payload,
            file=file,
            background_tasks=background_tasks,
        )
    except HTTPException as he:
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=FLOOR_LAYOUT_UPLOADED, tenant_id=str(current_user["tenant_id"]),
            current_user=current_user, resource_type="floor_layout", resource_id=None,
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=_d.get("code"),
            failure_reason=_d.get("message"),
        )
        raise
    safe_write_audit_log(
        conn, action=FLOOR_LAYOUT_UPLOADED, tenant_id=str(current_user["tenant_id"]),
        current_user=current_user, resource_type="floor_layout", resource_id=str(result.layout_id),
        new_values={"layout_name": result.layout_name, "floor_id": str(payload.floor_id), "status": result.status},
    )
    return result


@router.get(
    "/floors/{floor_id}",
    response_model=list[FloorLayoutResponse],
)
def list_floor_layouts_route(
    floor_id: Annotated[int, Path(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("layout:view")),
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

    result = activate_floor_layout(
        conn,
        current_user=current_user,
        layout_id=str(layout_id),
        background_tasks=background_tasks,
    )
    return result

@router.delete(
    "/{layout_id}",
    response_model=FloorLayoutResponse,
)
def delete_floor_layout_route(
    layout_id: Annotated[int, Path(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("layout:delete")),
    ],

    conn: Annotated[PGConnection, Depends(get_db)],
) -> FloorLayoutResponse:

    result = delete_floor_layout(
        conn,
        current_user=current_user,
        layout_id=str(layout_id),
    )
    return result


@router.get(
    "/{layout_id}/seats",
    response_model=LayoutSeatListResponse,
)
def get_floor_layout_seats_route(

    layout_id: Annotated[int, Path(gt=0)],

    current_user: Annotated[
        dict[str, Any],
        Depends(require_permission("layout:view")),
    ],

    conn: Annotated[
        PGConnection,
        Depends(get_db),
    ],

) -> LayoutSeatListResponse:

    return get_floor_layout_seats(
        conn,
        current_user=current_user,
        layout_id=str(layout_id),
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