import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.config import settings
from app.routers import whatsapp as whatsapp_router
from app.schemas.chat import (
    BookingCard,
    BookingListData,
    BotMessage,
    ChatResponse,
    FormCard,
    FormField,
    MessageType,
    QuickBookCard,
)
from app.services.whatsapp_interaction_service import WhatsAppInteractionService
from app.services.whatsapp_message_store import WhatsAppMessageStore
from app.services.whatsapp_session_service import WhatsAppSessionService
from app.services.whatsapp_service import WhatsAppService
from app.services.user_identity_service import UserIdentityService


class WhatsAppWebhookVerificationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_token = settings.WHATSAPP_VERIFY_TOKEN
        self.original_enabled = settings.WHATSAPP_ENABLED
        settings.WHATSAPP_ENABLED = True
        settings.WHATSAPP_VERIFY_TOKEN = "efacility_chatbot_verify"

    async def asyncTearDown(self):
        settings.WHATSAPP_VERIFY_TOKEN = self.original_token
        settings.WHATSAPP_ENABLED = self.original_enabled

    async def test_get_webhook_verification_success(self):
        response = await whatsapp_router.verify_webhook(
            hub_mode="subscribe",
            hub_verify_token="efacility_chatbot_verify",
            hub_challenge="challenge-123",
        )

        self.assertEqual(response.body.decode(), "challenge-123")

    async def test_get_webhook_verification_failure(self):
        with self.assertRaises(HTTPException) as ctx:
            await whatsapp_router.verify_webhook(
                hub_mode="subscribe",
                hub_verify_token="bad-token",
                hub_challenge="challenge-123",
            )

        self.assertEqual(ctx.exception.status_code, 403)


