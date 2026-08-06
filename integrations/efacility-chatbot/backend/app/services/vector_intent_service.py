from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class VectorIntentCandidate:
    intent: str
    confidence: float
    matched_prompt: Optional[str] = None


@dataclass(slots=True)
class VectorIntentMatch:
    intent: str
    confidence: float
    source: str = "pgvector"
    matched_prompt: Optional[str] = None
    candidates: list[VectorIntentCandidate] = field(default_factory=list)


@lru_cache(maxsize=1)
def _load_embedding_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def _format_vector(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


class VectorIntentService:
    """Semantic intent matcher backed by pgvector.

    This is intentionally optional at runtime. If pgvector, the intent table, or
    the local sentence-transformer model is unavailable, the caller receives an
    UNKNOWN-equivalent zero-confidence result and the rule-based flow continues.
    """

    async def match_intent(self, db: Any, tenant_id: int, message: str) -> VectorIntentMatch:
        try:
            from sqlalchemy import text

            model = _load_embedding_model()
            embedding = model.encode(message, normalize_embeddings=True).tolist()
            vector_literal = _format_vector(embedding)
            result = await db.execute(
                text(
                    """
                    SELECT intent_key, example_text, 1 - (embedding <=> CAST(:embedding AS vector)) AS confidence
                    FROM chatbot_intent_examples
                    WHERE tenant_id = :tenant_id
                      AND is_active = TRUE
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT 3
                    """
                ),
                {"tenant_id": tenant_id, "embedding": vector_literal},
            )
            rows = result.fetchall()
        except Exception as exc:
            logger.debug("pgvector intent matching unavailable: %s", exc)
            return VectorIntentMatch(intent="UNKNOWN", confidence=0.0, matched_prompt=None)

        if not rows:
            return VectorIntentMatch(intent="UNKNOWN", confidence=0.0, matched_prompt=None)

        candidates = [
            VectorIntentCandidate(
                intent=str(intent_key),
                matched_prompt=str(example_text),
                confidence=float(confidence or 0.0),
            )
            for intent_key, example_text, confidence in rows
        ]
        logger.info(
            "pgvector intent candidates=%s",
            [
                {
                    "intent": candidate.intent,
                    "confidence": round(candidate.confidence, 4),
                    "matched_prompt": candidate.matched_prompt,
                }
                for candidate in candidates
            ],
        )

        best = candidates[0]
        return VectorIntentMatch(
            intent=best.intent,
            confidence=best.confidence,
            matched_prompt=best.matched_prompt,
            candidates=candidates,
        )


vector_intent_service = VectorIntentService()
