from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chatbot import ChatbotSessionContext
from app.schemas.chat import ChatResponse, FormCard, FormField, SeatList, UserMessage
from app.services.chat_adapter_service import chat_adapter_service
from app.services.memory_service import memory_service
from app.services.seat_backend_api_service import seat_backend_api_service
from app.services.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

USER_FRIENDLY_WHATSAPP_ERROR = (
    'I am having trouble reaching the booking service right now. '
    'Please try again in a few minutes, or type "menu" to restart the chat.'
)


class WhatsAppInteractionService:
    """Channel-specific renderer for browser-like WhatsApp interactions.

    The chatbot engine remains the source of truth. This service only translates
    form cards and selectable cards into WhatsApp-native lists/buttons, then
    submits collected values back through the normal chat adapter.
    """

    def __init__(self):
        self._client = None
        self._redis_unavailable = False
        self._fallback: dict[str, dict[str, Any]] = {}

    async def handle_incoming(
        self,
        *,
        wa_id: str,
        text: str,
        session_id: str,
        db: AsyncSession,
    ) -> Optional[dict[str, Any]]:
        if text.startswith("wa:flow:"):
            return await self._handle_flow_reply(wa_id, text, session_id, db)

        if text.startswith("wa:seat:"):
            seat_id = text.split(":", 2)[2]
            response = await chat_adapter_service.process_message(
                session_id,
                UserMessage(form_data={"seat_id": seat_id}, message_type="FORM_SUBMIT"),
                db,
            )
            if response:
                await self.deliver_response(wa_id=wa_id, session_id=session_id, response=response, db=db)
            return {"status": "ok", "handled": "seat"}

        state = await self._get_state(wa_id)
        if not state:
            return None
        logger.info(
            "event=whatsapp_interaction_received wa_id=%s text_length=%s state=%s",
            self._mask_wa_id(wa_id),
            len(text or ""),
            self._state_summary(state),
        )

        if text.startswith("wa:"):
            result = await self._handle_control(wa_id, text, state, session_id, db)
        else:
            date_result = await self._handle_date_label(wa_id, text, state, session_id, db)
            if date_result:
                return date_result
            dynamic_result = await self._handle_dynamic_label(wa_id, text, state, session_id, db)
            if dynamic_result:
                return dynamic_result
            if self._is_global_plain_text(text) or self._is_global_button_payload(text):
                await self._delete_state(wa_id)
                return None
            if not state.get("awaiting_text"):
                return None
            result = await self._handle_text(wa_id, text, state, session_id, db)
        return result or {"status": "ok", "handled": "interaction"}

    async def deliver_response(
        self,
        *,
        wa_id: str,
        session_id: str,
        response: ChatResponse,
        db: AsyncSession,
    ) -> dict[str, Any]:
        form_card = self._first_form_card(response)
        if form_card:
            logger.info(
                "WhatsApp deliver form wa_id=%s session_id=%s node=%s fields=%s",
                self._mask_wa_id(wa_id),
                session_id,
                form_card.node,
                [field.key for field in form_card.fields],
            )
            if self._flow_enabled(form_card):
                await self._set_state(
                    wa_id,
                    {
                        "kind": "flow_form",
                        "session_id": session_id,
                        "card": form_card.model_dump(),
                        "values": {},
                        "field_index": 0,
                    },
                )
                return await whatsapp_service.send_flow(
                    wa_id,
                    body=self._flow_body(form_card),
                    flow_id=settings.WHATSAPP_BOOKING_FLOW_ID,
                    flow_token=session_id,
                    cta=settings.WHATSAPP_BOOKING_FLOW_CTA,
                    screen=settings.WHATSAPP_BOOKING_FLOW_SCREEN,
                    data=self._flow_data(form_card),
                    header=form_card.title,
                )

            initial_values = {
                field.key: field.default_value
                for field in form_card.fields
                if field.default_value not in (None, "")
            }
            await self._set_state(
                wa_id,
                {
                    "kind": "form",
                    "session_id": session_id,
                    "card": form_card.model_dump(),
                    "values": initial_values,
                    "field_index": 0,
                },
            )
            return await self._send_current_form_field(wa_id, db)

        seat_list = self._first_seat_list(response)
        if seat_list:
            logger.info(
                "WhatsApp deliver seat list wa_id=%s session_id=%s total=%s building=%s floor=%s",
                self._mask_wa_id(wa_id),
                session_id,
                seat_list.total,
                seat_list.building_name,
                seat_list.floor_name,
            )
            return await self._send_seat_list(wa_id, response, seat_list)

        await self._delete_state(wa_id)
        return await whatsapp_service.send_response(wa_id, response)

    async def _handle_flow_reply(
        self,
        wa_id: str,
        text: str,
        session_id: str,
        db: AsyncSession,
    ) -> Optional[dict[str, Any]]:
        state = await self._get_state(wa_id)
        if not state or state.get("kind") != "flow_form":
            return None

        try:
            form_data = json.loads(text.split(":", 2)[2])
        except (IndexError, ValueError, TypeError):
            return await whatsapp_service.send_text(wa_id, 'I could not read the form response. Please type "menu" to restart.')

        form_data = self._normalize_flow_form_data(form_data, state)
        await self._delete_state(wa_id)
        response = await chat_adapter_service.process_message(
            session_id,
            UserMessage(form_data=form_data, message_type="FORM_SUBMIT"),
            db,
        )
        if response:
            return await self.deliver_response(wa_id=wa_id, session_id=session_id, response=response, db=db)
        return await whatsapp_service.send_text(wa_id, USER_FRIENDLY_WHATSAPP_ERROR)

    async def _handle_control(
        self,
        wa_id: str,
        text: str,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> Optional[dict[str, Any]]:
        parts = text.split(":")
        command = parts[1] if len(parts) > 1 else ""

        if command == "date" and len(parts) >= 3:
            if parts[2] == "today":
                return await self._set_field_and_continue(wa_id, date.today().isoformat(), state, session_id, db)
            if parts[2] == "tomorrow":
                return await self._set_field_and_continue(
                    wa_id,
                    (date.today() + timedelta(days=1)).isoformat(),
                    state,
                    session_id,
                    db,
                )
            if parts[2] == "custom":
                state["awaiting_text"] = self._current_field(state).get("key")
                await self._set_state(wa_id, state)
                return await whatsapp_service.send_text(wa_id, "Please reply with the booking date in YYYY-MM-DD format.")

        if command == "field" and len(parts) >= 4:
            return await self._set_field_and_continue(wa_id, parts[3], state, session_id, db)

        if command == "check" and len(parts) >= 4:
            field_key = parts[2]
            value = parts[3]
            values = state.setdefault("values", {})
            selected = values.setdefault(field_key, [])
            if value not in selected:
                selected.append(value)
            await self._set_state(wa_id, state)
            return await self._send_current_form_field(wa_id, db)

        if command == "checkdone" and len(parts) >= 3:
            return await self._advance_field(wa_id, state, session_id, db)

        if command == "skip":
            return await self._advance_field(wa_id, state, session_id, db)

        if command == "menu":
            await self._delete_state(wa_id)
            response = await chat_adapter_service.process_message(
                session_id,
                UserMessage(text="menu", message_type="TEXT"),
                db,
            )
            if response:
                return await self.deliver_response(wa_id=wa_id, session_id=session_id, response=response, db=db)
            return await whatsapp_service.send_text(wa_id, 'Type "menu" to restart.')

        return None

    async def _handle_date_label(
        self,
        wa_id: str,
        text: str,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> Optional[dict[str, Any]]:
        try:
            field = self._current_field(state)
        except (IndexError, KeyError, TypeError, ValueError):
            return None
        if field.get("field_type") != "date":
            return None

        normalized = text.strip().lower()
        if normalized == "today":
            return await self._set_field_and_continue(wa_id, date.today().isoformat(), state, session_id, db)
        if normalized == "tomorrow":
            return await self._set_field_and_continue(
                wa_id,
                (date.today() + timedelta(days=1)).isoformat(),
                state,
                session_id,
                db,
            )
        if normalized in {"enter date", "custom", "custom date"}:
            state["awaiting_text"] = field.get("key")
            await self._set_state(wa_id, state)
            return await whatsapp_service.send_text(wa_id, "Please reply with the booking date in YYYY-MM-DD format.")
        return None

    async def _handle_dynamic_label(
        self,
        wa_id: str,
        text: str,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> Optional[dict[str, Any]]:
        try:
            field = FormField(**self._current_field(state))
        except (IndexError, KeyError, TypeError, ValueError):
            return None
        if field.field_type not in {"dropdown_dynamic", "radio"}:
            return None

        value = self._value_for_display_text(text, field, state)
        if value is None and field.field_type == "dropdown_dynamic":
            options = await self._lookup_dynamic_options(field, state, db)
            self._cache_field_options(state, field, options)
            value = self._value_for_display_text(text, field, state)
        if value is None:
            logger.info(
                "event=whatsapp_dynamic_label_unmatched wa_id=%s field=%s text_length=%s cached=%s",
                self._mask_wa_id(wa_id),
                field.key,
                len(text or ""),
                len(state.get("option_cache", {}).get(field.key) or []),
            )
            return None

        return await self._set_field_and_continue(wa_id, value, state, session_id, db)

    async def _handle_text(
        self,
        wa_id: str,
        text: str,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> Optional[dict[str, Any]]:
        awaiting = state.get("awaiting_text")
        if awaiting:
            state.pop("awaiting_text", None)
            if state.pop("awaiting_checkbox", None) == awaiting:
                return await self._handle_checkbox_text(wa_id, text, state, session_id, db)
            return await self._set_field_and_continue(wa_id, text.strip(), state, session_id, db)
        return None

    async def _handle_checkbox_text(
        self,
        wa_id: str,
        text: str,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> dict[str, Any]:
        field = FormField(**self._current_field(state))
        selected, error = self._parse_checkbox_selection(text, field)
        if error:
            state["awaiting_text"] = field.key
            state["awaiting_checkbox"] = field.key
            await self._set_state(wa_id, state)
            return await whatsapp_service.send_text(wa_id, f"{error}\n\n{self._checkbox_prompt(field, state)}")

        state.setdefault("values", {})[field.key] = selected
        return await self._advance_field(wa_id, state, session_id, db)

    async def _set_field_and_continue(
        self,
        wa_id: str,
        value: Any,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> dict[str, Any]:
        field = self._current_field(state)
        state.setdefault("values", {})[field["key"]] = value
        logger.info(
            "WhatsApp form field captured wa_id=%s session_id=%s node=%s field=%s value=%s values=%s",
            self._mask_wa_id(wa_id),
            session_id,
            state.get("card", {}).get("node"),
            field.get("key"),
            self._safe_value(value),
            self._value_keys(state),
        )
        await self._persist_partial_form_value(session_id, field.get("key"), value, db)

        duplicate_response = await self._early_duplicate_booking_response(
            field=field,
            value=value,
            state=state,
            session_id=session_id,
            db=db,
        )
        if duplicate_response:
            await self._delete_state(wa_id)
            return await self.deliver_response(
                wa_id=wa_id,
                session_id=session_id,
                response=duplicate_response,
                db=db,
            )

        return await self._advance_field(wa_id, state, session_id, db)

    async def _early_duplicate_booking_response(
        self,
        *,
        field: dict[str, Any],
        value: Any,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> Optional[ChatResponse]:
        card_node = state.get("card", {}).get("node")
        if field.get("key") != "booking_date" or card_node != "BOOK_WHEN_WHERE":
            return None

        from app.services.chat_engine import chat_engine
        from app.services.session_service import SessionService

        session = await SessionService.get(session_id, db)
        if not session:
            return None
        return await chat_engine.build_duplicate_booking_response_for_date(session, str(value), db)

    async def _advance_field(
        self,
        wa_id: str,
        state: dict[str, Any],
        session_id: str,
        db: AsyncSession,
    ) -> dict[str, Any]:
        state["field_index"] = int(state.get("field_index", 0)) + 1
        await self._set_state(wa_id, state)
        if state["field_index"] >= len(state.get("card", {}).get("fields", [])):
            form_data = state.get("values", {})
            logger.info(
                "WhatsApp form submit wa_id=%s session_id=%s node=%s keys=%s data=%s",
                self._mask_wa_id(wa_id),
                session_id,
                state.get("card", {}).get("node"),
                sorted(str(key) for key in form_data.keys()),
                self._safe_form_data(form_data),
            )
            await self._delete_state(wa_id)
            response = await chat_adapter_service.process_message(
                session_id,
                UserMessage(form_data=form_data, message_type="FORM_SUBMIT"),
                db,
            )
            if response:
                return await self.deliver_response(wa_id=wa_id, session_id=session_id, response=response, db=db)
            return await whatsapp_service.send_text(wa_id, USER_FRIENDLY_WHATSAPP_ERROR)
        return await self._send_current_form_field(wa_id, db)

    async def _send_current_form_field(self, wa_id: str, db: AsyncSession) -> dict[str, Any]:
        state = await self._get_state(wa_id)
        if not state:
            return {"status": "ignored", "reason": "no_state"}

        field = self._current_field(state)
        field_model = FormField(**field)

        if field_model.field_type == "date":
            options = [
                {"id": "wa:date:today", "title": "Today"},
                {"id": "wa:date:tomorrow", "title": "Tomorrow"},
                {"id": "wa:date:custom", "title": "Enter date"},
                {"id": "wa:menu", "title": "Main menu"},
            ]
            return await whatsapp_service.send_list(
                wa_id,
                f"Choose {field_model.label.lower()}.",
                "Choose date",
                options,
                header=field_model.label,
            )

        if field_model.field_type == "dropdown_dynamic":
            options = await self._lookup_dynamic_options(field_model, state, db)
            logger.info(
                "WhatsApp dynamic options wa_id=%s node=%s field=%s depends_on=%s value_keys=%s count=%s",
                self._mask_wa_id(wa_id),
                state.get("card", {}).get("node"),
                field_model.key,
                field_model.depends_on,
                self._value_keys(state),
                len(options or []),
            )
            if not options:
                return await whatsapp_service.send_text(
                    wa_id,
                    f"No options found for {field_model.label}. Type menu to restart or try again.",
                )
            self._cache_field_options(state, field_model, options)
            await self._set_state(wa_id, state)
            rows = self._dynamic_option_rows(field_model, options[:9])
            rows.append({"id": "wa:menu", "title": "Main menu"})
            extra_text = ""
            if len(options) > 9:
                extra_text = "\nShowing first 9 options. Type a more specific location if needed."
            return await whatsapp_service.send_list(
                wa_id,
                f"Choose {field_model.label.lower()}.{extra_text}",
                "Choose",
                rows,
                header=field_model.label,
            )

        if field_model.field_type == "radio":
            options = field_model.options or []
            self._cache_field_options(field_model=field_model, state=state, options=options)
            await self._set_state(wa_id, state)
            rows = [
                {
                    "id": f"wa:field:{field_model.key}:{option['value']}",
                    "title": option["label"],
                }
                for option in options[:9]
            ]
            rows.append({"id": "wa:menu", "title": "Main menu"})
            return await whatsapp_service.send_list(
                wa_id,
                f"Choose {field_model.label.lower()}.",
                "Choose",
                rows,
                header=field_model.label,
            )

        if field_model.field_type == "checkbox_group":
            return await self._send_checkbox_field(wa_id, field_model, state)

        state["awaiting_text"] = field_model.key
        await self._set_state(wa_id, state)
        return await whatsapp_service.send_text(wa_id, f"Please reply with {field_model.label}.")

    async def _send_checkbox_field(
        self,
        wa_id: str,
        field: FormField,
        state: dict[str, Any],
    ) -> dict[str, Any]:
        state["awaiting_text"] = field.key
        state["awaiting_checkbox"] = field.key
        await self._set_state(wa_id, state)
        return await whatsapp_service.send_text(wa_id, self._checkbox_prompt(field, state))

    def _checkbox_prompt(self, field: FormField, state: dict[str, Any]) -> str:
        lines = [
            f"{field.label}",
            "Reply with multiple numbers separated by commas, for example: 1,3,5.",
            "Reply 0 or skip if you do not want amenities.",
            "",
        ]
        for index, option in enumerate(field.options or [], start=1):
            lines.append(f"{index}. {option['label']}")
        lines.append("")
        lines.append('Type "menu" to restart.')
        return "\n".join(line for line in lines if line is not None)

    @staticmethod
    def _dynamic_option_rows(field: FormField, options: list[dict[str, str]]) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        for index, option in enumerate(options, start=1):
            label = str(option.get("label") or "Option").strip()
            row = {
                "id": f"wa:field:{field.key}:{option['value']}",
                "title": label,
            }
            if field.key == "building_id":
                row["title"] = f"{index}. Building"
                row["description"] = label
            elif len(label) > 24:
                row["title"] = f"{index}. {field.label[:18].strip() or 'Option'}"
                row["description"] = label
            rows.append(row)
        return rows

    @staticmethod
    def _cache_field_options(state: dict[str, Any], field_model: FormField, options: list[dict[str, Any]]) -> None:
        cached_options = []
        rows = WhatsAppInteractionService._dynamic_option_rows(
            field_model,
            [{"value": str(option.get("value")), "label": str(option.get("label") or "")} for option in options],
        )
        for index, option in enumerate(options, start=1):
            row = rows[index - 1] if index - 1 < len(rows) else {}
            cached_options.append(
                {
                    "value": str(option.get("value")),
                    "label": str(option.get("label") or ""),
                    "index": str(index),
                    "title": str(row.get("title") or ""),
                    "description": str(row.get("description") or ""),
                }
            )
        state.setdefault("option_cache", {})[field_model.key] = cached_options

    @staticmethod
    def _value_for_display_text(text: str, field: FormField, state: dict[str, Any]) -> Optional[str]:
        normalized = WhatsAppInteractionService._normalize_choice_text(text)
        if not normalized:
            return None
        cached_options = state.get("option_cache", {}).get(field.key) or []
        for option in cached_options:
            candidates = {
                WhatsAppInteractionService._normalize_choice_text(str(option.get("label") or "")),
                WhatsAppInteractionService._normalize_choice_text(str(option.get("title") or "")),
                WhatsAppInteractionService._normalize_choice_text(str(option.get("description") or "")),
                WhatsAppInteractionService._normalize_choice_text(str(option.get("index") or "")),
                WhatsAppInteractionService._normalize_choice_text(
                    f"{option.get('index')}. {option.get('label') or ''}"
                ),
                WhatsAppInteractionService._normalize_choice_text(
                    f"{option.get('index')}. {option.get('title') or ''}"
                ),
            }
            if normalized in candidates:
                value = option.get("value")
                return str(value) if value not in (None, "") else None
        return None

    @staticmethod
    def _normalize_choice_text(text: str) -> str:
        return re.sub(r"\s+", " ", str(text or "").strip().lower())

    async def _persist_partial_form_value(
        self,
        session_id: str,
        key: Optional[str],
        value: Any,
        db: AsyncSession,
    ) -> None:
        if key not in {"booking_date", "site_id", "building_id", "floor_id"}:
            return
        value_text = "" if value is None else str(value)
        try:
            await memory_service.merge_context(session_id, {str(key): value_text})
        except Exception as exc:
            logger.debug(
                "WhatsApp partial context cache write skipped session_id=%s key=%s error=%s",
                session_id,
                key,
                exc,
            )
        if not hasattr(db, "execute"):
            return
        try:
            session_uuid = uuid.UUID(str(session_id))
            result = await db.execute(
                select(ChatbotSessionContext).where(
                    ChatbotSessionContext.session_id == session_uuid,
                    ChatbotSessionContext.context_key == key,
                )
            )
            row = result.scalar_one_or_none()
            if row:
                row.context_value = value_text
                row.updated_at = datetime.now(timezone.utc)
            else:
                db.add(
                    ChatbotSessionContext(
                        session_id=session_uuid,
                        context_key=str(key),
                        context_value=value_text,
                    )
                )
            await db.commit()
        except Exception as exc:
            logger.warning(
                "WhatsApp partial context persist failed session_id=%s key=%s error=%s",
                session_id,
                key,
                exc,
            )
            try:
                await db.rollback()
            except Exception:
                pass

    @staticmethod
    def _parse_checkbox_selection(text: str, field: FormField) -> tuple[list[str], Optional[str]]:
        normalized = text.strip().lower()
        if normalized in {"0", "skip", "none", "no", "no amenities", "done"}:
            return [], None

        options = field.options or []
        values_by_number = {str(index): str(option["value"]) for index, option in enumerate(options, start=1)}
        labels_by_text = {
            re.sub(r"\s+", " ", str(option["label"]).strip().lower()): str(option["value"])
            for option in options
        }
        selected: list[str] = []
        invalid_numbers: list[str] = []

        tokens = [
            token
            for token in re.split(r"[\s,;]+|(?:\band\b)", normalized)
            if token
        ]
        for token in tokens:
            if token.isdigit():
                value = values_by_number.get(token)
                if value:
                    if value not in selected:
                        selected.append(value)
                else:
                    invalid_numbers.append(token)

        if not selected and not invalid_numbers:
            compact_text = re.sub(r"\s+", " ", normalized)
            for label, value in labels_by_text.items():
                if label and label in compact_text and value not in selected:
                    selected.append(value)

        if invalid_numbers:
            return [], f"Invalid amenity number(s): {', '.join(invalid_numbers)}."
        if not selected:
            return [], "I could not identify those amenities. Please reply with numbers like 1,3,5 or type skip."
        return selected, None

    async def _send_seat_list(self, wa_id: str, response: ChatResponse, seat_list: SeatList) -> dict[str, Any]:
        body = self._non_card_text(response)
        if not body:
            body = f"Found {seat_list.total} available seat(s). Select one to continue."
        rows = [
            {
                "id": f"wa:seat:{seat.id}",
                "title": f"Seat {seat.seat_code}",
                "description": ", ".join([seat.seat_type, *seat.amenities])[:72],
            }
            for seat in seat_list.seats[:10]
        ]
        return await whatsapp_service.send_list(wa_id, body, "Select seat", rows, header="Available seats")

    @staticmethod
    def _flow_enabled(form_card: FormCard) -> bool:
        return (
            settings.WHATSAPP_USE_FLOWS
            and bool(settings.WHATSAPP_BOOKING_FLOW_ID)
            and form_card.node in {"BOOK_WHEN_WHERE", "BOOK_DETAILS", "QUICK_BOOK_DATE"}
            and not any(field.field_type == "dropdown_dynamic" for field in form_card.fields)
        )

    @staticmethod
    def _flow_body(form_card: FormCard) -> str:
        subtitle = f"\n{form_card.subtitle}" if form_card.subtitle else ""
        return f"{form_card.title}{subtitle}\n\nComplete the form to continue your booking."

    @staticmethod
    def _flow_data(form_card: FormCard) -> dict[str, Any]:
        return {
            "node": form_card.node,
            "fields": [
                {
                    "key": field.key,
                    "label": field.label,
                    "field_type": field.field_type,
                    "required": field.required,
                    "default_value": field.default_value,
                    "options": field.options or [],
                }
                for field in form_card.fields
            ],
        }

    @staticmethod
    def _normalize_flow_form_data(form_data: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
        fields = state.get("card", {}).get("fields", [])
        field_keys = {field.get("key") for field in fields}
        normalized = {
            key: value
            for key, value in form_data.items()
            if key in field_keys
        }
        for field in fields:
            key = field.get("key")
            if key not in normalized and key in form_data:
                normalized[key] = form_data[key]
            if field.get("field_type") == "checkbox_group" and key in normalized and not isinstance(normalized[key], list):
                value = normalized[key]
                if value in (None, ""):
                    normalized[key] = []
                else:
                    normalized[key] = [str(value)]
        return normalized

    async def _lookup_dynamic_options(
        self,
        field: FormField,
        state: dict[str, Any],
        db: AsyncSession,
    ) -> list[dict[str, str]]:
        values = state.get("values", {})
        if field.lookup_endpoint and "sites" in field.lookup_endpoint:
            sites = await seat_backend_api_service.list_sites()
            return [
                {
                    "value": str(site.get("site_id")),
                    "label": f"{site.get('site_name')}{' (' + site.get('city') + ')' if site.get('city') else ''}",
                }
                for site in (sites or [])
                if site.get("site_id") and site.get("site_name")
            ]

        if field.lookup_endpoint and "buildings" in field.lookup_endpoint and values.get("site_id"):
            buildings = await seat_backend_api_service.list_buildings(int(values["site_id"]))
            return [
                {"value": str(building.get("building_id")), "label": building.get("building_name")}
                for building in (buildings or [])
                if building.get("building_id") and building.get("building_name")
            ]

        if field.lookup_endpoint and "floors" in field.lookup_endpoint and values.get("building_id"):
            floors = await seat_backend_api_service.list_floors(int(values["building_id"]))
            return [
                {"value": str(floor.get("floor_id")), "label": floor.get("floor_name") or floor.get("floor_code") or str(floor.get("floor_id"))}
                for floor in (floors or [])
                if floor.get("floor_id")
            ]

        if field.lookup_endpoint and "amenities" in field.lookup_endpoint:
            return []

        return []

    @staticmethod
    def _first_form_card(response: ChatResponse) -> Optional[FormCard]:
        for message in response.messages:
            if message.form_card:
                return message.form_card
        return None

    @staticmethod
    def _first_seat_list(response: ChatResponse) -> Optional[SeatList]:
        for message in response.messages:
            if message.seat_list:
                return message.seat_list
        return None

    @staticmethod
    def _non_card_text(response: ChatResponse) -> str:
        parts = [
            message.text
            for message in response.messages
            if message.text and not message.form_card and not message.seat_list
        ]
        return "\n\n".join(parts)

    @staticmethod
    def _current_field(state: dict[str, Any]) -> dict[str, Any]:
        fields = state.get("card", {}).get("fields", [])
        index = int(state.get("field_index", 0))
        return fields[index]

    @staticmethod
    def _step_text(state: dict[str, Any]) -> str:
        fields = state.get("card", {}).get("fields", [])
        total = len(fields)
        current = min(int(state.get("field_index", 0)) + 1, total)
        return f"Step {current} of {total}" if total else ""

    @staticmethod
    def _is_global_plain_text(text: str) -> bool:
        normalized = text.strip().lower()
        return normalized in {"menu", "main menu", "back to main menu", "0", "back", "restart", "start over"}

    @staticmethod
    def _is_global_button_payload(text: str) -> bool:
        normalized = text.strip().lower()
        return normalized in {
            "quick_book",
            "quick_book_from_bookings",
            "my_bookings",
            "default_location",
            "use default location",
            "select_location",
            "select another location",
            "use_default_location",
            "different_location",
            "change location",
            "cancel my booking",
            "modify my booking",
            "bookings_more",
            "cancel_rebook",
        }

    async def _get_state(self, wa_id: str) -> Optional[dict[str, Any]]:
        key = self._key(wa_id)
        client = await self._client_or_none()
        if client is not None:
            raw = await client.get(key)
            return json.loads(raw) if raw else None
        return self._fallback.get(key)

    async def _set_state(self, wa_id: str, state: dict[str, Any]):
        key = self._key(wa_id)
        client = await self._client_or_none()
        if client is not None:
            await client.set(key, json.dumps(state, default=str), ex=self._ttl_seconds())
            return
        self._fallback[key] = state

    async def _delete_state(self, wa_id: str):
        key = self._key(wa_id)
        client = await self._client_or_none()
        if client is not None:
            await client.delete(key)
            return
        self._fallback.pop(key, None)

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
            logger.warning("Redis client unavailable for WhatsApp interaction state: %s", exc)
            self._redis_unavailable = True
            return None

    @staticmethod
    def _key(wa_id: str) -> str:
        return f"whatsapp_interaction:{wa_id}"

    @staticmethod
    def _ttl_seconds() -> int:
        return max(60, settings.SESSION_TTL_MINUTES * 60)

    @staticmethod
    def _mask_wa_id(wa_id: str) -> str:
        value = str(wa_id or "")
        return f"***{value[-4:]}" if len(value) > 4 else "***"

    @staticmethod
    def _safe_text(text: str) -> str:
        value = str(text or "")
        return value if len(value) <= 80 else f"{value[:77]}..."

    @staticmethod
    def _safe_value(value: Any) -> str:
        return WhatsAppInteractionService._safe_text(str(value))

    @staticmethod
    def _safe_form_data(form_data: dict[str, Any]) -> dict[str, Any]:
        allowed = {"booking_date", "site_id", "building_id", "floor_id", "seat_id", "seat_ids"}
        return {str(key): form_data.get(key) for key in form_data if key in allowed}

    @staticmethod
    def _value_keys(state: dict[str, Any]) -> list[str]:
        return sorted(str(key) for key in (state.get("values") or {}).keys())

    @classmethod
    def _state_summary(cls, state: dict[str, Any]) -> dict[str, Any]:
        fields = state.get("card", {}).get("fields", [])
        index = int(state.get("field_index", 0) or 0)
        current = None
        if 0 <= index < len(fields):
            current = fields[index].get("key")
        return {
            "kind": state.get("kind"),
            "node": state.get("card", {}).get("node"),
            "field_index": index,
            "current_field": current,
            "value_keys": cls._value_keys(state),
        }


whatsapp_interaction_service = WhatsAppInteractionService()
