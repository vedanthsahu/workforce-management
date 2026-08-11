from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi import HTTPException

from backend.repositories.team_repository import (
    fetch_team_members_with_today_booking,
    search_team_members,
)
from backend.services.team_service import get_my_team_overview, search_my_team_members


class FakeCursor:
    def __init__(self, *, fetchall_result=None) -> None:
        self.executions: list[tuple[str, Any]] = []
        self._fetchall_result = fetchall_result or []

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> None:
        self.executions.append((sql, params))

    def fetchall(self):
        return self._fetchall_result


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor

    def cursor(self, **_: Any) -> FakeCursor:
        return self.cursor_instance


BOOKED_ROW = {
    "user_id": "38",
    "full_name": "Nagarjuna Padiri",
    "email": "nagarjuna.padiri@sgxdev.com",
    "team_id": "38",
    "team_name": "GDO - Engineering - Automation & AI",
    "booking_id": "662",
    "seat_id": "3470",
    "source_channel": "WEB",
    "seat_code": "PUNE-BUL-F1-A-106",
    "seat_type": "STANDARD",
    "floor_id": "59",
    "floor_name": "F1",
    "building_id": "82",
    "building_name": "Pune Building",
    "amenities": [
        {"id": 1, "name": "Near Cafeteria"},
        {"id": 2, "name": "Near Elevator"},
        {"id": 3, "name": "Quiet Zone"},
    ],
    "has_booking_today": True,
}

UNBOOKED_ROW = {
    "user_id": "36",
    "full_name": "Chandana N M",
    "email": "chandana.gowda@solugenix.com",
    "team_id": "38",
    "team_name": "GDO - Engineering - Automation & AI",
    "booking_id": None,
    "seat_id": None,
    "source_channel": None,
    "seat_code": None,
    "seat_type": None,
    "floor_id": None,
    "floor_name": None,
    "building_id": None,
    "building_name": None,
    "amenities": [],
    "has_booking_today": False,
}


TEAM_COUNTS = {"38": {"team_id": "38", "total_members": 2, "booked_today_count": 1}}


class TeamOverviewSeatDetailTests(unittest.TestCase):
    def test_booked_member_exposes_full_seat_detail(self) -> None:
        with patch(
            "backend.services.team_service.fetch_team_members_with_today_booking",
            return_value=[BOOKED_ROW, UNBOOKED_ROW],
        ), patch(
            "backend.services.team_service.fetch_team_member_counts",
            return_value=TEAM_COUNTS,
        ):
            teams = get_my_team_overview(
                conn=object(),
                current_user={"tenant_id": "3", "user_id": "36"},
            )

        team = teams[0]
        booked_member = next(m for m in team["members"] if m["user_id"] == "38")
        unbooked_member = next(m for m in team["members"] if m["user_id"] == "36")

        self.assertEqual(booked_member["seat"]["building_name"], "Pune Building")
        self.assertEqual(booked_member["seat"]["seat_type"], "STANDARD")
        self.assertEqual(booked_member["seat"]["source_channel"], "WEB")
        self.assertEqual(
            booked_member["seat"]["amenities"],
            [
                {"id": 1, "name": "Near Cafeteria"},
                {"id": 2, "name": "Near Elevator"},
                {"id": 3, "name": "Quiet Zone"},
            ],
        )
        self.assertIsNone(unbooked_member["seat"])
        self.assertEqual(team["booked_today_count"], 1)
        self.assertEqual(team["total_members"], 2)
        self.assertEqual(team["page"], 1)
        self.assertEqual(team["limit"], 20)

    def test_member_user_id_filters_to_single_teammate(self) -> None:
        with patch(
            "backend.services.team_service.fetch_team_members_with_today_booking",
            return_value=[BOOKED_ROW],
        ) as mock_fetch, patch(
            "backend.services.team_service.fetch_team_member_counts",
            return_value=TEAM_COUNTS,
        ):
            teams = get_my_team_overview(
                conn=object(),
                current_user={"tenant_id": "3", "user_id": "36"},
                member_user_id="38",
            )

        _, kwargs = mock_fetch.call_args
        self.assertEqual(kwargs["member_user_id"], "38")
        self.assertIsNone(kwargs["limit"])
        self.assertIsNone(kwargs["offset"])

        team = teams[0]
        self.assertEqual(len(team["members"]), 1)
        self.assertEqual(team["members"][0]["user_id"], "38")
        self.assertNotIn("page", team)

    def test_member_user_id_not_on_team_raises_404(self) -> None:
        with patch(
            "backend.services.team_service.fetch_team_members_with_today_booking",
            return_value=[],
        ), self.assertRaises(HTTPException) as ctx:
            get_my_team_overview(
                conn=object(),
                current_user={"tenant_id": "3", "user_id": "36"},
                member_user_id="999",
            )

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(ctx.exception.detail["code"], "teammate_not_found")

    def test_pagination_computes_offset_and_total_pages(self) -> None:
        with patch(
            "backend.services.team_service.fetch_team_members_with_today_booking",
            return_value=[BOOKED_ROW, UNBOOKED_ROW],
        ) as mock_fetch, patch(
            "backend.services.team_service.fetch_team_member_counts",
            return_value=TEAM_COUNTS,
        ):
            teams = get_my_team_overview(
                conn=object(),
                current_user={"tenant_id": "3", "user_id": "36"},
                page=2,
                limit=5,
            )

        _, kwargs = mock_fetch.call_args
        self.assertEqual(kwargs["limit"], 5)
        self.assertEqual(kwargs["offset"], 5)

        team = teams[0]
        self.assertEqual(team["page"], 2)
        self.assertEqual(team["limit"], 5)
        self.assertEqual(team["total_pages"], 1)
        self.assertEqual(team["total_members"], 2)


