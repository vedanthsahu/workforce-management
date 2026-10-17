"""Regression coverage for chatbot use of employee-saved preferences."""

import asyncio
from unittest.mock import ANY, AsyncMock, patch

from backend.chatbot.services.chat_engine import ChatEngine
from backend.chatbot.services.seat_backend_api_service import SeatBackendApiService


def test_preferences_flattens_dashboard_work_preferences_and_favorites():
    service = SeatBackendApiService()
    service._request = AsyncMock(
        return_value={
            "work_preferences": {
                "site_id": "10",
                "building_id": "20",
                "floor_id": "30",
                "site_name": "Hyderabad",
            },
            "favorite_seat": {"seat_id": "101"},
            "second_favorite_seat": None,
            "third_favorite_seat": {"seat_id": "103"},
        }
    )

    result = asyncio.run(service.preferences())

    service._request.assert_awaited_once_with("GET", "/dashboard/me")
    assert result == {
        "site_id": "10",
        "building_id": "20",
        "floor_id": "30",
        "site_name": "Hyderabad",
        "favorite_seat_ids": ["101", "103"],
    }


def test_date_only_booking_uses_saved_location_preferences():
    engine = ChatEngine()
    engine._get_context = AsyncMock(return_value={"booking_date": "2026-10-20"})
    engine._set_context_bulk = AsyncMock()
    preferences = {
        "site_id": "10",
        "site_name": "Hyderabad",
        "building_id": "20",
        "building_name": "Pranava One",
        "floor_id": "30",
        "floor_name": "11th Floor",
    }

    with patch.object(
        __import__(
            "backend.chatbot.services.chat_engine", fromlist=["seat_backend_api_service"]
        ).seat_backend_api_service,
        "preferences",
        AsyncMock(return_value=preferences),
    ):
        asyncio.run(
            engine._apply_location_defaults_from_external_backend(
                "session-id", {"booking_date": "2026-10-20"}, AsyncMock()
            )
        )

    engine._set_context_bulk.assert_awaited_once_with(
        "session-id",
        {
            "site_id": "10",
            "site_name": "Hyderabad",
            "building_id": "20",
            "building_name": "Pranava One",
            "floor_id": "30",
            "floor_name": "11th Floor",
        },
        ANY,
    )
