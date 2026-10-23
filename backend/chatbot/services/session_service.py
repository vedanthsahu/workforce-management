import uuid
from datetime import UTC, datetime, timedelta

from psycopg2.extensions import connection as PGConnection

from backend.chatbot.config import settings
from backend.chatbot.models.chatbot import ChatbotSession
from backend.chatbot.services.conversation_log_service import conversation_log_service
from backend.chatbot.services.memory_service import memory_service
from backend.repositories.chatbot_repository import (
    fetch_chatbot_session,
    insert_chatbot_message,
    insert_chatbot_session,
    update_chatbot_session_state,
)


def _utcnow():
    return datetime.now(UTC)


class SessionService:
    @staticmethod
    async def create(
        user_name: str,
        conn: PGConnection,
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
        row = insert_chatbot_session(
            conn,
            session_id=uuid.uuid4(),
            tenant_id=int(authenticated_tenant_id or settings.DEFAULT_TENANT_ID),
            user_name=user_name,
            state="INITIATED",
            current_node="MAIN_MENU",
            created_at=now,
            updated_at=now,
            expires_at=expires,
            context_data=context_data,
        )
        session = ChatbotSession.from_row(row)
        await memory_service.set_session(session)
        return session

    @staticmethod
    async def get(
        session_id: str,
        conn: PGConnection,
        *,
        authenticated_user_id: str | None = None,
        authenticated_tenant_id: str | None = None,
    ) -> ChatbotSession | None:
        try:
            uid = uuid.UUID(session_id)
        except ValueError:
            return None
        row = fetch_chatbot_session(conn, session_id=uid)
        session = ChatbotSession.from_row(row) if row else None
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
                update_chatbot_session_state(conn, session_id=uid, state="EXPIRED")
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
        conn: PGConnection,
        session: ChatbotSession | None = None,
    ):
        message_id = uuid.uuid4()
        insert_chatbot_message(
            conn,
            message_id=message_id,
            session_id=session_id,
            direction=direction,
            message_text=text[:2000],
            message_type=msg_type,
            node_id=node,
            created_at=_utcnow(),
        )
        if session:
            await conversation_log_service.record_message(
                session_id=session_id,
                tenant_id=session.tenant_id,
                user_name=session.user_name,
                direction=direction,
                text=text,
                message_type=msg_type,
                node=node,
                event_id=str(message_id),
            )
