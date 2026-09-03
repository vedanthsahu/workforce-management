"""Routes for role<->group eligibility (role_groups) -- which groups a role
may receive, not an authorization path itself.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import require_permission
from backend.core.audit_actions import ROLE_GROUP_ASSIGNED, ROLE_GROUP_REMOVED
from backend.db.connection import get_db
from backend.repositories.audit_repository import safe_write_audit_log
from backend.schemas.group import (
    AssignRoleGroupRequest,
    RoleGroupAssignmentResponse,
    RoleGroupListResponse,
)
from backend.services.group_service import (
    assign_group_to_role,
    list_groups_for_role,
    remove_group_from_role,
)

router = APIRouter(prefix="/roles/{role_id}/groups", tags=["roles"])


@router.get("", response_model=RoleGroupListResponse)
def list_role_groups(
    role_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("role:view_groups"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> RoleGroupListResponse:
    return list_groups_for_role(conn, tenant_id=str(current_user["tenant_id"]), role_id=str(role_id))


@router.post("", response_model=RoleGroupAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_role_group(
    role_id: Annotated[int, Path(gt=0)],
    payload: AssignRoleGroupRequest,
    current_user: Annotated[dict[str, Any], Depends(require_permission("role:assign_group"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> RoleGroupAssignmentResponse:
    tenant_id = str(current_user["tenant_id"])
    try:
        result = assign_group_to_role(
            conn, current_user=current_user, role_id=str(role_id), group_id=payload.group_id,
        )
    except HTTPException as he:
        d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=ROLE_GROUP_ASSIGNED, tenant_id=tenant_id, current_user=current_user,
            resource_type="role_group", resource_id=str(role_id),
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=d.get("code"), failure_reason=d.get("message"),
        )
        raise
    safe_write_audit_log(
        conn, action=ROLE_GROUP_ASSIGNED, tenant_id=tenant_id, current_user=current_user,
        resource_type="role_group", resource_id=str(role_id),
        new_values={"group_id": result.group_id, "group_name": result.group_name},
    )
    return result


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_role_group(
    role_id: Annotated[int, Path(gt=0)],
    group_id: Annotated[int, Path(gt=0)],
    current_user: Annotated[dict[str, Any], Depends(require_permission("role:remove_group"))],
    conn: Annotated[PGConnection, Depends(get_db)],
) -> None:
    tenant_id = str(current_user["tenant_id"])
    try:
        remove_group_from_role(
            conn, current_user=current_user, role_id=str(role_id), group_id=str(group_id),
        )
    except HTTPException as he:
        d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=ROLE_GROUP_REMOVED, tenant_id=tenant_id, current_user=current_user,
            resource_type="role_group", resource_id=str(role_id),
            event_status="DENIED" if he.status_code == 403 else "FAILURE",
            failure_code=d.get("code"), failure_reason=d.get("message"),
        )
        raise
    safe_write_audit_log(
        conn, action=ROLE_GROUP_REMOVED, tenant_id=tenant_id, current_user=current_user,
        resource_type="role_group", resource_id=str(role_id),
        old_values={"group_id": str(group_id)},
    )
