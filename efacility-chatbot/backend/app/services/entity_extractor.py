from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Iterable, Optional

try:
    from rapidfuzz import fuzz
except Exception:  # pragma: no cover - fallback for environments without rapidfuzz
    fuzz = None


SEAT_TYPE_ALIASES = {
    "STANDARD": ("standard", "desk", "normal", "regular seat", "regular desk", "workstation"),
    "WINDOW": ("window", "near window", "window seat", "by window", "beside window", "at window"),
    "CABIN": ("cabin", "private cabin", "private", "enclosed seat", "quiet cabin"),
    "ACCESSIBLE": ("accessible", "accessibility", "wheelchair", "accessible desk"),
    "HOT_DESK": ("hot desk", "hotdesk", "flex desk", "flexible desk", "shared desk"),
}

WEEKDAY_INDEX = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}

GENERIC_LOCATION_TOKENS = {
    "office",
    "site",
    "city",
    "building",
    "floor",
    "tower",
    "towers",
}


@dataclass(slots=True)
class ExtractedEntities:
    values: dict[str, Any] = field(default_factory=dict)

    def add(self, key: str, value: Any):
        if value is not None and value != "":
            self.values[key] = value


class EntityExtractor:
    booking_ref_pattern = re.compile(r"\bBK-\d{8}-[A-Z0-9]{4,10}\b", re.IGNORECASE)
    iso_date_pattern = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")
    slash_date_pattern = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b")
    date_token_pattern = re.compile(r"\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}")
    headcount_pattern = re.compile(r"\b(?:need|for|book|reserve)?\s*(\d{1,2})\s*(?:seats?|desks?|people|persons?)\b")
    floor_pattern = re.compile(
        r"\b(?:(\d{1,2})(?:st|nd|rd|th)?\s*floor|floor\s*(\d{1,2})(?:st|nd|rd|th)?)\b",
        re.IGNORECASE,
    )

    async def extract(self, db: Any, tenant_id: int, message: str) -> dict[str, Any]:
        normalized = self._normalize(message)
        entities = ExtractedEntities()

        entities.add("booking_ref", self._extract_booking_ref(message))
        booking_date = self._extract_single_date(normalized)
        if booking_date:
            entities.add("booking_date", booking_date.isoformat())

        date_range = self._extract_date_range(normalized)
        if date_range:
            start, end = date_range
            entities.add("date_range_start", start.isoformat())
            entities.add("date_range_end", end.isoformat())
        entities.add("booking_list_mode", self._extract_booking_list_mode(normalized))

        entities.add("headcount", self._extract_headcount(normalized))
        entities.add("seat_type", self._extract_seat_type(normalized))

        await self._extract_locations(db, tenant_id, normalized, entities)
        await self._extract_amenities(db, tenant_id, normalized, entities)

        return entities.values

    @staticmethod
    def _normalize(message: str) -> str:
        return re.sub(r"\s+", " ", message.lower()).strip()

    def _extract_booking_ref(self, message: str) -> Optional[str]:
        match = self.booking_ref_pattern.search(message)
        return match.group(0).upper() if match else None

    def _extract_single_date(self, message: str) -> Optional[date]:
        today = date.today()
        if re.search(r"\btoday\b", message):
            return today
        if re.search(r"\btomorrow\b", message):
            return today + timedelta(days=1)

        weekday_match = re.search(r"\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", message)
        if weekday_match:
            target = WEEKDAY_INDEX[weekday_match.group(1)]
            days_ahead = (target - today.weekday()) % 7
            return today + timedelta(days=days_ahead or 7)

        weekday_match = re.search(r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", message)
        if weekday_match:
            target = WEEKDAY_INDEX[weekday_match.group(1)]
            days_ahead = (target - today.weekday()) % 7
            return today + timedelta(days=days_ahead or 7)

        iso_match = self.iso_date_pattern.search(message)
        if iso_match:
            return self._safe_date_parse(iso_match.group(1), "%Y-%m-%d")

        slash_match = self.slash_date_pattern.search(message)
        if slash_match:
            day, month, year = slash_match.groups()
            return self._safe_date_parse(f"{int(day):02d}-{int(month):02d}-{year}", "%d-%m-%Y")

        return None

    @staticmethod
    def _extract_booking_list_mode(message: str) -> Optional[str]:
        if re.search(r"\b(cancelled|canceled)\b", message):
            return "cancelled"
        if re.search(r"\b(past|previous|old|history)\b", message):
            return "past"
        if re.search(r"\b(upcoming|future|active)\b", message):
            return "upcoming"
        return None

    def _extract_date_range(self, message: str) -> Optional[tuple[date, date]]:
        today = date.today()
        explicit_range = self._extract_explicit_date_range(message)
        if explicit_range:
            return explicit_range
        if "next week" in message:
            start = today + timedelta(days=(7 - today.weekday()))
            return start, start + timedelta(days=6)
        if "this week" in message:
            start = today - timedelta(days=today.weekday())
            return start, start + timedelta(days=6)
        if "last week" in message:
            end = today - timedelta(days=today.weekday() + 1)
            return end - timedelta(days=6), end
        if "last month" in message:
            first_this_month = today.replace(day=1)
            end = first_this_month - timedelta(days=1)
            return end.replace(day=1), end
        return None

    def _extract_explicit_date_range(self, message: str) -> Optional[tuple[date, date]]:
        tokens = self.date_token_pattern.findall(message)
        if len(tokens) < 2:
            return None
        if not re.search(r"\b(from|between|to|and)\b", message):
            return None
        start = self._parse_date_token(tokens[0])
        end = self._parse_date_token(tokens[1])
        if not start or not end:
            return None
        return (start, end) if start <= end else (end, start)

    def _parse_date_token(self, value: str) -> Optional[date]:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return self._safe_date_parse(value, "%Y-%m-%d")
        match = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", value)
        if not match:
            return None
        day, month, year = match.groups()
        return self._safe_date_parse(f"{int(day):02d}-{int(month):02d}-{year}", "%d-%m-%Y")

    @staticmethod
    def _safe_date_parse(value: str, fmt: str) -> Optional[date]:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            return None

    def _extract_headcount(self, message: str) -> Optional[int]:
        match = self.headcount_pattern.search(message)
        if match:
            return max(1, min(10, int(match.group(1))))
        word_match = re.search(
            r"\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:seats?|desks?|people|persons?)\b",
            message,
        )
        if not word_match:
            return None
        return NUMBER_WORDS[word_match.group(1)]

    def _extract_seat_type(self, message: str) -> Optional[str]:
        candidates = [
            (seat_type, alias)
            for seat_type, aliases in SEAT_TYPE_ALIASES.items()
            for alias in aliases
        ]
        for seat_type, alias in sorted(candidates, key=lambda item: len(item[1]), reverse=True):
            if alias in message:
                return seat_type
        return None

    async def _extract_locations(self, db: Any, tenant_id: int, message: str, entities: ExtractedEntities):
        from app.services.seat_backend_api_service import seat_backend_api_service

        site_rows = await seat_backend_api_service.list_sites() or []

        site = self._best_site_match(message, site_rows)
        if site:
            entities.add("site_name", site.get("site_name"))
            entities.add("site_id", site.get("site_id"))

        building_rows = []
        if entities.values.get("site_id"):
            building_rows = await seat_backend_api_service.list_buildings(int(entities.values["site_id"])) or []
        else:
            for site_row in site_rows[:20]:
                site_id = site_row.get("site_id")
                if site_id:
                    building_rows.extend(await seat_backend_api_service.list_buildings(int(site_id)) or [])

        building_candidates = building_rows
        building = self._best_match(
            message,
            [(b.get("building_name"), b) for b in building_candidates] + [(b.get("building_code"), b) for b in building_candidates],
        )
        if building:
            entities.add("building_name", building.get("building_name"))
            entities.add("building_id", building.get("building_id"))
            entities.add("site_id", building.get("site_id") or entities.values.get("site_id"))

        floor_rows = []
        if entities.values.get("building_id"):
            floor_rows = await seat_backend_api_service.list_floors(int(entities.values["building_id"])) or []
        else:
            for building_row in building_rows[:30]:
                building_id = building_row.get("building_id")
                if building_id:
                    floor_rows.extend(await seat_backend_api_service.list_floors(int(building_id)) or [])

        requested_floor_number = self._extract_floor_number(message)
        floor_candidates = floor_rows

        floor = None
        if requested_floor_number is not None:
            floor = self._find_floor_by_number(floor_candidates, requested_floor_number)
        if not floor:
            floor = self._best_match(
                message,
                [(f.get("floor_name"), f) for f in floor_candidates] + [(f.get("floor_code"), f) for f in floor_candidates],
            )

        if floor:
            entities.add("floor_name", floor.get("floor_name") or floor.get("floor_code"))
            entities.add("floor_id", floor.get("floor_id"))
            entities.add("building_id", floor.get("building_id") or entities.values.get("building_id"))
            entities.add("site_id", floor.get("site_id") or entities.values.get("site_id"))

    async def _extract_amenities(self, db: Any, tenant_id: int, message: str, entities: ExtractedEntities):
        return

    def _best_match(self, message: str, choices: Iterable[tuple[str, Any]], threshold: int = 82):
        normalized_message = self._normalize_location_text(message)
        best_score = 0
        best_value = None
        for label, value in choices:
            if not label:
                continue
            score = self._location_score(normalized_message, self._normalize_location_text(label))
            if score > best_score:
                best_score = score
                best_value = value
        return best_value if best_score >= threshold else None

    def _best_site_match(self, message: str, site_rows):
        normalized_message = self._normalize_location_text(message)
        best_score = 0
        best_site = None
        for site in site_rows:
            labels = [
                self._field(site, "site_name"),
                self._field(site, "site_code"),
                self._field(site, "address_line1"),
                f"{self._field(site, 'site_name') or ''} {self._field(site, 'address_line1') or ''}",
            ]
            score = max(
                self._location_score(normalized_message, self._normalize_location_text(label))
                for label in labels
                if label
            )
            if score > best_score:
                best_score = score
                best_site = site

        return best_site if best_score >= 82 else None

    def _contains_or_fuzzy(self, message: str, label: str, threshold: int = 86) -> bool:
        if not label:
            return False
        normalized_message = self._normalize_location_text(message)
        normalized = self._normalize_location_text(label)
        return normalized in normalized_message or self._score(normalized_message, normalized) >= threshold

    @staticmethod
    def _score(message: str, label: str) -> int:
        if label in message:
            return 100
        if fuzz:
            return int(fuzz.partial_ratio(message, label))
        message_tokens = set(message.split())
        label_tokens = set(label.split())
        if not label_tokens:
            return 0
        return int(100 * len(message_tokens & label_tokens) / len(label_tokens))

    @staticmethod
    def _location_score(message: str, label: str) -> int:
        if not label:
            return 0
        if re.search(rf"\b{re.escape(label)}\b", message):
            return 100

        message_tokens = set(message.split())
        label_tokens = set(label.split())
        meaningful_tokens = label_tokens - GENERIC_LOCATION_TOKENS
        tokens_to_match = meaningful_tokens or label_tokens
        if not tokens_to_match:
            return 0

        exact_matches = len(message_tokens & tokens_to_match)
        if exact_matches == len(tokens_to_match):
            return 100

        fuzzy_matches = 0
        if fuzz:
            for label_token in tokens_to_match:
                if any(fuzz.ratio(label_token, message_token) >= 88 for message_token in message_tokens):
                    fuzzy_matches += 1
        else:
            fuzzy_matches = exact_matches

        return int(100 * max(exact_matches, fuzzy_matches) / len(tokens_to_match))

    @staticmethod
    def _normalize_location_text(value: str) -> str:
        text = (value or "").lower()
        text = text.replace("hyderbad", "hyderabad")
        text = text.replace("hi-tech", "hitech")
        text = text.replace("hi tech", "hitech")
        text = re.sub(r"[_/-]+", " ", text)
        text = re.sub(r"[^\w\s]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def _field(row: Any, key: str):
        if isinstance(row, dict):
            return row.get(key)
        return getattr(row, key, None)

    @staticmethod
    def _extract_floor_number(message: str) -> Optional[int]:
        match = EntityExtractor.floor_pattern.search(message)
        if not match:
            return None
        value = match.group(1) or match.group(2)
        return int(value) if value else None

    @staticmethod
    def _find_floor_by_number(floors, number: int):
        for floor in floors:
            label = EntityExtractor._field(floor, "floor_name") or EntityExtractor._field(floor, "floor_code") or ""
            if EntityExtractor._extract_floor_number(label) == number:
                return floor
        return None


entity_extractor = EntityExtractor()
