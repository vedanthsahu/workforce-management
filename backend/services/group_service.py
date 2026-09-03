"""Service layer for the group-based permission model: group CRUD, group
permission editing, user<->group assignment, and role<->group eligibility.

Escalation rule implemented (the simpler half of the privilege-escalation
requirement): an actor can never cause a permission to be newly granted
through a group unless they already hold that permission themselves, or
their role is in the existing ADMIN_ROLE_NAMES bypass. The harder half --
validating a group edit against a formal per-role capability ceiling -- is
NOT implemented; it needs its own design pass before it can be built.
"""

from __future__ import annotations

from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.api.deps import ADMIN_ROLE_NAMES
from backend.repositories.group_repository import (
    delete_role_group,
    delete_user_group,
    deactivate_group as deactivate_group_row,
    fetch_group_by_id,
    fetch_group_detail,
    fetch_group_reference_counts,
    fetch_groups_for_role,
    fetch_groups_for_tenant,
    fetch_groups_for_user,
    fetch_permission_ids_for_group,
    fetch_role_by_id,
    insert_group,
    insert_group_permissions,
    insert_role_group,
    insert_user_group,
    is_group_eligible_for_role,
    replace_group_permissions,
    update_group_metadata,
)
from backend.repositories.permission_repository import (
    fetch_effective_permission_ids_for_user,
    fetch_permissions_catalog,
    fetch_permissions_for_user,
)
from backend.repositories.user_repository import fetch_user_by_id
from backend.schemas.group import (
    GroupAssignmentResponse,
    GroupDetailResponse,
    GroupListResponse,
    GroupMutationResponse,
    PermissionCatalogResponse,
    RoleGroupAssignmentResponse,
    RoleGroupListResponse,
    UserEffectivePermissionsResponse,
    UserGroupListResponse,
)


# ── shared helpers ────────────────────────────────────────────────────────────

def _require_user(conn: PGConnection, *, tenant_id: str, user_id: str) -> dict[str, Any]:
    user = fetch_user_by_id(conn, tenant_id=tenant_id, user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "user_not_found", "message": "User not found."},
        )
    return user


def _require_group(conn: PGConnection, *, tenant_id: str, group_id: str) -> dict[str, Any]:
    group = fetch_group_by_id(conn, tenant_id=tenant_id, group_id=group_id)
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "group_not_found", "message": "Group not found."},
        )
    return group


def _require_role(conn: PGConnection, *, tenant_id: str, role_id: str) -> dict[str, Any]:
    role = fetch_role_by_id(conn, tenant_id=tenant_id, role_id=role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "role_not_found", "message": "Role not found."},
        )
    return role


def _require_group_active(group: dict[str, Any]) -> None:
    if not group["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "group_inactive", "message": "This group has been deactivated and cannot be assigned."},
        )


def _is_bypass_actor(current_user: dict[str, Any]) -> bool:
    role_name = str(current_user.get("role_name") or current_user.get("role") or "").strip().upper()
    return role_name in ADMIN_ROLE_NAMES


def _require_actor_holds(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    permission_ids: set[int],
) -> None:
    """Escalation guard: refuse to let a group grant a permission the actor
    doesn't themselves hold, unless they're an existing bypass role."""
    if not permission_ids or _is_bypass_actor(current_user):
        return

    tenant_id = str(current_user["tenant_id"])
    actor_permission_ids = fetch_effective_permission_ids_for_user(
        conn, tenant_id=tenant_id, user_id=str(current_user.get("user_id")),
    )
    missing = permission_ids - actor_permission_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "cannot_grant_unheld_permission",
                "message": "You cannot grant a permission you do not hold yourself.",
                "permission_ids": sorted(str(p) for p in missing),
            },
        )


def _require_active_permission_ids(
    conn: PGConnection,
    *,
    permission_ids: list[str],
) -> set[int]:
    """Validate every id is real and active; return them as ints."""
    catalog = fetch_permissions_catalog(conn, active_only=False)
    by_id = {row["permission_id"]: row for row in catalog}

    resolved: set[int] = set()
    for pid in permission_ids:
        row = by_id.get(pid)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "unknown_permission", "message": f"Unknown permission id: {pid}"},
            )
        if not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "inactive_permission",
                    "message": f"Permission {row['permission_key']} is inactive and cannot be assigned.",
                },
            )
        resolved.add(int(pid))
    return resolved


# ── user <-> group ────────────────────────────────────────────────────────────

def get_groups_for_user(conn: PGConnection, *, tenant_id: str, user_id: str) -> UserGroupListResponse:
    _require_user(conn, tenant_id=tenant_id, user_id=user_id)
    groups = fetch_groups_for_user(conn, tenant_id=tenant_id, user_id=user_id)
    return UserGroupListResponse(groups=groups)


