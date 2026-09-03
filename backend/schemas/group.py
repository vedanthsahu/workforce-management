from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

GroupTier = Literal["REQUIRED", "STANDARD", "SPECIALIZED", "ADD_ON"]


class UserGroupItem(BaseModel):
    group_id: str
    group_name: str
    description: str | None = None
    is_system: bool
    assigned_at: datetime
    assigned_by_user_id: str | None = None


class UserGroupListResponse(BaseModel):
    groups: list[UserGroupItem]


class AssignGroupRequest(BaseModel):
    group_id: str


class GroupAssignmentResponse(BaseModel):
    user_id: str
    group_id: str
    group_name: str


class GroupSummary(BaseModel):
    group_id: str
    group_name: str
    description: str | None = None
    is_system: bool
    is_active: bool
    group_tier: GroupTier
    version: int
    permission_count: int
    assigned_user_count: int


class GroupListResponse(BaseModel):
    groups: list[GroupSummary]


class GroupPermissionItem(BaseModel):
    permission_id: str
    permission_key: str
    module_name: str | None = None


class GroupDetailResponse(BaseModel):
    group_id: str
    tenant_id: str
    group_name: str
    description: str | None = None
    is_system: bool
    is_active: bool
    group_tier: GroupTier
    version: int
    permissions: list[GroupPermissionItem]


class CreateGroupRequest(BaseModel):
    group_name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    group_tier: GroupTier
    permission_ids: list[str] = Field(min_length=1)
    role_ids: list[str] = Field(default_factory=list)


class UpdateGroupRequest(BaseModel):
    group_name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    expected_version: int


class GroupMutationResponse(BaseModel):
    group_id: str
    group_name: str
    description: str | None = None
    group_tier: GroupTier
    is_system: bool
    is_active: bool
    version: int


class UpdateGroupPermissionsRequest(BaseModel):
    permission_ids: list[str] = Field(min_length=1)


class PermissionCatalogItem(BaseModel):
    permission_id: str
    permission_key: str
    description: str | None = None
    module_name: str | None = None
    enforcement_scope: str
    is_active: bool


class PermissionCatalogResponse(BaseModel):
    permissions: list[PermissionCatalogItem]


class UserEffectivePermissionsResponse(BaseModel):
    user_id: str
    permissions: list[str]


class RoleGroupItem(BaseModel):
    group_id: str
    group_name: str
    group_tier: GroupTier
    is_system: bool


class RoleGroupListResponse(BaseModel):
    role_id: str
    groups: list[RoleGroupItem]


class AssignRoleGroupRequest(BaseModel):
    group_id: str


class RoleGroupAssignmentResponse(BaseModel):
    role_id: str
    group_id: str
    group_name: str
