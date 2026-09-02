"""
Deterministic Chat Engine for eFACiLiTY Seat Booking.

No AI / LLM involved. Pure rule-based state machine.
Each node knows exactly what input to expect and where to go next.
Menus are defined in the chatbot menu service to avoid a database lookup table.
"""
from __future__ import annotations
import asyncio
import json
import logging
import random
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chatbot import ChatbotSession
from app.schemas.chat import (
    ChatResponse, BotMessage, MessageType, ChatOption,
    FormCard, FormField, SeatList, SeatCard,
    BookingConfirmation, BookingSuccess,
    BookingCard, BookingListData, RebookCalendarData, RebookCalendarDay,
)
from app.services.menu_service import menu_service, MenuService
from app.services.booking_edit_service import booking_edit_service
from app.services.free_text_service import FreeTextResult, free_text_service
from app.services.input_guard_service import input_guard_service
from app.services.intent_matcher import Intent
from app.services.memory_service import memory_service
from app.services.navigation_service import navigation_service
from app.services.seat_backend_api_service import seat_backend_api_service
from app.services.telemetry_service import telemetry_service
from app.config import settings

logger = logging.getLogger(__name__)


# ── Node constants ─────────────────────────────────────────────────────────────
class Node:
    MAIN_MENU        = "MAIN_MENU"
    DYNAMIC_MENU     = "DYNAMIC_MENU"
    QUICK_BOOK       = "QUICK_BOOK"
    QUICK_BOOK_DATE  = "QUICK_BOOK_DATE"
    BOOK_WHEN_WHERE  = "BOOK_WHEN_WHERE"
    BOOK_DETAILS     = "BOOK_DETAILS"
    AVAILABLE_SEATS  = "AVAILABLE_SEATS"
    CONFIRM          = "CONFIRM"
    MY_BOOKINGS      = "MY_BOOKINGS"


NODE_STATE_MAP = {
    Node.BOOK_WHEN_WHERE: "BOOKING_WHEN_WHERE",
    Node.BOOK_DETAILS:    "BOOKING_DETAILS",
    Node.AVAILABLE_SEATS: "SELECTING_SEAT",
    Node.CONFIRM:         "CONFIRMING",
    Node.MY_BOOKINGS:     "NAVIGATING",
}

SEAT_TYPE_LABELS = {
    "STANDARD":   "Standard Desk",
    "WINDOW":     "Window Seat",
    "CABIN":      "Private Cabin",
    "ACCESSIBLE": "Accessible Seat",
    "HOT_DESK":   "Hot Desk",
}


def _max_headcount() -> int:
    return 10 if settings.ALLOW_MULTIPLE_SEATS else 1


