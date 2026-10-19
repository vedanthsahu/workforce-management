from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.chatbot.services.confidence_service import confidence_service
from backend.chatbot.services.entity_extractor import entity_extractor
from backend.chatbot.services.intent_matcher import (
    Intent,
    IntentResult,
    infer_booking_intent_from_entities,
    intent_matcher,
)
from backend.chatbot.services.text_normalizer_service import normalize_message

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class FreeTextResult:
    intent: Intent
    confidence: float
    source: str
    entities: dict[str, Any] = field(default_factory=dict)
    normalized_message: str = ""
    matched_prompt: str | None = None
    needs_confirmation: bool = False
    is_global_command: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def accepted(self) -> bool:
        return (
            self.confidence >= 0.80
            and self.intent != Intent.UNKNOWN
            and not self.needs_confirmation
        )

    def context_payload(self) -> str:
        return json.dumps(
            {
                "intent": self.intent.value,
                "entities": self.entities,
                "metadata": self.metadata,
            }
        )


class FreeTextService:
    global_commands = {
        "menu": Intent.UNKNOWN,
        "back": Intent.UNKNOWN,
        "0": Intent.UNKNOWN,
        "help": Intent.HELP,
        "quit": Intent.UNKNOWN,
        "exit": Intent.UNKNOWN,
        "bye": Intent.UNKNOWN,
    }

    async def interpret_message(
        self,
        db: AsyncSession,
        tenant_id: int,
        user_message: str,
        session_context: dict[str, str],
    ) -> FreeTextResult:
        normalized = self.normalize(user_message)
        logger.info(
            "event=free_text_received text_length=%s normalized_length=%s context_keys=%s",
            len(user_message or ""),
            len(normalized),
            sorted(session_context.keys()),
        )

        global_result = self._detect_global_command(normalized)
        if global_result:
            logger.info(
                "Free text global command intent=%s", global_result.intent.value
            )
            return global_result

        selected, rule_result, vector_result = await intent_matcher.detect_intent(
            db, tenant_id, normalized
        )
        entities = await entity_extractor.extract(db, tenant_id, normalized)
        selected = infer_booking_intent_from_entities(selected, entities)
        selected = confidence_service.rerank(selected, entities, session_context)
        result = self._build_result(selected, normalized, entities)

        logger.info(
            "event=free_text_classified rule_intent=%s rule_confidence=%s vector_intent=%s vector_confidence=%s selected_intent=%s selected_confidence=%s source=%s entity_keys=%s metadata_keys=%s",
            rule_result.intent.value if rule_result else None,
            rule_result.confidence if rule_result else None,
            vector_result.intent.value if vector_result else None,
            vector_result.confidence if vector_result else None,
            result.intent.value,
            result.confidence,
            result.source,
            sorted(result.entities.keys()),
            sorted(result.metadata.keys()),
        )
        return result

    @staticmethod
    def normalize(message: str) -> str:
        return normalize_message(message)

    def _detect_global_command(self, normalized: str) -> FreeTextResult | None:
        if normalized not in self.global_commands:
            return None
        intent = self.global_commands[normalized]
        return FreeTextResult(
            intent=intent,
            confidence=1.0 if intent != Intent.UNKNOWN else 0.0,
            source="global",
            normalized_message=normalized,
            needs_confirmation=False,
            is_global_command=True,
        )

    @staticmethod
    def _build_result(
        intent_result: IntentResult, normalized: str, entities: dict[str, Any]
    ) -> FreeTextResult:
        return FreeTextResult(
            intent=intent_result.intent,
            confidence=intent_result.confidence,
            source=intent_result.source,
            entities=entities,
            normalized_message=normalized,
            matched_prompt=intent_result.matched_prompt,
            needs_confirmation=intent_result.needs_confirmation,
            metadata=intent_result.metadata,
        )


free_text_service = FreeTextService()
