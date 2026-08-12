import logging
import asyncio
import json
from typing import Any, Optional

import httpx

from app.config import settings
from app.logging_config import mask_identifier
from app.schemas.chat import BotMessage, BookingCard, ChatOption, ChatResponse, MessageType

logger = logging.getLogger(__name__)


DEFAULT_USER_FRIENDLY_ERROR = (
    'I am having trouble reaching the booking service right now. '
    'Please try again in a few minutes, or type "menu" to restart the chat.'
)


class WhatsAppService:
    """WhatsApp Cloud API adapter utilities."""

    def extract_message_metadata(self, payload: dict[str, Any]) -> Optional[dict[str, str]]:
        try:
            value = payload["entry"][0]["changes"][0]["value"]
            message = (value.get("messages") or [])[0]
        except (KeyError, IndexError, TypeError):
            return None

        interactive = message.get("interactive") or {}
        return {
            "wa_id": str(message.get("from") or ""),
            "message_id": str(message.get("id") or ""),
            "message_type": str(message.get("type") or ""),
            "interactive_type": str(interactive.get("type") or ""),
        }

    def extract_text_message(self, payload: dict[str, Any]) -> Optional[tuple[str, str]]:
        try:
            value = payload["entry"][0]["changes"][0]["value"]
        except (KeyError, IndexError, TypeError):
            return None

        messages = value.get("messages") or []
        if not messages:
            return None

        message = messages[0]
        wa_id = message.get("from")
        text = self._extract_message_text(message)
        if not wa_id or not text:
            return None
        return str(wa_id), str(text).strip()

    async def send_response(self, wa_id: str, response: ChatResponse) -> dict[str, Any]:
        options = self._response_options(response)
        body = self.render_response_text(response, include_options=not options)
        if 1 <= len(options) <= 3:
            if len(body) > 900:
                await self.send_text(wa_id, body)
                body = "Choose an option:"
            return await self.send_buttons(wa_id, body, options)
        if 4 <= len(options) <= 10:
            if len(body) > 900:
                await self.send_text(wa_id, body)
                body = "Choose an option:"
            return await self.send_list(
                wa_id,
                body,
                "Choose",
                [
                    {
                        "id": self._button_id(option),
                        "title": self._list_title(option.label),
                    }
                    for option in options
                ],
                header="Choose an option",
            )
        return await self.send_text(wa_id, body)

    async def send_text(self, wa_id: str, body: str) -> dict[str, Any]:
        request_body = {
            "messaging_product": "whatsapp",
            "to": wa_id,
            "type": "text",
            "text": {"body": self._truncate(body)},
        }
        return await self._send_message(wa_id, request_body)

    async def send_buttons(self, wa_id: str, body: str, options: list[ChatOption]) -> dict[str, Any]:
        request_body = {
            "messaging_product": "whatsapp",
            "to": wa_id,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": self._truncate(body or "Please choose an option.", limit=1024)},
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": self._button_id(option),
                                "title": self._button_title(option),
                            },
                        }
                        for option in options[:3]
                    ]
                },
            },
        }
        return await self._send_message(wa_id, request_body)

    async def send_list(
        self,
        wa_id: str,
        body: str,
        button_text: str,
        rows: list[dict[str, str]],
        *,
        header: Optional[str] = None,
        section_title: str = "Options",
    ) -> dict[str, Any]:
        interactive: dict[str, Any] = {
            "type": "list",
            "body": {"text": self._truncate(body or "Please choose an option.", limit=1024)},
            "action": {
                "button": self._truncate(button_text or "Select", limit=20),
                "sections": [
                    {
                        "title": self._truncate(section_title or "Options", limit=24),
                        "rows": [
                            {
                                "id": self._truncate(str(row["id"]), limit=200),
                                "title": self._truncate(str(row["title"]), limit=24),
                                **(
                                    {"description": self._truncate(str(row["description"]), limit=72)}
                                    if row.get("description")
                                    else {}
                                ),
                            }
                            for row in rows[:10]
                        ],
                    }
                ],
            },
        }
        if header:
            interactive["header"] = {"type": "text", "text": self._truncate(header, limit=60)}

        request_body = {
            "messaging_product": "whatsapp",
            "to": wa_id,
            "type": "interactive",
            "interactive": interactive,
        }
        return await self._send_message(wa_id, request_body)

    async def send_flow(
        self,
        wa_id: str,
        *,
        body: str,
        flow_id: str,
        flow_token: str,
        cta: str,
        screen: str,
        data: dict[str, Any],
        header: Optional[str] = None,
    ) -> dict[str, Any]:
        interactive: dict[str, Any] = {
            "type": "flow",
            "body": {"text": self._truncate(body or "Please complete the booking form.", limit=1024)},
            "action": {
                "name": "flow",
                "parameters": {
                    "flow_message_version": "3",
                    "flow_id": flow_id,
                    "flow_token": self._truncate(flow_token, limit=200),
                    "flow_cta": self._truncate(cta or "Open", limit=30),
                    "flow_action": "navigate",
                    "flow_action_payload": {
                        "screen": screen,
                        "data": data,
                    },
                },
            },
        }
        if header:
            interactive["header"] = {"type": "text", "text": self._truncate(header, limit=60)}

        request_body = {
            "messaging_product": "whatsapp",
            "to": wa_id,
            "type": "interactive",
            "interactive": interactive,
        }
        return await self._send_message(wa_id, request_body)

    async def _send_message(self, wa_id: str, request_body: dict[str, Any]) -> dict[str, Any]:
        if not settings.WHATSAPP_ENABLED:
            logger.info("event=whatsapp_send_skipped reason=disabled wa_id=%s", mask_identifier(wa_id))
            return {"skipped": True, "reason": "disabled"}

        if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
            logger.error("WhatsApp send skipped because access token or phone number id is missing")
            return {"skipped": True, "reason": "missing_credentials"}

        url = (
            f"https://graph.facebook.com/{settings.WHATSAPP_GRAPH_API_VERSION}/"
            f"{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        )
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        attempts = max(1, int(settings.WHATSAPP_SEND_MAX_RETRIES or 1))
        response: Optional[httpx.Response] = None
        last_error: Optional[str] = None

        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(1, attempts + 1):
                try:
                    response = await client.post(url, json=request_body, headers=headers)
                    if response.status_code < 500 and response.status_code != 429:
                        break
                    last_error = response.text[:500]
                except httpx.HTTPError as exc:
                    last_error = str(exc)

                if attempt < attempts:
                    delay = max(0.0, float(settings.WHATSAPP_RETRY_BACKOFF_SECONDS or 0.0)) * attempt
                    if delay:
                        await asyncio.sleep(delay)

        if response is None:
            logger.warning(
                "event=whatsapp_send_failed wa_id=%s attempts=%s reason=no_response",
                mask_identifier(wa_id),
                attempts,
            )
            return {"status_code": 0, "body": last_error or "request_failed", "attempts": attempts}

        body_preview = response.text[:500]
        message_id = self._extract_outgoing_message_id(response)

        if response.status_code >= 400:
            logger.warning(
                "event=whatsapp_send_failed status_code=%s wa_id=%s attempts=%s",
                response.status_code,
                mask_identifier(wa_id),
                attempts,
            )
        else:
            logger.info(
                "event=whatsapp_send_completed status_code=%s wa_id=%s message_id=%s",
                response.status_code,
                mask_identifier(wa_id),
                message_id or "",
            )
        return {
            "status_code": response.status_code,
            "body": body_preview,
            "message_id": message_id,
            "attempts": attempts,
        }

    def render_response_text(self, response: ChatResponse, *, include_options: bool = True) -> str:
        parts: list[str] = []
        for message in response.messages:
            rendered = self._render_message(message, include_options=include_options)
            if rendered:
                parts.append(rendered)
        return "\n\n".join(parts) or "Done."

    def _render_message(self, message: BotMessage, *, include_options: bool = True) -> str:
        lines: list[str] = []
        if message.text:
            lines.append(self._adapt_text(message.text))

        if include_options and message.options:
            lines.append("Choose an option:")
            lines.extend(f"{option.number}. {option.label}" for option in message.options)

        if message.quick_book:
            quick = message.quick_book
            lines.extend(
                [
                    self._adapt_text(quick.prompt),
                    f"Seat: {quick.last_seat_code}",
                    f"Office: {quick.last_site}",
                    f"Building: {quick.last_building}",
                    f"Floor: {quick.last_floor}",
                    "Choose a button below.",
                ]
            )

        if message.form_card:
            form = message.form_card
            lines.append(form.title)
            if form.subtitle:
                lines.append(form.subtitle)
            required = [field.label for field in form.fields if field.required]
            if required:
                lines.append("I will ask these one by one: " + ", ".join(required))

        if message.seat_list:
            seat_list = message.seat_list
            lines.append(f"Found {seat_list.total} available seat(s). Reply with a seat number from the list:")
            for seat in seat_list.seats[:10]:
                lines.append(seat.seat_code)

        if message.confirmation:
            confirmation = message.confirmation
            lines.extend(
                [
                    "Booking Summary",
                    f"Date: {confirmation.booking_date}",
                    f"Office: {confirmation.site_name}",
                    f"Building: {confirmation.building_name}",
                    f"Floor: {confirmation.floor_name}",
                    f"Seat: {confirmation.seat_code}",
                    "Choose Confirm booking or Change details below.",
                ]
            )

        if message.success:
            success = message.success
            lines.extend(
                [
                    success.message,
                    f"Booking ref: {success.booking_ref}",
                    f"Date: {success.booking_date}",
                    f"Seat: {success.seat_code}",
                    f"Office: {success.site_name}",
                ]
            )

        if message.booking_list:
            rendered = self._render_booking_list(message.booking_list.bookings, message.booking_list.total)
            if rendered:
                lines.extend(rendered)
            else:
                lines.append("No bookings found.")

        if message.rebook_calendar:
            calendar = message.rebook_calendar
            lines.extend(
                [
                    f"Rebook seat {calendar.seat_code}",
                    f"{calendar.site_name}, {calendar.building_name}, {calendar.floor_name}",
                    "Available dates for the same seat:",
                ]
            )
            available_dates = [day.date for day in calendar.days if day.available]
            lines.extend(available_dates[:10] or ["No same-seat dates found. Use the browser calendar for recommendations."])

        if message.type == MessageType.ERROR and not lines:
            lines.append(DEFAULT_USER_FRIENDLY_ERROR)

        return "\n".join(dict.fromkeys(line for line in lines if line))

    def _render_booking_list(self, bookings: list[BookingCard], total: int) -> list[str]:
        if not bookings:
            return []
        lines = [f"Showing {len(bookings)} of {total} booking(s)."]
        has_manageable_booking = any(
            booking.can_modify is not False or booking.can_cancel is not False
            for booking in bookings
        )
        for index, booking in enumerate(bookings, start=1):
            lines.append(
                "\n".join(
                    [
                        f"{index}. {booking.booking_ref}",
                        f"Date: {booking.booking_date}",
                        f"Seat: {booking.seat_code} ({booking.seat_type})",
                        f"Office: {booking.site_name}",
                        f"Location: {booking.building_name}, {booking.floor_name}",
                        f"Status: {booking.status}",
                    ]
                )
            )
        if has_manageable_booking:
            lines.append('To manage a booking, reply "cancel my booking" or "modify my booking".')
        return lines

    def _response_options(self, response: ChatResponse) -> list[ChatOption]:
        booking_list_message = next((message for message in response.messages if message.booking_list), None)
        for message in reversed(response.messages):
            if message.options:
                if booking_list_message and self._booking_list_has_manageable_items(booking_list_message):
                    labels = {option.label.lower() for option in message.options}
                    if not any(label.startswith(("cancel ", "modify ")) and "bk-" in label for label in labels):
                        enhanced = [
                            ChatOption(number=1, label="Cancel booking", value="cancel my booking"),
                            ChatOption(number=2, label="Modify booking", value="modify my booking"),
                        ]
                        next_number = 3
                        for option in message.options:
                            if option.label.lower() in {"main menu", "back to main menu"}:
                                continue
                            enhanced.append(ChatOption(number=next_number, label=option.label, value=option.value))
                            next_number += 1
                        enhanced.append(ChatOption(number=0, label="Main menu", value="0"))
                        return enhanced[:10]
                return message.options
            if message.quick_book:
                return [
                    ChatOption(number=1, label="Use default location", value="default_location"),
                    ChatOption(number=2, label="Select another location", value="select_location"),
                ]
        return []

    @staticmethod
    def _booking_list_has_manageable_items(message: BotMessage) -> bool:
        if not message.booking_list:
            return False
        return any(
            booking.can_cancel is not False or booking.can_modify is not False
            for booking in message.booking_list.bookings
        )

    @staticmethod
    def _adapt_text(text: str) -> str:
        replacements = {
            "Fill in the form below": "I will guide you step by step.",
            "What would you like to do?": "What would you like to do?",
            "Please select": "Please choose",
        }
        adapted = text
        for source, target in replacements.items():
            adapted = adapted.replace(source, target)
        return adapted

    @staticmethod
    def _extract_message_text(message: dict[str, Any]) -> Optional[str]:
        text = (message.get("text") or {}).get("body")
        if text:
            return str(text)

        interactive = message.get("interactive") or {}
        nfm_reply = interactive.get("nfm_reply") or {}
        if nfm_reply.get("response_json"):
            try:
                parsed = json.loads(nfm_reply["response_json"])
            except (TypeError, ValueError):
                parsed = {"raw": str(nfm_reply.get("response_json") or "")}
            return "wa:flow:" + json.dumps(parsed, separators=(",", ":"))

        button_reply = interactive.get("button_reply") or {}
        if button_reply.get("id") or button_reply.get("title"):
            return str(button_reply.get("id") or button_reply.get("title"))

        list_reply = interactive.get("list_reply") or {}
        if list_reply.get("id") or list_reply.get("title"):
            return str(list_reply.get("id") or list_reply.get("title"))

        button = message.get("button") or {}
        if button.get("payload") or button.get("text"):
            return str(button.get("payload") or button.get("text"))

        return None

    @staticmethod
    def _extract_outgoing_message_id(response: httpx.Response) -> Optional[str]:
        try:
            payload = response.json()
        except ValueError:
            return None
        messages = payload.get("messages") or []
        if not messages:
            return None
        return str(messages[0].get("id") or "") or None

    @staticmethod
    def _button_id(option: ChatOption) -> str:
        value = str(option.value)
        return value[:256] if value else str(option.number)

    @staticmethod
    def _button_title(option: ChatOption) -> str:
        label = option.label.strip() or str(option.number)
        return label if len(label) <= 20 else f"{label[:17]}..."

    @staticmethod
    def _list_title(label: str) -> str:
        label = (label or "Option").strip()
        return label if len(label) <= 24 else f"{label[:21]}..."

    @staticmethod
    def _truncate(body: str, *, limit: int = 4096) -> str:
        return body[:limit] if len(body) > limit else body


whatsapp_service = WhatsAppService()
