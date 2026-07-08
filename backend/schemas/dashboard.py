"""
Dashboard.py for schema define
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from backend.schemas.auth import FavoriteSeatResponse
from backend.schemas.preferences import AmenityResponse, MyPreferencesResponse


class DashboardManagerResponse(BaseModel):
    user_id: str | None = None
    email: str | None = None
    full_name: str | None = None
    display_name: str | None = None


class DashboardOfficeInfoResponse(BaseModel):
    office_location: str | None = None
    home_site_id: str | None = None
    home_site_code: str | None = None
    home_site_name: str | None = None
    city: str | None = None
    country: str | None = None
    timezone: str | None = None


class DashboardPreferencesResponse(BaseModel):
    amenities: list[AmenityResponse] = []


class DashboardProfileMetadataResponse(BaseModel):
    status: str | None = None
    role_name: str | None = None
    company_name: str | None = None
    employee_id: str | None = None
    microsoft_object_id: str | None = None
    user_principal_name: str | None = None
    graph_last_synced_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DashboardMeResponse(BaseModel):
    user_id: str | None = None
    tenant_id: str | None = None
    tenant_name: str | None = None
    email: str | None = None
    full_name: str | None = None
    display_name: str | None = None
    department: str | None = None
    title: str | None = None
    job_title: str | None = None
    mobile_phone: str | None = None
    manager: DashboardManagerResponse | None = None
    office_info: DashboardOfficeInfoResponse | None = None
    preferences: DashboardPreferencesResponse | None = None
    profile_metadata: DashboardProfileMetadataResponse | None = None

    # User-saved defaults from POST /preferences/me (user_work_preferences +
    # user_preferred_amenities), distinct from `preferences` above which is
    # the full tenant amenity catalog used to populate a selection UI.
    work_preferences: MyPreferencesResponse | None = None

    favorite_seat: FavoriteSeatResponse | None = None
    second_favorite_seat: FavoriteSeatResponse | None = None

    days_in_office_total: int = 0
    days_in_office_current_month: int = 0
    days_in_office_current_year: int = 0

    team_rank_current_year: int | None = None
    team_member_count: int = 0
