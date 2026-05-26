"""
Employee dashboard service to get the dashboard details for dashboard/me
"""

from __future__ import annotations

from typing import Any

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.user_repository import (
    fetch_days_in_office,
    fetch_days_in_office_current_month,
    fetch_days_in_office_current_year,
    fetch_favorite_seat,
    fetch_team_rank_current_year,
    fetch_user_profile_context,
)
from backend.repositories.preferences_repository import fetch_active_amenities
from backend.schemas.dashboard import (
    DashboardManagerResponse,
    DashboardMeResponse,
    DashboardOfficeInfoResponse,
    DashboardPreferencesResponse,
    DashboardProfileMetadataResponse,
)


def get_dashboard_me(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
) -> DashboardMeResponse:
    try:
        tenant_id = str(current_user["tenant_id"])
        user_id = str(current_user["user_id"])
        profile = fetch_user_profile_context(
            conn,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        amenities = fetch_active_amenities(
            conn,
            tenant_id=tenant_id,
        )

        favorite_seat = fetch_favorite_seat(
            conn,
            tenant_id=tenant_id,
            user_id=user_id,
        )

        days_in_office_total = fetch_days_in_office(
            conn,
            tenant_id=tenant_id,
            user_id=user_id,
        )

        days_in_office_current_month = (
            fetch_days_in_office_current_month(
                conn,
                tenant_id=tenant_id,
                user_id=user_id,
            )
        )

        days_in_office_current_year = (
            fetch_days_in_office_current_year(
                conn,
                tenant_id=tenant_id,
                user_id=user_id,
            )
        )

        rank_data = fetch_team_rank_current_year(
            conn,
            tenant_id=tenant_id,
            user_id=user_id,
        )

    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "dashboard_lookup_failed",
                "message": "Failed to load dashboard data.",
            },
        ) from exc

    profile = profile or current_user
    return DashboardMeResponse(
        user_id=str(profile.get("user_id") or current_user.get("user_id")),
        tenant_id=str(profile.get("tenant_id") or current_user.get("tenant_id")),
        tenant_name=profile.get("tenant_name"),
        email=profile.get("email"),
        full_name=profile.get("full_name"),
        display_name=(
            profile.get("display_name")
            or profile.get("full_name")
            or profile.get("email")
        ),
        department=profile.get("department"),
        title=profile.get("job_title"),
        job_title=profile.get("job_title"),
        mobile_phone=profile.get("mobile_phone"),
        manager=_build_manager(profile),
        office_info=DashboardOfficeInfoResponse(
            office_location=profile.get("office_location"),
            home_site_id=profile.get("home_site_id"),
            home_site_code=profile.get("home_site_code"),
            home_site_name=profile.get("home_site_name"),
            city=profile.get("home_site_city"),
            country=profile.get("home_site_country"),
            timezone=profile.get("home_site_timezone"),
        ),
        preferences=DashboardPreferencesResponse(amenities=amenities),
        profile_metadata=DashboardProfileMetadataResponse(
            status=profile.get("status"),
            role_name=profile.get("role_name") or profile.get("role"),
            company_name=profile.get("company_name"),
            employee_id=profile.get("employee_id"),
            microsoft_object_id=profile.get("microsoft_object_id"),
            user_principal_name=profile.get("user_principal_name"),
            graph_last_synced_at=profile.get("graph_last_synced_at"),
            created_at=profile.get("created_at"),
            updated_at=profile.get("updated_at"),
        ),
        favorite_seat=favorite_seat,
        days_in_office_total=days_in_office_total,
        days_in_office_current_month=days_in_office_current_month,
        days_in_office_current_year=days_in_office_current_year,
        team_rank_current_year=rank_data["team_rank_current_year"],
        team_member_count=rank_data["team_member_count"],
    )


def _build_manager(profile: dict[str, Any]) -> DashboardManagerResponse | None:
    manager_user_id = profile.get("manager_user_id")
    if manager_user_id is None:
        return None

    return DashboardManagerResponse(
        user_id=str(manager_user_id),
        email=profile.get("manager_email"),
        full_name=profile.get("manager_full_name"),
        display_name=(
            profile.get("manager_display_name")
            or profile.get("manager_full_name")
            or profile.get("manager_email")
        ),
    )
