import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, BackgroundTasks
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.schemas.chat import UserMessage
from app.services.chat_adapter_service import chat_adapter_service
from app.services.whatsapp_interaction_service import whatsapp_interaction_service
from app.services.whatsapp_message_store import whatsapp_message_store
from app.services.whatsapp_service import whatsapp_service
from app.services.whatsapp_session_service import whatsapp_session_service

router = APIRouter()
logger = logging.getLogger(__name__)

WHATSAPP_FALLBACK_ERROR = (
    'I am having trouble reaching the booking service right now. '
    'Please try again in a few minutes, or type "menu" to restart the chat.'
)


@router.get("/webhook", response_class=PlainTextResponse)
async def verify_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verification success")
        return PlainTextResponse(content=hub_challenge)

    logger.warning("WhatsApp webhook verification failed mode=%s", hub_mode)
    raise HTTPException(status_code=403, detail="Invalid verify token")


@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception as exc:
        logger.warning("WhatsApp webhook invalid JSON ignored: %s", exc)
        return {"status": "ignored", "reason": "invalid_json"}

    metadata = whatsapp_service.extract_message_metadata(payload)
    if metadata:
        logger.info("WhatsApp webhook received metadata=%s", metadata)

    if not whatsapp_service.extract_text_message(payload):
        logger.info("WhatsApp webhook ignored non-message payload")
        return {"status": "ignored"}

    background_tasks.add_task(process_webhook_payload, payload)
    return {"status": "accepted"}


async def process_webhook_payload(payload: dict[str, Any]):
    async with AsyncSessionLocal() as db:
        await handle_webhook_payload(payload, db)


async def handle_webhook_payload(payload: dict[str, Any], db: AsyncSession) -> dict[str, Any]:
    extracted = whatsapp_service.extract_text_message(payload)
    if not extracted:
        logger.info("WhatsApp webhook ignored non-message payload")
        return {"status": "ignored"}

    wa_id, text = extracted
    metadata_extractor = getattr(whatsapp_service, "extract_message_metadata", None)
    metadata = metadata_extractor(payload) if metadata_extractor else {}
    if metadata:
        is_new_message = await whatsapp_message_store.record_incoming_once(metadata)
        if not is_new_message:
            logger.info(
                "WhatsApp duplicate webhook ignored wa_id=%s message_id=%s",
                wa_id,
                metadata.get("message_id"),
            )
            return {"status": "duplicate_ignored"}

    logger.info(
        "WhatsApp incoming wa_id=%s message_id=%s text=%s",
        wa_id,
        metadata.get("message_id", ""),
        text[:500],
    )

    try:
        session_id = await whatsapp_session_service.get_or_create_session_id(wa_id, db)
        logger.info("WhatsApp session mapped wa_id=%s session_id=%s", wa_id, session_id)

        interaction_result = await whatsapp_interaction_service.handle_incoming(
            wa_id=wa_id,
            text=text,
            session_id=session_id,
            db=db,
        )
        if interaction_result:
            logger.info("WhatsApp interaction handled wa_id=%s result=%s", wa_id, interaction_result)
            await whatsapp_message_store.record_outgoing(wa_id, interaction_result)
            return {"status": "ok"}

        response = await chat_adapter_service.process_message(
            session_id,
            UserMessage(text=text, message_type="TEXT"),
            db,
        )
        if response is None:
            session_id = await whatsapp_session_service.get_or_create_session_id(wa_id, db)
            response = await chat_adapter_service.process_message(
                session_id,
                UserMessage(text=text, message_type="TEXT"),
                db,
            )

        if response:
            send_result = await whatsapp_interaction_service.deliver_response(
                wa_id=wa_id,
                session_id=session_id,
                response=response,
                db=db,
            )
        else:
            send_result = await whatsapp_service.send_text(
                wa_id,
                WHATSAPP_FALLBACK_ERROR,
            )
        logger.info(
            "WhatsApp outgoing handled wa_id=%s session_id=%s result=%s",
            wa_id,
            session_id,
            {k: v for k, v in send_result.items() if k != "body"},
        )
        await whatsapp_message_store.record_outgoing(wa_id, send_result)
    except Exception as exc:
        logger.exception("WhatsApp webhook processing failed: %s", exc)
        try:
            await whatsapp_service.send_text(
                wa_id,
                WHATSAPP_FALLBACK_ERROR,
            )
        except Exception as send_exc:
            logger.warning("WhatsApp fallback send failed: %s", send_exc)

    return {"status": "ok"}
