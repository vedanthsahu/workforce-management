import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.session_service import SessionService
from app.services.user_identity_service import user_identity_service

logger = logging.getLogger(__name__)


class WhatsAppSessionService:
    """Maps a WhatsApp wa_id/mobile number to a chatbot session id."""

    def __init__(self):
        self._client = None
        self._redis_unavailable = False
        self._fallback_sessions: dict[str, str] = {}

    async def get_or_create_session_id(self, wa_id: str, db: AsyncSession) -> str:
        identity = await user_identity_service.resolve_whatsapp_user_async(wa_id, db)
        existing = await self.get_session_id(wa_id)
        if existing:
            session = await SessionService.get(existing, db)
            if session and session.user_name == identity.user_name:
                return str(session.id)
            if session:
                logger.info(
                    "WhatsApp mapped session user changed wa_id=%s old_user=%s new_user=%s",
                    wa_id,
                    session.user_name,
                    identity.user_name,
                )
                await self.clear_session_id(wa_id)
            else:
                await self.clear_session_id(wa_id)
            logger.info("WhatsApp mapped session expired wa_id=%s session_id=%s", wa_id, existing)

        session = await SessionService.create(identity.user_name, db)
        session_id = str(session.id)
        await self.set_session_id(wa_id, session_id)
        logger.info(
            "WhatsApp user resolved wa_id=%s user_name=%s matched=%s",
            wa_id,
            identity.user_name,
            identity.matched,
        )
        return session_id

    async def get_session_id(self, wa_id: str) -> Optional[str]:
        key = self._key(wa_id)
        client = await self._client_or_none()
        if client is not None:
            try:
                return await client.get(key)
            except Exception as exc:
                logger.warning("Redis WhatsApp session read failed: %s", exc)
                self._redis_unavailable = True
        return self._fallback_sessions.get(key)

    async def set_session_id(self, wa_id: str, session_id: str):
        key = self._key(wa_id)
        client = await self._client_or_none()
        if client is not None:
            try:
                await client.set(key, session_id, ex=self._ttl_seconds())
                return
            except Exception as exc:
                logger.warning("Redis WhatsApp session write failed: %s", exc)
                self._redis_unavailable = True
        self._fallback_sessions[key] = session_id

    async def clear_session_id(self, wa_id: str):
        key = self._key(wa_id)
        client = await self._client_or_none()
        if client is not None:
            try:
                await client.delete(key)
            except Exception as exc:
                logger.warning("Redis WhatsApp session delete failed: %s", exc)
                self._redis_unavailable = True
        self._fallback_sessions.pop(key, None)

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
            logger.warning("Redis client unavailable for WhatsApp session mapping: %s", exc)
            self._redis_unavailable = True
            return None

    @staticmethod
    def _key(wa_id: str) -> str:
        phone_key = user_identity_service.normalize_phone(wa_id) or wa_id
        return f"whatsapp_session:{phone_key}"

    @staticmethod
    def _ttl_seconds() -> int:
        return max(60, settings.SESSION_TTL_MINUTES * 60)


whatsapp_session_service = WhatsAppSessionService()
