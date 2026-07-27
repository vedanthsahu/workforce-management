from typing import Any

from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.team_repository import (
    fetch_team_member_counts,
    fetch_team_members_with_today_booking,
    search_team_members,
)


def get_my_team_overview(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    member_user_id: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    """Return the caller's team(s) with today's booking per member.

    If `member_user_id` is given, only that teammate's entry is returned
    (still scoped to the caller's own team -- a non-teammate id yields
    the same 404 as a nonexistent one, so this can't be used to probe
    who is or isn't on the team). Otherwise the full member list is
    paginated via `page`/`limit`; `total_members`/`booked_today_count`
    always reflect the whole team, not just the current page.
    """
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    offset = None if member_user_id is not None else (page - 1) * limit
    effective_limit = None if member_user_id is not None else limit

    rows = fetch_team_members_with_today_booking(
        conn,
        tenant_id=tenant_id,
        user_id=user_id,
        member_user_id=member_user_id,
        limit=effective_limit,
        offset=offset,
    )

    if not rows:
        if member_user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "teammate_not_found",
                    "message": "That user is not on any of your teams.",
                },
            )
        return []

    counts = fetch_team_member_counts(conn, tenant_id=tenant_id, user_id=user_id)

    team_map = {}

    for row in rows:
        team_id = row["team_id"]

        if team_id not in team_map:
            team_totals = counts.get(team_id, {})
            total_members = team_totals.get("total_members", 0)
            team_map[team_id] = {
                "team_id": team_id,
                "team_name": row["team_name"],
                "total_members": total_members,
                "booked_today_count": team_totals.get("booked_today_count", 0),
                "members": [],
            }
            if member_user_id is None:
                team_map[team_id]["page"] = page
                team_map[team_id]["limit"] = limit
                team_map[team_id]["total_pages"] = (
                    (total_members + limit - 1) // limit if limit else 1
                )

        member = {
            "user_id": row["user_id"],
            "full_name": row["full_name"],
            "email": row["email"],
            "has_booking_today": row["has_booking_today"],
            "seat": None,
        }

        if row["has_booking_today"]:
            member["seat"] = {
                "seat_id": row["seat_id"],
                "seat_code": row["seat_code"],
                "seat_type": row["seat_type"],
                "floor_id": row["floor_id"],
                "floor_name": row["floor_name"],
                "building_id": row["building_id"],
                "building_name": row["building_name"],
                "source_channel": row["source_channel"],
                "amenities": row["amenities"] or [],
            }

        team_map[team_id]["members"].append(member)

    return list(team_map.values())


def search_my_team_members(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    search_text: str,
    include_inactive: bool = False,
    limit: int = 20,
) -> list[dict]:
    """Search within the caller's own team(s), same contract as GET /users."""
    return search_team_members(
        conn,
        tenant_id=str(current_user["tenant_id"]),
        user_id=str(current_user["user_id"]),
        search_text=search_text,
        include_inactive=include_inactive,
        limit=limit,
    )