class WhatsAppWebhookPayloadTests(unittest.IsolatedAsyncioTestCase):
    async def test_post_ignores_status_only_payload(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "statuses": [{"id": "wamid.1", "status": "delivered"}],
                            }
                        }
                    ]
                }
            ]
        }

        result = await whatsapp_router.handle_webhook_payload(payload, db=object())

        self.assertEqual(result["status"], "ignored")

    async def test_post_handles_text_message_payload(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "919999999999",
                                        "type": "text",
                                        "text": {"body": "book seat tomorrow"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        fake_session_service = SimpleNamespace(get_or_create_session_id=AsyncMock(return_value="session-1"))
        fake_chat_adapter = SimpleNamespace(
            process_message=AsyncMock(
                return_value=ChatResponse(
                    session_id="session-1",
                    current_node="MAIN_MENU",
                    state="NAVIGATING",
                    messages=[BotMessage(type=MessageType.TEXT, text="Bot reply")],
                )
            )
        )
        fake_whatsapp_service = SimpleNamespace(
            extract_text_message=WhatsAppService().extract_text_message,
            render_response_text=lambda response: "Bot reply",
            send_response=AsyncMock(return_value={"status_code": 200}),
            send_text=AsyncMock(return_value={"status_code": 200}),
        )
        fake_interaction_service = SimpleNamespace(
            handle_incoming=AsyncMock(return_value=None),
            deliver_response=AsyncMock(return_value={"status_code": 200}),
        )
        fake_message_store = SimpleNamespace(
            record_incoming_once=AsyncMock(return_value=True),
            record_outgoing=AsyncMock(),
        )

        db = object()
        fake_identity_service = SimpleNamespace(resolve_whatsapp_user_async=AsyncMock(return_value=SimpleNamespace(
            user_id="38", tenant_id="3", user_name="Test User", phone_key="919999999999", matched=True,
        )))
        with patch.object(whatsapp_router, "whatsapp_session_service", fake_session_service), \
             patch.object(whatsapp_router, "chat_adapter_service", fake_chat_adapter), \
             patch.object(whatsapp_router, "whatsapp_interaction_service", fake_interaction_service), \
             patch.object(whatsapp_router, "whatsapp_service", fake_whatsapp_service), \
             patch.object(whatsapp_router, "whatsapp_message_store", fake_message_store), \
             patch.object(whatsapp_router, "user_identity_service", fake_identity_service):
            result = await whatsapp_router.handle_webhook_payload(payload, db=db)

        self.assertEqual(result["status"], "ok")
        self.assertEqual(fake_session_service.get_or_create_session_id.await_args.args[:2], ("919999999999", db))
        fake_interaction_service.deliver_response.assert_awaited_once()

    async def test_post_ignores_duplicate_message_id(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "919999999999",
                                        "id": "wamid.duplicate",
                                        "type": "text",
                                        "text": {"body": "hi"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        fake_message_store = SimpleNamespace(
            record_incoming_once=AsyncMock(return_value=False),
            record_outgoing=AsyncMock(),
        )
        fake_session_service = SimpleNamespace(get_or_create_session_id=AsyncMock(return_value="session-1"))

        with patch.object(whatsapp_router, "whatsapp_message_store", fake_message_store), \
             patch.object(whatsapp_router, "whatsapp_session_service", fake_session_service):
            result = await whatsapp_router.handle_webhook_payload(payload, db=object())

        self.assertEqual(result["status"], "duplicate_ignored")
        fake_session_service.get_or_create_session_id.assert_not_awaited()

    async def test_post_text_message_sends_rendered_response(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "919999999999",
                                        "text": {"body": "hi"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        db = object()
        fake_session_service = SimpleNamespace(get_or_create_session_id=AsyncMock(return_value="session-1"))
        fake_chat_adapter = SimpleNamespace(
            process_message=AsyncMock(
                return_value=ChatResponse(
                    session_id="session-1",
                    current_node="MAIN_MENU",
                    state="NAVIGATING",
                    messages=[BotMessage(type=MessageType.TEXT, text="Hello from eFACiLiTY")],
                )
            )
        )
        fake_whatsapp_service = SimpleNamespace(
            extract_text_message=WhatsAppService().extract_text_message,
            render_response_text=lambda response: "Hello from eFACiLiTY",
            send_response=AsyncMock(return_value={"status_code": 200}),
            send_text=AsyncMock(return_value={"status_code": 200}),
        )
        fake_interaction_service = SimpleNamespace(
            handle_incoming=AsyncMock(return_value=None),
            deliver_response=AsyncMock(return_value={"status_code": 200}),
        )
        fake_message_store = SimpleNamespace(
            record_incoming_once=AsyncMock(return_value=True),
            record_outgoing=AsyncMock(),
        )

        fake_identity_service = SimpleNamespace(resolve_whatsapp_user_async=AsyncMock(return_value=SimpleNamespace(
            user_id="38", tenant_id="3", user_name="Test User", phone_key="919999999999", matched=True,
        )))
        with patch.object(whatsapp_router, "whatsapp_session_service", fake_session_service), \
             patch.object(whatsapp_router, "chat_adapter_service", fake_chat_adapter), \
             patch.object(whatsapp_router, "whatsapp_interaction_service", fake_interaction_service), \
             patch.object(whatsapp_router, "whatsapp_service", fake_whatsapp_service), \
             patch.object(whatsapp_router, "whatsapp_message_store", fake_message_store), \
             patch.object(whatsapp_router, "user_identity_service", fake_identity_service):
            await whatsapp_router.handle_webhook_payload(payload, db=db)

        fake_chat_adapter.process_message.assert_awaited_once()
        fake_interaction_service.deliver_response.assert_awaited_once()

    def test_extracts_interactive_button_reply(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "919999999999",
                                        "type": "interactive",
                                        "interactive": {
                                            "type": "button_reply",
                                            "button_reply": {"id": "1", "title": "Quick Book"},
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        self.assertEqual(WhatsAppService().extract_text_message(payload), ("919999999999", "1"))

    def test_extracts_flow_reply(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "919999999999",
                                        "type": "interactive",
                                        "interactive": {
                                            "type": "nfm_reply",
                                            "nfm_reply": {
                                                "response_json": "{\"booking_date\":\"2026-07-20\"}",
                                            },
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        wa_id, text = WhatsAppService().extract_text_message(payload)

        self.assertEqual(wa_id, "919999999999")
        self.assertEqual(text, 'wa:flow:{"booking_date":"2026-07-20"}')


class WhatsAppInteractionRenderingTests(unittest.IsolatedAsyncioTestCase):
    async def test_form_card_starts_with_native_list_for_date(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        response = ChatResponse(
            session_id="session-1",
            current_node="BOOK_WHEN_WHERE",
            state="BOOKING_WHEN_WHERE",
            messages=[
                BotMessage(
                    type=MessageType.FORM_CARD,
                    form_card=FormCard(
                        title="When & Where",
                        node="BOOK_WHEN_WHERE",
                        fields=[
                            FormField(
                                key="booking_date",
                                label="Booking date",
                                field_type="date",
                                required=True,
                            )
                        ],
                    ),
                )
            ],
        )
        fake_whatsapp_service = SimpleNamespace(
            send_list=AsyncMock(return_value={"status_code": 200}),
        )

        with patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            await service.deliver_response(
                wa_id="919999999999",
                session_id="session-1",
                response=response,
                db=object(),
            )

        fake_whatsapp_service.send_list.assert_awaited_once()
        args = fake_whatsapp_service.send_list.await_args.args
        self.assertEqual(args[1], "Choose booking date.")
        self.assertNotIn("When & Where", args[1])
        self.assertNotIn("Step", args[1])
        self.assertEqual(args[3][-1]["id"], "wa:menu")

    async def test_static_form_card_uses_whatsapp_flow_when_configured(self):
        original_use_flows = settings.WHATSAPP_USE_FLOWS
        original_flow_id = settings.WHATSAPP_BOOKING_FLOW_ID
        settings.WHATSAPP_USE_FLOWS = True
        settings.WHATSAPP_BOOKING_FLOW_ID = "flow-123"
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        response = ChatResponse(
            session_id="session-1",
            current_node="QUICK_BOOK_DATE",
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.FORM_CARD,
                    form_card=FormCard(
                        title="Quick Book - Select Date",
                        node="QUICK_BOOK_DATE",
                        fields=[
                            FormField(
                                key="booking_date",
                                label="Booking date",
                                field_type="date",
                                required=True,
                            )
                        ],
                    ),
                )
            ],
        )
        fake_whatsapp_service = SimpleNamespace(
            send_flow=AsyncMock(return_value={"status_code": 200}),
        )

        try:
            with patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
                await service.deliver_response(
                    wa_id="919999999999",
                    session_id="session-1",
                    response=response,
                    db=object(),
                )
        finally:
            settings.WHATSAPP_USE_FLOWS = original_use_flows
            settings.WHATSAPP_BOOKING_FLOW_ID = original_flow_id

        fake_whatsapp_service.send_flow.assert_awaited_once()
        kwargs = fake_whatsapp_service.send_flow.await_args.kwargs
        self.assertEqual(kwargs["flow_id"], "flow-123")
        self.assertEqual(kwargs["flow_token"], "session-1")

    async def test_dynamic_location_form_uses_native_lists_even_when_flows_configured(self):
        original_use_flows = settings.WHATSAPP_USE_FLOWS
        original_flow_id = settings.WHATSAPP_BOOKING_FLOW_ID
        settings.WHATSAPP_USE_FLOWS = True
        settings.WHATSAPP_BOOKING_FLOW_ID = "flow-123"
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        response = ChatResponse(
            session_id="session-1",
            current_node="BOOK_WHEN_WHERE",
            state="BOOKING_WHEN_WHERE",
            messages=[
                BotMessage(
                    type=MessageType.FORM_CARD,
                    form_card=FormCard(
                        title="When & Where",
                        node="BOOK_WHEN_WHERE",
                        fields=[
                            FormField(
                                key="site_id",
                                label="Office / Site",
                                field_type="dropdown_dynamic",
                                lookup_endpoint="/api/chat/lookup/sites",
                                required=True,
                            )
                        ],
                    ),
                )
            ],
        )
        fake_whatsapp_service = SimpleNamespace(
            send_flow=AsyncMock(return_value={"status_code": 200}),
            send_list=AsyncMock(return_value={"status_code": 200}),
        )

        try:
            with patch.object(
                service,
                "_lookup_dynamic_options",
                AsyncMock(return_value=[{"value": "8", "label": "Hyderabad Begumpet Office"}]),
            ), patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
                await service.deliver_response(
                    wa_id="919999999999",
                    session_id="session-1",
                    response=response,
                    db=object(),
                )
        finally:
            settings.WHATSAPP_USE_FLOWS = original_use_flows
            settings.WHATSAPP_BOOKING_FLOW_ID = original_flow_id

        fake_whatsapp_service.send_flow.assert_not_awaited()
        fake_whatsapp_service.send_list.assert_awaited_once()

    async def test_stale_state_does_not_swallow_quick_book_button_payload(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {"fields": [{"key": "site_id", "label": "Office", "field_type": "dropdown_dynamic"}]},
                "values": {},
                "field_index": 0,
            },
        )

        result = await service.handle_incoming(
            wa_id="919999999999",
            text="default_location",
            session_id="session-1",
            db=object(),
        )

        self.assertIsNone(result)
        self.assertIsNone(await service._get_state("919999999999"))

    async def test_date_title_reply_submits_active_quick_book_date_field(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {
                    "title": "Quick Book - Select Date",
                    "node": "QUICK_BOOK_DATE",
                    "fields": [
                        {
                            "key": "booking_date",
                            "label": "Booking date",
                            "field_type": "date",
                            "required": True,
                        }
                    ],
                },
                "values": {},
                "field_index": 0,
            },
        )
        fake_chat_adapter = SimpleNamespace(
            process_message=AsyncMock(
                return_value=ChatResponse(
                    session_id="session-1",
                    current_node="AVAILABLE_SEATS",
                    state="SELECTING_SEAT",
                    messages=[BotMessage(type=MessageType.TEXT, text="Found seats")],
                )
            )
        )
        fake_whatsapp_service = SimpleNamespace(
            send_response=AsyncMock(return_value={"status_code": 200}),
        )

        with patch("app.services.whatsapp_interaction_service.chat_adapter_service", fake_chat_adapter), \
             patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            result = await service.handle_incoming(
                wa_id="919999999999",
                text="Today",
                session_id="session-1",
                db=object(),
            )

        self.assertEqual(result["status_code"], 200)
        submitted_message = fake_chat_adapter.process_message.await_args.args[1]
        self.assertIn("booking_date", submitted_message.form_data)
        self.assertIsNone(await service._get_state("919999999999"))

    async def test_full_when_where_visible_labels_keep_initial_date(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {
                    "title": "When & Where",
                    "node": "BOOK_WHEN_WHERE",
                    "fields": [
                        {
                            "key": "booking_date",
                            "label": "Booking date",
                            "field_type": "date",
                            "required": True,
                        },
                        {
                            "key": "site_id",
                            "label": "Office / Site",
                            "field_type": "dropdown_dynamic",
                            "lookup_endpoint": "/api/chat/lookup/sites",
                            "required": True,
                        },
                        {
                            "key": "building_id",
                            "label": "Building",
                            "field_type": "dropdown_dynamic",
                            "lookup_endpoint": "/api/chat/lookup/buildings",
                            "required": True,
                        },
                        {
                            "key": "floor_id",
                            "label": "Floor",
                            "field_type": "dropdown_dynamic",
                            "lookup_endpoint": "/api/chat/lookup/floors",
                            "required": True,
                        },
                    ],
                },
                "values": {},
                "field_index": 0,
            },
        )

        async def lookup(field, state, db):
            if field.key == "site_id":
                return [{"value": "8", "label": "Hyderabad Begumpet Office"}]
            if field.key == "building_id":
                return [{"value": "15", "label": "Roxana Towers"}]
            if field.key == "floor_id":
                return [{"value": "38", "label": "8th Floor"}]
            return []

        fake_chat_adapter = SimpleNamespace(
            process_message=AsyncMock(
                return_value=ChatResponse(
                    session_id="session-1",
                    current_node="AVAILABLE_SEATS",
                    state="SELECTING_SEAT",
                    messages=[BotMessage(type=MessageType.TEXT, text="Found seats")],
                )
            )
        )
        fake_whatsapp_service = SimpleNamespace(
            send_list=AsyncMock(return_value={"status_code": 200}),
            send_response=AsyncMock(return_value={"status_code": 200}),
        )

        with patch.object(service, "_lookup_dynamic_options", AsyncMock(side_effect=lookup)), \
             patch("app.services.whatsapp_interaction_service.chat_adapter_service", fake_chat_adapter), \
             patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            await service.handle_incoming(
                wa_id="919999999999",
                text="Today",
                session_id="session-1",
                db=object(),
            )
            await service.handle_incoming(
                wa_id="919999999999",
                text="Hyderabad Begumpet Office",
                session_id="session-1",
                db=object(),
            )
            await service.handle_incoming(
                wa_id="919999999999",
                text="Roxana Towers",
                session_id="session-1",
                db=object(),
            )
            result = await service.handle_incoming(
                wa_id="919999999999",
                text="8th Floor",
                session_id="session-1",
                db=object(),
            )

        self.assertEqual(result["status_code"], 200)
        submitted_message = fake_chat_adapter.process_message.await_args.args[1]
        self.assertIn("booking_date", submitted_message.form_data)
        self.assertEqual(submitted_message.form_data["site_id"], "8")
        self.assertEqual(submitted_message.form_data["building_id"], "15")
        self.assertEqual(submitted_message.form_data["floor_id"], "38")
        self.assertIsNone(await service._get_state("919999999999"))

    async def test_quick_book_response_sends_default_location_buttons(self):
        service = WhatsAppService()
        response = ChatResponse(
            session_id="session-1",
            current_node="QUICK_BOOK",
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.QUICK_BOOK,
                    quick_book=QuickBookCard(
                        prompt="I can start with your default location.",
                        last_seat_code="Select during booking",
                        last_site="Hyderabad Begumpet Office",
                        last_building="Roxana Towers",
                        last_floor="8th Floor",
                        last_seat_type="Standard Desk",
                    ),
                )
            ],
        )

        with patch.object(service, "send_buttons", AsyncMock(return_value={"status_code": 200})) as send_buttons:
            await service.send_response("919999999999", response)

        body = send_buttons.await_args.args[1]
        self.assertIn("I can start with your default location.", body)
        self.assertIn("Seat: Select during booking", body)
        self.assertIn("Office: Hyderabad Begumpet Office", body)
        self.assertIn("Building: Roxana Towers", body)
        self.assertIn("Floor: 8th Floor", body)
        self.assertIn("Choose a button below.", body)
        options = send_buttons.await_args.args[2]
        self.assertEqual([option.value for option in options], ["default_location", "select_location"])

    async def test_flow_reply_submits_form_data(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "flow_form",
                "session_id": "session-1",
                "card": {
                    "title": "When & Where",
                    "node": "BOOK_WHEN_WHERE",
                    "fields": [
                        {"key": "booking_date", "label": "Booking date", "field_type": "date", "required": True},
                    ],
                },
                "values": {},
                "field_index": 0,
            },
        )
        fake_chat_adapter = SimpleNamespace(
            process_message=AsyncMock(
                return_value=ChatResponse(
                    session_id="session-1",
                    current_node="BOOK_DETAILS",
                    state="BOOKING_DETAILS",
                    messages=[BotMessage(type=MessageType.TEXT, text="Next")],
                )
            )
        )
        fake_whatsapp_service = SimpleNamespace(
            send_response=AsyncMock(return_value={"status_code": 200}),
        )

        with patch("app.services.whatsapp_interaction_service.chat_adapter_service", fake_chat_adapter), \
             patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            result = await service.handle_incoming(
                wa_id="919999999999",
                text='wa:flow:{"booking_date":"2026-07-20","ignored":"x"}',
                session_id="session-1",
                db=object(),
            )

        self.assertEqual(result["status_code"], 200)
        submitted_message = fake_chat_adapter.process_message.await_args.args[1]
        self.assertEqual(submitted_message.form_data, {"booking_date": "2026-07-20"})

    async def test_dynamic_list_limits_rows_and_keeps_main_menu(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {
                    "title": "When & Where",
                    "fields": [
                        {
                            "key": "site_id",
                            "label": "Office",
                            "field_type": "dropdown_dynamic",
                            "lookup_endpoint": "/api/sites",
                            "required": True,
                        }
                    ],
                },
                "values": {},
                "field_index": 0,
            },
        )
        options = [{"value": str(index), "label": f"Office {index}"} for index in range(12)]
        fake_whatsapp_service = SimpleNamespace(
            send_list=AsyncMock(return_value={"status_code": 200}),
        )

        with patch.object(service, "_lookup_dynamic_options", AsyncMock(return_value=options)), \
             patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            await service._send_current_form_field("919999999999", db=object())

        args = fake_whatsapp_service.send_list.await_args.args
        self.assertEqual(len(args[3]), 10)
        self.assertEqual(args[3][-1]["id"], "wa:menu")
        self.assertIn("Showing first 9 options", args[1])

    async def test_building_list_uses_description_for_full_name(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {
                    "title": "When & Where",
                    "node": "BOOK_WHEN_WHERE",
                    "fields": [
                        {
                            "key": "building_id",
                            "label": "Building",
                            "field_type": "dropdown_dynamic",
                            "lookup_endpoint": "/api/chat/lookup/buildings",
                            "required": True,
                        }
                    ],
                },
                "values": {"site_id": "8"},
                "field_index": 0,
            },
        )
        long_name = "Sudirman Center 56A-B Main Corporate Tower"
        fake_whatsapp_service = SimpleNamespace(
            send_list=AsyncMock(return_value={"status_code": 200}),
        )

        with patch.object(
            service,
            "_lookup_dynamic_options",
            AsyncMock(return_value=[{"value": "15", "label": long_name}]),
        ), patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            await service._send_current_form_field("919999999999", db=object())

        rows = fake_whatsapp_service.send_list.await_args.args[3]
        self.assertEqual(rows[0]["title"], "1. Building")
        self.assertEqual(rows[0]["description"], long_name)
        self.assertLessEqual(len(rows[0]["title"]), 24)

    async def test_amenities_prompt_accepts_multiple_numbers_at_once(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {
                    "title": "Booking Details",
                    "node": "BOOK_DETAILS",
                    "fields": [
                        {
                            "key": "amenity_ids",
                            "label": "Preferred amenities (optional)",
                            "field_type": "checkbox_group",
                            "required": False,
                            "options": [
                                {"value": "10", "label": "Dual Monitor"},
                                {"value": "20", "label": "Near Elevator"},
                                {"value": "30", "label": "Window Seat"},
                            ],
                        }
                    ],
                },
                "values": {},
                "field_index": 0,
            },
        )
        fake_whatsapp_service = SimpleNamespace(
            send_text=AsyncMock(return_value={"status_code": 200}),
            send_response=AsyncMock(return_value={"status_code": 200}),
        )
        fake_chat_adapter = SimpleNamespace(
            process_message=AsyncMock(
                return_value=ChatResponse(
                    session_id="session-1",
                    current_node="AVAILABLE_SEATS",
                    state="SELECTING_SEAT",
                    messages=[BotMessage(type=MessageType.TEXT, text="Done")],
                )
            )
        )

        with patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service), \
             patch("app.services.whatsapp_interaction_service.chat_adapter_service", fake_chat_adapter):
            await service._send_current_form_field("919999999999", db=object())
            result = await service.handle_incoming(
                wa_id="919999999999",
                text="1,3",
                session_id="session-1",
                db=object(),
            )

        self.assertEqual(result["status_code"], 200)
        first_prompt = fake_whatsapp_service.send_text.await_args_list[0].args[1]
        self.assertIn("Reply with multiple numbers separated by commas", first_prompt)
        fake_chat_adapter.process_message.assert_awaited_once()
        submitted_message = fake_chat_adapter.process_message.await_args.args[1]
        self.assertEqual(submitted_message.form_data["amenity_ids"], ["10", "30"])

    async def test_stale_interaction_does_not_swallow_menu_text(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {"fields": [{"key": "site_id", "label": "Office", "field_type": "dropdown_dynamic"}]},
                "values": {},
                "field_index": 0,
            },
        )

        result = await service.handle_incoming(
            wa_id="919999999999",
            text="Menu",
            session_id="session-1",
            db=object(),
        )

        self.assertIsNone(result)
        self.assertIsNone(await service._get_state("919999999999"))

    async def test_existing_booking_is_checked_immediately_after_date(self):
        service = WhatsAppInteractionService()
        service._redis_unavailable = True
        await service._set_state(
            "919999999999",
            {
                "kind": "form",
                "session_id": "session-1",
                "card": {
                    "title": "When & Where",
                    "node": "BOOK_WHEN_WHERE",
                    "fields": [
                        {
                            "key": "booking_date",
                            "label": "Booking date",
                            "field_type": "date",
                            "required": True,
                        },
                        {
                            "key": "site_id",
                            "label": "Office / Site",
                            "field_type": "dropdown_dynamic",
                            "required": True,
                            "lookup_endpoint": "/api/chat/lookup/sites",
                        },
                    ],
                },
                "values": {},
                "field_index": 0,
            },
        )
        duplicate_response = ChatResponse(
            session_id="session-1",
            current_node="MAIN_MENU",
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.OPTIONS,
                    text="You already have a booking for this date.",
                    options=[
                        {"number": 1, "label": "Cancel existing & rebook", "value": "cancel_rebook"},
                        {"number": 0, "label": "Back to main menu", "value": "0"},
                    ],
                )
            ],
        )
        fake_whatsapp_service = SimpleNamespace(
            send_response=AsyncMock(return_value={"status_code": 200}),
        )

        with patch.object(service, "_early_duplicate_booking_response", AsyncMock(return_value=duplicate_response)) as duplicate_check, \
             patch("app.services.whatsapp_interaction_service.whatsapp_service", fake_whatsapp_service):
            result = await service.handle_incoming(
                wa_id="919999999999",
                text="wa:date:today",
                session_id="session-1",
                db=object(),
            )

        self.assertEqual(result["status_code"], 200)
        duplicate_check.assert_awaited_once()
        fake_whatsapp_service.send_response.assert_awaited_once()
        self.assertIsNone(await service._get_state("919999999999"))

    def test_booking_list_renders_as_whatsapp_friendly_cards(self):
        response = ChatResponse(
            session_id="session-1",
            current_node="MY_BOOKINGS",
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.BOOKING_LIST,
                    booking_list=BookingListData(
                        total=8,
                        bookings=[
                            BookingCard(
                                booking_id="booking-1",
                                booking_ref="BK-20260707-ABC123",
                                booking_date="2026-07-07",
                                site_name="Hyderabad Hi-Tech City Office",
                                building_name="Mindspace Building 9",
                                floor_name="5th Floor",
                                seat_code="15",
                                seat_type="Window Seat",
                                status="CONFIRMED",
                                can_modify=True,
                                can_cancel=True,
                            )
                        ],
                    ),
                )
            ],
        )

        rendered = WhatsAppService().render_response_text(response)

        self.assertIn("Showing 1 of 8 booking(s).", rendered)
        self.assertIn("1. BK-20260707-ABC123", rendered)
        self.assertIn("Seat: 15 (Window Seat)", rendered)
        self.assertNotIn("Actions:", rendered)
        self.assertIn('reply "cancel my booking" or "modify my booking"', rendered)

    async def test_long_response_sends_text_before_buttons(self):
        service = WhatsAppService()
        response = ChatResponse(
            session_id="session-1",
            current_node="MY_BOOKINGS",
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.TEXT,
                    text="Booking details\n" + ("A" * 950),
                    options=[
                        {"number": 1, "label": "Quick Book", "value": "quick_book"},
                        {"number": 0, "label": "Main menu", "value": "0"},
                    ],
                )
            ],
        )

        with patch.object(service, "send_text", AsyncMock(return_value={"status_code": 200})) as send_text, \
             patch.object(service, "send_buttons", AsyncMock(return_value={"status_code": 200})) as send_buttons:
            await service.send_response("919999999999", response)

        send_text.assert_awaited_once()
        send_buttons.assert_awaited_once()
        self.assertEqual(send_buttons.await_args.args[1], "Choose an option:")

    def test_booking_list_adds_manage_options_for_whatsapp(self):
        response = ChatResponse(
            session_id="session-1",
            current_node="MY_BOOKINGS",
            state="NAVIGATING",
            messages=[
                BotMessage(
                    type=MessageType.BOOKING_LIST,
                    booking_list=BookingListData(
                        total=1,
                        bookings=[
                            BookingCard(
                                booking_id="booking-1",
                                booking_ref="BK-20260707-ABC123",
                                booking_date="2026-07-07",
                                site_name="Hyderabad Hi-Tech City Office",
                                building_name="Mindspace Building 9",
                                floor_name="5th Floor",
                                seat_code="15",
                                seat_type="Window Seat",
                                status="CONFIRMED",
                            )
                        ],
                    ),
                ),
                BotMessage(
                    type=MessageType.OPTIONS,
                    options=[
                        {"number": 1, "label": "Quick Book", "value": "quick_book_from_bookings"},
                        {"number": 0, "label": "Main menu", "value": "0"},
                    ],
                ),
            ],
        )

        options = WhatsAppService()._response_options(response)

        self.assertEqual(options[0].label, "Cancel booking")
        self.assertEqual(options[0].value, "cancel my booking")
        self.assertEqual(options[1].label, "Modify booking")
        self.assertEqual(options[1].value, "modify my booking")


