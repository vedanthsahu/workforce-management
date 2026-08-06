import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.chatbot import ChatbotSession, ChatbotSessionContext
from app.config import settings
from app.services.conversation_log_service import conversation_log_service
from app.services.memory_service import memory_service


def _utcnow():
    return datetime.now(timezone.utc)


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
        session = ChatbotSession(
            id=uuid.uuid4(),
            tenant_id=settings.DEFAULT_TENANT_ID,
            user_name=user_name,
            state="INITIATED",
            current_node="MAIN_MENU",
            created_at=now,
            updated_at=now,
            expires_at=expires,
        )
        db.add(session)
        if authenticated_user_id is not None:
            db.add(ChatbotSessionContext(
                session_id=session.id,
                context_key="authenticated_user_id",
                context_value=authenticated_user_id,
                updated_at=now,
            ))
        if authenticated_tenant_id is not None:
            db.add(ChatbotSessionContext(
                session_id=session.id,
                context_key="authenticated_tenant_id",
                context_value=authenticated_tenant_id,
                updated_at=now,
            ))
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
        result = await db.execute(select(ChatbotSession).where(ChatbotSession.id == uid))
        session = result.scalar_one_or_none()
        if session and (authenticated_user_id is not None or authenticated_tenant_id is not None):
            owner_result = await db.execute(
                select(
                    ChatbotSessionContext.context_key,
                    ChatbotSessionContext.context_value,
                ).where(
                    ChatbotSessionContext.session_id == uid,
                    ChatbotSessionContext.context_key.in_((
                        "authenticated_user_id",
                        "authenticated_tenant_id",
                    )),
                )
            )
            ownership = dict(owner_result.all())
            if (
                ownership.get("authenticated_user_id") != authenticated_user_id
                or ownership.get("authenticated_tenant_id") != authenticated_tenant_id
            ):
                return None
        if session and session.expires_at:
            expires = session.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < _utcnow():
                session.state = "EXPIRED"
                await db.commit()
                return None
        if session:
            await memory_service.set_session(session)
        return session

    @staticmethod
    async def save_message(session_id, direction: str, text: str,
                           msg_type: str, node: str, db: AsyncSession, session: ChatbotSession | None = None):
        from app.models.chatbot import ChatbotMessage
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
