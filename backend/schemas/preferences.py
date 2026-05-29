from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AmenityStatusFilter = Literal["ACTIVE", "INACTIVE"]


def _trim_string(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _uppercase_key(value: str | None) -> str | None:
    trimmed = _trim_string(value)
    return trimmed.upper() if trimmed is not None else None


class AmenityResponse(BaseModel):
    id: str
    key: str
    name: str
    category: str | None = None
    description: str | None = None
    icon: str | None = None


class PreferencesResponse(BaseModel):
    amenities: list[AmenityResponse]


class CreateAmenityRequest(BaseModel):
    amenity_key: str = Field(min_length=1, max_length=100)
    amenity_name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    icon_name: str | None = Field(default=None, max_length=100)
    category_id: int = Field(gt=0)
    is_active: bool = True

    @field_validator("amenity_key", mode="before")
    @classmethod
    def normalize_key(cls, value: str) -> str:
        normalized = _uppercase_key(value)
        if normalized is None:
            raise ValueError("amenity_key is required.")
        return normalized

    @field_validator("amenity_name", "description", "icon_name", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)


class UpdateAmenityRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    amenity_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    icon_name: str | None = Field(default=None, max_length=100)
    category_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None

    @field_validator("amenity_name", "description", "icon_name", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)


class AdminAmenityResponse(BaseModel):
    amenity_id: str
    amenity_key: str
    amenity_name: str
    description: str | None = None
    icon_name: str | None = None
    category_id: str
    category_name: str | None = None
    is_active: bool
    assigned_seat_count: int = 0


class AmenityListResponse(BaseModel):
    items: list[AdminAmenityResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    total_amenities: int
    active_amenities: int
    inactive_amenities: int
    assigned_amenities: int