# ── Chat Engine ────────────────────────────────────────────────────────────────
class ChatEngine:

    def __init__(self):
        self.tenant_id = settings.DEFAULT_TENANT_ID

    # ── Main entry point ───────────────────────────────────────────────────────
    async def process(
        self,
        session: ChatbotSession,
        user_text: Optional[str],
        form_data: Optional[Dict[str, Any]],
        db: AsyncSession,
    ) -> ChatResponse:
        node = session.current_node
        telemetry_service.record_step(
            "engine.process.start",
            session_id=str(session.id),
            current_node=node,
            has_text=bool(user_text),
            form_keys=sorted((form_data or {}).keys()),
        )

        # Global commands
        if navigation_service.is_main_menu_command(user_text):
            return await self._go_to_main_menu(session, db)

        if user_text and user_text.strip().lower() in ("quit", "exit", "bye"):
            return await self._abandon(session, db)

        if user_text and self._is_greeting_text(user_text):
            return await self._build_greeting_response(session, db)

        if user_text and user_text.strip().lower() == "free_text_confirm":
            return await self._confirm_pending_free_text(session, db)

        if user_text and user_text.strip().lower().startswith("confirm_cancel:"):
            booking_id = user_text.split(":", 1)[1]
            return await self._inline_cancel_booking(session, booking_id, db)

        if user_text and user_text.strip().lower().startswith("confirm_modify:"):
            booking_id = user_text.split(":", 1)[1]
            return await self._inline_modify_booking(session, booking_id, db)

        if user_text and user_text.strip().lower() in ("bookings_more", "past_bookings_more", "show more", "more"):
            return await self._show_more_bookings(session, db)

        if user_text:
            normalized_shortcut = user_text.strip().lower()
            if normalized_shortcut in {"quick_book_from_bookings", "quick book"} and node != Node.QUICK_BOOK_DATE:
                return await self._start_quick_book_entry(session, db)
            if normalized_shortcut in {"book_seat_from_bookings", "book a seat", "book seat"} and node not in (Node.BOOK_WHEN_WHERE, Node.BOOK_DETAILS):
                return await self._start_book_seat_entry(session, db)

        # "0" and "back" — go up one level in menus, or to root from flows
        if user_text and user_text.strip().lower() in ("0", "back"):
            if node in (Node.MAIN_MENU, Node.DYNAMIC_MENU):
                pass  # let the handler process it for proper level navigation
            else:
                return await self._go_to_main_menu(session, db)

        if settings.ENABLE_FREE_TEXT and self._should_interpret_free_text(node, user_text, form_data):
            normalized_text = free_text_service.normalize(user_text or "")
            guard = input_guard_service.check(normalized_text)
            if guard:
                telemetry_service.record_intent(
                    guard.category.upper(),
                    1.0,
                    "input_guard",
                    accepted=False,
                    needs_confirmation=False,
                    node=node,
                )
                menu_resp = await self._build_dynamic_menu(session, None, "", db)
                return ChatResponse(
                    session_id=str(session.id),
                    current_node=Node.MAIN_MENU,
                    state="NAVIGATING",
                    messages=[
                        BotMessage(type=MessageType.TEXT, text=guard.message),
                        *menu_resp.messages,
                    ],
                )

            context = await self._get_context(session.id, db)
            interpreted = await free_text_service.interpret_message(
                db=db,
                tenant_id=self.tenant_id,
                user_message=user_text or "",
                session_context=context,
            )
            telemetry_service.record_step(
                "free_text.interpreted",
                session_id=str(session.id),
                current_node=node,
                intent=interpreted.intent.value,
                confidence=round(interpreted.confidence, 4),
                source=interpreted.source,
                accepted=interpreted.accepted,
                needs_confirmation=interpreted.needs_confirmation,
                entity_keys=sorted(interpreted.entities.keys()),
            )
            telemetry_service.record_intent(
                interpreted.intent.value,
                interpreted.confidence,
                interpreted.source,
                accepted=interpreted.accepted,
                needs_confirmation=interpreted.needs_confirmation,
                node=node,
            )
            if node in (Node.BOOK_WHEN_WHERE, Node.BOOK_DETAILS, Node.AVAILABLE_SEATS, Node.CONFIRM):
                routed = await self._route_booking_slot_text(session, interpreted, db)
                if routed:
                    return routed
            routed = await self._route_free_text(session, interpreted, db)
            if routed:
                return routed

        handlers = {
            Node.MAIN_MENU:       self._handle_main_menu,
            Node.DYNAMIC_MENU:    self._handle_dynamic_menu,
            Node.QUICK_BOOK:      self._handle_quick_book,
            Node.QUICK_BOOK_DATE: self._handle_quick_book_date,
            Node.BOOK_WHEN_WHERE: self._handle_when_where,
            Node.BOOK_DETAILS:    self._handle_details,
            Node.AVAILABLE_SEATS: self._handle_seat_selection,
            Node.CONFIRM:         self._handle_confirm,
            Node.MY_BOOKINGS:     self._handle_my_bookings,
        }

        handler = handlers.get(node, self._handle_main_menu)
        return await handler(session, user_text, form_data, db)

    # ── FREE TEXT ROUTING ─────────────────────────────────────────────────────
    def _should_interpret_free_text(self, node: str, user_text: Optional[str], form_data: Optional[Dict[str, Any]]) -> bool:
        if form_data or not user_text:
            return False
        text = user_text.strip()
        if not text or text.isdigit():
            return False
        if text.lower() in {
            "quick_book",
            "custom_booking",
            "default_location",
            "use_default_location",
            "select_location",
            "different_location",
            "cancel_rebook",
        }:
            return False
        return node in (
            Node.MAIN_MENU,
            Node.DYNAMIC_MENU,
            Node.QUICK_BOOK,
            Node.MY_BOOKINGS,
            Node.BOOK_WHEN_WHERE,
            Node.BOOK_DETAILS,
            Node.AVAILABLE_SEATS,
            Node.CONFIRM,
        )

    async def _route_free_text(
        self,
        session: ChatbotSession,
        result: FreeTextResult,
        db: AsyncSession,
    ) -> Optional[ChatResponse]:
        logger.info(
            "event=free_text_routed intent=%s confidence=%s source=%s needs_confirmation=%s entity_keys=%s",
            result.intent.value,
            result.confidence,
            result.source,
            result.needs_confirmation,
            sorted(result.entities.keys()),
        )

        if result.intent == Intent.HELP and result.is_global_command:
            return await self._build_help_response(session, db)

        if result.needs_confirmation:
            await self._set_context_bulk(session.id, {"pending_free_text": result.context_payload()}, db)
            return ChatResponse(
                session_id=str(session.id),
                current_node=session.current_node,
                state=session.state,
                messages=[
                    BotMessage(
                        type=MessageType.OPTIONS,
                        text=f"I think you want to {self._intent_label(result.intent)}. Is that correct?",
                        options=[
                            ChatOption(number=1, label="Yes, continue", value="free_text_confirm"),
                            ChatOption(number=0, label="No, show menu", value="0"),
                        ],
                    )
                ],
            )

        if not result.accepted:
            menu_resp = await self._build_dynamic_menu(session, None, "", db)
            return ChatResponse(
                session_id=str(session.id),
                current_node=Node.MAIN_MENU,
                state="NAVIGATING",
                messages=[
                    BotMessage(
                        type=MessageType.TEXT,
                        text=(
                            "I could not understand that clearly. You can type like "
                            "'book a seat tomorrow' or use the options below."
                        ),
                    ),
                    *menu_resp.messages,
                ],
            )

        return await self._execute_free_text_intent(session, result.intent, result.entities, db)

    async def _confirm_pending_free_text(self, session: ChatbotSession, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        payload = ctx.get("pending_free_text")
        if not payload:
            return await self._go_to_main_menu(session, db)
        try:
            parsed = json.loads(payload)
            intent = Intent(parsed.get("intent", "UNKNOWN"))
            entities = parsed.get("entities", {})
        except (ValueError, TypeError):
            return await self._go_to_main_menu(session, db)

        await self._set_context_bulk(session.id, {"pending_free_text": ""}, db)
        return await self._execute_free_text_intent(session, intent, entities, db)

    async def _execute_free_text_intent(
        self,
        session: ChatbotSession,
        intent: Intent,
        entities: Dict[str, Any],
        db: AsyncSession,
    ) -> ChatResponse:
        logger.info(
            "event=free_text_execute intent=%s entity_keys=%s",
            intent.value,
            sorted(entities.keys()),
        )
        telemetry_service.record_step(
            "free_text.execute",
            session_id=str(session.id),
            intent=intent.value,
            entity_keys=sorted(entities.keys()),
        )

        if intent == Intent.GREETING:
            return await self._build_greeting_response(session, db)
        if intent == Intent.HELP:
            return await self._build_help_response(session, db)
        if intent == Intent.LIST_BOOKINGS:
            if entities.get("booking_date"):
                entities["date_range_start"] = entities["booking_date"]
                entities["date_range_end"] = entities["booking_date"]
            if not entities.get("date_range_start"):
                entities["date_range_start"] = ""
                entities["date_range_end"] = ""
            if not entities.get("booking_list_mode"):
                entities["booking_list_mode"] = self._default_booking_list_mode_for_date(entities.get("booking_date"))
            entities["booking_list_offset"] = 0
            await self._apply_entities_to_context(session.id, entities, db)
            await self._update_node(session, Node.MY_BOOKINGS, "NAVIGATING", db)
            return await self._build_my_bookings(session, db)
        if intent == Intent.CANCEL_BOOKING:
            if entities.get("booking_date"):
                entities["date_range_start"] = entities["booking_date"]
                entities["date_range_end"] = entities["booking_date"]
            entities["booking_action"] = "cancel"
            entities["booking_list_mode"] = "upcoming"
            entities["booking_list_offset"] = 0
            await self._apply_entities_to_context(session.id, entities, db)
            if entities.get("booking_ref"):
                return await self._build_booking_action_confirmation_by_ref(session, "cancel", str(entities["booking_ref"]), db)
            await self._update_node(session, Node.MY_BOOKINGS, "NAVIGATING", db)
            return await self._build_my_bookings(session, db)
        if intent == Intent.MODIFY_BOOKING:
            if entities.get("booking_date"):
                entities["date_range_start"] = entities["booking_date"]
                entities["date_range_end"] = entities["booking_date"]
            entities["booking_action"] = "modify"
            entities["booking_list_mode"] = "upcoming"
            entities["booking_list_offset"] = 0
            await self._apply_entities_to_context(session.id, entities, db)
            if entities.get("booking_ref"):
                return await self._build_booking_action_confirmation_by_ref(session, "modify", str(entities["booking_ref"]), db)
            await self._update_node(session, Node.MY_BOOKINGS, "NAVIGATING", db)
            return await self._build_my_bookings(session, db)
        if intent == Intent.QUICK_BOOK:
            telemetry_service.record_booking_event("booking_flow_started", source="free_text_quick_book")
            return await self._start_quick_book_entry(session, db, booking_date_str=entities.get("booking_date"))
        if intent == Intent.BOOK_SEAT:
            telemetry_service.record_booking_event("booking_flow_started", source="free_text")
            # A generic request such as "need a seat" starts a fresh booking.
            # Do not let a date/location left by an abandoned flow trigger a
            # duplicate-booking warning for a date the user did not mention.
            if not entities or session.current_node not in {
                Node.BOOK_WHEN_WHERE,
                Node.BOOK_DETAILS,
                Node.AVAILABLE_SEATS,
                Node.CONFIRM,
            }:
                await self._reset_manual_booking_context(session.id, db)
            return await self._route_book_seat_from_entities(session, entities, db)

        return await self._go_to_main_menu(session, db)

    async def _route_booking_slot_text(
        self,
        session: ChatbotSession,
        result: FreeTextResult,
        db: AsyncSession,
    ) -> Optional[ChatResponse]:
        if result.intent in (Intent.GREETING, Intent.HELP, Intent.LIST_BOOKINGS, Intent.CANCEL_BOOKING, Intent.MODIFY_BOOKING, Intent.QUICK_BOOK):
            return await self._route_free_text(session, result, db)

        if result.intent not in (Intent.BOOK_SEAT, Intent.UNKNOWN):
            return None

        if not result.entities:
            return None

        booking_keys = {
            "booking_date",
            "site_id",
            "building_id",
            "floor_id",
            "seat_type",
            "headcount",
            "amenity_ids",
        }
        if not any(key in result.entities for key in booking_keys):
            return None

        return await self._route_book_seat_from_entities(
            session,
            result.entities,
            db,
            intro_text="Got it. I updated your booking details.",
        )

    async def _route_book_seat_from_entities(
        self,
        session,
        entities: Dict[str, Any],
        db: AsyncSession,
        intro_text: Optional[str] = None,
        ) -> ChatResponse:
        await self._apply_entities_to_context(session.id, entities, db)
        await self._apply_booking_defaults(session.id, db)
        await self._apply_location_defaults_from_external_backend(session.id, entities, db)
        ctx = await self._get_context(session.id, db)
        has_when_where = all(ctx.get(key) for key in ("booking_date", "site_id", "building_id", "floor_id"))
        if not has_when_where:
            await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
            resp = await self._build_when_where_card(session, db)
            if self._requested_multiple_when_disabled(entities):
                resp.messages.insert(0, BotMessage(type=MessageType.TEXT, text="Only one seat can be booked per user right now. I set the seat count to 1."))
            resp.messages.insert(0, BotMessage(type=MessageType.TEXT, text=self._booking_progress_text(ctx, intro_text)))
            return resp

        date_error_resp = await self._build_invalid_booking_date_response(session, ctx.get("booking_date", ""), db)
        if date_error_resp:
            return date_error_resp

        duplicate_resp = await self._build_duplicate_booking_response(session, ctx.get("booking_date", ""), db)
        if duplicate_resp:
            return duplicate_resp

        resp = await self._continue_to_available_seats(session, db, self._booking_progress_text(ctx, intro_text))
        if self._requested_multiple_when_disabled(entities):
            resp.messages.insert(0, BotMessage(type=MessageType.TEXT, text="Only one seat can be booked per user right now. I set the seat count to 1."))
        return resp

    async def _apply_entities_to_context(self, session_id, entities: Dict[str, Any], db: AsyncSession):
        context: Dict[str, str] = {}
        for key in (
            "booking_date",
            "date_range_start",
            "date_range_end",
            "site_id",
            "building_id",
            "floor_id",
            "seat_type",
            "booking_ref",
            "booking_action",
            "booking_list_mode",
            "booking_list_offset",
        ):
            if key in entities:
                context[key] = str(entities[key])
        if entities.get("headcount"):
            context["headcount"] = str(max(1, min(_max_headcount(), int(entities["headcount"]))))
        if "amenity_ids" in entities:
            context["amenity_ids"] = ",".join(str(value) for value in entities.get("amenity_ids") or [])
        if "seat_type" in entities or "amenity_ids" in entities:
            context["booking_prefill_source"] = "free_text"
        if "site_id" in entities:
            if "building_id" not in entities:
                context["building_id"] = ""
            if "floor_id" not in entities:
                context["floor_id"] = ""
        if "building_id" in entities and "floor_id" not in entities:
            context["floor_id"] = ""
        if context:
            await self._set_context_bulk(session_id, context, db)

    async def _apply_booking_defaults(self, session_id, db: AsyncSession):
        if settings.ALLOW_MULTIPLE_SEATS:
            return
        ctx = await self._get_context(session_id, db)
        if not ctx.get("headcount"):
            await self._set_context_bulk(session_id, {"headcount": "1"}, db)

    async def _apply_location_defaults_from_external_backend(
        self,
        session_id,
        entities: Dict[str, Any],
        db: AsyncSession,
    ):
        if not any(key in entities for key in ("site_id", "building_id", "floor_id")):
            return

        ctx = await self._get_context(session_id, db)
        updates: Dict[str, str] = {}
        site_id = self._safe_int(ctx.get("site_id"))
        building_id = self._safe_int(ctx.get("building_id"))
        floor_id = self._safe_int(ctx.get("floor_id"))

        if site_id and not ctx.get("site_name"):
            sites = await seat_backend_api_service.list_sites() or []
            site = next((row for row in sites if str(row.get("site_id")) == str(site_id)), None)
            if site:
                updates["site_name"] = str(site.get("site_name") or "")

        if site_id and not building_id:
            buildings = await seat_backend_api_service.list_buildings(site_id) or []
            active_buildings = [
                building for building in buildings
                if str(building.get("status") or "ACTIVE").upper() == "ACTIVE"
            ]
            if len(active_buildings) == 1:
                building = active_buildings[0]
                building_id = self._safe_int(building.get("building_id"))
                if building_id:
                    updates["building_id"] = str(building_id)
                    updates["building_name"] = str(building.get("building_name") or "")

        if building_id and not ctx.get("building_name") and site_id and "building_name" not in updates:
            buildings = await seat_backend_api_service.list_buildings(site_id) or []
            building = next((row for row in buildings if str(row.get("building_id")) == str(building_id)), None)
            if building:
                updates["building_name"] = str(building.get("building_name") or "")

        if floor_id and not ctx.get("floor_name") and building_id:
            floors = await seat_backend_api_service.list_floors(building_id) or []
            floor = next((row for row in floors if str(row.get("floor_id")) == str(floor_id)), None)
            if floor:
                updates["floor_name"] = str(floor.get("floor_name") or floor.get("floor_code") or "")

        if updates:
            await self._set_context_bulk(session_id, updates, db)

    async def _booking_details_reset_context(self, session, db: AsyncSession) -> Dict[str, str]:
        ctx = await self._get_context(session.id, db)
        if ctx.get("booking_prefill_source") == "free_text":
            return {
                "seat_type": "STANDARD",
                "headcount": "1",
                "amenity_ids": "",
                "selected_seat_ids": "",
                "seat_id": "",
                "booking_prefill_source": "",
            }
        return {
            "seat_type": "STANDARD",
            "headcount": "1",
            "amenity_ids": "",
            "selected_seat_ids": "",
            "seat_id": "",
            "booking_prefill_source": "",
        }

    @staticmethod
    def _booking_progress_text(ctx: Dict[str, str], intro_text: Optional[str]) -> str:
        missing_prompt = ChatEngine._missing_booking_prompt(ctx)
        if not intro_text:
            return missing_prompt
        if "Please provide" not in missing_prompt:
            return intro_text
        return f"{intro_text} {missing_prompt}"

    @staticmethod
    def _default_booking_list_mode_for_date(booking_date_str: Optional[str]) -> str:
        if not booking_date_str:
            return "upcoming"
        try:
            booking_date = datetime.strptime(str(booking_date_str), "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return "upcoming"
        return "past" if booking_date < date.today() else "upcoming"

    @staticmethod
    def _missing_booking_prompt(ctx: Dict[str, str]) -> str:
        missing = []
        if not ctx.get("booking_date"):
            missing.append("date")
        if not ctx.get("site_id"):
            missing.append("office/site")
        if not ctx.get("building_id"):
            missing.append("building")
        if not ctx.get("floor_id"):
            missing.append("floor")
        if not missing:
            return "Got it. I found the details I need."
        if len(missing) == 1:
            missing_text = missing[0]
        else:
            missing_text = ", ".join(missing[:-1]) + f" and {missing[-1]}"
        return f"I captured what I could. Please provide the missing {missing_text}."

    async def _build_invalid_booking_date_response(
        self,
        session,
        booking_date_str: str,
        db: AsyncSession,
    ) -> Optional[ChatResponse]:
        try:
            booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            await self._set_context_bulk(session.id, {"booking_date": ""}, db)
            await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
            resp = await self._build_when_where_card(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Invalid date format. Please choose a valid booking date."))
            return resp

        if booking_date >= date.today():
            return None

        await self._set_context_bulk(session.id, {"booking_date": ""}, db)
        await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
        resp = await self._build_when_where_card(session, db)
        resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Booking date cannot be in the past. Please choose today or a future date."))
        return resp

    async def _build_duplicate_booking_response(
        self,
        session,
        booking_date_str: str,
        db: AsyncSession,
    ) -> Optional[ChatResponse]:
        try:
            booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return None

        external_existing = await self._external_booking_for_date(booking_date_str)
        if external_existing:
            session.current_menu_id = None
            await self._update_node(session, Node.MAIN_MENU, "NAVIGATING", db)
            is_locked = self._is_current_or_ongoing_booking(external_existing)
            detail_text = (
                f"You already have a booking for **{booking_date.strftime('%d %b %Y')}**:\n\n"
                f"📋 **{external_existing.get('booking_id') or 'Existing booking'}** — "
                f"{external_existing.get('seat_code') or 'Seat booked'}\n\n"
            )
            if is_locked:
                detail_text += (
                    "Today's or ongoing bookings cannot be cancelled or modified from the chatbot. "
                    "Please contact the facility team if you need help with this booking."
                )
                options = [ChatOption(number=0, label="Back to main menu", value="0")]
            else:
                detail_text += (
                    "If you'd like to change it, please cancel the existing booking first and then book a new one."
                )
                booking_id = str(external_existing.get("booking_id") or "")
                booking_summary = {
                    "booking_ref": str(external_existing.get("booking_id") or ""),
                    "booking_date": str(external_existing.get("booking_date") or booking_date_str),
                    "site_id": str(external_existing.get("site_id") or ""),
                    "building_id": str(external_existing.get("building_id") or ""),
                    "floor_id": str(external_existing.get("floor_id") or ""),
                    "seat_id": str(external_existing.get("seat_id") or ""),
                    "seat_code": str(external_existing.get("seat_code") or ""),
                    "site_name": str(external_existing.get("site_name") or ""),
                    "building_name": str(external_existing.get("building_name") or ""),
                    "floor_name": str(external_existing.get("floor_name") or ""),
                    "status": str(external_existing.get("booking_status") or external_existing.get("status") or ""),
                }
                await self._set_context_bulk(session.id, {
                    "duplicate_booking_id": booking_id,
                    "booking_action": "cancel",
                    "booking_list_source": "seat_backend_api",
                    "booking_list_ids": f"1:{booking_id}",
                    "booking_list_summaries": json.dumps({booking_id: booking_summary}),
                    "date_range_start": booking_date_str,
                    "date_range_end": booking_date_str,
                }, db)
                options = [
                    ChatOption(number=1, label="Cancel existing & rebook", value="cancel_rebook"),
                    ChatOption(number=0, label="Back to main menu", value="0"),
                ]
            return ChatResponse(
                session_id=str(session.id),
                current_node=Node.MAIN_MENU,
                state="NAVIGATING",
                messages=[
                    BotMessage(
                        type=MessageType.TEXT,
                        text=detail_text,
                    ),
                    BotMessage(
                        type=MessageType.OPTIONS,
                        text="What would you like to do?",
                        options=options,
                    ),
                ],
            )

        return None

    async def build_duplicate_booking_response_for_date(
        self,
        session,
        booking_date_str: str,
        db: AsyncSession,
    ) -> Optional[ChatResponse]:
        """Channel adapters can use this to stop booking flow as soon as date is known."""
        return await self._build_duplicate_booking_response(session, booking_date_str, db)

    async def _external_booking_for_date(self, booking_date_str: str) -> Optional[Dict[str, Any]]:
        rows: list[Dict[str, Any]] = []

        current = await seat_backend_api_service.my_current_bookings()
        if current:
            rows.extend(current)

        future = await seat_backend_api_service.my_future_bookings(page=1, limit=100)
        if future:
            future_rows, _has_more = future
            rows.extend(future_rows)

        matches = [
            row for row in rows
            if self._normalize_booking_date(row.get("booking_date")) == booking_date_str
        ]
        if not matches:
            return None
        return sorted(matches, key=self._booking_row_sort_key, reverse=True)[0]

    @staticmethod
    def _normalize_booking_date(value: Any) -> str:
        if isinstance(value, datetime):
            return value.date().isoformat()
        if isinstance(value, date):
            return value.isoformat()
        raw = str(value or "").strip()
        return raw[:10] if len(raw) >= 10 else raw

    @classmethod
    def _is_current_or_ongoing_booking(cls, row: Dict[str, Any]) -> bool:
        booking_date = cls._normalize_booking_date(row.get("booking_date"))
        if not booking_date:
            return False
        if booking_date <= date.today().isoformat():
            return True
        status = str(row.get("booking_status") or row.get("status") or "").upper()
        return status in {"ONGOING", "IN_PROGRESS", "CHECKED_IN"}

    @staticmethod
    def _current_booking_action_blocked_message(action: str, summary: Dict[str, str]) -> str:
        action_label = "modified" if action == "modify" else "cancelled"
        booking_ref = summary.get("booking_ref") or summary.get("booking_id") or "this booking"
        booking_date = ChatEngine._normalize_booking_date(summary.get("booking_date")) or "today"
        return (
            f"Booking **{booking_ref}** is for **{booking_date}**. "
            f"Today's or ongoing bookings cannot be {action_label} from the chatbot. "
            "Please contact the facility team if you need help with this booking."
        )

    async def _build_help_response(self, session, db: AsyncSession) -> ChatResponse:
        menu_resp = await self._build_dynamic_menu(session, None, "", db)
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MAIN_MENU,
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.TEXT,
                    text=(
                        "You can type things like:\n"
                        "- book a seat tomorrow in Hyderabad\n"
                        "- I need 2 seats with monitor\n"
                        "- show my bookings\n"
                        "- cancel booking BK-20260625-A12BCD\n"
                        "- modify my booking"
                    ),
                ),
                *menu_resp.messages,
            ],
        )

    async def _build_greeting_response(self, session, db: AsyncSession) -> ChatResponse:
        menu_resp = await self._build_dynamic_menu(session, None, "", db)
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MAIN_MENU,
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.TEXT,
                    text=f"Hi {session.user_name}! How can I help with your seat booking today?",
                ),
                *menu_resp.messages,
            ],
        )

    @staticmethod
    def _intent_label(intent: Intent) -> str:
        labels = {
            Intent.BOOK_SEAT: "book a seat",
            Intent.LIST_BOOKINGS: "show your bookings",
            Intent.CANCEL_BOOKING: "cancel a booking",
            Intent.MODIFY_BOOKING: "modify a booking",
            Intent.QUICK_BOOK: "quick book",
            Intent.GREETING: "say hello",
            Intent.HELP: "get help",
        }
        return labels.get(intent, "continue")

    @staticmethod
    def _requested_multiple_when_disabled(entities: Dict[str, Any]) -> bool:
        try:
            requested = int(entities.get("headcount") or 1)
        except (TypeError, ValueError):
            return False
        return not settings.ALLOW_MULTIPLE_SEATS and requested > 1

    @staticmethod
    def _is_greeting_text(user_text: str) -> bool:
        normalized = free_text_service.normalize(user_text or "")
        return normalized in {
            "hi",
            "hii",
            "hello",
            "helo",
            "hey",
            "hiya",
            "hi there",
            "hello there",
            "hey there",
            "namaste",
            "good morning",
            "good afternoon",
            "good evening",
        }

    # ── DYNAMIC MENU (DB-driven) ───────────────────────────────────────────────
    async def _build_dynamic_menu(self, session, parent_id, intro_text, db) -> ChatResponse:
        children = await menu_service.get_children(parent_id, self.tenant_id, db)

        options = [
            ChatOption(number=child.display_order, label=child.label, value=str(child.display_order))
            for child in children
        ]

        if parent_id is not None:
            options.append(ChatOption(number=0, label="Go back", value="0"))

        current_node = Node.MAIN_MENU if parent_id is None else Node.DYNAMIC_MENU
        telemetry_service.record_menu_view(
            parent_id=parent_id,
            option_count=len(children),
            node=current_node,
        )

        messages = []
        if intro_text:
            messages.append(BotMessage(type=MessageType.TEXT, text=intro_text))
        messages.append(BotMessage(
            type=MessageType.OPTIONS,
            text="What would you like to do?" if parent_id is None else "Please select an option:",
            options=options
        ))

        return ChatResponse(
            session_id=str(session.id),
            current_node=current_node,
            state="NAVIGATING",
            messages=messages
        )

    async def _navigate_menu_choice(self, session, parent_id, choice, db):
        children = await menu_service.get_children(parent_id, self.tenant_id, db)

        selected = next((c for c in children if c.display_order == choice), None)
        if not selected:
            count = len(children)
            return await self._build_dynamic_menu(
                session, parent_id, f"Invalid option. Please enter 1-{count}.", db
            )

        telemetry_service.record_menu_selection(
            menu_key=selected.menu_key,
            label=selected.label,
            target_node=selected.target_node,
            parent_id=parent_id,
        )

        # Has children → show sub-menu
        if selected.children:
            session.current_menu_id = selected.id
            await self._update_node(session, Node.DYNAMIC_MENU, "NAVIGATING", db)
            return await self._build_dynamic_menu(session, selected.id, f"**{selected.label}**", db)

        # Has target_node → inject context and delegate to existing handler
        if selected.target_node:
            if selected.context_preset:
                resolved = MenuService.resolve_context_preset(selected.context_preset)
                await self._set_context_bulk(session.id, resolved, db)

            state = NODE_STATE_MAP.get(selected.target_node, "NAVIGATING")
            session.current_menu_id = None
            await self._update_node(session, selected.target_node, state, db)
            if selected.target_node in (Node.BOOK_WHEN_WHERE, Node.BOOK_DETAILS):
                telemetry_service.record_booking_event(
                    "booking_flow_started",
                    source="menu",
                    menu_key=selected.menu_key,
                    label=selected.label,
                )

            handler = {
                Node.BOOK_WHEN_WHERE: lambda s, ut, fd, d: self._start_book_seat_entry(s, d),
                Node.BOOK_DETAILS:    lambda s, ut, fd, d: self._build_details_card(s, d),
                Node.QUICK_BOOK:      lambda s, ut, fd, d: self._start_quick_book_entry(s, d),
                Node.MY_BOOKINGS:     lambda s, ut, fd, d: self._build_upcoming_bookings_from_menu(s, d),
            }.get(selected.target_node)

            if handler:
                return await handler(session, None, None, db)

        # Placeholder — feature not built yet
        msg = selected.placeholder_msg or "This feature is coming soon! Stay tuned."
        return await self._build_dynamic_menu(session, parent_id, msg, db)

    # ── MAIN MENU ──────────────────────────────────────────────────────────────
    async def _handle_main_menu(self, session, user_text, form_data, db):
        if user_text is None:
            session.current_menu_id = None
            await self._update_node(session, Node.MAIN_MENU, "NAVIGATING", db)
            return await self._build_dynamic_menu(
                session, None,
                f"Hello {session.user_name}! Welcome to eFACiLiTY Seat Booking.",
                db
            )

        # Handle "cancel & rebook" shortcut from duplicate booking warning
        if user_text and user_text.strip().lower() == "cancel_rebook":
            ctx = await self._get_context(session.id, db)
            booking_id = str(ctx.get("duplicate_booking_id") or "").strip()
            await self._update_node(session, Node.MY_BOOKINGS, "NAVIGATING", db)
            if booking_id:
                return await self._build_booking_action_confirmation(session, "cancel", booking_id, db)
            selected_date = str(ctx.get("date_range_start") or ctx.get("booking_date") or "").strip()
            if selected_date:
                booking = await self._external_booking_for_date(selected_date)
                if booking and booking.get("booking_id"):
                    return await self._build_booking_action_confirmation(
                        session, "cancel", str(booking["booking_id"]), db
                    )
            resp = await self._go_to_main_menu(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text=(f"No booking found for {selected_date}." if selected_date else "I could not identify the booking to cancel."),
            ))
            return resp

        if navigation_service.is_main_menu_command(user_text):
            return await self._go_to_main_menu(session, db)

        choice = self._parse_number(user_text)
        if choice is None or choice < 1:
            return await self._build_dynamic_menu(session, None, "Please enter a valid number.", db)

        return await self._navigate_menu_choice(session, None, choice, db)

    async def _handle_dynamic_menu(self, session, user_text, form_data, db):
        if navigation_service.is_main_menu_command(user_text):
            return await self._go_to_main_menu(session, db)

        choice = self._parse_number(user_text)
        parent_id = session.current_menu_id

        if choice is None:
            return await self._build_dynamic_menu(session, parent_id, "Please enter a valid number.", db)

        if choice == 0:
            # Go back one level
            if parent_id:
                current_item = await menu_service.get_menu_item(parent_id, self.tenant_id, db)
                if current_item and current_item.parent_id:
                    grandparent = await menu_service.get_menu_item(current_item.parent_id, self.tenant_id, db)
                    session.current_menu_id = grandparent.parent_id if grandparent else None
                    target = Node.DYNAMIC_MENU if session.current_menu_id else Node.MAIN_MENU
                    await self._update_node(session, target, "NAVIGATING", db)
                    return await self._build_dynamic_menu(session, session.current_menu_id, "", db)
            return await self._go_to_main_menu(session, db)

        return await self._navigate_menu_choice(session, parent_id, choice, db)

    # ── QUICK BOOK ──────────────────────────────────────────────────────────────
    async def _start_quick_book_entry(
        self,
        session,
        db: AsyncSession,
        booking_date_str: Optional[str] = None,
    ) -> ChatResponse:
        profile = await self._get_default_booking_profile(session.user_name, db)
        if not profile:
            telemetry_service.record_booking_event("booking_flow_started", source="quick_book_no_default")
            session.current_menu_id = None
            await self._set_context_bulk(session.id, {
                "booking_date": "",
                "site_id": "",
                "building_id": "",
                "floor_id": "",
                "site_name": "",
                "building_name": "",
                "floor_name": "",
                "favorite_seat_ids": "",
                "previous_seat_ids": "",
                "last_seat_id": "",
                "seat_type": "STANDARD",
                "headcount": "1",
                "amenity_ids": "",
                "selected_seat_ids": "",
                "seat_id": "",
                "booking_prefill_source": "missing_default",
                "quick_book_mode": "true",
                "quick_book_missing_profile": "true",
            }, db)
            await self._update_node(session, Node.QUICK_BOOK_DATE, "NAVIGATING", db)
            if booking_date_str:
                return await self._handle_quick_book_date(
                    session,
                    None,
                    {"booking_date": booking_date_str},
                    db,
                )
            resp = self._build_quick_book_date_card(session)
            resp.messages.insert(0, BotMessage(
                type=MessageType.TEXT,
                text="Quick Book will check your previous or recommended seats for the selected date."
            ))
            return resp

        await self._set_context_bulk(session.id, {
            "booking_date": "",
            "site_id": str(profile["site_id"]),
            "building_id": str(profile["building_id"]),
            "floor_id": str(profile["floor_id"]),
            "site_name": profile["site_name"],
            "building_name": profile["building_name"],
            "floor_name": profile["floor_name"],
            "favorite_seat_ids": ",".join(str(x) for x in (profile.get("favorite_seat_ids") or [])),
            "previous_seat_ids": ",".join(str(x) for x in (profile.get("previous_seat_ids") or [])),
            "last_seat_id": str(profile.get("last_seat_id") or ""),
            "seat_type": profile.get("seat_type") or "STANDARD",
            "headcount": str(max(1, min(_max_headcount(), int(profile.get("headcount") or 1)))),
            "amenity_ids": ",".join(str(x) for x in (profile.get("amenity_ids") or [])),
            "selected_seat_ids": "",
            "seat_id": "",
            "booking_prefill_source": profile["source"],
            "quick_book_source_booking_id": str(profile.get("source_booking_id") or ""),
            "quick_book_source_booking_date": str(profile.get("source_booking_date") or ""),
            "quick_book_mode": "true",
        }, db)
        await self._update_node(session, Node.QUICK_BOOK_DATE, "NAVIGATING", db)
        if booking_date_str:
            return await self._handle_quick_book_date(
                session,
                None,
                {"booking_date": booking_date_str},
                db,
            )
        resp = self._build_quick_book_date_card(session)
        resp.messages.insert(0, BotMessage(
            type=MessageType.TEXT,
            text="Quick Book will check your previous seats for the selected date. Please choose a booking date.",
        ))
        return resp

    async def _get_default_booking_profile(self, user_name: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
        return await self._get_external_default_booking_profile()

    async def _get_external_default_booking_profile(self) -> Optional[Dict[str, Any]]:
        preferences = await seat_backend_api_service.preferences()
        preferences = preferences or {}
        favorite_seat_ids = self._extract_preferred_seat_ids_from_preferences(preferences)

        previous_booking_profile = await self._get_previous_booking_profile(favorite_seat_ids)
        if previous_booking_profile:
            previous_booking_profile["favorite_seat_ids"] = favorite_seat_ids
            return previous_booking_profile

        site_id = preferences.get("site_id")
        building_id = preferences.get("building_id")
        floor_id = preferences.get("floor_id")
        site_name = preferences.get("site_name")
        building_name = preferences.get("building_name")
        floor_name = preferences.get("floor_name")

        if not site_id:
            me = await seat_backend_api_service.me() or {}
            site_id = me.get("home_site_id") or me.get("site_id")

        if site_id and not site_name:
            sites = await seat_backend_api_service.list_sites() or []
            site = next((row for row in sites if str(row.get("site_id")) == str(site_id)), None)
            site_name = (site or {}).get("site_name")

        if site_id and not building_id:
            buildings = await seat_backend_api_service.list_buildings(int(site_id)) or []
            building = next((row for row in buildings if row.get("status") == "ACTIVE"), None) or (buildings[0] if buildings else None)
            if building:
                building_id = building.get("building_id")
                building_name = building.get("building_name")

        if building_id and not floor_id:
            floors = await seat_backend_api_service.list_floors(int(building_id)) or []
            floor = next((row for row in floors if row.get("status") == "ACTIVE"), None) or (floors[0] if floors else None)
            if floor:
                floor_id = floor.get("floor_id")
                floor_name = floor.get("floor_name") or floor.get("floor_code")

        if not (site_id and building_id and floor_id):
            return None

        return {
            "source": "default_location",
            "site_id": site_id,
            "building_id": building_id,
            "floor_id": floor_id,
            "last_seat_id": "",
            "seat_code": "",
            "site_name": site_name or "Default office",
            "building_name": building_name or "Default building",
            "floor_name": floor_name or "Default floor",
            "seat_type": preferences.get("seat_type") or "STANDARD",
            "headcount": 1,
            "amenity_ids": [],
            "favorite_seat_ids": favorite_seat_ids,
            "previous_seat_ids": [],
        }

    async def _get_previous_booking_profile(self, favorite_seat_ids: Optional[list[int]] = None) -> Optional[Dict[str, Any]]:
        rows = await self._recent_booking_rows()
        row = self._ranked_booking_profile_row(rows, favorite_seat_ids or [])
        if not row:
            return None

        profile = self._profile_from_booking_row(row)
        if not profile:
            return None

        profile["previous_seat_ids"] = self._previous_seat_ids_for_profile(profile, rows)
        logger.info(
            "Quick Book default profile sourced from ranked booking history booking_id=%s date=%s seat=%s",
            row.get("booking_id"),
            row.get("booking_date"),
            row.get("seat_code") or row.get("seat_id"),
        )
        return profile

    def _ranked_booking_profile_row(self, rows: list[Dict[str, Any]], favorite_seat_ids: list[int]) -> Optional[Dict[str, Any]]:
        usable_rows = [row for row in rows if self._profile_from_booking_row(row)]
        if not usable_rows:
            return None

        favorite_set = {seat_id for seat_id in favorite_seat_ids if seat_id}
        seat_counts: Dict[int, int] = {}
        location_counts: Dict[tuple[str, str, str], int] = {}
        for row in usable_rows:
            seat_id = self._safe_int(row.get("seat_id"))
            if seat_id:
                seat_counts[seat_id] = seat_counts.get(seat_id, 0) + 1
            location_key = (
                str(row.get("site_id") or ""),
                str(row.get("building_id") or ""),
                str(row.get("floor_id") or ""),
            )
            location_counts[location_key] = location_counts.get(location_key, 0) + 1

        def score(row: Dict[str, Any]) -> tuple[int, int, int, str]:
            seat_id = self._safe_int(row.get("seat_id")) or 0
            location_key = (
                str(row.get("site_id") or ""),
                str(row.get("building_id") or ""),
                str(row.get("floor_id") or ""),
            )
            return (
                1 if seat_id in favorite_set else 0,
                seat_counts.get(seat_id, 0),
                location_counts.get(location_key, 0),
                str(row.get("booking_date") or ""),
            )

        return max(usable_rows, key=score)

    def _previous_seat_ids_for_profile(self, profile: Dict[str, Any], rows: list[Dict[str, Any]]) -> list[int]:
        candidates: Dict[int, tuple[int, str]] = {}
        for row in rows:
            if str(row.get("site_id") or "") != str(profile.get("site_id") or ""):
                continue
            if str(row.get("building_id") or "") != str(profile.get("building_id") or ""):
                continue
            if str(row.get("floor_id") or "") != str(profile.get("floor_id") or ""):
                continue
            seat_id = self._safe_int(row.get("seat_id"))
            if not seat_id:
                continue
            count, latest = candidates.get(seat_id, (0, ""))
            candidates[seat_id] = (count + 1, max(latest, str(row.get("booking_date") or "")))
        return [
            seat_id
            for seat_id, _score in sorted(
                candidates.items(),
                key=lambda item: (item[1][0], item[1][1]),
                reverse=True,
            )
        ]

    @staticmethod
    def _extract_preferred_seat_ids_from_preferences(preferences: Dict[str, Any]) -> list[int]:
        candidates: list[Any] = []
        for key in ("favorite_seat_ids", "favourite_seat_ids", "preferred_seat_ids", "seat_ids"):
            value = preferences.get(key)
            if isinstance(value, list):
                candidates.extend(value)
            elif value not in (None, ""):
                candidates.append(value)

        for key in ("favorite_seats", "favourite_seats", "preferred_seats"):
            value = preferences.get(key)
            if isinstance(value, list):
                candidates.extend(value)

        for key in ("favorite_seat_id", "favourite_seat_id", "preferred_seat_id", "default_seat_id", "seat_id"):
            value = preferences.get(key)
            if value not in (None, ""):
                candidates.append(value)

        seat_ids: list[int] = []
        for candidate in candidates:
            if isinstance(candidate, dict):
                candidate = candidate.get("seat_id") or candidate.get("id")
            seat_id = ChatEngine._safe_int(candidate)
            if seat_id and seat_id not in seat_ids:
                seat_ids.append(seat_id)
        return seat_ids

    async def _recent_booking_rows(self) -> list[Dict[str, Any]]:
        rows: list[Dict[str, Any]] = []
        current = await seat_backend_api_service.my_current_bookings()
        if current:
            rows.extend(current)

        future = await seat_backend_api_service.my_future_bookings(page=1, limit=20)
        if future:
            future_rows, _ = future
            rows.extend(future_rows)

        if not rows:
            past = await seat_backend_api_service.my_past_bookings(page=1, limit=20)
            if past:
                past_rows, _ = past
                rows.extend(past_rows)
        else:
            past = await seat_backend_api_service.my_past_bookings(page=1, limit=20)
            if past:
                past_rows, _ = past
                seen_booking_ids = {str(row.get("booking_id") or "") for row in rows}
                rows.extend(
                    row for row in past_rows
                    if str(row.get("booking_id") or "") not in seen_booking_ids
                )

        return sorted(rows, key=self._booking_row_sort_key, reverse=True)

    def _profile_from_booking_row(self, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        site_id = self._safe_int(row.get("site_id"))
        building_id = self._safe_int(row.get("building_id"))
        floor_id = self._safe_int(row.get("floor_id"))
        if not (site_id and building_id and floor_id):
            return None

        return {
            "source": "previous_booking",
            "site_id": site_id,
            "building_id": building_id,
            "floor_id": floor_id,
            "last_seat_id": str(row.get("seat_id") or ""),
            "seat_code": row.get("seat_code") or "",
            "site_name": row.get("site_name") or "Previous office",
            "building_name": row.get("building_name") or "Previous building",
            "floor_name": row.get("floor_name") or "Previous floor",
            "seat_type": row.get("seat_type") or "STANDARD",
            "headcount": 1,
            "amenity_ids": [],
            "previous_seat_ids": [],
            "source_booking_id": row.get("booking_id") or row.get("booking_ref") or "",
            "source_booking_date": row.get("booking_date") or "",
        }

    @staticmethod
    def _booking_row_sort_key(row: Dict[str, Any]) -> tuple[int, str]:
        status = str(row.get("booking_status") or row.get("status") or "").upper()
        active_rank = 1 if status in {"CONFIRMED", "ACTIVE", "BOOKED", "APPROVED"} else 0
        return active_rank, str(row.get("booking_date") or "")

    async def _handle_quick_book(self, session, user_text, form_data, db):
        if not user_text:
            return await self._go_to_main_menu(session, db)

        choice = user_text.strip().lower()
        if choice in ("quick_book", "default_location", "use_default_location", "use default location", "1"):
            telemetry_service.record_booking_event("booking_flow_started", source="quick_book_default_location")
            await self._update_node(session, Node.QUICK_BOOK_DATE, "NAVIGATING", db)
            return self._build_quick_book_date_card(session)
        elif choice in (
            "custom_booking",
            "select_location",
            "different_location",
            "select another location",
            "change location",
            "2",
        ):
            return await self._start_select_location_booking(session, db)
        return await self._go_to_main_menu(session, db)

    def _build_quick_book_date_card(self, session) -> ChatResponse:
        card = FormCard(
            title="Quick Book - Select Date",
            subtitle="I will check your previous or recommended seats.",
            node=Node.QUICK_BOOK_DATE,
            fields=[
                FormField(
                    key="booking_date",
                    label="Booking date",
                    field_type="date",
                    required=True,
                    placeholder="Select a date",
                ),
            ],
            submit_label="Find available seats"
        )
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.QUICK_BOOK_DATE,
            state="NAVIGATING",
            messages=[BotMessage(type=MessageType.FORM_CARD, form_card=card)]
        )

    async def _handle_quick_book_date(self, session, user_text, form_data, db):
        normalized_text = (user_text or "").strip().lower()
        if normalized_text in {"book_seat_from_bookings", "book a seat", "book seat"}:
            return await self._start_book_seat_entry(session, db)

        if not form_data:
            return self._build_quick_book_date_card(session)

        booking_date_str = form_data.get("booking_date")
        if not booking_date_str:
            resp = self._build_quick_book_date_card(session)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Please select a date."))
            return resp

        try:
            booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
            if booking_date < date.today():
                resp = self._build_quick_book_date_card(session)
                resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Date cannot be in the past."))
                return resp
        except ValueError:
            resp = self._build_quick_book_date_card(session)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Invalid date format."))
            return resp

        duplicate_resp = await self._build_duplicate_booking_response(session, booking_date_str, db)
        if duplicate_resp:
            return duplicate_resp

        await self._set_context_bulk(session.id, {"booking_date": booking_date_str}, db)
        ctx = await self._get_context(session.id, db)
        if ctx.get("quick_book_mode") == "true" and not all(ctx.get(key) for key in ("site_id", "building_id", "floor_id")):
            profile = await self._get_default_booking_profile(session.user_name, db)
            if profile:
                await self._set_context_bulk(session.id, {
                    "site_id": str(profile["site_id"]),
                    "building_id": str(profile["building_id"]),
                    "floor_id": str(profile["floor_id"]),
                    "site_name": profile["site_name"],
                    "building_name": profile["building_name"],
                    "floor_name": profile["floor_name"],
                    "favorite_seat_ids": ",".join(str(x) for x in (profile.get("favorite_seat_ids") or [])),
                    "previous_seat_ids": ",".join(str(x) for x in (profile.get("previous_seat_ids") or [])),
                    "last_seat_id": str(profile.get("last_seat_id") or ""),
                    "seat_type": profile.get("seat_type") or "STANDARD",
                    "headcount": str(max(1, min(_max_headcount(), int(profile.get("headcount") or 1)))),
                    "amenity_ids": ",".join(str(x) for x in (profile.get("amenity_ids") or [])),
                    "booking_prefill_source": profile["source"],
                    "quick_book_source_booking_id": str(profile.get("source_booking_id") or ""),
                    "quick_book_source_booking_date": str(profile.get("source_booking_date") or ""),
                    "quick_book_missing_profile": "",
                }, db)
            else:
                await self._update_node(session, Node.QUICK_BOOK_DATE, "NAVIGATING", db)
                resp = self._build_quick_book_date_card(session)
                resp.messages.insert(0, BotMessage(
                    type=MessageType.ERROR,
                    text="I could not find your previous or default seat details for Quick Book. Please use Book a seat to choose a location."
                ))
                resp.messages.append(BotMessage(
                    type=MessageType.OPTIONS,
                    text="What would you like to do?",
                    options=[
                        ChatOption(number=1, label="Book a seat", value="book_seat_from_bookings"),
                        ChatOption(number=0, label="Main menu", value="0"),
                    ],
                ))
                return resp
        return await self._continue_to_available_seats(
            session,
            db,
            f"Checking your previous seats for **{booking_date.strftime('%d %b %Y')}**.",
        )

    @staticmethod
    def _quick_book_preferred_seat_ids(ctx: Dict[str, str]) -> list[int]:
        preferred_ids: list[int] = []
        for value in (ctx.get("favorite_seat_ids") or "").split(","):
            seat_id = ChatEngine._safe_int(value)
            if seat_id and seat_id not in preferred_ids:
                preferred_ids.append(seat_id)
        for value in (ctx.get("previous_seat_ids") or "").split(","):
            seat_id = ChatEngine._safe_int(value)
            if seat_id and seat_id not in preferred_ids:
                preferred_ids.append(seat_id)
        last_seat_id = ChatEngine._safe_int(ctx.get("last_seat_id"))
        if last_seat_id and last_seat_id not in preferred_ids:
            preferred_ids.append(last_seat_id)
        return preferred_ids

    async def _start_select_location_booking(self, session, db: AsyncSession) -> ChatResponse:
        telemetry_service.record_booking_event("booking_flow_started", source="quick_book_select_location")
        session.current_menu_id = None
        await self._set_context_bulk(session.id, {
            "booking_date": "",
            "site_id": "",
            "building_id": "",
            "floor_id": "",
            "last_seat_id": "",
            "seat_type": "",
            "amenity_ids": "",
            "selected_seat_ids": "",
            "seat_id": "",
            "booking_prefill_source": "select_location",
            "quick_book_mode": "",
        }, db)
        await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
        resp = await self._build_when_where_card(session, db)
        resp.messages.insert(0, BotMessage(
            type=MessageType.TEXT,
            text="Sure. Select the office, date, building, and floor you want."
        ))
        return resp

    async def _start_book_seat_entry(self, session, db: AsyncSession) -> ChatResponse:
        session.current_menu_id = None
        await self._reset_manual_booking_context(session.id, db)
        await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
        return await self._build_when_where_card(session, db)

    async def _reset_manual_booking_context(self, session_id, db: AsyncSession) -> None:
        await self._set_context_bulk(session_id, {
            "booking_date": "",
            "site_id": "",
            "building_id": "",
            "floor_id": "",
            "favorite_seat_ids": "",
            "last_seat_id": "",
            "seat_type": "",
            "amenity_ids": "",
            "selected_seat_ids": "",
            "seat_id": "",
            "booking_prefill_source": "manual",
            "quick_book_mode": "",
        }, db)

    # ── STEP 1: WHEN + WHERE (Form Card) ──────────────────────────────────────
    async def _build_when_where_card(self, session, db: Optional[AsyncSession] = None) -> ChatResponse:
        ctx = await self._get_context(session.id, db) if db else {}
        card = FormCard(
            title="When & Where",
            subtitle="Tell us when and where you'd like to book",
            node=Node.BOOK_WHEN_WHERE,
            fields=[
                FormField(
                    key="booking_date",
                    label="Booking date",
                    field_type="date",
                    required=True,
                    default_value=ctx.get("booking_date"),
                    placeholder="Select a date",
                ),
                FormField(
                    key="site_id",
                    label="Office / Site",
                    field_type="dropdown_dynamic",
                    required=True,
                    default_value=ctx.get("site_id"),
                    lookup_endpoint="/api/chat/lookup/sites",
                    placeholder="Select an office",
                ),
                FormField(
                    key="building_id",
                    label="Building",
                    field_type="dropdown_dynamic",
                    required=True,
                    default_value=ctx.get("building_id"),
                    lookup_endpoint="/api/chat/lookup/buildings",
                    depends_on="site_id",
                    placeholder="Select a building",
                ),
                FormField(
                    key="floor_id",
                    label="Floor",
                    field_type="dropdown_dynamic",
                    required=True,
                    default_value=ctx.get("floor_id"),
                    lookup_endpoint="/api/chat/lookup/floors",
                    depends_on="building_id",
                    placeholder="Select a floor",
                ),
            ],
            submit_label="Find available seats"
        )
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.BOOK_WHEN_WHERE,
            state="BOOKING_WHEN_WHERE",
            messages=[BotMessage(type=MessageType.FORM_CARD, form_card=card)]
        )

    async def _handle_when_where(self, session, user_text, form_data, db):
        if not form_data:
            return await self._build_when_where_card(session, db)

        # Treat this submit as the user's current choice set.
        # Do not backfill missing values from older booking context because that
        # can silently reuse a stale floor/building and produce unrelated seats.
        form_data = {key: value for key, value in form_data.items() if value not in (None, "")}

        booking_date_str = form_data.get("booking_date")
        site_id = self._safe_int(form_data.get("site_id"))
        building_id = self._safe_int(form_data.get("building_id"))
        floor_id = self._safe_int(form_data.get("floor_id"))

        errors = []
        if not booking_date_str:
            errors.append("Booking date is required.")
        else:
            try:
                booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
                if booking_date < date.today():
                    errors.append("Booking date cannot be in the past.")
            except ValueError:
                errors.append("Invalid date format.")

        if not site_id:
            errors.append("Please select an office site.")
        if not building_id:
            errors.append("Please select a building.")
        if not floor_id:
            errors.append("Please select a floor.")

        if errors:
            logger.info(
                "WhenWhere validation failed session_id=%s errors=%s form_keys=%s",
                session.id,
                errors,
                sorted(str(key) for key in form_data.keys()),
            )
            resp = await self._build_when_where_card(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR, text="\n".join(errors)))
            return resp

        duplicate_resp = await self._build_duplicate_booking_response(session, booking_date_str, db)
        if duplicate_resp:
            return duplicate_resp

        booking_context = {
            "booking_date": booking_date_str,
            "site_id": str(site_id),
            "building_id": str(building_id),
            "floor_id": str(floor_id),
            "quick_book_mode": "",
        }
        booking_context.update(await self._booking_details_reset_context(session, db))
        await self._set_context_bulk(session.id, booking_context, db)
        return await self._continue_to_available_seats(session, db)

    # ── STEP 2: BOOKING DETAILS (Form Card) ───────────────────────────────────
    async def _build_details_card(self, session, db: AsyncSession) -> ChatResponse:
        return await self._continue_to_available_seats(session, db)

    async def _handle_details(self, session, user_text, form_data, db):
        return await self._continue_to_available_seats(session, db)

    async def _continue_to_available_seats(
        self,
        session,
        db: AsyncSession,
        intro_text: Optional[str] = None,
    ) -> ChatResponse:
        await self._set_context_bulk(session.id, {
            "seat_type": "STANDARD",
            "headcount": "1",
            "amenity_ids": "",
            "selected_seat_ids": "",
        }, db)
        await self._update_node(session, Node.AVAILABLE_SEATS, "SELECTING_SEAT", db)
        resp = await self._build_seat_list(session, db)
        if intro_text:
            resp.messages.insert(0, BotMessage(type=MessageType.TEXT, text=intro_text))
        return resp

    # ── STEP 3: AVAILABLE SEATS ────────────────────────────────────────────────
    async def _build_seat_list(self, session, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        floor_id = self._safe_int(ctx.get("floor_id"))
        amenity_ids_str = ctx.get("amenity_ids", "")
        amenity_ids = [int(x) for x in amenity_ids_str.split(",") if x.strip().isdigit()] if amenity_ids_str else []
        booking_date_str = ctx.get("booking_date")

        external_seats = await self._build_external_seat_list_response(
            session,
            db,
            site_id=self._safe_int(ctx.get("site_id")),
            building_id=self._safe_int(ctx.get("building_id")),
            floor_id=floor_id,
            booking_date_str=booking_date_str,
            amenity_ids=amenity_ids,
            modify_booking_id=ctx.get("rebook_modify_booking_id") or None,
        )
        if external_seats:
            return external_seats

        telemetry_service.record_booking_event(
            "seat_backend_unavailable",
            floor_id=floor_id,
            booking_date=booking_date_str,
        )
        await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
        resp = await self._build_when_where_card(session, db)
        resp.messages.insert(0, BotMessage(
            type=MessageType.ERROR,
            text=(
                "I am unable to connect to the seat booking system right now, "
                "so I cannot load available seats. Please try again in a few minutes."
            )
        ))
        return resp

    async def _build_external_seat_list_response(
        self,
        session,
        db: AsyncSession,
        *,
        site_id: Optional[int],
        building_id: Optional[int],
        floor_id: Optional[int],
        booking_date_str: Optional[str],
        amenity_ids: list[int],
        modify_booking_id: Optional[str] = None,
    ) -> Optional[ChatResponse]:
        if not floor_id or not booking_date_str:
            return None
        telemetry_service.record_step(
            "seats.lookup.start",
            session_id=str(session.id),
            floor_id=floor_id,
            booking_date=booking_date_str,
            amenity_count=len(amenity_ids),
        )
        seats = await seat_backend_api_service.available_seats(
            floor_id=floor_id,
            booking_date=booking_date_str,
            amenity_ids=amenity_ids,
            modify_booking_id=modify_booking_id,
        )
        if seats is None:
            telemetry_service.record_step(
                "seats.lookup.failed",
                session_id=str(session.id),
                floor_id=floor_id,
                booking_date=booking_date_str,
            )
            return None
        available_rows = [
            seat for seat in seats
            if self._is_backend_seat_available(seat, booking_date_str)
        ]
        telemetry_service.record_step(
            "seats.lookup.result",
            session_id=str(session.id),
            floor_id=floor_id,
            booking_date=booking_date_str,
            returned_count=len(seats),
            available_count=len(available_rows),
        )
        if not available_rows:
            telemetry_service.record_booking_event(
                "no_available_seats",
                floor_id=floor_id,
                seat_type="STANDARD",
                strategy="external_api",
            )
            await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
            resp = await self._build_when_where_card(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text="No available seats found for that date and location. Please choose a different date, office, building, or floor."
            ))
            return resp

        ctx = await self._get_context(session.id, db)
        quick_book_mode = ctx.get("quick_book_mode") == "true"
        seat_list_text = f"Found {len(available_rows)} available seat(s). Select one to continue:"
        candidate_rows = available_rows[:20]
        floors = await seat_backend_api_service.list_floors(building_id) if building_id else None
        floor_name = next(
            (floor.get("floor_name") or floor.get("floor_code") for floor in (floors or []) if str(floor.get("floor_id")) == str(floor_id)),
            "Selected Floor",
        )
        buildings = await seat_backend_api_service.list_buildings(site_id) if site_id else None
        building_id_str = str(building_id or "")
        building_name = next(
            (building.get("building_name") for building in (buildings or []) if str(building.get("building_id")) == building_id_str),
            "Selected Building",
        )
        sites = await seat_backend_api_service.list_sites()
        site_name = next(
            (site.get("site_name") for site in (sites or []) if str(site.get("site_id")) == str(site_id or "")),
            "Selected office",
        )

        if quick_book_mode:
            preferred_ids = self._quick_book_preferred_seat_ids(ctx)
            preferred_order = {seat_id: index for index, seat_id in enumerate(preferred_ids)}
            preferred_rows = [
                seat for seat in available_rows
                if self._backend_seat_id(seat) in preferred_order
            ]
            if preferred_rows:
                preferred_rows.sort(key=lambda seat: preferred_order.get(self._backend_seat_id(seat) or 0, 9999))
                selected = preferred_rows[0]
                selected_id = self._backend_seat_id(selected)
                if selected_id:
                    selected_code = self._backend_seat_code(selected, selected_id)
                    await self._set_context_bulk(session.id, {
                        "selected_seat_ids": str(selected_id),
                        "seat_id": str(selected_id),
                        "available_seats_map": f"1:{selected_id}",
                        "available_seat_codes": f"{selected_id}:{selected_code}",
                        "external_booking_source": "seat_backend_api",
                        "site_name": site_name,
                        "building_name": building_name,
                        "floor_name": floor_name,
                    }, db)
                    await self._update_node(session, Node.CONFIRM, "CONFIRMING", db)
                    resp = await self._build_confirmation(session, db)
                    resp.messages.insert(0, BotMessage(
                        type=MessageType.TEXT,
                        text=self._quick_book_auto_selected_text(selected_code, ctx),
                    ))
                    telemetry_service.record_seat_recommendation(
                        strategy="quick_book_auto_preferred",
                        seat_count=1,
                        amenity_fallback=False,
                        seat_type_fallback=False,
                    )
                    return resp
            else:
                sample_size = min(5, len(available_rows))
                candidate_rows = random.sample(available_rows, sample_size)
                seat_list_text = "Your previous seats are not available for that date. Here are available alternatives:"

        seat_cards = [
            SeatCard(
                id=seat_id,
                seat_code=self._backend_seat_code(seat, seat_id),
                seat_type=seat.get("seat_type") or "STANDARD",
                seat_neighborhood=seat.get("seat_neighborhood"),
                amenities=seat.get("matched_amenities") or [],
            )
            for seat in candidate_rows
            if (seat_id := self._backend_seat_id(seat)) is not None
        ]
        if not seat_cards:
            return None

        seat_map = {str(i + 1): seat.id for i, seat in enumerate(seat_cards)}
        await self._set_context_bulk(session.id, {
            "available_seats_map": ",".join(f"{k}:{v}" for k, v in seat_map.items()),
            "available_seat_codes": ",".join(f"{seat.id}:{seat.seat_code}" for seat in seat_cards),
            "external_booking_source": "seat_backend_api",
            "site_name": site_name,
            "building_name": building_name,
            "floor_name": floor_name,
        }, db)

        telemetry_service.record_seat_recommendation(
            strategy="external_api",
            seat_count=len(seat_cards),
            amenity_fallback=False,
            seat_type_fallback=False,
        )
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.AVAILABLE_SEATS,
            state="SELECTING_SEAT",
            messages=[
                BotMessage(
                    type=MessageType.SEAT_LIST,
                    text=seat_list_text,
                    seat_list=SeatList(
                        seats=seat_cards,
                        total=len(seat_cards),
                        floor_name=floor_name,
                        building_name=building_name,
                        headcount=int((await self._get_context(session.id, db)).get("headcount", "1")),
                    ),
                )
            ],
        )

    @staticmethod
    def _quick_book_auto_selected_text(seat_code: str, ctx: Dict[str, str]) -> str:
        source = ctx.get("booking_prefill_source") or ""
        booking_id = ctx.get("quick_book_source_booking_id") or ""
        booking_date = ctx.get("quick_book_source_booking_date") or ""
        if source == "previous_booking" and booking_id:
            date_text = f" on {booking_date}" if booking_date else ""
            return (
                f"I found **{seat_code}** from your booking history"
                f" (booking {booking_id}{date_text}) and it is available for this date, so I selected it for you."
            )
        if source == "default_location":
            return f"I found **{seat_code}** from your default location/preference data and it is available for this date, so I selected it for you."
        return f"I found your preferred seat **{seat_code}** available for this date and selected it for you."

    @staticmethod
    def _is_backend_seat_available(seat: Dict[str, Any], booking_date_str: str) -> bool:
        if seat.get("is_bookable") is False:
            return False

        availability = seat.get("availability") or {}
        status = str(availability.get("status") or "").upper()
        if status in {"FULLY_AVAILABLE", "AVAILABLE"}:
            return True
        if status in {"FULLY_UNAVAILABLE", "UNAVAILABLE", "BOOKED", "BLOCKED"}:
            return False

        daily_statuses = availability.get("daily_statuses") or []
        for daily in daily_statuses:
            if str(daily.get("booking_date") or "") == str(booking_date_str):
                return str(daily.get("status") or "").upper() in {"AVAILABLE", "FULLY_AVAILABLE"}

        available_dates = {str(value) for value in (availability.get("available_dates") or [])}
        if available_dates:
            return str(booking_date_str) in available_dates

        return True

    @staticmethod
    def _backend_seat_id(seat: Dict[str, Any]) -> Optional[int]:
        nested = seat.get("seat") if isinstance(seat.get("seat"), dict) else {}
        return ChatEngine._safe_int(
            seat.get("seat_id") or seat.get("seatId") or seat.get("id") or nested.get("seat_id") or nested.get("id")
        )

    @staticmethod
    def _backend_seat_code(seat: Dict[str, Any], seat_id: int) -> str:
        nested = seat.get("seat") if isinstance(seat.get("seat"), dict) else {}
        return str(
            seat.get("seat_code")
            or seat.get("seatCode")
            or seat.get("code")
            or seat.get("seat_name")
            or nested.get("seat_code")
            or nested.get("code")
            or nested.get("seat_name")
            or seat_id
        )

    async def _handle_seat_selection(self, session, user_text, form_data, db):
        selected_ids = []

        edit_response = await self._route_seat_preference_change(session, user_text, form_data, db)
        if edit_response:
            return edit_response

        # Multi-select: frontend sends seat_ids array
        if form_data and "seat_ids" in form_data:
            raw = form_data["seat_ids"]
            selected_ids = [int(x) for x in raw if str(x).isdigit()] if isinstance(raw, list) else []

        # Single select: frontend sends seat_id
        elif form_data and "seat_id" in form_data:
            sid = self._safe_int(form_data["seat_id"])
            if sid:
                selected_ids = [sid]

        # Text input: number typed
        elif user_text and user_text.strip().isdigit():
            ctx = await self._get_context(session.id, db)
            seat_map_str = ctx.get("available_seats_map", "")
            seat_map = {}
            for pair in seat_map_str.split(","):
                if ":" in pair:
                    k, v = pair.split(":", 1)
                    seat_map[k] = int(v)
            sid = seat_map.get(user_text.strip())
            if sid:
                selected_ids = [sid]

        if not selected_ids:
            resp = await self._build_seat_list(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text="Invalid selection. Please select a seat from the list."
            ))
            return resp

        ctx = await self._get_context(session.id, db)
        headcount = int(ctx.get("headcount", "1"))

        if len(selected_ids) != headcount:
            resp = await self._build_seat_list(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text=f"Please select exactly {headcount} seat(s). You selected {len(selected_ids)}."
            ))
            return resp

        await self._set_context_bulk(session.id, {
            "selected_seat_ids": ",".join(str(s) for s in selected_ids),
            "seat_id": str(selected_ids[0]),
        }, db)

        await self._update_node(session, Node.CONFIRM, "CONFIRMING", db)
        return await self._build_confirmation(session, db)

    async def _route_seat_preference_change(self, session, user_text, form_data, db) -> Optional[ChatResponse]:
        if form_data or not user_text:
            return None

        target = booking_edit_service.detect_seat_preference_change_target(user_text)
        if not target:
            return None

        if target == "when_where":
            updates = booking_edit_service.context_clear_for_when_where_change(user_text)
            if updates:
                await self._set_context_bulk(session.id, updates, db)
            await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
            resp = await self._build_when_where_card(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.TEXT,
                text="Sure. You can update the date, office, building, or floor below. I kept your other booking preferences."
            ))
            return resp

        await self._set_context_bulk(session.id, {"selected_seat_ids": "", "seat_id": ""}, db)
        await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
        resp = await self._build_when_where_card(session, db)
        resp.messages.insert(0, BotMessage(
            type=MessageType.TEXT,
            text="Seat preferences are not being collected right now. You can update the date or location below."
        ))
        return resp

    # ── STEP 4: CONFIRMATION ───────────────────────────────────────────────────
    async def _build_confirmation(self, session, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)

        floor_id = self._safe_int(ctx.get("floor_id"))
        building_id = self._safe_int(ctx.get("building_id"))
        site_id = self._safe_int(ctx.get("site_id"))
        booking_date_str = ctx.get("booking_date", "")
        seat_type = ctx.get("seat_type", "STANDARD")
        headcount = int(ctx.get("headcount", "1"))
        selected_ids_str = ctx.get("selected_seat_ids", ctx.get("seat_id", ""))
        selected_ids = [int(x) for x in selected_ids_str.split(",") if x.strip().isdigit()]

        context_seat_codes = self._context_seat_code_map(ctx)
        seat_codes = [context_seat_codes[sid] for sid in selected_ids if sid in context_seat_codes]

        confirmation = BookingConfirmation(
            booking_date=booking_date_str,
            site_name=ctx.get("site_name") or "—",
            building_name=ctx.get("building_name") or "—",
            floor_name=ctx.get("floor_name") or "—",
            seat_code=", ".join(seat_codes) if seat_codes else "—",
            seat_type=SEAT_TYPE_LABELS.get(seat_type, seat_type),
            headcount=headcount,
            amenities=["None"],
        )
        telemetry_service.record_booking_event(
            "confirmation_shown",
            seat_count=len(selected_ids),
            site_id=site_id,
            building_id=building_id,
            floor_id=floor_id,
            seat_type=seat_type,
        )

        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.CONFIRM,
            state="CONFIRMING",
            messages=[
                BotMessage(type=MessageType.CONFIRMATION, confirmation=confirmation),
                BotMessage(
                    type=MessageType.OPTIONS,
                    text="Would you like to confirm this booking?",
                    options=[
                        ChatOption(number=1, label="Confirm booking", value="1"),
                        ChatOption(number=2, label="Change details", value="2"),
                        ChatOption(number=0, label="Back to main menu", value="0"),
                    ]
                )
            ]
        )

    async def _handle_confirm(self, session, user_text, form_data, db):
        choice = self._parse_number(user_text)

        if choice == 1:
            return await self._create_booking(session, db)
        elif choice == 2:
            await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
            return await self._build_when_where_card(session, db)
        else:
            return await self._go_to_main_menu(session, db)

    # ── CREATE BOOKING ─────────────────────────────────────────────────────────
    async def _create_booking(self, session, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)

        selected_ids_str = ctx.get("selected_seat_ids", ctx.get("seat_id", ""))
        selected_ids = [int(x) for x in selected_ids_str.split(",") if x.strip().isdigit()]

        if ctx.get("rebook_modify_booking_id"):
            return await self._modify_external_booking_for_rebook(session, db, ctx, selected_ids)

        return await self._create_external_booking(session, db, ctx, selected_ids)

    async def _modify_external_booking_for_rebook(
        self,
        session,
        db: AsyncSession,
        ctx: Dict[str, str],
        selected_ids: list[int],
    ) -> ChatResponse:
        booking_id = ctx.get("rebook_modify_booking_id") or ""
        if not booking_id or len(selected_ids) != 1:
            await self._update_node(session, Node.AVAILABLE_SEATS, "SELECTING_SEAT", db)
            resp = await self._build_seat_list(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Please select one seat before confirming the change."))
            return resp

        seat_id = selected_ids[0]
        updated = await seat_backend_api_service.modify_booking(
            booking_id,
            site_id=int(ctx["site_id"]),
            building_id=int(ctx["building_id"]),
            floor_id=int(ctx["floor_id"]),
            seat_id=seat_id,
            booking_date=ctx["booking_date"],
        )
        if not updated:
            await self._set_context_bulk(session.id, {"selected_seat_ids": "", "seat_id": ""}, db)
            await self._update_node(session, Node.AVAILABLE_SEATS, "SELECTING_SEAT", db)
            resp = await self._build_seat_list(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text="I could not update your existing booking in the seat management system. Please select a seat and try again.",
            ))
            return resp

        session.current_menu_id = None
        await self._set_context_bulk(session.id, {"rebook_modify_booking_id": ""}, db)
        await self._update_node(session, Node.MAIN_MENU, "COMPLETED", db)
        menu_resp = await self._build_dynamic_menu(session, None, "", db)

        context_seat_codes = self._context_seat_code_map(ctx)
        seat_display = str(updated.get("seat_code") or context_seat_codes.get(seat_id) or seat_id)
        telemetry_service.record_booking_event(
            "booking_modified_for_rebook",
            booking_id=booking_id,
            site_id=int(ctx["site_id"]),
            building_id=int(ctx["building_id"]),
            floor_id=int(ctx["floor_id"]),
            booking_date=ctx["booking_date"],
            source="seat_backend_api",
        )
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MAIN_MENU,
            state="COMPLETED",
            messages=[
                BotMessage(
                    type=MessageType.SUCCESS,
                    success=BookingSuccess(
                        booking_ref=str(updated.get("booking_id") or updated.get("booking_ref") or booking_id),
                        booking_date=ctx["booking_date"],
                        seat_code=seat_display,
                        site_name=updated.get("site_name") or ctx.get("site_name") or "Selected office",
                        message="Your existing booking has been updated with the selected seat.",
                    ),
                ),
                *menu_resp.messages,
            ],
        )

    async def _create_external_booking(
        self,
        session,
        db: AsyncSession,
        ctx: Dict[str, str],
        selected_ids: list[int],
    ) -> ChatResponse:
        if not selected_ids:
            await self._update_node(session, Node.AVAILABLE_SEATS, "SELECTING_SEAT", db)
            resp = await self._build_seat_list(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Please select a seat before confirming."))
            return resp

        created_bookings = []
        for seat_id in selected_ids:
            created = await seat_backend_api_service.create_booking(
                site_id=int(ctx["site_id"]),
                building_id=int(ctx["building_id"]),
                floor_id=int(ctx["floor_id"]),
                seat_id=seat_id,
                booking_date=ctx["booking_date"],
            )
            if not created:
                await self._set_context_bulk(session.id, {"selected_seat_ids": "", "seat_id": ""}, db)
                await self._update_node(session, Node.AVAILABLE_SEATS, "SELECTING_SEAT", db)
                resp = await self._build_seat_list(session, db)
                resp.messages.insert(0, BotMessage(
                    type=MessageType.ERROR,
                    text="I could not create the booking in the seat management backend. Please select a seat and try again.",
                ))
                return resp
            created_bookings.append(created)

        session.current_menu_id = None
        await self._update_node(session, Node.MAIN_MENU, "COMPLETED", db)
        menu_resp = await self._build_dynamic_menu(session, None, "", db)

        context_seat_codes = self._context_seat_code_map(ctx)
        refs = ", ".join(str(item.get("booking_id") or item.get("booking_ref") or "") for item in created_bookings).strip(", ")
        seats_display = ", ".join(
            str(item.get("seat_code") or context_seat_codes.get(seat_id) or seat_id)
            for item, seat_id in zip(created_bookings, selected_ids)
        )
        telemetry_service.record_booking_event(
            "booking_created",
            booking_count=len(created_bookings),
            site_id=int(ctx["site_id"]),
            building_id=int(ctx["building_id"]),
            floor_id=int(ctx["floor_id"]),
            booking_date=ctx["booking_date"],
            source="seat_backend_api",
        )
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MAIN_MENU,
            state="COMPLETED",
            messages=[
                BotMessage(
                    type=MessageType.SUCCESS,
                    success=BookingSuccess(
                        booking_ref=refs or "Created",
                        booking_date=ctx["booking_date"],
                        seat_code=seats_display,
                        site_name=created_bookings[0].get("site_name") or ctx.get("site_name") or "Selected office",
                        message="Your seat has been booked!" if len(created_bookings) == 1 else f"Your {len(created_bookings)} seat(s) have been booked!",
                    ),
                ),
                *menu_resp.messages,
            ],
        )

    # ── MY BOOKINGS ────────────────────────────────────────────────────────────
    async def _handle_my_bookings(self, session, user_text, form_data, db):
        # Handle inline actions from booking cards
        if form_data:
            action = form_data.get("action")
            booking_id = form_data.get("booking_id")

            if action == "booking_list_mode":
                requested_mode = str(form_data.get("mode") or "upcoming").lower()
                list_mode = requested_mode if requested_mode in {"upcoming", "past", "cancelled"} else "upcoming"
                await self._set_context_bulk(
                    session.id,
                    {
                        "booking_action": "",
                        "booking_list_mode": list_mode,
                        "booking_list_offset": "0",
                        "date_range_start": "",
                        "date_range_end": "",
                    },
                    db,
                )
                return await self._build_my_bookings(session, db)

            if action == "cancel" and booking_id and settings.ENABLE_BOOKING_ACTION_CONFIRMATION:
                return await self._build_booking_action_confirmation(session, "cancel", booking_id, db)
            if action == "cancel" and booking_id:
                return await self._inline_cancel_booking(session, booking_id, db)

            if action == "modify" and booking_id and settings.ENABLE_BOOKING_ACTION_CONFIRMATION:
                return await self._build_booking_action_confirmation(session, "modify", booking_id, db)
            if action == "modify" and booking_id:
                return await self._inline_modify_booking(session, booking_id, db)

            if action == "rebook" and booking_id:
                return await self._build_rebook_calendar(session, str(booking_id), db)

            if action == "rebook_month":
                return await self._build_rebook_calendar(
                    session,
                    str(form_data.get("booking_id") or ""),
                    db,
                    month_start=str(form_data.get("month_start") or ""),
                )

            if action == "rebook_date":
                return await self._handle_rebook_date_selection(
                    session,
                    str(form_data.get("booking_id") or ""),
                    str(form_data.get("booking_date") or ""),
                    db,
                )

        # Handle menu options below booking list
        if user_text:
            normalized_text = user_text.strip().lower()
            if normalized_text in {"quick_book_from_bookings", "quick book"}:
                return await self._start_quick_book_entry(session, db)
            if normalized_text in {"book_seat_from_bookings", "book a seat", "book seat"}:
                return await self._start_book_seat_entry(session, db)

            choice = self._parse_number(user_text)
            ctx = await self._get_context(session.id, db)
            action = ctx.get("booking_action")
            list_mode = ctx.get("booking_list_mode") or "upcoming"
            has_more = ctx.get("booking_list_has_more") == "true"
            if action in {"cancel", "modify"} and choice is not None:
                booking_id = self._booking_id_for_choice(ctx, choice)
                if booking_id:
                    return await self._build_booking_action_confirmation(session, action, booking_id, db)
                if has_more and str(choice) == ctx.get("booking_list_show_more_choice"):
                    return await self._show_more_bookings(session, db)
                if choice == 0:
                    await self._set_context_bulk(session.id, {"booking_action": "", "booking_list_ids": ""}, db)
                    return await self._go_to_main_menu(session, db)

            if choice == 1:
                if has_more:
                    return await self._show_more_bookings(session, db)
                return await self._start_quick_book_entry(session, db)

            if choice == 2:
                if has_more and list_mode not in {"past", "cancelled"}:
                    return await self._start_quick_book_entry(session, db)
                if not has_more and list_mode not in {"past", "cancelled"}:
                    return await self._start_book_seat_entry(session, db)

            if choice == 3 and has_more and list_mode not in {"past", "cancelled"}:
                return await self._start_book_seat_entry(session, db)

        return await self._build_my_bookings(session, db)

    async def _build_upcoming_bookings_from_menu(self, session, db: AsyncSession) -> ChatResponse:
        await self._set_context_bulk(
            session.id,
            {
                "booking_action": "",
                "booking_list_ids": "",
                "booking_list_mode": "upcoming",
                "booking_list_offset": "0",
                "date_range_start": "",
                "date_range_end": "",
            },
            db,
        )
        return await self._build_my_bookings(session, db)

    async def _show_more_bookings(self, session, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        list_mode = ctx.get("booking_list_mode") or "upcoming"
        if list_mode not in {"past", "upcoming", "cancelled"}:
            return await self._go_to_main_menu(session, db)
        current_offset = self._safe_int(ctx.get("booking_list_offset")) or 0
        page_size = self._past_bookings_page_size() if list_mode == "past" else self._my_bookings_max_results()
        await self._set_context_bulk(
            session.id,
            {"booking_list_offset": str(current_offset + page_size)},
            db,
        )
        return await self._build_my_bookings(session, db)

    async def _build_my_bookings(self, session, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        list_mode = ctx.get("booking_list_mode") or "upcoming"
        action = ctx.get("booking_action")
        show_actions = list_mode not in {"past", "cancelled"}
        page_size = self._past_bookings_page_size() if list_mode == "past" else self._my_bookings_max_results()
        offset = self._safe_int(ctx.get("booking_list_offset")) or 0

        external_resp = await self._build_external_my_bookings(
            session,
            db,
            ctx=ctx,
            list_mode=list_mode,
            action=action,
            show_actions=show_actions,
            page_size=page_size,
            offset=offset,
        )
        if external_resp:
            return external_resp

        await self._update_node(session, Node.MY_BOOKINGS, "NAVIGATING", db)
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MY_BOOKINGS,
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.ERROR,
                    text=(
                        "I am unable to connect to the seat booking system right now, "
                        "so I cannot load your bookings. Please try again in a few minutes."
                    ),
                ),
                BotMessage(
                    type=MessageType.OPTIONS,
                    text="",
                    options=[ChatOption(number=0, label="Main menu", value="0")],
                ),
            ],
        )

    async def _build_external_my_bookings(
        self,
        session,
        db: AsyncSession,
        *,
        ctx: Dict[str, str],
        list_mode: str,
        action: Optional[str],
        show_actions: bool,
        page_size: int,
        offset: int,
    ) -> Optional[ChatResponse]:
        page = (offset // page_size) + 1
        prefetched_past = None
        if list_mode == "past":
            result = await seat_backend_api_service.my_past_bookings(page=page, limit=page_size)
        elif list_mode == "cancelled":
            result = await seat_backend_api_service.my_cancelled_bookings(page=page, limit=page_size)
            if result is None:
                past_result = await seat_backend_api_service.my_past_bookings(page=page, limit=page_size)
                if past_result:
                    past_rows, past_has_more = past_result
                    result = (self._cancelled_booking_rows(past_rows), past_has_more)
        else:
            if page == 1:
                current_rows, future_result = await asyncio.gather(
                    seat_backend_api_service.my_current_bookings(),
                    seat_backend_api_service.my_future_bookings(page=page, limit=page_size),
                )
                if future_result is None and current_rows is None:
                    result = None
                else:
                    future_rows, future_has_more = future_result or ([], False)
                    result = (
                        self._merge_upcoming_booking_rows(current_rows or [], future_rows),
                        future_has_more,
                    )
            else:
                result = await seat_backend_api_service.my_future_bookings(page=page, limit=page_size)
        if result is None:
            return None
        rows, has_more = result
        rows = self._filter_external_bookings_by_date(rows, ctx)
        rows = self._sort_external_bookings_ascending(rows)

        await self._update_node(session, Node.MY_BOOKINGS, "NAVIGATING", db)
        if not rows:
            if (
                list_mode == "upcoming"
                and page == 1
                and not action
                and not ctx.get("date_range_start")
                and not ctx.get("date_range_end")
            ):
                history = await self._build_booking_history_fallback(session, db, prefetched_past)
                if history:
                    return history
            session.current_menu_id = None
            await self._update_node(session, Node.MAIN_MENU, "NAVIGATING", db)
            menu_resp = await self._build_dynamic_menu(session, None, "", db)
            return ChatResponse(
                session_id=str(session.id),
                current_node=Node.MAIN_MENU,
                state="NAVIGATING",
                messages=[
                    BotMessage(type=MessageType.TEXT, text=self._empty_booking_list_text(list_mode, offset, ctx)),
                    *menu_resp.messages,
                ],
            )

        row_card_pairs = [
            (row, self._external_booking_card(row, show_actions=show_actions, can_rebook=list_mode == "past"))
            for row in rows
            if row.get("booking_id")
        ]
        cards = [card for _row, card in row_card_pairs]
        await self._set_context_bulk(
            session.id,
            {
                "booking_list_source": "seat_backend_api",
                "booking_list_ids": ",".join(f"{index + 1}:{card.booking_id}" for index, card in enumerate(cards)),
                "booking_list_summaries": json.dumps({
                    card.booking_id: {
                        "booking_ref": card.booking_ref,
                        "booking_date": card.booking_date,
                        "site_id": str(row.get("site_id") or ""),
                        "building_id": str(row.get("building_id") or ""),
                        "floor_id": str(row.get("floor_id") or ""),
                        "seat_id": str(row.get("seat_id") or ""),
                        "seat_code": card.seat_code,
                        "site_name": card.site_name,
                        "building_name": card.building_name,
                        "floor_name": card.floor_name,
                        "status": card.status,
                    }
                    for row, card in row_card_pairs
                }),
                "booking_list_has_more": "true" if has_more else "false",
                "booking_list_show_more_choice": str(len(cards) + 1) if has_more else "",
            },
            db,
        )
        messages = [
            BotMessage(
                type=MessageType.BOOKING_LIST,
                text=self._booking_list_title(list_mode, len(cards), offset, ctx, action),
                booking_list=BookingListData(bookings=cards, total=len(cards), mode=list_mode),
            )
        ]
        guidance = self._booking_list_guidance_text(list_mode, has_more, action)
        if guidance:
            messages.append(BotMessage(type=MessageType.TEXT, text=guidance))
        messages.append(BotMessage(
            type=MessageType.OPTIONS,
            text="",
            options=self._booking_list_options(list_mode, has_more, action, cards),
        ))
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MY_BOOKINGS,
            state="NAVIGATING",
            messages=messages,
        )

    async def _build_booking_history_fallback(
        self,
        session,
        db: AsyncSession,
        past_result: Optional[tuple[list[Dict[str, Any]], bool]],
    ) -> Optional[ChatResponse]:
        """Keep the empty state in the selected Upcoming tab."""
        del past_result
        messages: list[BotMessage] = [BotMessage(
            type=MessageType.BOOKING_LIST,
            text="No upcoming bookings.",
            booking_list=BookingListData(
                bookings=[],
                total=0,
                mode="upcoming",
            ),
        )]
        messages.append(BotMessage(
            type=MessageType.OPTIONS,
            text="",
            options=[ChatOption(number=0, label="Main menu", value="0")],
        ))
        await self._set_context_bulk(session.id, {
            "booking_list_source": "seat_backend_api",
            "booking_list_summaries": "{}",
            "booking_list_has_more": "false",
        }, db)
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MY_BOOKINGS,
            state="NAVIGATING",
            messages=messages,
        )

    @staticmethod
    def _merge_upcoming_booking_rows(
        current_rows: list[Dict[str, Any]],
        future_rows: list[Dict[str, Any]],
    ) -> list[Dict[str, Any]]:
        """Combine today's and future bookings without duplicate cards."""
        today = date.today().isoformat()
        merged: list[Dict[str, Any]] = []
        seen: set[str] = set()
        for row in [*current_rows, *future_rows]:
            booking_date = ChatEngine._normalize_booking_date(row.get("booking_date"))
            if not booking_date or booking_date < today:
                continue
            identity = str(row.get("booking_id") or row.get("booking_ref") or "").strip()
            if not identity:
                identity = "|".join((
                    booking_date,
                    str(row.get("seat_id") or row.get("seat_code") or ""),
                ))
            if identity in seen:
                continue
            seen.add(identity)
            merged.append(row)
        return merged

    @staticmethod
    def _external_booking_card(row: Dict[str, Any], *, show_actions: bool, can_rebook: bool = False) -> BookingCard:
        booking_id = str(row.get("booking_id") or "")
        booking_ref = booking_id
        return BookingCard(
            booking_id=booking_id,
            booking_ref=booking_ref,
            booking_date=str(row.get("booking_date") or ""),
            site_name=row.get("site_name") or "—",
            building_name=row.get("building_name") or "—",
            floor_name=row.get("floor_name") or "—",
            seat_code=row.get("seat_code") or "—",
            seat_type=row.get("seat_type") or "Standard Desk",
            status=row.get("booking_status") or row.get("status") or "CONFIRMED",
            can_modify=show_actions,
            can_cancel=show_actions,
            can_rebook=can_rebook,
        )

    @staticmethod
    def _filter_external_bookings_by_date(rows: list[Dict[str, Any]], ctx: Dict[str, str]) -> list[Dict[str, Any]]:
        if not (ctx.get("date_range_start") and ctx.get("date_range_end")):
            return rows
        start = ctx["date_range_start"]
        end = ctx["date_range_end"]
        return [
            row for row in rows
            if start <= str(row.get("booking_date") or "") <= end
        ]

    @staticmethod
    def _sort_external_bookings_ascending(rows: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        return sorted(
            rows,
            key=lambda row: (
                ChatEngine._normalize_booking_date(row.get("booking_date")) or "9999-12-31",
                str(row.get("booking_id") or row.get("booking_ref") or ""),
            ),
        )

    @staticmethod
    def _cancelled_booking_rows(rows: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        return [
            row for row in rows
            if str(row.get("booking_status") or row.get("status") or "").upper() in {"CANCELLED", "CANCELED"}
        ]

    def _booking_list_title(self, list_mode: str, count: int, offset: int, ctx: Dict[str, str], action: Optional[str] = None) -> str:
        if action in {"cancel", "modify"}:
            action_text = "cancel" if action == "cancel" else "modify"
            range_text = ""
            if ctx.get("date_range_start") and ctx.get("date_range_end") and ctx["date_range_start"] == ctx["date_range_end"]:
                range_text = f" for {ctx['date_range_start']}"
            return f"Select the booking you want to {action_text}{range_text}:"

        if ctx.get("date_range_start") and ctx.get("date_range_end") and ctx["date_range_start"] == ctx["date_range_end"]:
            return f"Booking details for {ctx['date_range_start']}:"

        if list_mode == "cancelled":
            range_text = ""
            if ctx.get("date_range_start") and ctx.get("date_range_end"):
                range_text = f" from {ctx['date_range_start']} to {ctx['date_range_end']}"
            start = offset + 1
            end = offset + count
            return f"Cancelled bookings{range_text}: showing {start}-{end}."

        if list_mode != "past":
            return f"You have {count} upcoming booking(s):"

        range_text = ""
        if ctx.get("date_range_start") and ctx.get("date_range_end"):
            range_text = f" from {ctx['date_range_start']} to {ctx['date_range_end']}"
        start = offset + 1
        end = offset + count
        return f"Past bookings{range_text}: showing {start}-{end}."

    @staticmethod
    def _my_bookings_max_results() -> int:
        return max(1, int(settings.MY_BOOKINGS_MAX_RESULTS or 7))

    @staticmethod
    def _past_bookings_page_size() -> int:
        return max(1, int(settings.PAST_BOOKINGS_PAGE_SIZE or 5))

    @staticmethod
    def _empty_booking_list_text(list_mode: str, offset: int, ctx: Optional[Dict[str, str]] = None) -> str:
        ctx = ctx or {}
        if ctx.get("date_range_start") and ctx.get("date_range_end") and ctx["date_range_start"] == ctx["date_range_end"]:
            return f"No booking found for {ctx['date_range_start']}."
        if list_mode == "cancelled":
            if offset > 0:
                return "No more cancelled bookings found."
            return "You have no cancelled bookings."
        if list_mode != "past":
            if offset > 0:
                return "No more upcoming bookings found."
            return "You have no upcoming bookings."
        if offset > 0:
            return "No more past bookings found."
        return "You have no past bookings."

    @staticmethod
    def _booking_list_guidance_text(list_mode: str, has_more: bool, action: Optional[str] = None) -> Optional[str]:
        if not has_more:
            return None
        scope = "cancelled" if list_mode == "cancelled" else ("past" if list_mode == "past" else "upcoming")
        if action in {"cancel", "modify"}:
            return (
                f"There are more {scope} bookings. To find a specific one faster, "
                "tell me a specific date or date range."
            )
        return (
            f"There are more {scope} bookings. Click **Show more**, or tell me a "
            "specific date/date range to narrow the results."
        )

    @staticmethod
    def _booking_list_options(
        list_mode: str,
        has_more: bool,
        action: Optional[str] = None,
        cards: Optional[List[BookingCard]] = None,
    ) -> List[ChatOption]:
        if action in {"cancel", "modify"}:
            action_label = "Cancel" if action == "cancel" else "Modify"
            options = [
                ChatOption(number=index + 1, label=f"{action_label} {card.booking_ref}", value=str(index + 1))
                for index, card in enumerate(cards or [])
            ]
            if has_more:
                options.append(ChatOption(number=len(options) + 1, label="Show more", value="bookings_more"))
            options.append(ChatOption(number=0, label="Main menu", value="0"))
            return options

        options = []
        if has_more:
            options.append(ChatOption(number=1, label="Show more", value="bookings_more"))
        if list_mode not in {"past", "cancelled"}:
            options.append(ChatOption(number=2 if has_more else 1, label="Quick Book", value="quick_book_from_bookings"))
            options.append(ChatOption(number=3 if has_more else 2, label="Book a seat", value="book_seat_from_bookings"))
        options.append(ChatOption(number=0, label="Main menu", value="0"))
        return options

    async def _build_cancel_confirmation_by_ref(self, session, booking_ref: str, db: AsyncSession) -> ChatResponse:
        return await self._build_booking_action_confirmation_by_ref(session, "cancel", booking_ref, db)

    async def _build_booking_action_confirmation_by_ref(
        self,
        session,
        action: str,
        booking_ref: str,
        db: AsyncSession,
    ) -> ChatResponse:
        return await self._build_booking_action_confirmation(session, action, booking_ref, db)

    async def _build_booking_action_confirmation(
        self,
        session,
        action: str,
        booking_id: str,
        db: AsyncSession,
    ) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        external_summary = self._context_booking_summary(ctx, booking_id)
        if not external_summary:
            external_summary = await self._external_booking_summary_by_id(booking_id)
            if external_summary:
                await self._set_context_bulk(session.id, {
                    "booking_list_source": "seat_backend_api",
                    "booking_list_summaries": json.dumps({str(booking_id): external_summary}),
                }, db)
        if not external_summary:
            resp = await self._build_my_bookings(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Booking not found or already cancelled."))
            return resp

        action = "modify" if action == "modify" else "cancel"
        if self._is_current_or_ongoing_booking(external_summary):
            await self._set_context_bulk(session.id, {"booking_action": "", "booking_list_ids": ""}, db)
            resp = await self._go_to_main_menu(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text=self._current_booking_action_blocked_message(action, external_summary),
            ))
            return resp

        action_label = "modify" if action == "modify" else "cancel"
        confirm_value = f"confirm_modify:{booking_id}" if action == "modify" else f"confirm_cancel:{booking_id}"

        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MY_BOOKINGS,
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.TEXT,
                    text=(
                        f"Found booking **{external_summary.get('booking_ref') or booking_id}** "
                        f"for **{external_summary.get('booking_date') or 'the selected date'}**."
                    ),
                ),
                BotMessage(
                    type=MessageType.OPTIONS,
                    text=f"Do you want to {action_label} this booking?",
                    options=[
                        ChatOption(number=1, label=f"Confirm {action_label}", value=confirm_value),
                        ChatOption(number=0, label="Main menu", value="0"),
                    ],
                ),
            ],
        )

    @staticmethod
    def _booking_id_for_choice(ctx: Dict[str, str], choice: int) -> Optional[str]:
        for pair in ctx.get("booking_list_ids", "").split(","):
            if ":" not in pair:
                continue
            number, booking_id = pair.split(":", 1)
            if number.strip() == str(choice):
                return booking_id.strip()
        return None

    @staticmethod
    def _context_seat_code_map(ctx: Dict[str, str]) -> Dict[int, str]:
        seat_codes: Dict[int, str] = {}
        for pair in ctx.get("available_seat_codes", "").split(","):
            if ":" not in pair:
                continue
            seat_id, seat_code = pair.split(":", 1)
            try:
                seat_codes[int(seat_id.strip())] = seat_code.strip()
            except ValueError:
                continue
        return seat_codes

    @staticmethod
    def _context_booking_summary(ctx: Dict[str, str], booking_id: str) -> Optional[Dict[str, str]]:
        if ctx.get("booking_list_source") != "seat_backend_api":
            return None
        try:
            summaries = json.loads(ctx.get("booking_list_summaries") or "{}")
        except ValueError:
            return None
        summary = summaries.get(str(booking_id))
        return summary if isinstance(summary, dict) else None

    async def _build_rebook_calendar(
        self,
        session,
        booking_id: str,
        db: AsyncSession,
        month_start: Optional[str] = None,
    ) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        external_summary = self._context_booking_summary(ctx, booking_id)
        if not external_summary:
            external_summary = await self._external_booking_summary_by_id(booking_id)
        if not external_summary:
            resp = await self._build_my_bookings(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Booking not found for rebooking."))
            return resp

        floor_id = self._safe_int(external_summary.get("floor_id"))
        seat_id = self._safe_int(external_summary.get("seat_id"))
        if not floor_id or not seat_id:
            resp = await self._build_my_bookings(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text="I could not read the original seat details for this booking. Please use Book a seat.",
            ))
            return resp

        month_start_date = self._normalize_calendar_month_start(month_start)
        telemetry_service.record_step(
            "rebook.calendar.start",
            session_id=str(session.id),
            booking_id=booking_id,
            floor_id=floor_id,
            seat_id=seat_id,
            month_start=month_start_date.isoformat(),
        )
        reserved_dates = await self._reserved_booking_dates_for_month(month_start_date)
        days = await self._rebook_calendar_days(
            floor_id=floor_id,
            seat_id=seat_id,
            month_start=month_start_date,
            reserved_dates=reserved_dates,
        )
        telemetry_service.record_step(
            "rebook.calendar.ready",
            session_id=str(session.id),
            booking_id=booking_id,
            month_start=month_start_date.isoformat(),
            day_count=len(days),
            available_days=sum(1 for day in days if day.available),
            reserved_days=sum(1 for day in days if day.reserved),
        )
        await self._set_context_bulk(session.id, {
            "rebook_source_booking_id": booking_id,
            "rebook_source_summary": json.dumps(external_summary),
        }, db)
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MY_BOOKINGS,
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.REBOOK_CALENDAR,
                    text=(
                        "Select a new date. Green dates mean the same seat is available; "
                        "red dates need smart seat recommendations; orange dates can update your existing booking; "
                        "purple dates can change the existing booking with another available seat."
                    ),
                    rebook_calendar=RebookCalendarData(
                        booking_id=booking_id,
                        seat_code=str(external_summary.get("seat_code") or external_summary.get("seat_id") or ""),
                        site_name=str(external_summary.get("site_name") or "Previous office"),
                        building_name=str(external_summary.get("building_name") or "Previous building"),
                        floor_name=str(external_summary.get("floor_name") or "Previous floor"),
                        month_start=month_start_date.isoformat(),
                        previous_month_start=self._previous_rebook_month_start(month_start_date),
                        next_month_start=self._add_months(month_start_date, 1).isoformat(),
                        days=days,
                    ),
                )
            ],
        )

    async def _rebook_calendar_days(
        self,
        *,
        floor_id: int,
        seat_id: int,
        month_start: Optional[date] = None,
        days: Optional[int] = None,
        reserved_dates: Optional[dict[str, str]] = None,
    ) -> list[RebookCalendarDay]:
        if month_start is None:
            month_start = date.today().replace(day=1)
        reserved_dates = reserved_dates or {}
        total_days = days or self._days_in_month(month_start)

        # Bound concurrency so a month view does not wait on 28-31 sequential
        # SeatBook requests while still protecting the main API and DB pool.
        semaphore = asyncio.Semaphore(6)

        async def build_day(index: int) -> RebookCalendarDay:
            booking_date = month_start + timedelta(days=index)
            booking_date_str = booking_date.isoformat()
            selectable = booking_date >= date.today()
            if not selectable:
                return RebookCalendarDay(date=booking_date_str, available=False, selectable=False)
            async with semaphore:
                seats = await seat_backend_api_service.available_seats(
                    floor_id=floor_id,
                    booking_date=booking_date_str,
                    amenity_ids=[],
                    modify_booking_id=reserved_dates.get(booking_date_str),
                )
            available = False
            if seats is not None:
                available = any(
                    self._safe_int(seat.get("seat_id")) == seat_id
                    and self._is_backend_seat_available(seat, booking_date_str)
                    for seat in seats
                )
            reserved = booking_date_str in reserved_dates
            return RebookCalendarDay(
                date=booking_date_str,
                available=available,
                selectable=True,
                reserved=reserved,
                reserved_seat_available=available if reserved else False,
            )

        return list(await asyncio.gather(*(build_day(index) for index in range(total_days))))

    async def _reserved_booking_dates_for_month(self, month_start: date) -> dict[str, str]:
        month_end = self._add_months(month_start, 1)
        rows: list[Dict[str, Any]] = []

        current = await seat_backend_api_service.my_current_bookings()
        if current:
            rows.extend(current)

        future = await seat_backend_api_service.my_future_bookings(page=1, limit=100)
        if future:
            future_rows, _has_more = future
            rows.extend(future_rows)

        dates: dict[str, str] = {}
        for row in rows:
            booking_date_str = self._normalize_booking_date(row.get("booking_date"))
            if not booking_date_str:
                continue
            booking_id = str(row.get("booking_id") or "")
            if not booking_id:
                continue
            try:
                booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
            except (TypeError, ValueError):
                continue
            if month_start <= booking_date < month_end:
                dates[booking_date_str] = booking_id
        return dates

    @staticmethod
    def _normalize_calendar_month_start(value: Optional[str]) -> date:
        if value:
            try:
                parsed = datetime.strptime(str(value), "%Y-%m-%d").date()
                return parsed.replace(day=1)
            except (TypeError, ValueError):
                pass
        return date.today().replace(day=1)

    @staticmethod
    def _days_in_month(month_start: date) -> int:
        next_month = ChatEngine._add_months(month_start, 1)
        return (next_month - month_start).days

    @staticmethod
    def _add_months(value: date, months: int) -> date:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        return date(year, month, 1)

    @staticmethod
    def _previous_rebook_month_start(month_start: date) -> Optional[str]:
        current_month = date.today().replace(day=1)
        if month_start <= current_month:
            return None
        return ChatEngine._add_months(month_start, -1).isoformat()

    async def _handle_rebook_date_selection(
        self,
        session,
        booking_id: str,
        booking_date_str: str,
        db: AsyncSession,
    ) -> ChatResponse:
        telemetry_service.record_step(
            "rebook.date.selected",
            session_id=str(session.id),
            booking_id=booking_id,
            booking_date=booking_date_str,
        )
        ctx = await self._get_context(session.id, db)
        external_summary = self._context_booking_summary(ctx, booking_id)
        if not external_summary and ctx.get("rebook_source_booking_id") == booking_id:
            try:
                parsed = json.loads(ctx.get("rebook_source_summary") or "{}")
                external_summary = parsed if isinstance(parsed, dict) else None
            except ValueError:
                external_summary = None
        if not external_summary:
            resp = await self._build_my_bookings(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="Booking not found for rebooking."))
            return resp

        date_error_resp = await self._build_invalid_booking_date_response(session, booking_date_str, db)
        if date_error_resp:
            return date_error_resp
        existing_booking = await self._external_booking_for_date(booking_date_str)
        if existing_booking and self._is_current_or_ongoing_booking(existing_booking):
            session.current_menu_id = None
            await self._update_node(session, Node.MAIN_MENU, "NAVIGATING", db)
            resp = await self._go_to_main_menu(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.ERROR,
                text=self._current_booking_action_blocked_message("modify", existing_booking),
            ))
            return resp

        site_id = self._safe_int(external_summary.get("site_id"))
        building_id = self._safe_int(external_summary.get("building_id"))
        floor_id = self._safe_int(external_summary.get("floor_id"))
        seat_id = self._safe_int(external_summary.get("seat_id"))
        if not (site_id and building_id and floor_id and seat_id):
            resp = await self._build_my_bookings(session, db)
            resp.messages.insert(0, BotMessage(type=MessageType.ERROR, text="I could not reuse the original booking details. Please use Book a seat."))
            return resp

        profile = await self._get_default_booking_profile(session.user_name, db)
        favorite_ids = [str(value) for value in (profile or {}).get("favorite_seat_ids", [])]
        previous_ids = [str(value) for value in (profile or {}).get("previous_seat_ids", [])]
        if str(seat_id) not in previous_ids:
            previous_ids.insert(0, str(seat_id))

        await self._set_context_bulk(session.id, {
            "booking_date": booking_date_str,
            "site_id": str(site_id),
            "building_id": str(building_id),
            "floor_id": str(floor_id),
            "site_name": str(external_summary.get("site_name") or ""),
            "building_name": str(external_summary.get("building_name") or ""),
            "floor_name": str(external_summary.get("floor_name") or ""),
            "favorite_seat_ids": ",".join(favorite_ids),
            "previous_seat_ids": ",".join(previous_ids),
            "last_seat_id": str(seat_id),
            "seat_type": "STANDARD",
            "headcount": "1",
            "amenity_ids": "",
            "selected_seat_ids": "",
            "seat_id": "",
            "booking_prefill_source": "previous_booking",
            "quick_book_source_booking_id": booking_id,
            "quick_book_source_booking_date": str(external_summary.get("booking_date") or ""),
            "quick_book_mode": "true",
            "rebook_modify_booking_id": str(existing_booking.get("booking_id") or "") if existing_booking else "",
        }, db)

        seats = await seat_backend_api_service.available_seats(
            floor_id=floor_id,
            booking_date=booking_date_str,
            amenity_ids=[],
            modify_booking_id=str(existing_booking.get("booking_id") or "") if existing_booking else None,
        )
        original_seat = next(
            (
                seat for seat in (seats or [])
                if self._safe_int(seat.get("seat_id")) == seat_id
                and self._is_backend_seat_available(seat, booking_date_str)
            ),
            None,
        )
        if original_seat:
            telemetry_service.record_step(
                "rebook.same_seat.available",
                session_id=str(session.id),
                booking_id=booking_id,
                modify_booking_id=str(existing_booking.get("booking_id") or "") if existing_booking else "",
                booking_date=booking_date_str,
                seat_id=seat_id,
            )
            selected_code = original_seat.get("seat_code") or original_seat.get("code") or str(seat_id)
            await self._set_context_bulk(session.id, {
                "selected_seat_ids": str(seat_id),
                "seat_id": str(seat_id),
                "available_seats_map": f"1:{seat_id}",
                "available_seat_codes": f"{seat_id}:{selected_code}",
                "external_booking_source": "seat_backend_api",
            }, db)
            await self._update_node(session, Node.CONFIRM, "CONFIRMING", db)
            resp = await self._build_confirmation(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.TEXT,
                text=(
                    f"You already have a booking on **{booking_date_str}**. "
                    f"Your previous seat **{selected_code}** is available, so I selected it to update that booking."
                    if existing_booking
                    else f"Your previous seat **{selected_code}** is available on **{booking_date_str}**, so I selected it for rebooking."
                ),
            ))
            return resp

        telemetry_service.record_step(
            "rebook.same_seat.unavailable",
            session_id=str(session.id),
            booking_id=booking_id,
            modify_booking_id=str(existing_booking.get("booking_id") or "") if existing_booking else "",
            booking_date=booking_date_str,
            seat_id=seat_id,
        )
        return await self._continue_to_available_seats(
            session,
            db,
            "That previous seat is unavailable for the selected date. I checked your preferred seats and available alternatives.",
        )

    async def _external_booking_summary_by_id(self, booking_id: str) -> Optional[Dict[str, str]]:
        rows: list[Dict[str, Any]] = []
        for loader in (seat_backend_api_service.my_future_bookings, seat_backend_api_service.my_past_bookings):
            result = await loader(page=1, limit=100)
            if result:
                result_rows, _has_more = result
                rows.extend(result_rows)
        row = next((item for item in rows if str(item.get("booking_id")) == str(booking_id)), None)
        if not row:
            return None
        return {
            "booking_ref": str(row.get("booking_id") or booking_id),
            "booking_date": str(row.get("booking_date") or ""),
            "site_id": str(row.get("site_id") or ""),
            "building_id": str(row.get("building_id") or ""),
            "floor_id": str(row.get("floor_id") or ""),
            "seat_id": str(row.get("seat_id") or ""),
            "seat_code": str(row.get("seat_code") or ""),
            "site_name": str(row.get("site_name") or ""),
            "building_name": str(row.get("building_name") or ""),
            "floor_name": str(row.get("floor_name") or ""),
            "status": str(row.get("booking_status") or row.get("status") or ""),
        }

    async def _inline_cancel_booking(self, session, booking_id: str, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        external_summary = self._context_booking_summary(ctx, booking_id)
        if external_summary:
            if self._is_current_or_ongoing_booking(external_summary):
                await self._set_context_bulk(session.id, {"booking_action": "", "booking_list_ids": ""}, db)
                resp = await self._go_to_main_menu(session, db)
                resp.messages.insert(0, BotMessage(
                    type=MessageType.ERROR,
                    text=self._current_booking_action_blocked_message("cancel", external_summary),
                ))
                return resp

            cancelled = await seat_backend_api_service.cancel_booking(booking_id)
            await self._set_context_bulk(session.id, {"booking_action": "", "booking_list_ids": ""}, db)
            resp = await self._build_my_bookings(session, db)
            if cancelled:
                resp.messages.insert(0, BotMessage(
                    type=MessageType.TEXT,
                    text=f"✅ Booking **{external_summary.get('booking_ref') or booking_id}** has been cancelled."
                ))
            else:
                resp.messages.insert(0, BotMessage(
                    type=MessageType.ERROR,
                    text="I could not cancel that booking in the seat management backend. Please try again."
                ))
            return resp

        resp = await self._build_my_bookings(session, db)
        resp.messages.insert(0, BotMessage(
            type=MessageType.ERROR, text="Booking not found or already cancelled."
        ))
        return resp

    async def _inline_modify_booking(self, session, booking_id: str, db: AsyncSession) -> ChatResponse:
        ctx = await self._get_context(session.id, db)
        external_summary = self._context_booking_summary(ctx, booking_id)
        if external_summary:
            if self._is_current_or_ongoing_booking(external_summary):
                await self._set_context_bulk(session.id, {"booking_action": "", "booking_list_ids": ""}, db)
                resp = await self._go_to_main_menu(session, db)
                resp.messages.insert(0, BotMessage(
                    type=MessageType.ERROR,
                    text=self._current_booking_action_blocked_message("modify", external_summary),
                ))
                return resp

            cancelled = await seat_backend_api_service.cancel_booking(booking_id, reason="Modified from chatbot")
            if not cancelled:
                resp = await self._build_my_bookings(session, db)
                resp.messages.insert(0, BotMessage(
                    type=MessageType.ERROR,
                    text="I could not start modification for that booking in the seat management backend. Please try again.",
                ))
                return resp
            await self._set_context_bulk(session.id, {
                "booking_action": "",
                "booking_list_ids": "",
                "booking_date": external_summary.get("booking_date") or "",
                "site_id": external_summary.get("site_id") or "",
                "building_id": external_summary.get("building_id") or "",
                "floor_id": external_summary.get("floor_id") or "",
                "site_name": external_summary.get("site_name") or "",
                "building_name": external_summary.get("building_name") or "",
                "floor_name": external_summary.get("floor_name") or "",
                "seat_type": "STANDARD",
                "headcount": "1",
                "amenity_ids": "",
                "selected_seat_ids": "",
                "external_booking_source": "seat_backend_api",
            }, db)
            await self._update_node(session, Node.BOOK_WHEN_WHERE, "BOOKING_WHEN_WHERE", db)
            resp = await self._build_when_where_card(session, db)
            resp.messages.insert(0, BotMessage(
                type=MessageType.TEXT,
                text=f"Booking **{external_summary.get('booking_ref') or booking_id}** cancelled. Let's rebook with updated details:"
            ))
            return resp

        resp = await self._build_my_bookings(session, db)
        resp.messages.insert(0, BotMessage(
            type=MessageType.ERROR, text="Booking not found or already cancelled."
        ))
        return resp

    # ── UTILITIES ──────────────────────────────────────────────────────────────
    async def _go_to_main_menu(self, session, db: AsyncSession) -> ChatResponse:
        session.current_menu_id = None
        await self._update_node(session, Node.MAIN_MENU, "NAVIGATING", db)
        return await self._build_dynamic_menu(session, None, "", db)

    async def _abandon(self, session, db: AsyncSession) -> ChatResponse:
        session.current_menu_id = None
        await self._update_node(session, Node.MAIN_MENU, "ABANDONED", db)
        return ChatResponse(
            session_id=str(session.id),
            current_node=Node.MAIN_MENU,
            state="ABANDONED",
            messages=[BotMessage(type=MessageType.TEXT, text="Goodbye! See you next time.")]
        )

    async def _update_node(self, session: ChatbotSession, node: str, state: str, db: AsyncSession):
        session.current_node = node
        session.state = state
        session.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(session)
        await memory_service.set_session_state(
            session.id,
            state=session.state,
            current_node=session.current_node,
            current_menu_id=session.current_menu_id,
        )

    async def _get_context(self, session_id, db: AsyncSession) -> Dict[str, str]:
        cached = await memory_service.get_context(session_id)
        if cached is not None:
            return cached
        result = await db.execute(select(ChatbotSession).where(ChatbotSession.id == session_id))
        session = result.scalar_one_or_none()
        context = dict(session.context_data or {}) if session else {}
        await memory_service.set_context(session_id, context)
        return context

    async def _set_context_bulk(self, session_id, kv: Dict[str, str], db: AsyncSession):
        result = await db.execute(select(ChatbotSession).where(ChatbotSession.id == session_id))
        session = result.scalar_one_or_none()
        if session is None:
            return
        context = dict(session.context_data or {})
        context.update(kv)
        session.context_data = context
        session.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await memory_service.merge_context(session_id, kv)

    @staticmethod
    def _parse_number(text: Optional[str]) -> Optional[int]:
        if not text:
            return None
        try:
            return int(text.strip())
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def _safe_int(value) -> Optional[int]:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None


# Singleton
chat_engine = ChatEngine()