def assign_group_to_user(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    target_user_id: str,
    group_id: str,
) -> GroupAssignmentResponse:
    tenant_id = str(current_user["tenant_id"])
    target_user = _require_user(conn, tenant_id=tenant_id, user_id=target_user_id)
    group = _require_group(conn, tenant_id=tenant_id, group_id=group_id)
    _require_group_active(group)

    if not is_group_eligible_for_role(
        conn, tenant_id=tenant_id, group_id=group_id, role_name=str(target_user["role_name"]),
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "group_not_eligible_for_role",
                "message": "This group is not eligible for the target user's role.",
            },
        )

    _require_actor_holds(
        conn, current_user=current_user,
        permission_ids=fetch_permission_ids_for_group(conn, group_id=group_id),
    )

    try:
        insert_user_group(
            conn, user_id=target_user_id, group_id=group_id,
            assigned_by_user_id=current_user.get("user_id"),
        )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "group_already_assigned", "message": "This user already has this group."},
        )

    conn.commit()
    # NOTE: assigning a group should force the affected user's refresh token
    # to be revoked so the new permission applies immediately. Not wired in
    # yet -- depends on the still-deferred refresh-token grace migration.
    return GroupAssignmentResponse(user_id=target_user_id, group_id=group_id, group_name=group["group_name"])


def remove_group_from_user(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    target_user_id: str,
    group_id: str,
) -> None:
    tenant_id = str(current_user["tenant_id"])
    _require_user(conn, tenant_id=tenant_id, user_id=target_user_id)
    group = _require_group(conn, tenant_id=tenant_id, group_id=group_id)

    if group["group_tier"] == "REQUIRED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "cannot_remove_required_group",
                "message": (
                    "This is the mandatory floor group for this user's role and cannot be removed "
                    "while they remain in that role. Demote or deactivate the user instead."
                ),
            },
        )

    deleted = delete_user_group(conn, user_id=target_user_id, group_id=group_id)
    if not deleted:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "group_not_assigned", "message": "This user does not have this group."},
        )

    conn.commit()
    # NOTE: same refresh-token-revocation gap noted in assign_group_to_user.


def get_effective_permissions_for_user(
    conn: PGConnection, *, tenant_id: str, user_id: str,
) -> UserEffectivePermissionsResponse:
    _require_user(conn, tenant_id=tenant_id, user_id=user_id)
    perms = fetch_permissions_for_user(conn, tenant_id=tenant_id, user_id=user_id)
    return UserEffectivePermissionsResponse(user_id=user_id, permissions=perms)


# ── group CRUD ────────────────────────────────────────────────────────────────

def list_groups(conn: PGConnection, *, tenant_id: str) -> GroupListResponse:
    return GroupListResponse(groups=fetch_groups_for_tenant(conn, tenant_id=tenant_id))


def get_group(conn: PGConnection, *, tenant_id: str, group_id: str) -> GroupDetailResponse:
    detail = fetch_group_detail(conn, tenant_id=tenant_id, group_id=group_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "group_not_found", "message": "Group not found."},
        )
    return GroupDetailResponse(**detail)


def create_group(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    group_name: str,
    description: str | None,
    group_tier: str,
    permission_ids: list[str],
    role_ids: list[str],
) -> GroupMutationResponse:
    tenant_id = str(current_user["tenant_id"])

    resolved_permission_ids = _require_active_permission_ids(conn, permission_ids=permission_ids)
    _require_actor_holds(conn, current_user=current_user, permission_ids=resolved_permission_ids)

    for role_id in role_ids:
        _require_role(conn, tenant_id=tenant_id, role_id=role_id)

    try:
        group = insert_group(
            conn, tenant_id=tenant_id, group_name=group_name,
            description=description, group_tier=group_tier,
        )
        insert_group_permissions(
            conn, group_id=group["group_id"], permission_ids=sorted(resolved_permission_ids),
        )
        for role_id in role_ids:
            insert_role_group(conn, role_id=role_id, group_id=group["group_id"])
    except psycopg2.errors.UniqueViolation as exc:
        conn.rollback()
        constraint = getattr(exc.diag, "constraint_name", "") or ""
        if "permission_set" in constraint:
            code, message = "duplicate_permission_set", "A group with this exact permission set already exists."
        elif "name" in constraint:
            code, message = "duplicate_group_name", "A group with this name already exists in this tenant."
        else:
            code, message = "duplicate_group", "This group conflicts with an existing one."
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"code": code, "message": message})

    conn.commit()
    return GroupMutationResponse(**group)


def update_group(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    group_id: str,
    group_name: str | None,
    description: str | None,
    expected_version: int,
) -> GroupMutationResponse:
    tenant_id = str(current_user["tenant_id"])
    existing = _require_group(conn, tenant_id=tenant_id, group_id=group_id)

    if existing["is_system"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "system_group_protected", "message": "System groups cannot be modified."},
        )

    try:
        updated = update_group_metadata(
            conn, tenant_id=tenant_id, group_id=group_id, group_name=group_name,
            description=description, expected_version=expected_version,
        )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "duplicate_group_name", "message": "A group with this name already exists in this tenant."},
        )

    if updated is None:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "version_conflict",
                "message": "This group was modified by someone else. Reload and try again.",
            },
        )

    conn.commit()
    return GroupMutationResponse(**updated)


