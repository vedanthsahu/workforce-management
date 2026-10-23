import json
import logging

from psycopg2.extensions import connection as PGConnection

from backend.chatbot.deps.seatbook_auth import (
    SeatBookIdentity,
    current_seatbook_identity,
)
from backend.chatbot.schemas.chat import (
    BotMessage,
    ChatResponse,
    CreateSessionRequest,
    MessageType,
    SessionOut,
    UserMessage,
)
from backend.chatbot.services.chat_engine import chat_engine
from backend.chatbot.services.session_service import SessionService
from backend.chatbot.services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)


USER_FRIENDLY_PROCESSING_ERROR = (
    "I am having trouble reaching the booking service right now. "
    'Please try again in a few minutes, or type "menu" to restart the chat.'
)


class ChatAdapterService:
    """Shared application service for all chat channels.

    HTTP, WhatsApp, and future channels should use this service instead of
    duplicating state-machine, persistence, and telemetry behavior.
    """

    async def create_session(
        self,
        body: CreateSessionRequest,
        db: PGConnection,
        identity: SeatBookIdentity | None = None,
    ) -> SessionOut:
        started = telemetry_service.timer()
        user_name = identity.display_name if identity else body.user_name
        logger.info(
            "event=chat_session_create_started channel=%s authenticated=%s tenant_id=%s",
            getattr(body, "channel", "browser"),
            identity is not None,
            identity.tenant_id if identity else "-",
        )
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
        except Exception:
            ok = False
            logger.exception("Error during session init")
            initial = None
        telemetry_service.record_latency(
            "create_session", telemetry_service.elapsed_ms(started), ok=ok
        )
        elapsed_ms = telemetry_service.elapsed_ms(started)
        logger.info(
            "event=chat_session_create_completed session_id=%s node=%s ok=%s elapsed_ms=%s",
            session.id,
            session.current_node,
            ok,
            round(elapsed_ms, 2),
        )
        telemetry_service.record_step(
            "session.initial_response",
            session_id=str(session.id),
            current_node=session.current_node,
            ok=ok,
            message_types=[
                message.type.value for message in (initial.messages if initial else [])
            ],
        )
        return SessionOut(
            session_id=str(session.id),
            user_name=session.user_name,
            current_node=session.current_node,
            state=session.state,
            initial_response=initial,
        )

    async def process_message(
        self,
        session_id: str,
        body: UserMessage,
        db: PGConnection,
        identity: SeatBookIdentity | None = None,
    ) -> ChatResponse | None:
        identity = identity or current_seatbook_identity()
        started = telemetry_service.timer()
        logger.info(
            "event=chat_message_started session_id=%s message_type=%s has_text=%s text_length=%s form_keys=%s",
            session_id,
            body.message_type,
            bool(body.text),
            len(body.text or ""),
            sorted((body.form_data or {}).keys()),
        )
        session = await SessionService.get(
            session_id,
            db,
            authenticated_user_id=identity.user_id if identity else None,
            authenticated_tenant_id=identity.tenant_id if identity else None,
        )
        if not session:
            logger.warning(
                "event=chat_message_rejected session_id=%s reason=session_missing_or_not_owned",
                session_id,
            )
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
        except Exception:
            ok = False
            logger.exception("Error processing message")
            db.rollback()
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
        telemetry_service.record_latency(
            "send_message", telemetry_service.elapsed_ms(started), ok=ok
        )
        elapsed_ms = telemetry_service.elapsed_ms(started)
        logger.info(
            "event=chat_message_completed session_id=%s from_node=%s to_node=%s ok=%s elapsed_ms=%s response_types=%s",
            session_id,
            session.current_node,
            response.current_node,
            ok,
            round(elapsed_ms, 2),
            [message.type.value for message in response.messages],
        )
        telemetry_service.record_step(
            "message.response",
            session_id=session_id,
            current_node=response.current_node,
            state=response.state,
            ok=ok,
            message_types=[message.type.value for message in response.messages],
        )

        try:
            summary = " | ".join(
                m.text or m.type.value for m in response.messages if m.text or m.type
            )
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
