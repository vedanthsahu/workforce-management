from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.intent_matcher import Intent, IntentResult


BOOKING_ENTITY_KEYS = {
    "booking_date",
    "site_id",
    "building_id",
    "floor_id",
    "seat_type",
    "amenity_ids",
}

BOOKING_CONTEXT_KEYS = {
    "booking_date",
    "site_id",
    "building_id",
    "floor_id",
    "seat_type",
    "amenity_ids",
}

BOOKING_ACTION_ENTITY_KEYS = {
    "booking_ref",
    "booking_date",
    "date_range_start",
    "date_range_end",
    "booking_list_mode",
}


@dataclass(slots=True)
class ConfidenceBreakdown:
    base_confidence: float
    entity_score: float
    context_score: float
    source_adjustment: float
    final_confidence: float

    def as_dict(self) -> dict[str, float]:
        return {
            "base_confidence": round(self.base_confidence, 4),
            "entity_score": round(self.entity_score, 4),
            "context_score": round(self.context_score, 4),
            "source_adjustment": round(self.source_adjustment, 4),
            "final_confidence": round(self.final_confidence, 4),
        }


class ConfidenceService:
    """Deterministic confidence reranking after entity extraction.

    Rules and pgvector still pick the intent. This service only adjusts the
    confidence using explainable domain signals so telemetry is steadier and
    medium-confidence decisions can be reviewed more accurately.
    """

    def rerank(
        self,
        result: IntentResult,
        entities: dict[str, Any],
        session_context: dict[str, str],
    ) -> IntentResult:
        if result.intent == Intent.UNKNOWN:
            return result

        entity_score = self._entity_score(result.intent, entities)
        context_score = self._context_score(result.intent, session_context)
        source_adjustment = self._source_adjustment(result, entity_score)
        final_confidence = self._clamp(
            result.confidence
            + (entity_score * 0.07)
            + (context_score * 0.03)
            + source_adjustment
        )

        if abs(final_confidence - result.confidence) < 0.0001:
            return result

        breakdown = ConfidenceBreakdown(
            base_confidence=result.confidence,
            entity_score=entity_score,
            context_score=context_score,
            source_adjustment=source_adjustment,
            final_confidence=final_confidence,
        )
        return IntentResult(
            intent=result.intent,
            confidence=final_confidence,
            source=f"{result.source}+rerank",
            matched_prompt=result.matched_prompt,
            metadata={**result.metadata, "confidence_breakdown": breakdown.as_dict()},
        )

    @staticmethod
    def _entity_score(intent: Intent, entities: dict[str, Any]) -> float:
        if not entities:
            return 0.0
        if intent == Intent.BOOK_SEAT:
            return ConfidenceService._coverage(BOOKING_ENTITY_KEYS, entities)
        if intent in {Intent.LIST_BOOKINGS, Intent.CANCEL_BOOKING, Intent.MODIFY_BOOKING}:
            return ConfidenceService._coverage(BOOKING_ACTION_ENTITY_KEYS, entities)
        return 0.0

    @staticmethod
    def _context_score(intent: Intent, session_context: dict[str, str]) -> float:
        if intent != Intent.BOOK_SEAT or not session_context:
            return 0.0
        present = {key for key, value in session_context.items() if value}
        return len(present & BOOKING_CONTEXT_KEYS) / len(BOOKING_CONTEXT_KEYS)

    @staticmethod
    def _source_adjustment(result: IntentResult, entity_score: float) -> float:
        if result.source == "pgvector" and result.intent == Intent.BOOK_SEAT and entity_score == 0:
            return -0.05
        if result.source == "entity_inference":
            return 0.02
        return 0.0

    @staticmethod
    def _coverage(keys: set[str], entities: dict[str, Any]) -> float:
        return len([key for key in keys if entities.get(key)]) / len(keys)

    @staticmethod
    def _clamp(value: float) -> float:
        return max(0.0, min(0.99, round(value, 4)))


confidence_service = ConfidenceService()
