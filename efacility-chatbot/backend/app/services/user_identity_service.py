import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chatbot import ChatbotUserIdentityMap


@dataclass(frozen=True)
class ResolvedUserIdentity:
    user_id: str
    tenant_id: str
    user_name: str
    phone_key: str
    matched: bool


class UserIdentityService:
    """Resolves channel-specific identities to the chatbot user_name.

    The web chatbot already receives a user_name from the UI. WhatsApp only
    gives us a wa_id/mobile number, so this service maps that phone number to
    the same user_name used by the web channel.
    """

    def resolve_whatsapp_user(self, wa_id: str) -> ResolvedUserIdentity:
        normalized_wa_id = self.normalize_phone(wa_id)
        return self._resolve_from_mapping(normalized_wa_id, wa_id, self._whatsapp_mappings())

    async def resolve_whatsapp_user_async(self, wa_id: str, db: AsyncSession) -> ResolvedUserIdentity:
        normalized_wa_id = self.normalize_phone(wa_id)
        db_mappings = await self._whatsapp_db_mappings(db)
        if db_mappings:
            resolved = self._resolve_from_mapping(normalized_wa_id, wa_id, db_mappings)
            if resolved.matched:
                return resolved
        return self.resolve_whatsapp_user(wa_id)

    @staticmethod
    def normalize_phone(value: str) -> str:
        return re.sub(r"\D+", "", value or "")

    @staticmethod
    def _phones_match(wa_id: str, configured_phone: str) -> bool:
        if not wa_id or not configured_phone:
            return False
        return wa_id == configured_phone

    @staticmethod
    def _whatsapp_mappings() -> dict[str, tuple[str, str, str]]:
        """Parse phone|user_id|tenant_id|display_name entries.

        Legacy phone:name entries intentionally do not authorize a user because
        they cannot bind downstream calls to a Workforce identity and tenant.
        """
        raw = settings.WHATSAPP_USER_MAPPINGS or ""
        mappings: dict[str, tuple[str, str, str]] = {}
        for item in raw.split(","):
            if not item.strip():
                continue
            parts = [part.strip() for part in item.split("|", 3)]
            if len(parts) != 4:
                continue
            phone, user_id, tenant_id, user_name = parts
            if phone and user_id and tenant_id and user_name:
                mappings[phone] = (user_id, tenant_id, user_name)
        return mappings

    def _resolve_from_mapping(
        self,
        normalized_wa_id: str,
        original_wa_id: str,
        mappings: dict[str, tuple[str, str, str]],
    ) -> ResolvedUserIdentity:
        for configured_phone, (user_id, tenant_id, user_name) in mappings.items():
            normalized_configured = self.normalize_phone(configured_phone)
            if self._phones_match(normalized_wa_id, normalized_configured):
                return ResolvedUserIdentity(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    user_name=user_name,
                    phone_key=normalized_configured or normalized_wa_id,
                    matched=True,
                )

        return ResolvedUserIdentity(
            user_id="",
            tenant_id="",
            user_name="",
            phone_key=normalized_wa_id or original_wa_id,
            matched=False,
        )

    async def _whatsapp_db_mappings(self, db: AsyncSession) -> dict[str, tuple[str, str, str]]:
        result = await db.execute(
            select(ChatbotUserIdentityMap).where(
                ChatbotUserIdentityMap.tenant_id == settings.DEFAULT_TENANT_ID,
                ChatbotUserIdentityMap.channel == "whatsapp",
                ChatbotUserIdentityMap.is_active.is_(True),
            )
        )
        return {
            row.external_id: (str(row.user_id or ""), str(row.tenant_id), row.user_name)
            for row in result.scalars().all()
            if row.external_id and row.user_id and row.user_name
        }


user_identity_service = UserIdentityService()
