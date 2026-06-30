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
    "PRODUCT_ADMIN",
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


class RoleSummary(CamelModel):
    role_name: str = Field(alias="roleName")
    count: int


class AdminUserDirectorySummary(CamelModel):
    total_users: int = Field(alias="totalUsers")
    filtered_users: int = Field(alias="filteredUsers")
    active_users: int = Field(alias="activeUsers")
    inactive_users: int = Field(alias="inactiveUsers")
    roles: list[RoleSummary] = Field(default_factory=list)


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


class AdminUserDirectoryResponse(CamelModel):
    summary: AdminUserDirectorySummary
    items: list[AdminUserDirectoryItem]
