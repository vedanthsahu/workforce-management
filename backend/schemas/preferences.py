from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AmenityStatusFilter = Literal["ACTIVE", "INACTIVE"]

_UNSAFE_KEY_CHARS = re.compile(r"[^A-Z0-9]+")
_DUPLICATE_UNDERSCORES = re.compile(r"_+")


def _trim_string(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _normalize_key(value: str | None) -> str | None:
    trimmed = _trim_string(value)
    if trimmed is None:
        return None

    normalized = _UNSAFE_KEY_CHARS.sub("_", trimmed.upper())
    normalized = _DUPLICATE_UNDERSCORES.sub("_", normalized)
    normalized = normalized.strip("_")
    return normalized or None


def generate_category_key(name: str) -> str:
    normalized = _normalize_key(name)
    if normalized is None:
        raise ValueError("category_name must contain at least one letter or number.")
    return normalized


def generate_amenity_key(name: str) -> str:
    normalized = _normalize_key(name)
    if normalized is None:
        raise ValueError("amenity_name must contain at least one letter or number.")
    return normalized


def _normalize_keywords(value: Any) -> Any:
    if value is None:
        return None
    if not isinstance(value, list):
        return value

    normalized: list[str] = []
    for item in value:
        if not isinstance(item, str):
            normalized.append(item)
            continue

        trimmed = item.strip()
        if trimmed:
            normalized.append(trimmed)
    return normalized


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
    amenity_name: str = Field(min_length=1, max_length=200)
    category_id: int = Field(gt=0)
    description: str | None = None
    icon_name: str | None = Field(default=None, max_length=100)
    is_active: bool = True

    @field_validator("amenity_name", "description", "icon_name", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @property
    def amenity_key(self) -> str:
        return generate_amenity_key(self.amenity_name)


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


class AmenityCategoryResponse(BaseModel):
    category_id: str
    category_key: str
    category_name: str
    description: str | None = None
    search_keywords: list[str] = Field(default_factory=list)
    is_system_defined: bool
    is_active: bool
    amenity_count: int = 0
    active_amenity_count: int = 0


class AmenityCategoryListResponse(BaseModel):
    items: list[AmenityCategoryResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    active_categories: int
    inactive_categories: int
    system_categories: int
    tenant_categories: int


class CreateAmenityCategoryRequest(BaseModel):
    category_name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    search_keywords: list[str] | None = None
    is_active: bool = True

    @field_validator("category_name", "description", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @field_validator("search_keywords", mode="before")
    @classmethod
    def trim_keywords(cls, value: Any) -> Any:
        return _normalize_keywords(value)


class UpdateAmenityCategoryRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    category_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    search_keywords: list[str] | None = None
    is_active: bool | None = None

    @field_validator("category_name", "description", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @field_validator("search_keywords", mode="before")
    @classmethod
    def trim_keywords(cls, value: Any) -> Any:
        return _normalize_keywords(value)
