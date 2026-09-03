"""Routes for group management: CRUD on groups, group permissions, and
assigning/removing groups on users. Role<->group eligibility lives in
roles.py instead, since it's addressed by role_id, not user_id.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_permission
from backend.core.audit_actions import (
    GROUP_ASSIGNED,
    GROUP_CREATED,
    GROUP_DEACTIVATED,
    GROUP_PERMISSIONS_UPDATED,
    GROUP_REMOVED,
    GROUP_UPDATED,
)
from backend.db.connection import get_db
from backend.repositories.audit_repository import safe_write_audit_log
from backend.schemas.group import (
    AssignGroupRequest,
    CreateGroupRequest,
    GroupAssignmentResponse,
    GroupDetailResponse,
    GroupListResponse,
    GroupMutationResponse,
    PermissionCatalogResponse,
    UpdateGroupPermissionsRequest,
    UpdateGroupRequest,
    UserEffectivePermissionsResponse,
    UserGroupListResponse,
)
from backend.services.group_service import (
    assign_group_to_user,
    create_group as create_group_service,
    deactivate_group as deactivate_group_service,
    get_effective_permissions_for_user,
    get_group,
    get_groups_for_user,
    get_permissions_catalog,
    list_groups,
    remove_group_from_user,
    update_group as update_group_service,
    update_group_permissions as update_group_permissions_service,
)

router = APIRouter(tags=["groups"])
user_groups_router = APIRouter(prefix="/users/{user_id}/groups", tags=["groups"])


def _audit_or_reraise(conn, *, action, tenant_id, current_user, resource_id, he: HTTPException):
    d = he.detail if isinstance(he.detail, dict) else {}
    safe_write_audit_log(
        conn, action=action, tenant_id=tenant_id, current_user=current_user,
        resource_type="group", resource_id=resource_id,
        event_status="DENIED" if he.status_code == 403 else "FAILURE",
        failure_code=d.get("code"), failure_reason=d.get("message"),
    )


# ── group CRUD ────────────────────────────────────────────────────────────────

@router.get("/groups", response_model=GroupListResponse)
def list_groups_route(
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:view"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GroupListResponse:
    return list_groups(conn, tenant_id=str(current_user["tenant_id"]))


@router.get("/groups/{group_id}", response_model=GroupDetailResponse)
def get_group_route(
    group_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:view"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GroupDetailResponse:
    return get_group(conn, tenant_id=str(current_user["tenant_id"]), group_id=str(group_id))


@router.post("/groups", response_model=GroupMutationResponse, status_code=status.HTTP_201_CREATED)
def create_group_route(
    payload: CreateGroupRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:create"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GroupMutationResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = create_group_service(
            conn, current_user=current_user, group_name=payload.group_name,
            description=payload.description, group_tier=payload.group_tier,
            permission_ids=payload.permission_ids, role_ids=payload.role_ids,
        )
    except HTTPException as he:
        _audit_or_reraise(conn, action=GROUP_CREATED, tenant_id=tenant_id, current_user=current_user, resource_id=None, he=he)
        raise
    safe_write_audit_log(
        conn, action=GROUP_CREATED, tenant_id=tenant_id, current_user=current_user,
        resource_type="group", resource_id=result.group_id,
        new_values={"group_name": result.group_name, "group_tier": result.group_tier},
    )
    return result


@router.patch("/groups/{group_id}", response_model=GroupMutationResponse)
def update_group_route(
    group_id: Annotated[int, Path(gt=0)],
    payload: UpdateGroupRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:update"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GroupMutationResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = update_group_service(
            conn, current_user=current_user, group_id=str(group_id),
            group_name=payload.group_name, description=payload.description,
            expected_version=payload.expected_version,
        )
    except HTTPException as he:
        _audit_or_reraise(conn, action=GROUP_UPDATED, tenant_id=tenant_id, current_user=current_user, resource_id=str(group_id), he=he)
        raise
    safe_write_audit_log(
        conn, action=GROUP_UPDATED, tenant_id=tenant_id, current_user=current_user,
        resource_type="group", resource_id=str(group_id),
        new_values={"group_name": result.group_name, "description": result.description},
    )
    return result


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_group_route(
    group_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:delete"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> None:
    tenant_id = str(current_user["tenant_id"])
    try:
        deactivate_group_service(conn, current_user=current_user, group_id=str(group_id))
    except HTTPException as he:
        _audit_or_reraise(conn, action=GROUP_DEACTIVATED, tenant_id=tenant_id, current_user=current_user, resource_id=str(group_id), he=he)
        raise
    safe_write_audit_log(
        conn, action=GROUP_DEACTIVATED, tenant_id=tenant_id, current_user=current_user,
        resource_type="group", resource_id=str(group_id),
    )


@router.patch("/groups/{group_id}/permissions", response_model=GroupDetailResponse)
def update_group_permissions_route(
    group_id: Annotated[int, Path(gt=0)],
    payload: UpdateGroupPermissionsRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:update_permissions"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GroupDetailResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = update_group_permissions_service(
            conn, current_user=current_user, group_id=str(group_id),
            permission_ids=payload.permission_ids,
        )
    except HTTPException as he:
        _audit_or_reraise(conn, action=GROUP_PERMISSIONS_UPDATED, tenant_id=tenant_id, current_user=current_user, resource_id=str(group_id), he=he)
        raise
    safe_write_audit_log(
        conn, action=GROUP_PERMISSIONS_UPDATED, tenant_id=tenant_id, current_user=current_user,
        resource_type="group", resource_id=str(group_id),
        new_values={"permission_count": len(result.permissions)},
    )
    return result


@router.get("/permissions", response_model=PermissionCatalogResponse)
def get_permissions_catalog_route(
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:view"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> PermissionCatalogResponse:
    return get_permissions_catalog(conn)


# ── user <-> group ────────────────────────────────────────────────────────────

@user_groups_router.get("", response_model=UserGroupListResponse)
def list_user_groups(
    user_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:view"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> UserGroupListResponse:
    return get_groups_for_user(conn, tenant_id=str(current_user["tenant_id"]), user_id=str(user_id))


@user_groups_router.post("", response_model=GroupAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_group(
    user_id: Annotated[int, Path(gt=0)],
    payload: AssignGroupRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:assign_user"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> GroupAssignmentResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = assign_group_to_user(
            conn, current_user=current_user, target_user_id=str(user_id), group_id=payload.group_id,
        )
    except HTTPException as he:
        _audit_or_reraise(conn, action=GROUP_ASSIGNED, tenant_id=tenant_id, current_user=current_user, resource_id=str(user_id), he=he)
        raise
    safe_write_audit_log(
        conn, action=GROUP_ASSIGNED, tenant_id=tenant_id, current_user=current_user,
        resource_type="user_group", resource_id=str(user_id),
        new_values={"group_id": result.group_id, "group_name": result.group_name},
    )
    return result


@user_groups_router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_group(
    user_id: Annotated[int, Path(gt=0)],
    group_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:remove_user"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> None:
    tenant_id = str(current_user["tenant_id"])
    try:
        remove_group_from_user(
            conn, current_user=current_user, target_user_id=str(user_id), group_id=str(group_id),
        )
    except HTTPException as he:
        _audit_or_reraise(conn, action=GROUP_REMOVED, tenant_id=tenant_id, current_user=current_user, resource_id=str(user_id), he=he)
        raise
    safe_write_audit_log(
        conn, action=GROUP_REMOVED, tenant_id=tenant_id, current_user=current_user,
        resource_type="user_group", resource_id=str(user_id),
        old_values={"group_id": str(group_id)},
    )


@router.get("/users/{user_id}/permissions", response_model=UserEffectivePermissionsResponse)
def get_user_effective_permissions_route(
    user_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("group:view"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> UserEffectivePermissionsResponse:
    return get_effective_permissions_for_user(
        conn, tenant_id=str(current_user["tenant_id"]), user_id=str(user_id),
    )
