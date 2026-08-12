from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


class WhatsAppMessageStore:
    """Tracks WhatsApp message ids for traceability and duplicate suppression."""

    def __init__(self):
        self._client = None
        self._redis_unavailable = False
        self._fallback_messages: dict[str, dict[str, Any]] = {}

    async def record_incoming_once(self, metadata: dict[str, str]) -> bool:
        message_id = metadata.get("message_id")
        if not message_id:
            return True

        trace = {
            "message_id": message_id,
            "wa_id": metadata.get("wa_id", ""),
            "message_type": metadata.get("message_type", ""),
            "interactive_type": metadata.get("interactive_type", ""),
            "received_at": datetime.now(timezone.utc).isoformat(),
        }
        key = self._incoming_key(message_id)
        client = await self._client_or_none()
        if client is not None:
            try:
                stored = await client.set(
                    key,
                    json.dumps(trace),
                    ex=self._ttl_seconds(),
                    nx=True,
                )
                return bool(stored)
            except Exception as exc:
                logger.warning("Redis WhatsApp message id write failed: %s", exc)
                self._redis_unavailable = True

        if key in self._fallback_messages:
            return False
        self._fallback_messages[key] = trace
        return True

    async def record_outgoing(self, wa_id: str, result: dict[str, Any]):
        message_id = result.get("message_id")
        if not message_id:
            return
        trace = {
            "message_id": message_id,
            "wa_id": wa_id,
            "status_code": result.get("status_code"),
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        key = self._outgoing_key(message_id)
        client = await self._client_or_none()
        if client is not None:
            try:
                await client.set(key, json.dumps(trace), ex=self._ttl_seconds())
                return
            except Exception as exc:
                logger.warning("Redis WhatsApp outgoing message id write failed: %s", exc)
                self._redis_unavailable = True
        self._fallback_messages[key] = trace

    async def _client_or_none(self):
        if not settings.ENABLE_REDIS_MEMORY or self._redis_unavailable:
            return None
        if self._client is not None:
            return self._client
        try:
            from redis.asyncio import Redis

            self._client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
            return self._client
        except Exception as exc:
            logger.warning("Redis client unavailable for WhatsApp message store: %s", exc)
            self._redis_unavailable = True
            return None

    @staticmethod
    def _incoming_key(message_id: str) -> str:
        return f"whatsapp_message:incoming:{message_id}"

    @staticmethod
    def _outgoing_key(message_id: str) -> str:
        return f"whatsapp_message:outgoing:{message_id}"

    @staticmethod
    def _ttl_seconds() -> int:
        return max(300, int(settings.WHATSAPP_MESSAGE_DEDUPE_TTL_SECONDS or 86400))


whatsapp_message_store = WhatsAppMessageStore()
