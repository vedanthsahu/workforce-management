from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GuardResult:
    category: str
    message: str


class InputGuardService:
    toxic_pattern = re.compile(
        r"\b(fuck|shit|stupid|idiot|moron|bitch|asshole|dumb)\b",
        re.IGNORECASE,
    )
    out_of_scope_pattern = re.compile(
        r"\b("
        r"weather|pizza|lunch|dinner|restaurant|hotel|hostel|resort|motel|"
        r"movie|cinema|theatre|theater|flight|train|bus|salary|payroll|password|joke"
        r")\b",
        re.IGNORECASE,
    )
    facility_service_pattern = re.compile(
        r"\b("
        r"clean|cleaning|sanitize|sanitise|wipe|dust|spill|repair|fix|broken|damage|damaged|"
        r"maintenance|housekeeping|janitor|electrician|plumber|ac|air\s*conditioner|"
        r"light|fan|chair|monitor|keyboard|mouse|kick|bend|service\s*request|ticket|complaint"
        r")\b",
        re.IGNORECASE,
    )

    def check(self, normalized_message: str) -> GuardResult | None:
        if not normalized_message:
            return None
        if self.toxic_pattern.search(normalized_message):
            return GuardResult(
                category="toxic",
                message=(
                    "I can help with seat bookings, changes, cancellations, and booking history. "
                    "Please keep the conversation respectful."
                ),
            )
        if self.out_of_scope_pattern.search(normalized_message):
            return GuardResult(
                category="out_of_scope",
                message=(
                    "I can help with seat bookings, changes, cancellations, and booking history. "
                    "Please choose an option below or ask about a booking."
                ),
            )
        if self.facility_service_pattern.search(normalized_message):
            return GuardResult(
                category="facility_service",
                message=(
                    "I can help with seat bookings, changes, cancellations, and booking history. "
                    "For cleaning, maintenance, or service requests, please use the facility service desk."
                ),
            )
        return None


input_guard_service = InputGuardService()
