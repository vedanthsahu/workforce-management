import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.chatbot.config import settings
from backend.chatbot.models.chatbot import ChatbotSession
from backend.chatbot.services.conversation_log_service import conversation_log_service
from backend.chatbot.services.memory_service import memory_service


def _utcnow():
    return datetime.now(UTC)


class SessionService:
    @staticmethod
    async def create(
        user_name: str,
        db: AsyncSession,
        *,
        authenticated_user_id: str | None = None,
        authenticated_tenant_id: str | None = None,
    ) -> ChatbotSession:
        now = _utcnow()
        expires = now + timedelta(minutes=settings.SESSION_TTL_MINUTES)
        context_data = {}
        if authenticated_user_id is not None:
            context_data["authenticated_user_id"] = authenticated_user_id
        if authenticated_tenant_id is not None:
            context_data["authenticated_tenant_id"] = authenticated_tenant_id
        session = ChatbotSession(
            id=uuid.uuid4(),
            tenant_id=int(authenticated_tenant_id or settings.DEFAULT_TENANT_ID),
            user_name=user_name,
            state="INITIATED",
            current_node="MAIN_MENU",
            created_at=now,
            updated_at=now,
            expires_at=expires,
            context_data=context_data,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        await memory_service.set_session(session)
        return session

    @staticmethod
    async def get(
        session_id: str,
        db: AsyncSession,
        *,
        authenticated_user_id: str | None = None,
        authenticated_tenant_id: str | None = None,
    ) -> ChatbotSession | None:
        try:
            uid = uuid.UUID(session_id)
        except ValueError:
            return None
        result = await db.execute(
            select(ChatbotSession).where(ChatbotSession.id == uid)
        )
        session = result.scalar_one_or_none()
        if session and (
            authenticated_user_id is not None or authenticated_tenant_id is not None
        ):
            ownership = session.context_data or {}
            if (
                ownership.get("authenticated_user_id") != authenticated_user_id
                or ownership.get("authenticated_tenant_id") != authenticated_tenant_id
            ):
                return None
        if session and session.expires_at:
            expires = session.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            if expires < _utcnow():
                session.state = "EXPIRED"
                await db.commit()
                return None
        if session:
            await memory_service.set_session(session)
        return session

    @staticmethod
    async def save_message(
        session_id,
        direction: str,
        text: str,
        msg_type: str,
        node: str,
        db: AsyncSession,
        session: ChatbotSession | None = None,
    ):
        from backend.chatbot.models.chatbot import ChatbotMessage

        msg = ChatbotMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            direction=direction,
            message_text=text[:2000],
            message_type=msg_type,
            node_id=node,
            created_at=_utcnow(),
        )
        db.add(msg)
        await db.commit()
        if session:
            await conversation_log_service.record_message(
                session_id=session_id,
                tenant_id=session.tenant_id,
                user_name=session.user_name,
                direction=direction,
                text=text,
                message_type=msg_type,
                node=node,
                event_id=str(msg.id),
            )
