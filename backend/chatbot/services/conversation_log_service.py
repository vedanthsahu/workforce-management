from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from backend.chatbot.config import settings
from backend.chatbot.services.memory_service import memory_service

logger = logging.getLogger(__name__)


class ConversationLogService:
    """Conversation event sink for ELK-compatible storage.

    The chatbot should never fail because Elasticsearch is down. Events are
    best-effort indexed to Elasticsearch and also mirrored to Redis conversation
    memory when Redis is enabled.
    """

    async def record_message(
        self,
        *,
        session_id: Any,
        tenant_id: int,
        user_name: str,
        direction: str,
        text: str,
        message_type: str,
        node: str,
        event_id: str | None = None,
    ):
        message_text = (text or "")[:4000]
        event = {
            "event_id": str(event_id) if event_id else None,
            "@timestamp": datetime.now(UTC).isoformat(),
            "message": message_text,
            "log": {"level": "info"},
            "service": {"name": "efacility-chatbot"},
            "event": {
                "dataset": "efacility.chatbot.conversation",
                "kind": "event",
                "category": ["web"],
                "type": ["info"],
            },
            "data_stream": {
                "type": "logs",
                "dataset": "efacility-chatbot.conversations",
                "namespace": "default",
            },
            "resource": "efacility-chatbot",
            "content": message_text,
            "session_id": str(session_id),
            "tenant_id": tenant_id,
            "user_name": user_name,
            "direction": direction,
            "message_type": message_type,
            "node": node,
            "message_text": message_text,
            "source": "efacility-chatbot",
        }
        await memory_service.append_conversation_event(session_id, event)
        await self._index_event(event)

    async def _index_event(self, event: dict[str, Any]):
        if not settings.ENABLE_ELK_CONVERSATION_LOGS:
            return
        url = settings.ELASTICSEARCH_URL.rstrip("/")
        endpoint = (
            f"{url}/{settings.ELASTICSEARCH_CONVERSATION_INDEX}/_doc?op_type=create"
        )
        try:
            async with httpx.AsyncClient(
                timeout=settings.ELASTICSEARCH_TIMEOUT_SECONDS
            ) as client:
                response = await client.post(endpoint, json=event)
                response.raise_for_status()
        except Exception as exc:
            logger.warning(
                "event=conversation_index_failed session_id=%s event_id=%s error_type=%s",
                event.get("session_id"),
                event.get("event_id"),
                type(exc).__name__,
            )

    async def health(self) -> bool:
        if not settings.ENABLE_ELK_CONVERSATION_LOGS:
            return False
        try:
            async with httpx.AsyncClient(
                timeout=settings.ELASTICSEARCH_TIMEOUT_SECONDS
            ) as client:
                response = await client.get(settings.ELASTICSEARCH_URL.rstrip("/"))
                return response.status_code < 500
        except Exception:
            return False


conversation_log_service = ConversationLogService()