class WhatsAppSendRetryTests(unittest.IsolatedAsyncioTestCase):
    async def test_send_message_retries_transient_failure(self):
        class FakeResponse:
            def __init__(self, status_code, body):
                self.status_code = status_code
                self.text = body

            def json(self):
                return {"messages": [{"id": "wamid.out"}]}

        class FakeClient:
            def __init__(self):
                self.calls = 0

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, *args, **kwargs):
                self.calls += 1
                if self.calls == 1:
                    return FakeResponse(500, "temporary")
                return FakeResponse(200, "{\"messages\":[{\"id\":\"wamid.out\"}]}")

        original_enabled = settings.WHATSAPP_ENABLED
        original_token = settings.WHATSAPP_ACCESS_TOKEN
        original_phone = settings.WHATSAPP_PHONE_NUMBER_ID
        original_retries = settings.WHATSAPP_SEND_MAX_RETRIES
        settings.WHATSAPP_ENABLED = True
        settings.WHATSAPP_ACCESS_TOKEN = "token"
        settings.WHATSAPP_PHONE_NUMBER_ID = "phone"
        settings.WHATSAPP_SEND_MAX_RETRIES = 2
        fake_client = FakeClient()

        try:
            with patch("app.services.whatsapp_service.httpx.AsyncClient", return_value=fake_client), \
                 patch("app.services.whatsapp_service.asyncio.sleep", AsyncMock()):
                result = await WhatsAppService().send_text("919999999999", "hello")
        finally:
            settings.WHATSAPP_ENABLED = original_enabled
            settings.WHATSAPP_ACCESS_TOKEN = original_token
            settings.WHATSAPP_PHONE_NUMBER_ID = original_phone
            settings.WHATSAPP_SEND_MAX_RETRIES = original_retries

        self.assertEqual(fake_client.calls, 2)
        self.assertEqual(result["status_code"], 200)
        self.assertEqual(result["message_id"], "wamid.out")


