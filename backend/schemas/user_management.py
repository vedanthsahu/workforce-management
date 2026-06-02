from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


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