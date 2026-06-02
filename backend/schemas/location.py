"""Pydantic schemas for location lookup responses."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.core.enums import (
    PreferenceMatchStatus,
    SeatAvailabilityStatus,
    UISeatState,
)

HierarchyStatus = Literal["ACTIVE", "INACTIVE"]


def _trim_string(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _uppercase_code(value: str | None) -> str | None:
    trimmed = _trim_string(value)
    return trimmed.upper() if trimmed is not None else None


def _uppercase_status(value: str | None) -> str | None:
    trimmed = _trim_string(value)
    return trimmed.upper() if trimmed is not None else None


class SiteResponse(BaseModel):
    """Public representation of a site."""

    site_id: str
    site_code: str
    site_name: str
    city: str | None = None
    country: str | None = None
    timezone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    status: str | None = None
    building_count: int | None = None
    floor_count: int | None = None
    seat_count: int | None = None
    active_seat_count: int | None = None
    bookable_seat_count: int | None = None


class CreateSiteRequest(BaseModel):
    """Payload for creating a tenant-scoped site."""

    site_code: str = Field(min_length=1, max_length=50)
    site_name: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    timezone: str = Field(min_length=1, max_length=100)
    address_line1: str | None = Field(default=None, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    status: HierarchyStatus = "ACTIVE"

    @field_validator("site_code", mode="before")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = _uppercase_code(value)
        if normalized is None:
            raise ValueError("site_code is required.")
        return normalized

    @field_validator(
        "site_name",
        "city",
        "country",
        "timezone",
        "address_line1",
        "address_line2",
        mode="before",
    )
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class UpdateSiteRequest(BaseModel):
    """Payload for metadata-only site updates."""

    model_config = ConfigDict(extra="allow")

    site_name: str | None = Field(default=None, min_length=1, max_length=200)
    city: str | None = Field(default=None, min_length=1, max_length=100)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    timezone: str | None = Field(default=None, min_length=1, max_length=100)
    address_line1: str | None = Field(default=None, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    status: HierarchyStatus | None = None

    @field_validator(
        "site_name",
        "city",
        "country",
        "timezone",
        "address_line1",
        "address_line2",
        mode="before",
    )
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class SiteHierarchySummary(BaseModel):
    building_count: int = 0
    floor_count: int = 0
    seat_count: int = 0
    active_seat_count: int = 0
    bookable_seat_count: int = 0


class SiteDetailsResponse(SiteResponse):
    hierarchy_summary: SiteHierarchySummary


class BuildingResponse(BaseModel):
    """Public representation of a building within a site."""

    building_id: str
    site_id: str
    site_name: str
    building_code: str
    building_name: str
    status: str | None = None
    floor_count: int | None = None
    seat_count: int | None = None
    active_seat_count: int | None = None
    bookable_seat_count: int | None = None


class CreateBuildingRequest(BaseModel):
    """Payload for creating a building under an existing site."""

    site_id: int = Field(gt=0)
    building_code: str = Field(min_length=1, max_length=50)
    building_name: str = Field(min_length=1, max_length=200)
    status: HierarchyStatus = "ACTIVE"

    @field_validator("building_code", mode="before")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = _uppercase_code(value)
        if normalized is None:
            raise ValueError("building_code is required.")
        return normalized

    @field_validator("building_name", mode="before")
    @classmethod
    def trim_name(cls, value: str) -> str | None:
        return _trim_string(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class UpdateBuildingRequest(BaseModel):
    """Payload for metadata-only building updates."""

    model_config = ConfigDict(extra="allow")

    building_name: str | None = Field(default=None, min_length=1, max_length=200)
    status: HierarchyStatus | None = None

    @field_validator("building_name", mode="before")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class FloorLayoutInfo(BaseModel):
    """Published layout metadata attached to a floor."""

    layout_id: str
    layout_name: str
    layout_file_url: str


class FloorResponse(BaseModel):
    """Public representation of a floor within a location/building."""

    floor_id: str
    site_id: str | None = None
    building_id: str | None = None
    building_code: str | None = None
    building_name: str | None = None
    floor_code: str | None = None
    floor_name: str | None = None
    status: str | None = None
    seat_count: int | None = None
    active_seat_count: int | None = None
    bookable_seat_count: int | None = None
    layout_count: int | None = None
    published_layout_exists: bool | None = None
    layout_id: str | None = None
    layout_name: str | None = None
    layout_file_url: str | None = None
    layout_status: str | None = None
    layout_is_published: bool | None = None
    layout_version_no: int | None = None
    active_layout: FloorLayoutInfo | None = None


class CreateFloorRequest(BaseModel):
    """Payload for creating a floor under an existing building."""

    site_id: int = Field(gt=0)
    building_id: int = Field(gt=0)
    floor_code: str = Field(min_length=1, max_length=50)
    floor_name: str = Field(min_length=1, max_length=200)
    status: HierarchyStatus = "ACTIVE"

    @field_validator("floor_code", mode="before")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = _uppercase_code(value)
        if normalized is None:
            raise ValueError("floor_code is required.")
        return normalized

    @field_validator("floor_name", mode="before")
    @classmethod
    def trim_name(cls, value: str) -> str | None:
        return _trim_string(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class UpdateFloorRequest(BaseModel):
    """Payload for metadata-only floor updates."""

    model_config = ConfigDict(extra="allow")

    floor_name: str | None = Field(default=None, min_length=1, max_length=200)
    status: HierarchyStatus | None = None

    @field_validator("floor_name", mode="before")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        return _trim_string(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class SeatResponse(BaseModel):
    """Public representation of a seat on a floor."""

    seat_id: str
    code: str
    x: float | None = None
    y: float | None = None
    w: float | None = None
    h: float | None = None
    rotation_angle: float | None = None
    status: SeatAvailabilityStatus
    selectable: bool
    matched_amenity_ids: list[int]
    matched_amenity_count: int
    requested_amenity_count: int
    preference_match_status: PreferenceMatchStatus
    ui_state: UISeatState


class LayoutSeatConfigurationUpdateRequest(BaseModel):

    seat_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    seat_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    status: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    is_bookable: bool | None = None

    is_reserved: bool | None = None

    amenity_ids: list[int] | None = None


class LayoutSeatConfigurationResponse(BaseModel):

    layout_seat_mapping_id: str

    seat_id: str | None = None

    layout_id: str

    floor_id: str

    seat_code: str

    seat_name: str | None = None

    seat_type: str

    status: str

    is_bookable: bool

    is_reserved: bool

    is_configured: bool

    configuration_status: str

    amenity_ids: list[int]


class SeatConfigurationUpdateRequest(BaseModel):
    """Payload for soft seat configuration changes."""

    model_config = ConfigDict(extra="allow")

    status: HierarchyStatus | None = None
    is_bookable: bool | None = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        return _uppercase_status(value)


class SeatConfigurationResponse(BaseModel):
    seat_id: str
    site_id: str
    building_id: str
    floor_id: str
    seat_code: str
    status: str
    is_bookable: bool