class FetchTeamMembersRepositoryTests(unittest.TestCase):
    def test_member_user_id_adds_filter_and_skips_limit(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_team_members_with_today_booking(
            conn,
            tenant_id="3",
            user_id="36",
            member_user_id="38",
        )

        sql, params = cursor.executions[0]
        self.assertIn("AND tm.user_id = %s", sql)
        self.assertNotIn("LIMIT", sql)
        self.assertEqual(params, ("36", "3", "38"))

    def test_pagination_appends_limit_offset(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        fetch_team_members_with_today_booking(
            conn,
            tenant_id="3",
            user_id="36",
            limit=5,
            offset=5,
        )

        sql, params = cursor.executions[0]
        self.assertIn("LIMIT %s OFFSET %s", sql)
        self.assertNotIn("tm.user_id = %s", sql)
        self.assertEqual(params, ("36", "3", 5, 5))


class SearchTeamMembersRepositoryTests(unittest.TestCase):
    def test_search_is_scoped_to_callers_own_team(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        search_team_members(
            conn,
            tenant_id="3",
            user_id="36",
            search_text="nagarjuna",
            limit=20,
        )

        sql, params = cursor.executions[0]
        self.assertIn("WHERE tm_target.user_id = %s", sql)
        self.assertIn("AND u.status = 'ACTIVE'", sql)
        self.assertEqual(params, ("nagarjuna", "36", "3", "nagarjuna", "nagarjuna", 20))

    def test_include_inactive_drops_status_filter(self) -> None:
        cursor = FakeCursor(fetchall_result=[])
        conn = FakeConnection(cursor)

        search_team_members(
            conn,
            tenant_id="3",
            user_id="36",
            search_text="nag",
            include_inactive=True,
            limit=20,
        )

        sql, _ = cursor.executions[0]
        self.assertNotIn("u.status = 'ACTIVE'", sql)


class SearchMyTeamMembersServiceTests(unittest.TestCase):
    def test_passes_current_user_scope_through(self) -> None:
        with patch(
            "backend.services.team_service.search_team_members",
        ) as mock_search:
            search_my_team_members(
                conn=object(),
                current_user={"tenant_id": "3", "user_id": "36"},
                search_text="nag",
                limit=10,
            )

        _, kwargs = mock_search.call_args
        self.assertEqual(kwargs["tenant_id"], "3")
        self.assertEqual(kwargs["user_id"], "36")
        self.assertEqual(kwargs["search_text"], "nag")
        self.assertEqual(kwargs["limit"], 10)


if __name__ == "__main__":
    unittest.main()
