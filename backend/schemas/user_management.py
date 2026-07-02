from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


AdminDirectoryRole = Literal[
    "EMPLOYEE",
    "MANAGER",
    "TALENT",
    "SECURITY",
    "TENANT_ADMIN",
    "TALENT_GUEST_COORDINATOR",
]

AdminDirectoryStatus = Literal[
    "ACTIVE",
    "INACTIVE",
    "LOCKED",
]


class UpdateMyProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    display_name: str | None = Field(default=None, max_length=200)
    mobile_phone: str | None = Field(default=None, max_length=50)
    office_location: str | None = Field(default=None, max_length=200)


class AdminUserAccessUpdateRequest(BaseModel):
    role_name: Literal[
        "EMPLOYEE",
        "MANAGER",
        "TALENT",
        "SECURITY",
    ] | None = None

    status: Literal[
        "ACTIVE",
        "INACTIVE",
    ] | None = None

class UserSearchResponse(BaseModel):
    user_id: str
    tenant_id: str

    full_name: str
    email: str

    role_name: str
    status: str

    employee_id: str | None = None
    department: str | None = None





class AdminUserDirectorySummary(CamelModel):
    total_users: int = Field(alias="totalUsers")
    filtered_users: int = Field(alias="filteredUsers")
    active_users: int = Field(alias="activeUsers")
    inactive_users: int = Field(alias="inactiveUsers")


class AdminUserDirectoryItem(CamelModel):
    id: str
    employee_id: str | None = Field(default=None, alias="employeeId")
    full_name: str | None = Field(default=None, alias="fullName")
    role_name: str = Field(alias="roleName")
    department: str | None = None
    job_title: str | None = Field(default=None, alias="jobTitle")
    mobile_phone: str | None = Field(default=None, alias="mobilePhone")
    status: str
    email: str | None = None




class UserDetailsResponse(CamelModel):
    id: str

    email: str
    full_name: str = Field(alias="fullName")
    display_name: str | None = Field(
        default=None,
        alias="displayName",
    )

    role_name: str = Field(alias="roleName")
    status: str

    employee_id: str | None = Field(
        default=None,
        alias="employeeId",
    )

    mobile_phone: str | None = Field(
        default=None,
        alias="mobilePhone",
    )

    office_location: str | None = Field(
        default=None,
        alias="officeLocation",
    )

    job_title: str | None = Field(
        default=None,
        alias="jobTitle",
    )

    department: str | None = None

    company_name: str | None = Field(
        default=None,
        alias="companyName",
    )

    manager_user_id: str | None = Field(
        default=None,
        alias="managerUserId",
    )

    home_site_id: str | None = Field(
        default=None,
        alias="homeSiteId",
    )

class PermissionMetadata(CamelModel):
    id: int
    permission_key: str = Field(alias="permissionKey")
    description: str
    module_name: str = Field(alias="moduleName")


class RoleMetadata(CamelModel):
    role_id: int = Field(alias="roleId")
    role_name: str = Field(alias="roleName")
    role_description: str = Field(alias="roleDescription")

    user_count: int = Field(alias="userCount")

    permission_count: int = Field(alias="permissionCount")

    permissions: list[PermissionMetadata] = Field(
        default_factory=list
    )


class PaginationMetadata(CamelModel):
    page: int
    limit: int

    total_pages: int = Field(alias="totalPages")

    has_next: bool = Field(alias="hasNext")
    has_previous: bool = Field(alias="hasPrevious")


class AdminUserDirectoryResponse(CamelModel):
    summary: AdminUserDirectorySummary

    roles: list[RoleMetadata] = Field(
        default_factory=list
    )

    pagination: PaginationMetadata | None = None

    items: list[AdminUserDirectoryItem]