class WhatsAppMessageStoreTests(unittest.IsolatedAsyncioTestCase):
    async def test_fallback_store_detects_duplicate(self):
        store = WhatsAppMessageStore()
        store._redis_unavailable = True
        metadata = {"message_id": "wamid.1", "wa_id": "919999999999", "message_type": "text"}

        first = await store.record_incoming_once(metadata)
        second = await store.record_incoming_once(metadata)

        self.assertTrue(first)
        self.assertFalse(second)


class WhatsAppSessionMappingTests(unittest.IsolatedAsyncioTestCase):
    async def test_session_mapping_creates_and_reuses_session(self):
        service = WhatsAppSessionService()
        service._redis_unavailable = True
        fake_created_session = SimpleNamespace(id="session-1")
        fake_existing_session = SimpleNamespace(id="session-1", user_name="Test User")
        fake_session_service = SimpleNamespace(
            create=AsyncMock(return_value=fake_created_session),
            get=AsyncMock(return_value=fake_existing_session),
        )
        fake_identity = SimpleNamespace(
            user_id="38",
            tenant_id="3",
            user_name="Test User",
            phone_key="919999999999",
            matched=True,
        )
        db = object()

        with patch("app.services.whatsapp_session_service.SessionService", fake_session_service), \
             patch(
                 "app.services.whatsapp_session_service.user_identity_service.resolve_whatsapp_user_async",
                 AsyncMock(return_value=fake_identity),
             ):
            first_session_id = await service.get_or_create_session_id("919999999999", db=db)
            second_session_id = await service.get_or_create_session_id("919999999999", db=db)

        self.assertEqual(first_session_id, "session-1")
        self.assertEqual(second_session_id, "session-1")
        fake_session_service.create.assert_awaited_once()
        fake_session_service.get.assert_awaited_once_with(
            "session-1", db, authenticated_user_id="38", authenticated_tenant_id="3"
        )

    async def test_session_mapping_uses_configured_user_for_phone(self):
        original_mappings = settings.WHATSAPP_USER_MAPPINGS
        settings.WHATSAPP_USER_MAPPINGS = "918686123214|38|3|Naga"
        service = WhatsAppSessionService()
        service._redis_unavailable = True
        fake_created_session = SimpleNamespace(id="session-1")
        fake_session_service = SimpleNamespace(
            create=AsyncMock(return_value=fake_created_session),
            get=AsyncMock(return_value=None),
        )
        fake_identity = SimpleNamespace(user_id="38", tenant_id="3", user_name="Naga", phone_key="918686123214", matched=True)

        try:
            with patch("app.services.whatsapp_session_service.SessionService", fake_session_service), \
                 patch(
                     "app.services.whatsapp_session_service.user_identity_service.resolve_whatsapp_user_async",
                     AsyncMock(return_value=fake_identity),
                 ):
                session_id = await service.get_or_create_session_id("918686123214", db=object())
        finally:
            settings.WHATSAPP_USER_MAPPINGS = original_mappings

        self.assertEqual(session_id, "session-1")
        fake_session_service.create.assert_awaited_once()
        self.assertEqual(fake_session_service.create.await_args.args[0], "Naga")

    def test_user_identity_requires_exact_normalized_number(self):
        original_mappings = settings.WHATSAPP_USER_MAPPINGS
        settings.WHATSAPP_USER_MAPPINGS = "8686123214|38|3|Naga"
        try:
            identity = UserIdentityService().resolve_whatsapp_user("918686123214")
        finally:
            settings.WHATSAPP_USER_MAPPINGS = original_mappings

        self.assertEqual(identity.user_name, "")
        self.assertFalse(identity.matched)


if __name__ == "__main__":
    unittest.main()
