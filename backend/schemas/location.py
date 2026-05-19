"""Pydantic schemas for location lookup responses."""

from __future__ import annotations

from pydantic import BaseModel

from backend.core.enums import (
    PreferenceMatchStatus,
    SeatAvailabilityStatus,
    UISeatState,
)


class SiteResponse(BaseModel):
    """Public representation of a site."""

    site_id: str
    site_code: str
    site_name: str
    city: str | None = None
    country: str | None = None
  


class BuildingResponse(BaseModel):
    """Public representation of a building within a site."""

    building_id: str
    site_id: str
    building_code: str
    building_name: str


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
    layout_id: str | None = None
    layout_name: str | None = None
    layout_file_url: str | None = None
    layout_status: str | None = None
    layout_is_published: bool | None = None
    layout_version_no: int | None = None
    active_layout: FloorLayoutInfo | None = None


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
