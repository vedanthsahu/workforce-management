from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from app.services.vector_intent_service import vector_intent_service


class Intent(str, Enum):
    GREETING = "GREETING"
    BOOK_SEAT = "BOOK_SEAT"
    LIST_BOOKINGS = "LIST_BOOKINGS"
    CANCEL_BOOKING = "CANCEL_BOOKING"
    MODIFY_BOOKING = "MODIFY_BOOKING"
    QUICK_BOOK = "QUICK_BOOK"
    HELP = "HELP"
    UNKNOWN = "UNKNOWN"


@dataclass(slots=True)
class IntentResult:
    intent: Intent
    confidence: float
    source: str
    matched_prompt: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def accepted(self) -> bool:
        return self.confidence >= 0.80 and self.intent != Intent.UNKNOWN

    @property
    def needs_confirmation(self) -> bool:
        return 0.60 <= self.confidence < 0.80 and self.intent != Intent.UNKNOWN


class IntentMatcher:
    """Rule-first intent detector with optional pgvector fallback."""

    _patterns: list[tuple[Intent, float, tuple[str, ...]]] = [
        (
            Intent.GREETING,
            0.96,
            (
                r"^\s*(hi|hello|hey|hiya|hii|helo|namaste|howdy|yo|good\s+morning|good\s+afternoon|good\s+evening)\s*[!.]*\s*$",
                r"^\s*(hi|hello|hey)\s+(there|ef|bot|buddy|team)\s*[!.]*\s*$",
                r"^\s*what\s+s\s+up\s*[!.?]*\s*$",
                r"^\s*can you help me\s*$",
                r"^\s*(morning|afternoon|evening)\s*[!.]*\s*$",
                r"^\s*(hello|hi|hey)\s+assistant\s*[!.]*\s*$",
            ),
        ),
        (
            Intent.CANCEL_BOOKING,
            0.94,
            (
                r"\bcancel\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\bdelete\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*|workspace\w*)\b",
                r"\bremove\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*|workspace\w*)\b",
                r"\bdrop\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\b(don\s+t|do not)\s+need\b.*\b(seat\w*|desk\w*|bo+k\w*|reservation\w*|it)\b",
                r"\b(i won\s+t|i will not|i am not|i m not)\b.*\b(coming|come|office|use\b.*\bseat)\b",
                r"\b(work|working)\s+from\s+home\b",
                r"\b(wfh|work from home)\b.*\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
                r"\bplease remove it\b",
                r"\bcancel\b.*\boffice visit\b",
                r"\bcancel\b.*\b(first|second|third|that one|this one|one)\b",
                r"\bscrap\b.*\b(plan|visit|booking|reservation|seat|desk)\b",
                r"\bskip\b.*\b(office|visit|seat|desk|booking|reservation)\b",
                r"\bnot required\b",
                r"\bforget\b.*\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
                r"\bno (office|longer required)\b",
                r"\bi changed my mind\b",
            ),
        ),
        (
            Intent.MODIFY_BOOKING,
            0.91,
            (
                r"\bmodify\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\bchange\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\bupdate\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\breschedule\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\bmove\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\bedit\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\b(friday|monday|tuesday|wednesday|thursday|saturday|sunday|today|tomorrow)\b.*\b(won\s+t|will not)\s+work\b",
                r"\bneed another\b.*\b(day|date|location|office|floor|seat|building)\b",
                r"\bneed to change\b.*\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|date|day|office|location|floor|building|seat)\b",
                r"\b(change|switch|move|shift|update|reschedule)\b.*\b(it|offices?|location|floor|building|seat|day|date)\b",
                r"\b(floor|office|location|building|seat|day|date)\b.*\b(change|switch|move|shift|update)\b",
                r"\b(use|take|pick)\b.*\b(different|another|new)\b.*\b(seat|desk|floor|building|office|location)\b",
                r"\bcan i\b.*\b(change|switch|move|shift|update)\b.*\b(seat|desk|floor|building|office|location|date|day|it)\b",
                r"\bmy plans changed\b",
                r"\bactually\b.*\b(building|office|location|floor|seat)\b",
                r"\bno\s+(floor|building|office|location|seat)\b",
                r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\s+instead\b",
                r"\bwrong\b.*\b(date|office|location|floor|building|seat)\b",
                r"\bdifferent\s+(location|office|building|floor|seat)\b",
                r"\bwindow seat instead\b",
                r"\bcan we reschedule\b",
            ),
        ),
        (
            Intent.LIST_BOOKINGS,
            0.92,
            (
                r"\b(show|view|list|display|provide|get|give)\b(?!.*\b(usual|regular|preferred|favo[u]?rite|previous)\b).*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\b(find|lookup|look up)\b(?!.*\bavailable\b).*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\bmy\b.*\b(bo+k\w*|reservation\w*)\b",
                r"\bwhat\b.*\b(bo+k\w*|reservation\w*|seat\w*)\b",
                r"\bdo i have\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\b(past|previous|old|history|upcoming|future|active|cancelled|canceled)\b.*\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b",
                r"\b(bo+k\w*|reservation\w*|seat\w*|desk\w*)\b.*\b(past|previous|old|history|upcoming|future|active|cancelled|canceled)\b",
                r"\bbo+k\w*\s+history\b",
                r"\bwhat do i have planned\b",
                r"\bshow\b.*\b(schedule|calendar)\b",
                r"\b(my|office|workspace)\b.*\b(schedule|calendar|reservations)\b",
                r"\b(upcoming|future|planned)\b.*\b(office visits?|visits?|plans?)\b",
                r"\boffice plans?\b",
                r"\bthis month\s+s\b.*\boffice visits?\b",
                r"\b(anything|something)\b.*\b(arranged|planned)\b",
                r"\banything for\b.*\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
                r"\bdo i already have something\b",
                r"\bwhere am i sitting\b",
                r"\bwhere should i sit\b",
                r"\bwhich (seat|desk)\b.*\b(i have|assigned|allocated|reserved|booked)\b",
                r"\bshow\b.*\b(my )?(seat|desk)\b.*\b(for|on)\b",
                r"\bam i\b.*\b(booked|reserved|scheduled)\b",
                r"\bwhere\b.*\b(i am|i m|i)\b.*\b(supposed to )?sit\b",
                r"\bwhere\b.*\bi\b.*\b(booked|reserved)\b.*\b(seat|desk)\b",
                r"\b(past|previous|old|history)\b.*\boffice visits?\b",
            ),
        ),
        (
            Intent.QUICK_BOOK,
            0.90,
            (
                r"\bquick\s*book\b",
                r"\bsame as last time\b",
                r"\bsame place as last time\b",
                r"\bprevious preferences\b",
                r"\blast location\b",
                r"\busual seat\b",
                r"\bpreferred desk\b",
                r"\bpreferred seat\b",
                r"\bfavo[u]?rite (seat|desk|workspace)\b",
                r"\bregular workspace\b",
                r"\brepeat\b.*\b(book|booking|reservation)\b",
                r"\b(copy|reuse|rebook)\b.*\b(last|previous|usual|regular|same)\b.*\b(seat|desk|workspace|booking)?\b",
                r"\bbook\b.*\b(my )?(preferred|favo[u]?rite|usual|regular)\b.*\b(seat|desk|workspace)\b",
                r"\buse my\b.*\b(usual|default|regular|favo[u]?rite|previous)\b.*\b(office|location|seat)?\b",
                r"\b(default|regular|previous)\s+location\b",
                r"\bwhatever i used\b",
                r"\bregular office\b",
                r"\bsame office\b",
                r"\bdo the normal one\b",
                r"\bnothing special\b",
                r"\bfastest option\b",
                r"\bjust make it quick\b",
                r"\bsame building\b",
            ),
        ),
        (
            Intent.BOOK_SEAT,
            0.88,
            (
                r"\b(book|reserve|need|want)\b.*\b(seats?|desks?|workspace|cabin|hot desk)\b",
                r"\b(arrange|find|get)\b.*\b(seats?|desks?|workspace|place to sit|place to work)\b",
                r"\b(save|hold)\b.*\b(a )?(seat|desk|workspace|spot)\b",
                r"\b(seats?|desks?|workspace|cabin|hot desk)\b.*\b(today|tomorrow|next|floor|monitor|window)\b",
                r"\bneed\b.*\b(somewhere|place|workspace|available place|desk)\b",
                r"\b(somewhere|place)\b.*\b(sit|work|quiet|window|monitor|team|lift|comfortable)\b",
                r"\b(i'?ll|i will|i am|i'?m|planning to)\b.*\b(office|work from office|coming to the office)\b",
                r"\bi\s+ll\b.*\b(bangalore|bengaluru|hyderabad|chennai|office)\b",
                r"\bi don\s+t want to work from home\b",
                r"\boffice\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
                r"\bwork from\b.*\b(bangalore|bengaluru|hyderabad|chennai|office)\b",
                r"\bneed to work from\b.*\b(office|building|tower|towers|roxana|begumpet|hitech|hyderabad|bangalore|bengaluru|chennai)\b",
                r"\breserve\b.*\b(place|workspace|seat|desk)\b",
                r"\b(anything free|any desks available|what\s+s available|empty seats?|available workspaces?|any options|any cabins available|workstations left)\b",
                r"\banything near the window\b",
                r"\bneed a monitor\b",
                r"\bdo i have choices\b",
                r"\bavailable\b.*\b(floor|hyderabad|bangalore|bengaluru|chennai|desk|seat)\b",
                r"\bcan you arrange a workspace\b",
                r"\bcan you sort something out\b",
                r"\bcan you help me with\b.*\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b",
                r"\bhome will work\b.*\btomorrow\b",
            ),
        ),
        (
            Intent.HELP,
            0.95,
            (
                r"^\s*help\s*$",
                r"\bwhat can you do\b",
                r"\bwhat are my options\b",
                r"\bguide me\b",
                r"\bhow does this work\b",
                r"\bshow options\b",
                r"\bhow\b.*\bbook\b.*\bseat\b",
                r"\bi need\b.*\bassistance\b",
                r"\bcan you do something for me\b",
            ),
        ),
    ]

    async def detect_intent(
        self,
        db: Any,
        tenant_id: int,
        message: str,
    ) -> tuple[IntentResult, IntentResult, Optional[IntentResult]]:
        rule_result = self.detect_by_rules(message)
        vector_result: Optional[IntentResult] = None

        if _env_bool("ENABLE_VECTOR_INTENT", True) and rule_result.confidence < 0.80:
            vector_match = await vector_intent_service.match_intent(db, tenant_id, message)
            vector_result = IntentResult(
                intent=Intent(vector_match.intent) if vector_match.intent in Intent._value2member_map_ else Intent.UNKNOWN,
                confidence=vector_match.confidence,
                source=vector_match.source,
                matched_prompt=vector_match.matched_prompt,
                metadata={
                    "vector_candidates": [
                        {
                            "intent": candidate.intent,
                            "confidence": round(candidate.confidence, 4),
                            "matched_prompt": candidate.matched_prompt,
                        }
                        for candidate in vector_match.candidates
                    ]
                },
            )
            if vector_result.confidence > rule_result.confidence:
                return vector_result, rule_result, vector_result

        return rule_result, rule_result, vector_result

    def detect_by_rules(self, message: str) -> IntentResult:
        normalized = message.lower().strip()
        special = self._detect_special_cases(normalized)
        if special:
            return special
        for intent, confidence, patterns in self._patterns:
            if any(re.search(pattern, normalized) for pattern in patterns):
                return IntentResult(intent=intent, confidence=confidence, source="rules")
        return IntentResult(intent=Intent.UNKNOWN, confidence=0.0, source="rules")

    @staticmethod
    def _detect_special_cases(normalized: str) -> Optional[IntentResult]:
        if re.search(r"\b(which|what|show|list|view|see)\b.*\b(bo+k\w*|reservations?)\b.*\b(cancel|cancell?ed?)\b", normalized):
            return IntentResult(Intent.LIST_BOOKINGS, 0.93, "rules")
        if (
            normalized != "can you help me"
            and re.search(r"\bhelp\b", normalized)
            and not re.search(r"\b(book|reserve|cancel|modify|change|update|move)\b", normalized)
            and not re.search(r"\b(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", normalized)
        ):
            return IntentResult(Intent.HELP, 0.95, "rules")
        if re.search(r"\b(use|get|book)\b.*\b(previous|usual|regular|preferred|favo[u]?rite)\b.*\b(seat|desk|workspace|office|place)?\b", normalized):
            return IntentResult(Intent.QUICK_BOOK, 0.91, "rules")
        if re.search(r"\bsame\s+place\s+as\s+last\s+time\b", normalized):
            return IntentResult(Intent.QUICK_BOOK, 0.91, "rules")
        return None


def infer_booking_intent_from_entities(intent_result: IntentResult, entities: dict[str, Any]) -> IntentResult:
    if intent_result.intent != Intent.UNKNOWN:
        return intent_result

    booking_entity_keys = {
        "site_id",
        "building_id",
        "floor_id",
        "seat_type",
        "headcount",
        "amenity_ids",
    }
    if any(key in entities for key in booking_entity_keys):
        return IntentResult(
            intent=Intent.BOOK_SEAT,
            confidence=0.82,
            source="entity_inference",
            matched_prompt=None,
            metadata={"entity_inference_keys": sorted(key for key in booking_entity_keys if entities.get(key))},
        )
    if entities.get("booking_list_mode") or entities.get("date_range_start") or entities.get("date_range_end"):
        return IntentResult(
            intent=Intent.LIST_BOOKINGS,
            confidence=0.82,
            source="entity_inference",
            matched_prompt=None,
            metadata={"entity_inference_keys": sorted(key for key in ("booking_list_mode", "date_range_start", "date_range_end") if entities.get(key))},
        )
    return intent_result


intent_matcher = IntentMatcher()


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
