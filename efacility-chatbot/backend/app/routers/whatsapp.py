import json
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
from app.logging_config import mask_identifier
from app.deps.seatbook_auth import SeatBookIdentity, whatsapp_seatbook_identity
from app.services.user_identity_service import user_identity_service
from app.services.whatsapp_security_service import whatsapp_security_service

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
    if not settings.WHATSAPP_ENABLED or not settings.WHATSAPP_VERIFY_TOKEN:
        raise HTTPException(status_code=404, detail="WhatsApp webhook is disabled")
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verification success")
        return PlainTextResponse(content=hub_challenge)

    logger.warning("WhatsApp webhook verification failed mode=%s", hub_mode)
    raise HTTPException(status_code=403, detail="Invalid verify token")


@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks) -> dict[str, Any]:
    if not settings.WHATSAPP_ENABLED:
        raise HTTPException(status_code=404, detail="WhatsApp webhook is disabled")
    if not settings.WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS:
        logger.error("event=whatsapp_webhook_rejected reason=signature_verification_not_configured")
        raise HTTPException(status_code=503, detail="Webhook signature verification is not configured")
    content_length = request.headers.get("content-length")
    maximum = max(1024, int(settings.WHATSAPP_MAX_WEBHOOK_BYTES))
    if content_length and content_length.isdigit() and int(content_length) > maximum:
        logger.warning("event=whatsapp_webhook_rejected reason=payload_too_large")
        raise HTTPException(status_code=413, detail="Webhook payload too large")
    try:
        raw_body = await request.body()
        if len(raw_body) > maximum:
            logger.warning("event=whatsapp_webhook_rejected reason=payload_too_large")
            raise HTTPException(status_code=413, detail="Webhook payload too large")
        payload = json.loads(raw_body)
        if not isinstance(payload, dict):
            raise ValueError("root must be an object")
    except HTTPException:
        raise
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
        logger.warning("event=whatsapp_webhook_rejected reason=invalid_json error_type=%s", type(exc).__name__)
        return {"status": "ignored", "reason": "invalid_json"}

    metadata = whatsapp_service.extract_message_metadata(payload)
    if metadata:
        logger.info(
            "event=whatsapp_webhook_received wa_id=%s message_id=%s message_type=%s interactive_type=%s",
            mask_identifier(metadata.get("wa_id")),
            metadata.get("message_id", ""),
            metadata.get("message_type", ""),
            metadata.get("interactive_type", ""),
        )

    extracted = whatsapp_service.extract_text_message(payload)
    if not extracted:
        logger.info("WhatsApp webhook ignored non-message payload")
        return {"status": "ignored"}

    wa_id, _ = extracted
    client_host = request.client.host if request.client else "unknown"
    phone_key = user_identity_service.normalize_phone(wa_id)
    sender_allowed = await whatsapp_security_service.allow_request(
        f"sender:{phone_key}", settings.WHATSAPP_RATE_LIMIT_PER_MINUTE
    )
    source_allowed = await whatsapp_security_service.allow_request(
        f"source:{client_host}", settings.WHATSAPP_IP_RATE_LIMIT_PER_MINUTE
    )
    if not sender_allowed or not source_allowed:
        logger.warning("event=whatsapp_webhook_rejected reason=rate_limited wa_id=%s", mask_identifier(wa_id))
        raise HTTPException(status_code=429, detail="Webhook rate limit exceeded")
    if not await whatsapp_security_service.reserve_task():
        logger.warning("event=whatsapp_webhook_rejected reason=worker_capacity")
        raise HTTPException(status_code=503, detail="Webhook worker capacity reached")
    background_tasks.add_task(process_webhook_payload, payload)
    return {"status": "accepted"}


async def process_webhook_payload(payload: dict[str, Any]):
    try:
        async with AsyncSessionLocal() as db:
            await handle_webhook_payload(payload, db)
    finally:
        await whatsapp_security_service.release_task()


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
                mask_identifier(wa_id),
                metadata.get("message_id"),
            )
            return {"status": "duplicate_ignored"}

    logger.info(
        "event=whatsapp_message_received wa_id=%s message_id=%s text_length=%s",
        mask_identifier(wa_id),
        metadata.get("message_id", ""),
        len(text or ""),
    )

    authorized = False
    try:
        resolved = await user_identity_service.resolve_whatsapp_user_async(wa_id, db)
        if settings.WHATSAPP_REQUIRE_ALLOWLIST and not resolved.matched:
            logger.warning("event=whatsapp_message_rejected reason=sender_not_allowlisted wa_id=%s", mask_identifier(wa_id))
            return {"status": "rejected", "reason": "sender_not_allowlisted"}
        if not resolved.matched:
            raise PermissionError("Unmapped WhatsApp identities are not supported")
        identity = SeatBookIdentity(
            user_id=resolved.user_id,
            tenant_id=resolved.tenant_id,
            display_name=resolved.user_name,
        )
        authorized = True
        async with whatsapp_seatbook_identity(identity):
            return await _handle_authorized_message(wa_id, text, metadata, resolved, identity, db)
    except PermissionError:
        logger.warning("event=whatsapp_message_rejected reason=identity_not_authorized wa_id=%s", mask_identifier(wa_id))
        return {"status": "rejected", "reason": "identity_not_authorized"}
    except Exception as exc:
        logger.exception("event=whatsapp_processing_failed error_type=%s", type(exc).__name__)
        if authorized:
            try:
                await whatsapp_service.send_text(wa_id, WHATSAPP_FALLBACK_ERROR)
            except Exception as send_exc:
                logger.warning("event=whatsapp_fallback_failed error_type=%s", type(send_exc).__name__)
    return {"status": "ok"}


async def _handle_authorized_message(wa_id, text, metadata, resolved, identity, db):
    session_id = await whatsapp_session_service.get_or_create_session_id(wa_id, db, resolved)
    logger.info("event=whatsapp_session_mapped wa_id=%s session_id=%s", mask_identifier(wa_id), session_id)

    interaction_result = await whatsapp_interaction_service.handle_incoming(
        wa_id=wa_id,
        text=text,
        session_id=session_id,
        db=db,
    )
    if interaction_result:
        logger.info(
            "event=whatsapp_interaction_handled wa_id=%s status=%s handled=%s",
            mask_identifier(wa_id),
            interaction_result.get("status", "unknown"),
            interaction_result.get("handled", "-"),
        )
        await whatsapp_message_store.record_outgoing(wa_id, interaction_result)
        return {"status": "ok"}

    response = await chat_adapter_service.process_message(
        session_id,
        UserMessage(text=text, message_type="TEXT"),
        db,
        identity,
    )
    if response is None:
        session_id = await whatsapp_session_service.get_or_create_session_id(wa_id, db, resolved)
        response = await chat_adapter_service.process_message(
            session_id,
            UserMessage(text=text, message_type="TEXT"),
            db,
            identity,
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
        "event=whatsapp_outgoing_handled wa_id=%s session_id=%s status=%s",
        mask_identifier(wa_id),
        session_id,
        send_result.get("status", "unknown"),
    )
    await whatsapp_message_store.record_outgoing(wa_id, send_result)
    return {"status": "ok"}
