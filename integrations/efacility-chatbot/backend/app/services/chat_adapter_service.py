import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.chat import ChatResponse, BotMessage, CreateSessionRequest, MessageType, SessionOut, UserMessage
from app.deps.seatbook_auth import SeatBookIdentity
from app.services.chat_engine import chat_engine
from app.services.session_service import SessionService
from app.services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)


USER_FRIENDLY_PROCESSING_ERROR = (
    'I am having trouble reaching the booking service right now. '
    'Please try again in a few minutes, or type "menu" to restart the chat.'
)


class ChatAdapterService:
    """Shared application service for all chat channels.

    HTTP, WhatsApp, and future channels should use this service instead of
    duplicating state-machine, persistence, and telemetry behavior.
    """

    async def create_session(self, body: CreateSessionRequest, db: AsyncSession, identity: SeatBookIdentity | None = None) -> SessionOut:
        started = telemetry_service.timer()
        user_name = identity.display_name if identity else body.user_name
        session = await SessionService.create(
            user_name,
            db,
            authenticated_user_id=identity.user_id if identity else None,
            authenticated_tenant_id=identity.tenant_id if identity else None,
        )
        telemetry_service.record_booking_event("session_started", user_name=user_name)
        telemetry_service.record_step(
            "session.create",
            session_id=str(session.id),
            user_name=user_name,
            current_node=session.current_node,
        )
        ok = True
        try:
            initial = await chat_engine.process(session, None, None, db)
        except Exception as exc:
            ok = False
            logger.exception("Error during session init: %s", exc)
            initial = None
        telemetry_service.record_latency("create_session", telemetry_service.elapsed_ms(started), ok=ok)
        telemetry_service.record_step(
            "session.initial_response",
            session_id=str(session.id),
            current_node=session.current_node,
            ok=ok,
            message_types=[message.type.value for message in (initial.messages if initial else [])],
        )
        return SessionOut(
            session_id=str(session.id),
            user_name=session.user_name,
            current_node=session.current_node,
            state=session.state,
            initial_response=initial,
        )

    async def process_message(self, session_id: str, body: UserMessage, db: AsyncSession, identity: SeatBookIdentity | None = None) -> ChatResponse | None:
        started = telemetry_service.timer()
        session = await SessionService.get(
            session_id,
            db,
            authenticated_user_id=identity.user_id if identity else None,
            authenticated_tenant_id=identity.tenant_id if identity else None,
        )
        if not session:
            return None

        telemetry_service.record_step(
            "message.received",
            session_id=session_id,
            current_node=session.current_node,
            message_type=body.message_type,
            has_text=bool(body.text),
            form_keys=sorted((body.form_data or {}).keys()),
        )
        await SessionService.save_message(
            session.id,
            "IN",
            body.text or json.dumps(body.form_data or {}),
            body.message_type,
            session.current_node,
            db,
            session=session,
        )

        ok = True
        try:
            response = await chat_engine.process(
                session,
                user_text=body.text,
                form_data=body.form_data,
                db=db,
            )
        except Exception as exc:
            ok = False
            logger.exception("Error processing message: %s", exc)
            await db.rollback()
            response = ChatResponse(
                session_id=session_id,
                current_node=session.current_node,
                state=session.state,
                messages=[
                    BotMessage(
                        type=MessageType.ERROR,
                        text=USER_FRIENDLY_PROCESSING_ERROR,
                    )
                ],
            )
        telemetry_service.record_latency("send_message", telemetry_service.elapsed_ms(started), ok=ok)
        telemetry_service.record_step(
            "message.response",
            session_id=session_id,
            current_node=response.current_node,
            state=response.state,
            ok=ok,
            message_types=[message.type.value for message in response.messages],
        )

        try:
            summary = " | ".join(m.text or m.type.value for m in response.messages if m.text or m.type)
            await SessionService.save_message(
                session.id,
                "OUT",
                summary[:2000],
                "BOT_RESPONSE",
                response.current_node,
                db,
                session=session,
            )
        except Exception as exc:
            logger.warning("Failed to persist outgoing message: %s", exc)

        return response


chat_adapter_service = ChatAdapterService()
