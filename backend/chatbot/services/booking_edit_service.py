from __future__ import annotations

import re


class BookingEditService:
    @staticmethod
    def detect_seat_preference_change_target(user_text: str) -> str | None:
        text = re.sub(r"\s+", " ", user_text.strip().lower())
        if not text:
            return None

        has_change_language = bool(
            re.search(
                r"\b(change|edit|update|switch|modify|different|another|other|new)\b",
                text,
            )
        )
        if not has_change_language:
            return None

        when_where_terms = (
            "date",
            "day",
            "today",
            "tomorrow",
            "office",
            "site",
            "location",
            "building",
            "tower",
            "floor",
            "where",
            "when",
        )
        detail_terms = (
            "seat type",
            "type",
            "amenity",
            "amenities",
            "monitor",
            "window",
            "cabin",
            "accessible",
            "hot desk",
            "standard",
            "headcount",
            "number of seats",
            "people",
            "person",
        )

        if any(term in text for term in when_where_terms):
            return "when_where"
        if any(term in text for term in detail_terms):
            return "details"
        if re.search(r"\bseat\b", text):
            return "details"
        return None

    @staticmethod
    def context_clear_for_when_where_change(user_text: str) -> dict[str, str]:
        text = user_text.lower()
        if any(term in text for term in ("office", "site", "location")):
            return {
                "site_id": "",
                "building_id": "",
                "floor_id": "",
                "selected_seat_ids": "",
                "seat_id": "",
            }
        if any(term in text for term in ("building", "tower")):
            return {
                "building_id": "",
                "floor_id": "",
                "selected_seat_ids": "",
                "seat_id": "",
            }
        if "floor" in text:
            return {"floor_id": "", "selected_seat_ids": "", "seat_id": ""}
        if any(term in text for term in ("date", "day", "today", "tomorrow", "when")):
            return {"booking_date": "", "selected_seat_ids": "", "seat_id": ""}
        return {"selected_seat_ids": "", "seat_id": ""}


booking_edit_service = BookingEditService()