def update_group_permissions(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    group_id: str,
    permission_ids: list[str],
) -> GroupDetailResponse:
    tenant_id = str(current_user["tenant_id"])
    existing = _require_group(conn, tenant_id=tenant_id, group_id=group_id)

    if existing["is_system"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "system_group_protected", "message": "System group permissions cannot be modified."},
        )

    resolved_permission_ids = _require_active_permission_ids(conn, permission_ids=permission_ids)
    current_permission_ids = fetch_permission_ids_for_group(conn, group_id=group_id)
    newly_added = resolved_permission_ids - current_permission_ids
    _require_actor_holds(conn, current_user=current_user, permission_ids=newly_added)

    try:
        replace_group_permissions(
            conn, group_id=group_id, permission_ids=sorted(resolved_permission_ids),
        )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "duplicate_permission_set",
                "message": "Another group in this tenant already has this exact permission set.",
            },
        )

    conn.commit()
    return get_group(conn, tenant_id=tenant_id, group_id=group_id)


def deactivate_group(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    group_id: str,
) -> None:
    tenant_id = str(current_user["tenant_id"])
    group = _require_group(conn, tenant_id=tenant_id, group_id=group_id)

    if group["is_system"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "system_group_protected", "message": "System groups cannot be deleted."},
        )

    refs = fetch_group_reference_counts(conn, group_id=group_id)
    if refs["user_count"] > 0 or refs["role_count"] > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "group_in_use",
                "message": "This group is currently assigned to users or roles and cannot be deleted.",
                "assigned_user_count": refs["user_count"],
                "eligible_role_count": refs["role_count"],
            },
        )

    deactivated = deactivate_group_row(conn, tenant_id=tenant_id, group_id=group_id)
    if not deactivated:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "group_not_found", "message": "Group not found."},
        )
    conn.commit()


def get_permissions_catalog(conn: PGConnection) -> PermissionCatalogResponse:
    return PermissionCatalogResponse(permissions=fetch_permissions_catalog(conn, active_only=True))


# ── role <-> group eligibility ─────────────────────────────────────────────────

def list_groups_for_role(conn: PGConnection, *, tenant_id: str, role_id: str) -> RoleGroupListResponse:
    _require_role(conn, tenant_id=tenant_id, role_id=role_id)
    groups = fetch_groups_for_role(conn, tenant_id=tenant_id, role_id=role_id)
    return RoleGroupListResponse(role_id=role_id, groups=groups)


def assign_group_to_role(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    role_id: str,
    group_id: str,
) -> RoleGroupAssignmentResponse:
    tenant_id = str(current_user["tenant_id"])
    _require_role(conn, tenant_id=tenant_id, role_id=role_id)
    group = _require_group(conn, tenant_id=tenant_id, group_id=group_id)
    _require_group_active(group)

    if group["group_tier"] == "REQUIRED":
        existing = fetch_groups_for_role(conn, tenant_id=tenant_id, role_id=role_id)
        if any(g["group_tier"] == "REQUIRED" for g in existing):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "role_already_has_required_group",
                    "message": "This role already has a REQUIRED (floor) group -- a role may only have one.",
                },
            )

    # Attaching a group to a whole role is a bigger escalation surface than
    # assigning it to one user -- everyone eligible for that role gains it.
    _require_actor_holds(
        conn, current_user=current_user,
        permission_ids=fetch_permission_ids_for_group(conn, group_id=group_id),
    )

    try:
        insert_role_group(conn, role_id=role_id, group_id=group_id)
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_eligible", "message": "This group is already eligible for this role."},
        )

    conn.commit()
    return RoleGroupAssignmentResponse(role_id=role_id, group_id=group_id, group_name=group["group_name"])


def remove_group_from_role(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    role_id: str,
    group_id: str,
) -> None:
    tenant_id = str(current_user["tenant_id"])
    _require_role(conn, tenant_id=tenant_id, role_id=role_id)
    group = _require_group(conn, tenant_id=tenant_id, group_id=group_id)

    if group["group_tier"] == "REQUIRED":
        eligible = fetch_groups_for_role(conn, tenant_id=tenant_id, role_id=role_id)
        required_count = sum(1 for g in eligible if g["group_tier"] == "REQUIRED")
        if required_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "role_would_lose_required_group",
                    "message": "Removing this would leave the role with no mandatory floor group.",
                },
            )

    deleted = delete_role_group(conn, role_id=role_id, group_id=group_id)
    if not deleted:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_eligible", "message": "This group is not currently eligible for this role."},
        )
    conn.commit()
