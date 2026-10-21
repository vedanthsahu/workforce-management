from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from backend.chatbot.config import settings

logger = logging.getLogger(__name__)


class MemoryService:
    """Redis-backed short-lived chatbot memory.

    Postgres remains the durable source of truth. Redis is used for active
    session state and context so normal chat turns do not need to rebuild memory
    only from relational rows.
    """

    def __init__(self):
        self._client = None
        self._redis_unavailable = False

    async def get_context(self, session_id: Any) -> dict[str, str] | None:
        value = await self._get_json(self._context_key(session_id))
        if not isinstance(value, dict):
            return None
        return {str(k): "" if v is None else str(v) for k, v in value.items()}

    async def set_context(self, session_id: Any, context: dict[str, str]):
        await self._set_json(self._context_key(session_id), context)

    async def merge_context(
        self, session_id: Any, values: dict[str, str]
    ) -> dict[str, str] | None:
        context = await self.get_context(session_id) or {}
        context.update({str(k): "" if v is None else str(v) for k, v in values.items()})
        await self.set_context(session_id, context)
        return context

    async def set_session(self, session: Any):
        payload = {
            "id": str(session.id),
            "tenant_id": session.tenant_id,
            "user_name": session.user_name,
            "state": session.state,
            "current_node": session.current_node,
            "current_menu_id": session.current_menu_id,
            "created_at": self._iso(session.created_at),
            "updated_at": self._iso(session.updated_at),
            "expires_at": self._iso(session.expires_at),
        }
        await self._set_json(self._session_key(session.id), payload)

    async def set_session_state(
        self,
        session_id: Any,
        *,
        state: str,
        current_node: str,
        current_menu_id: Any = None,
    ):
        payload = await self._get_json(self._session_key(session_id))
        if not isinstance(payload, dict):
            return
        payload.update(
            {
                "state": state,
                "current_node": current_node,
                "current_menu_id": current_menu_id,
                "updated_at": datetime.now(UTC).isoformat(),
            }
        )
        await self._set_json(self._session_key(session_id), payload)

    async def append_conversation_event(self, session_id: Any, event: dict[str, Any]):
        client = await self._client_or_none()
        if client is None:
            return
        try:
            key = self._conversation_key(session_id)
            await client.rpush(key, json.dumps(event, default=str))
            await client.expire(key, self._ttl_seconds())
        except Exception as exc:
            logger.debug("Redis conversation memory unavailable: %s", exc)
            self._redis_unavailable = True

    async def ping(self) -> bool:
        client = await self._client_or_none()
        if client is None:
            return False
        try:
            return bool(await client.ping())
        except Exception:
            return False

    async def _get_json(self, key: str) -> Any | None:
        client = await self._client_or_none()
        if client is None:
            return None
        try:
            raw = await client.get(key)
            if not raw:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.debug("Redis read unavailable for %s: %s", key, exc)
            self._redis_unavailable = True
            return None

    async def _set_json(self, key: str, value: Any):
        client = await self._client_or_none()
        if client is None:
            return
        try:
            await client.set(
                key, json.dumps(value, default=str), ex=self._ttl_seconds()
            )
        except Exception as exc:
            logger.debug("Redis write unavailable for %s: %s", key, exc)
            self._redis_unavailable = True

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
            logger.debug("Redis client unavailable: %s", exc)
            self._redis_unavailable = True
            return None

    @staticmethod
    def _session_key(session_id: Any) -> str:
        return f"efacility:chat:session:{session_id}"

    @staticmethod
    def _context_key(session_id: Any) -> str:
        return f"efacility:chat:context:{session_id}"

    @staticmethod
    def _conversation_key(session_id: Any) -> str:
        return f"efacility:chat:conversation:{session_id}"

    @staticmethod
    def _ttl_seconds() -> int:
        return max(60, settings.SESSION_TTL_MINUTES * 60)

    @staticmethod
    def _iso(value: Any) -> str | None:
        return value.isoformat() if value else None


memory_service = MemoryService()
