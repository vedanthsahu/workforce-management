import asyncio
import unittest
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.schemas.chat import BookingListData
from app.services.booking_edit_service import BookingEditService
from app.services.chat_engine import ChatEngine
from app.services.confidence_service import ConfidenceService
from app.services.entity_extractor import EntityExtractor
from app.services.input_guard_service import InputGuardService
from app.services.intent_matcher import Intent, IntentMatcher, IntentResult, infer_booking_intent_from_entities
from app.services.menu_service import MenuService
from app.services.navigation_service import NavigationService
from app.services.text_normalizer_service import normalize_message


class IntentMatcherTests(unittest.TestCase):
    def setUp(self):
        self.matcher = IntentMatcher()

    def test_keyword_book_seat(self):
        result = self.matcher.detect_by_rules("book a seat tomorrow in Hyderabad")
        self.assertEqual(result.intent, Intent.BOOK_SEAT)
        self.assertGreaterEqual(result.confidence, 0.80)

    def test_keyword_greeting(self):
        result = self.matcher.detect_by_rules("hello")
        self.assertEqual(result.intent, Intent.GREETING)
        self.assertGreaterEqual(result.confidence, 0.80)

    def test_keyword_greeting_variant(self):
        result = self.matcher.detect_by_rules("good morning")
        self.assertEqual(result.intent, Intent.GREETING)
        self.assertGreaterEqual(result.confidence, 0.80)

    def test_document_greeting_and_help_variants(self):
        cases = {
            "Howdy": Intent.GREETING,
            "Yo": Intent.GREETING,
            "What's up": Intent.GREETING,
            "Can you help me?": Intent.GREETING,
            "Morning": Intent.GREETING,
            "Hello assistant": Intent.GREETING,
            "I need some assistance": Intent.HELP,
            "Can you do something for me?": Intent.HELP,
            "What are my options?": Intent.HELP,
            "How does this work?": Intent.HELP,
        }

        for prompt, expected in cases.items():
            with self.subTest(prompt=prompt):
                result = self.matcher.detect_by_rules(normalize_message(prompt))
                self.assertEqual(result.intent, expected)
                self.assertGreaterEqual(result.confidence, 0.80)

    def test_keyword_list_bookings(self):
        result = self.matcher.detect_by_rules("show my bookings")
        self.assertEqual(result.intent, Intent.LIST_BOOKINGS)

    def test_keyword_past_bookings(self):
        result = self.matcher.detect_by_rules("show the past bookings")
        self.assertEqual(result.intent, Intent.LIST_BOOKINGS)

    def test_keyword_cancelled_bookings_is_list_not_cancel_action(self):
        result = self.matcher.detect_by_rules("please show me cancelled bookings")
        self.assertEqual(result.intent, Intent.LIST_BOOKINGS)

    def test_keyword_future_bookings(self):
        result = self.matcher.detect_by_rules("provide me future bookings")
        self.assertEqual(result.intent, Intent.LIST_BOOKINGS)

    def test_keyword_cancel_booking(self):
        result = self.matcher.detect_by_rules("cancel my booking BK-20260625-A12BCD")
        self.assertEqual(result.intent, Intent.CANCEL_BOOKING)

    def test_cancel_booking_typo(self):
        result = self.matcher.detect_by_rules("cancel my bookig")
        self.assertEqual(result.intent, Intent.CANCEL_BOOKING)

    def test_modify_booking_typo(self):
        result = self.matcher.detect_by_rules("modify my boooking")
        self.assertEqual(result.intent, Intent.MODIFY_BOOKING)

    def test_cancel_synonym(self):
        result = self.matcher.detect_by_rules("drop my desk reservation")
        self.assertEqual(result.intent, Intent.CANCEL_BOOKING)

    def test_modify_synonym(self):
        result = self.matcher.detect_by_rules("edit my desk booking")
        self.assertEqual(result.intent, Intent.MODIFY_BOOKING)

    def test_list_synonym(self):
        result = self.matcher.detect_by_rules("look up my upcoming desk bookings")
        self.assertEqual(result.intent, Intent.LIST_BOOKINGS)

    def test_document_book_seat_without_book_variants(self):
        cases = [
            "I need somewhere to sit tomorrow.",
            "Need a workspace for Friday.",
            "Can I get somewhere to work?",
            "Need a desk.",
            "Need somewhere near my teammates.",
            "Need a seat close to the lift.",
            "I need an available place.",
            "Anything free tomorrow?",
            "Any empty seats?",
            "Any cabins available?",
            "Can you sort something out?",
            "I don't think home will work tomorrow.",
            "Can you help me with tomorrow?",
            "Can you arrange a workspace for Friday?",
            "Please save a desk for me tomorrow.",
            "Find me a place to sit next Monday.",
        ]

        for prompt in cases:
            with self.subTest(prompt=prompt):
                result = self.matcher.detect_by_rules(normalize_message(prompt))
                self.assertEqual(result.intent, Intent.BOOK_SEAT)

    def test_document_quick_book_variants(self):
        cases = [
            "Use my usual office.",
            "Default location.",
            "Whatever I used last week.",
            "The regular office.",
            "Use my previous office.",
            "Just make it quick.",
            "Do the normal one.",
            "Fastest option.",
            "Use my favourite location.",
            "Same building.",
            "Same office",
            "Book my preferred seat for Friday.",
            "Reuse my last desk.",
            "Favourite workspace tomorrow.",
        ]

        for prompt in cases:
            with self.subTest(prompt=prompt):
                result = self.matcher.detect_by_rules(normalize_message(prompt))
                self.assertEqual(result.intent, Intent.QUICK_BOOK)

    def test_document_list_booking_variants(self):
        cases = [
            "What do I have planned?",
            "Show my schedule.",
            "Anything arranged tomorrow?",
            "Office plans this week?",
            "Upcoming office visits.",
            "Where am I sitting tomorrow?",
            "Do I already have something?",
            "Show my office schedule.",
            "Show me where I am supposed to sit tomorrow.",
            "This month's office visits.",
            "My reservations.",
            "My workspace schedule.",
            "Office calendar.",
            "Which desk is assigned to me tomorrow?",
            "Am I booked for Friday?",
            "Show my seat for 25/07/2026.",
        ]

        for prompt in cases:
            with self.subTest(prompt=prompt):
                result = self.matcher.detect_by_rules(normalize_message(prompt))
                self.assertEqual(result.intent, Intent.LIST_BOOKINGS)

    def test_document_modify_variants_without_booking_word(self):
        cases = [
            "Friday won't work.",
            "Need another day.",
            "Move it to Monday.",
            "Shift it.",
            "Change the office.",
            "Need another location.",
            "Floor needs to change.",
            "Can I move it?",
            "Can I switch offices?",
            "Need another seat.",
            "Need another building.",
            "Wrong date.",
            "I picked the wrong office.",
            "Need to update it.",
            "Can we reschedule?",
            "My plans changed.",
            "Need to change tomorrow to Friday.",
            "I need another floor.",
            "Different location please.",
            "Actually Building B",
            "No Floor 2",
            "Friday instead",
            "Can I switch my seat?",
            "Use another floor.",
            "Pick a different desk.",
        ]

        for prompt in cases:
            with self.subTest(prompt=prompt):
                result = self.matcher.detect_by_rules(normalize_message(prompt))
                self.assertEqual(result.intent, Intent.MODIFY_BOOKING)

    def test_document_cancel_variants_without_booking_word(self):
        cases = [
            "I won't be coming.",
            "Working from home tomorrow.",
            "Don't need it anymore.",
            "I won't be in office.",
            "Not required anymore.",
            "Forget tomorrow.",
            "I won't use the seat.",
            "Remove my reservation.",
            "Delete my workspace.",
            "No office tomorrow.",
            "No longer required.",
            "Cancel the first one",
            "Skip office tomorrow.",
            "Scrap my visit.",
            "WFH tomorrow.",
        ]

        for prompt in cases:
            with self.subTest(prompt=prompt):
                result = self.matcher.detect_by_rules(normalize_message(prompt))
                self.assertEqual(result.intent, Intent.CANCEL_BOOKING)

    def test_unknown_low_confidence(self):
        result = self.matcher.detect_by_rules("random cafeteria question")
        self.assertEqual(result.intent, Intent.UNKNOWN)
        self.assertLess(result.confidence, 0.60)


class EntityExtractorTests(unittest.TestCase):
    def setUp(self):
        self.extractor = EntityExtractor()

    def test_booking_reference_extraction(self):
        ref = self.extractor._extract_booking_ref("cancel booking BK-20260625-A12BCD")
        self.assertEqual(ref, "BK-20260625-A12BCD")

    def test_tomorrow_date_extraction(self):
        extracted = self.extractor._extract_single_date("book a seat tomorrow")
        self.assertEqual(extracted, date.today() + timedelta(days=1))

    def test_plain_weekday_date_extraction(self):
        extracted = self.extractor._extract_single_date("book my preferred desk for friday")
        days_ahead = (4 - date.today().weekday()) % 7
        self.assertEqual(extracted, date.today() + timedelta(days=days_ahead or 7))

    def test_next_week_range_extraction(self):
        start, end = self.extractor._extract_date_range("show my bookings for next week")
        self.assertEqual((end - start).days, 6)

    def test_explicit_range_extraction(self):
        start, end = self.extractor._extract_date_range("show past bookings from 2026-06-01 to 2026-06-15")
        self.assertEqual(start.isoformat(), "2026-06-01")
        self.assertEqual(end.isoformat(), "2026-06-15")

    def test_specific_booking_date_extraction(self):
        extracted = self.extractor._extract_single_date("show my booking on 09-07-2026")
        self.assertEqual(extracted.isoformat(), "2026-07-09")

    def test_past_booking_mode_extraction(self):
        self.assertEqual(self.extractor._extract_booking_list_mode("show the past bookings"), "past")

    def test_cancelled_booking_mode_extraction(self):
        self.assertEqual(self.extractor._extract_booking_list_mode("show cancelled bookings"), "cancelled")
        self.assertEqual(self.extractor._extract_booking_list_mode("show canceled bookings"), "cancelled")

    def test_future_booking_mode_extraction(self):
        self.assertEqual(self.extractor._extract_booking_list_mode("provide me future bookings"), "upcoming")

    def test_headcount_extraction(self):
        self.assertEqual(self.extractor._extract_headcount("I need 2 seats with monitor"), 2)
        self.assertEqual(self.extractor._extract_headcount("for 3 people"), 3)
        self.assertEqual(self.extractor._extract_headcount("book two seats"), 2)

    def test_seat_type_extraction(self):
        self.assertEqual(self.extractor._extract_seat_type("need a cabin seat"), "CABIN")
        self.assertEqual(self.extractor._extract_seat_type("near window please"), "WINDOW")
        self.assertEqual(self.extractor._extract_seat_type("desk by the window"), "WINDOW")

    def test_hitech_site_match_ignores_generic_hyderabad_city(self):
        sites = [
            SimpleNamespace(id=5, site_code="HYD-BEG", site_name="Hyderabad Begumpet Office", city="Hyderabad city", address_line1="Begumpet"),
            SimpleNamespace(id=13, site_code="HYD-HTC", site_name="Hyderabad Hi-Tech City Office", city="Hyderabad", address_line1="Hi-Tech City"),
            SimpleNamespace(id=41, site_code="TEST-SITE-SEVER", site_name="TEST-SITE-SEVER", city="Hyderbad", address_line1=""),
        ]

        site = self.extractor._best_site_match(
            "i want a window seat on 04/07/2026 at hyderbad hitech city office floor 5",
            sites,
        )

        self.assertEqual(site.id, 13)

    def test_location_normalization_handles_hitech_and_hyderbad(self):
        self.assertEqual(
            self.extractor._normalize_location_text("Hyderbad Hi-Tech City"),
            "hyderabad hitech city",
        )

    def test_floor_number_extraction_supports_both_orders(self):
        self.assertEqual(self.extractor._extract_floor_number("5th floor"), 5)
        self.assertEqual(self.extractor._extract_floor_number("floor 5"), 5)

    def test_location_score_ignores_generic_office_only_match(self):
        message = self.extractor._normalize_location_text("hyderbad hitech city office floor 5")
        self.assertLess(
            self.extractor._location_score(message, self.extractor._normalize_location_text("Indore Office")),
            82,
        )
        self.assertGreaterEqual(
            self.extractor._location_score(message, self.extractor._normalize_location_text("Hyderabad Hi-Tech City Office")),
            82,
        )

    def test_location_score_does_not_match_short_code_inside_word(self):
        message = self.extractor._normalize_location_text("i want a window seat")
        self.assertEqual(
            self.extractor._location_score(message, self.extractor._normalize_location_text("IND")),
            0,
        )


class FreeTextServiceTests(unittest.TestCase):
    def test_entity_only_booking_preference_infers_book_seat(self):
        unknown = IntentResult(intent=Intent.UNKNOWN, confidence=0.0, source="rules")
        result = infer_booking_intent_from_entities(unknown, {"seat_type": "WINDOW"})

        self.assertEqual(result.intent, Intent.BOOK_SEAT)
        self.assertGreaterEqual(result.confidence, 0.80)
        self.assertEqual(result.source, "entity_inference")

    def test_non_booking_entities_do_not_infer_book_seat(self):
        unknown = IntentResult(intent=Intent.UNKNOWN, confidence=0.0, source="rules")
        result = infer_booking_intent_from_entities(unknown, {"booking_ref": "BK-20260625-A12BCD"})

        self.assertEqual(result.intent, Intent.UNKNOWN)

    def test_date_only_entity_does_not_infer_book_seat(self):
        unknown = IntentResult(intent=Intent.UNKNOWN, confidence=0.0, source="rules")
        result = infer_booking_intent_from_entities(unknown, {"booking_date": "2026-07-01"})

        self.assertEqual(result.intent, Intent.UNKNOWN)

    def test_specific_booking_date_title_is_date_scoped(self):
        engine = ChatEngine()
        title = engine._booking_list_title(
            "upcoming",
            1,
            0,
            {"date_range_start": "2026-07-09", "date_range_end": "2026-07-09"},
        )

        self.assertEqual(title, "Booking details for 2026-07-09:")

    def test_booking_list_payload_keeps_mode_for_date_scoped_text(self):
        data = BookingListData(bookings=[], total=0, mode="past")

        self.assertEqual(data.mode, "past")

    def test_past_booking_card_can_rebook(self):
        card = ChatEngine._external_booking_card(
            {"booking_id": "10", "booking_date": "2026-07-25"},
            show_actions=False,
            can_rebook=True,
        )

        self.assertTrue(card.can_rebook)
        self.assertFalse(card.can_modify)
        self.assertFalse(card.can_cancel)

    def test_date_scoped_booking_list_defaults_to_past_for_past_date(self):
        past_date = (date.today() - timedelta(days=1)).isoformat()

        self.assertEqual(ChatEngine._default_booking_list_mode_for_date(past_date), "past")

    def test_date_scoped_booking_list_defaults_to_upcoming_for_today_or_future(self):
        today = date.today().isoformat()
        future_date = (date.today() + timedelta(days=1)).isoformat()

        self.assertEqual(ChatEngine._default_booking_list_mode_for_date(today), "upcoming")
        self.assertEqual(ChatEngine._default_booking_list_mode_for_date(future_date), "upcoming")

    def test_specific_booking_date_empty_message_is_date_scoped(self):
        message = ChatEngine._empty_booking_list_text(
            "upcoming",
            0,
            {"date_range_start": "2026-07-09", "date_range_end": "2026-07-09"},
        )

        self.assertEqual(message, "No booking found for 2026-07-09.")

    def test_booking_rows_are_sorted_by_date_ascending(self):
        rows = [
            {"booking_id": "754", "booking_date": "2052-07-23T00:00:00Z"},
            {"booking_id": "753", "booking_date": "2026-07-30"},
            {"booking_id": "752", "booking_date": "2026-07-23"},
        ]

        sorted_rows = ChatEngine._sort_external_bookings_ascending(rows)

        self.assertEqual([row["booking_id"] for row in sorted_rows], ["752", "753", "754"])

    def test_greeting_text_is_global_shortcut(self):
        self.assertTrue(ChatEngine._is_greeting_text("Hello there!"))
        self.assertTrue(ChatEngine._is_greeting_text("good morning"))
        self.assertFalse(ChatEngine._is_greeting_text("hello book a seat"))

    def test_free_text_is_interpreted_during_seat_selection(self):
        engine = ChatEngine()

        self.assertTrue(engine._should_interpret_free_text("AVAILABLE_SEATS", "i want a seat on 25-08-2026 at begumpet office", None))
        self.assertTrue(engine._should_interpret_free_text("CONFIRM", "change to begumpet office", None))

    def test_site_only_prompt_defaults_single_building_but_keeps_floor_missing(self):
        asyncio.run(self._assert_site_only_prompt_defaults_single_building_but_keeps_floor_missing())

    async def _assert_site_only_prompt_defaults_single_building_but_keeps_floor_missing(self):
        engine = ChatEngine()
        ctx = {"site_id": "8"}

        async def get_context(_session_id, _db):
            return dict(ctx)

        async def merge_context(_session_id, updates, _db):
            ctx.update(updates)

        with patch.object(engine, "_get_context", AsyncMock(side_effect=get_context)), patch.object(
            engine,
            "_set_context_bulk",
            AsyncMock(side_effect=merge_context),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_sites",
            AsyncMock(return_value=[{"site_id": 8, "site_name": "Hyderabad Begumpet Office"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_buildings",
            AsyncMock(return_value=[{"building_id": 15, "building_name": "Roxana Towers", "status": "ACTIVE"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_floors",
            AsyncMock(return_value=[{"floor_id": 38, "floor_name": "8th Floor", "status": "ACTIVE"}]),
        ):
            await engine._apply_location_defaults_from_external_backend(
                "session-1",
                {"site_id": 8},
                db=object(),
            )

        self.assertEqual(ctx["site_name"], "Hyderabad Begumpet Office")
        self.assertEqual(ctx["building_id"], "15")
        self.assertEqual(ctx["building_name"], "Roxana Towers")
        self.assertNotIn("floor_id", ctx)
        self.assertNotIn("floor_name", ctx)

    def test_site_only_prompt_keeps_building_missing_when_multiple_exist(self):
        asyncio.run(self._assert_site_only_prompt_keeps_building_missing_when_multiple_exist())

    async def test_when_where_does_not_backfill_missing_floor_from_context(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1")
        existing_context = {
            "booking_date": "2026-09-02",
            "site_id": "8",
            "building_id": "15",
            "floor_id": "38",
        }
        submitted_form = {
            "booking_date": "2026-09-02",
            "site_id": "8",
            "building_id": "15",
            "floor_id": "",
        }

        with patch.object(engine, "_get_context", AsyncMock(return_value=existing_context)), patch.object(
            engine,
            "_build_when_where_card",
            AsyncMock(return_value=ChatResponse(
                session_id="session-1",
                current_node=Node.BOOK_WHEN_WHERE,
                state="BOOKING_WHEN_WHERE",
                messages=[BotMessage(type=MessageType.FORM_CARD, form_card=None)],
            )),
        ) as build_card, patch.object(engine, "_update_node", AsyncMock()), patch.object(
            engine,
            "_build_duplicate_booking_response",
            AsyncMock(return_value=None),
        ), patch.object(engine, "_continue_to_available_seats", AsyncMock()) as continue_seats:
            response = await engine._handle_when_where(session, "", submitted_form, db=object())

        self.assertEqual(response.current_node, Node.BOOK_WHEN_WHERE)
        self.assertEqual(response.messages[0].type, MessageType.ERROR)
        self.assertIn("floor", response.messages[0].text.lower())
        build_card.assert_awaited_once()
        continue_seats.assert_not_awaited()

    async def test_when_where_requires_floor_before_finding_seats(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1")
        submitted_form = {
            "booking_date": "2026-09-02",
            "site_id": "8",
            "building_id": "15",
        }

        with patch.object(engine, "_get_context", AsyncMock(return_value={})), patch.object(
            engine,
            "_build_when_where_card",
            AsyncMock(side_effect=lambda *_args, **_kwargs: ChatResponse(
                session_id="session-1",
                current_node=Node.BOOK_WHEN_WHERE,
                state="BOOKING_WHEN_WHERE",
                messages=[],
            )),
        ), patch.object(engine, "_update_node", AsyncMock()), patch.object(
            engine,
            "_build_duplicate_booking_response",
            AsyncMock(return_value=None),
        ), patch.object(engine, "_continue_to_available_seats", AsyncMock()) as continue_seats:
            response = await engine._handle_when_where(session, "", submitted_form, db=object())

        self.assertEqual(response.current_node, Node.BOOK_WHEN_WHERE)
        self.assertEqual(response.messages[0].type, MessageType.ERROR)
        self.assertIn("floor", response.messages[0].text.lower())
        continue_seats.assert_not_awaited()

    async def _assert_site_only_prompt_keeps_building_missing_when_multiple_exist(self):
        engine = ChatEngine()
        ctx = {"site_id": "8"}

        async def get_context(_session_id, _db):
            return dict(ctx)

        async def merge_context(_session_id, updates, _db):
            ctx.update(updates)

        with patch.object(engine, "_get_context", AsyncMock(side_effect=get_context)), patch.object(
            engine,
            "_set_context_bulk",
            AsyncMock(side_effect=merge_context),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_sites",
            AsyncMock(return_value=[{"site_id": 8, "site_name": "Hyderabad Begumpet Office"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_buildings",
            AsyncMock(return_value=[
                {"building_id": 15, "building_name": "Roxana Towers", "status": "ACTIVE"},
                {"building_id": 16, "building_name": "Annex", "status": "ACTIVE"},
            ]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_floors",
            AsyncMock(return_value=[]),
        ):
            await engine._apply_location_defaults_from_external_backend(
                "session-1",
                {"site_id": 8},
                db=object(),
            )

        self.assertEqual(ctx["site_name"], "Hyderabad Begumpet Office")
        self.assertNotIn("building_id", ctx)
        self.assertNotIn("building_name", ctx)
        self.assertNotIn("floor_id", ctx)
        self.assertNotIn("floor_name", ctx)


class TextNormalizerTests(unittest.TestCase):
    def test_common_booking_typos_are_normalized(self):
        self.assertEqual(
            normalize_message("bok a seet tomorow in hyderbad hitech office flor 5"),
            "book a seat tomorrow in hyderabad hitech office floor 5",
        )
        self.assertEqual(normalize_message("bokk"), "book")
        self.assertEqual(
            normalize_message("banglore wrkspace windo moniter flooor"),
            "bangalore workspace window monitor floor",
        )
        self.assertEqual(
            normalize_message("cancell reshedule updte resrvation"),
            "cancel reschedule update reservation",
        )

    def test_quick_book_typo_is_normalized(self):
        self.assertEqual(normalize_message("quick bok"), "quick book")

    def test_unicode_text_is_normalized_before_cleanup(self):
        self.assertEqual(normalize_message("ＢＯＫ   a   seet tomorrow"), "book a seat tomorrow")


class ConfidenceServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = ConfidenceService()

    def test_booking_entities_increase_confidence_explainably(self):
        result = IntentResult(intent=Intent.BOOK_SEAT, confidence=0.82, source="entity_inference")
        reranked = self.service.rerank(
            result,
            {"booking_date": "2026-07-04", "site_id": 1, "floor_id": 2, "seat_type": "WINDOW"},
            {},
        )

        self.assertGreater(reranked.confidence, result.confidence)
        self.assertIn("confidence_breakdown", reranked.metadata)

    def test_unknown_intent_is_not_reranked(self):
        result = IntentResult(intent=Intent.UNKNOWN, confidence=0.0, source="rules")
        reranked = self.service.rerank(result, {"seat_type": "WINDOW"}, {})

        self.assertEqual(reranked, result)


class QuickBookDefaultProfileTests(unittest.IsolatedAsyncioTestCase):
    def test_default_root_menu_has_three_primary_actions(self):
        labels = [node.label for node in MenuService._default_root_menu()]
        targets = [node.target_node for node in MenuService._default_root_menu()]

        self.assertEqual(labels, ["Quick Book", "Book a seat", "My Bookings"])
        self.assertEqual(targets, ["QUICK_BOOK", "BOOK_WHEN_WHERE", "MY_BOOKINGS"])

    def test_booking_list_options_include_book_a_seat(self):
        options = ChatEngine._booking_list_options("upcoming", has_more=False)

        self.assertEqual([option.label for option in options], ["Quick Book", "Book a seat", "Main menu"])
        self.assertEqual([option.value for option in options], ["quick_book_from_bookings", "book_seat_from_bookings", "0"])

    async def test_book_a_seat_from_bookings_starts_full_booking_flow(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1")

        with patch.object(engine, "_get_context", AsyncMock(return_value={"booking_list_has_more": "false"})), patch.object(
            engine,
            "_start_book_seat_entry",
            AsyncMock(return_value="book-seat-flow"),
        ) as start_book_seat:
            response = await engine._handle_my_bookings(session, "book_seat_from_bookings", None, db=object())

        self.assertEqual(response, "book-seat-flow")
        start_book_seat.assert_awaited_once()

    async def test_generic_book_intent_resets_previous_booking_draft(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", current_node="MAIN_MENU")

        with patch.object(engine, "_reset_manual_booking_context", AsyncMock()) as reset_context, patch.object(
            engine,
            "_route_book_seat_from_entities",
            AsyncMock(return_value="when-where-card"),
        ) as route_booking:
            response = await engine._execute_free_text_intent(
                session,
                Intent.BOOK_SEAT,
                {},
                db=object(),
            )

        self.assertEqual(response, "when-where-card")
        reset_context.assert_awaited_once_with("session-1", unittest.mock.ANY)
        route_booking.assert_awaited_once()

    async def test_generic_book_intent_resets_draft_even_inside_booking_flow(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", current_node="CONFIRM")

        with patch.object(engine, "_reset_manual_booking_context", AsyncMock()) as reset_context, patch.object(
            engine, "_route_book_seat_from_entities", AsyncMock(return_value="when-where-card")
        ):
            response = await engine._execute_free_text_intent(session, Intent.BOOK_SEAT, {}, db=object())

        self.assertEqual(response, "when-where-card")
        reset_context.assert_awaited_once()

    async def test_numeric_book_a_seat_from_bookings_starts_full_booking_flow(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1")

        with patch.object(engine, "_get_context", AsyncMock(return_value={"booking_list_has_more": "false"})), patch.object(
            engine,
            "_start_book_seat_entry",
            AsyncMock(return_value="book-seat-flow"),
        ) as start_book_seat:
            response = await engine._handle_my_bookings(session, "2", None, db=object())

        self.assertEqual(response, "book-seat-flow")
        start_book_seat.assert_awaited_once()

    async def test_duplicate_booking_lookup_includes_current_bookings(self):
        engine = ChatEngine()
        booking_row = {
            "booking_id": "booking-today",
            "booking_date": "2026-07-23T00:00:00Z",
            "seat_code": "BEG-ROX-F8-D-114",
            "status": "CONFIRMED",
        }

        with patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings",
            AsyncMock(return_value=[booking_row]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings",
            AsyncMock(return_value=([], False)),
        ):
            existing = await engine._external_booking_for_date("2026-07-23")

        self.assertEqual(existing, booking_row)

    async def test_today_duplicate_booking_does_not_offer_cancel_rebook(self):
        engine = ChatEngine()
        session = SimpleNamespace(
            id="session-1",
            current_menu_id=123,
            current_node="QUICK_BOOK_DATE",
            state="NAVIGATING",
        )
        today = date.today().isoformat()
        booking_row = {
            "booking_id": "booking-today",
            "booking_date": today,
            "seat_code": "BEG-ROX-F8-D-114",
            "status": "CONFIRMED",
        }

        with patch.object(engine, "_update_node", AsyncMock()), patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings",
            AsyncMock(return_value=[booking_row]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings",
            AsyncMock(return_value=([], False)),
        ):
            resp = await engine._build_duplicate_booking_response(session, today, db=object())

        self.assertIsNotNone(resp)
        self.assertIn("cannot be cancelled or modified", resp.messages[0].text)
        self.assertEqual([option.value for option in resp.messages[1].options], ["0"])

    async def test_cancel_rebook_targets_duplicate_booking_only(self):
        engine = ChatEngine()
        session = SimpleNamespace(
            id="session-1",
            current_menu_id=123,
            current_node="BOOK_WHEN_WHERE",
            state="NAVIGATING",
        )
        selected_date = (date.today() + timedelta(days=2)).isoformat()
        booking_row = {
            "booking_id": "booking-42",
            "booking_date": selected_date,
            "seat_code": "BEG-ROX-F8-D-114",
            "status": "CONFIRMED",
        }
        stored_context = {}

        async def store_context(_session_id, updates, _db):
            stored_context.update(updates)

        with patch.object(engine, "_external_booking_for_date", AsyncMock(return_value=booking_row)), patch.object(
            engine, "_set_context_bulk", AsyncMock(side_effect=store_context)
        ), patch.object(engine, "_update_node", AsyncMock()):
            response = await engine._build_duplicate_booking_response(session, selected_date, db=object())

        self.assertIsNotNone(response)
        self.assertEqual(stored_context["duplicate_booking_id"], "booking-42")
        self.assertEqual(stored_context["date_range_start"], selected_date)
        self.assertEqual(stored_context["date_range_end"], selected_date)

        with patch.object(engine, "_get_context", AsyncMock(return_value=stored_context)), patch.object(
            engine, "_update_node", AsyncMock()
        ), patch.object(
            engine,
            "_build_booking_action_confirmation",
            AsyncMock(return_value="single-booking-confirmation"),
        ) as confirmation, patch.object(engine, "_build_my_bookings", AsyncMock()) as all_bookings:
            result = await engine._handle_main_menu(session, "cancel_rebook", None, db=object())

        self.assertEqual(result, "single-booking-confirmation")
        confirmation.assert_awaited_once_with(session, "cancel", "booking-42", unittest.mock.ANY)
        all_bookings.assert_not_awaited()

    async def test_cancel_rebook_recovers_target_from_selected_date(self):
        engine = ChatEngine()
        selected_date = (date.today() + timedelta(days=2)).isoformat()
        session = SimpleNamespace(id="session-1", current_node="MAIN_MENU")
        context = {"duplicate_booking_id": "", "date_range_start": selected_date}

        with patch.object(engine, "_get_context", AsyncMock(return_value=context)), patch.object(
            engine, "_update_node", AsyncMock()
        ), patch.object(
            engine, "_external_booking_for_date", AsyncMock(return_value={"booking_id": "booking-42"})
        ), patch.object(
            engine, "_build_booking_action_confirmation", AsyncMock(return_value="single-booking-confirmation")
        ) as confirmation:
            result = await engine._handle_main_menu(session, "cancel_rebook", None, db=object())

        self.assertEqual(result, "single-booking-confirmation")
        confirmation.assert_awaited_once_with(session, "cancel", "booking-42", unittest.mock.ANY)

    async def test_empty_upcoming_list_stays_on_upcoming_tab(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", current_menu_id=1)
        past = {"booking_id": "past-1", "booking_date": "2026-08-01", "seat_code": "P-1"}
        cancelled = {"booking_id": "cancelled-1", "booking_date": "2026-08-02", "seat_code": "C-1", "status": "CANCELLED"}

        with patch.object(engine, "_update_node", AsyncMock()), patch.object(
            engine, "_set_context_bulk", AsyncMock()
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings", AsyncMock(return_value=[])
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings", AsyncMock(return_value=([], False))
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_past_bookings", AsyncMock(return_value=([past], False))
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_cancelled_bookings", AsyncMock(return_value=([cancelled], False))
        ):
            response = await engine._build_external_my_bookings(
                session, object(), ctx={}, list_mode="upcoming", action=None,
                show_actions=True, page_size=7, offset=0,
            )

        lists = [message.booking_list for message in response.messages if message.booking_list]
        self.assertEqual(len(lists), 1)
        self.assertEqual(lists[0].mode, "upcoming")
        self.assertEqual(lists[0].bookings, [])
        self.assertIn("no upcoming bookings", response.messages[0].text.lower())

    def test_upcoming_rows_include_today_and_future_without_duplicates(self):
        today = date.today().isoformat()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        current = [
            {"booking_id": "today-1", "booking_date": today},
            {"booking_id": "old-1", "booking_date": yesterday},
        ]
        future = [
            {"booking_id": "today-1", "booking_date": today},
            {"booking_id": "future-1", "booking_date": tomorrow},
        ]

        rows = ChatEngine._merge_upcoming_booking_rows(current, future)

        self.assertEqual([row["booking_id"] for row in rows], ["today-1", "future-1"])

    def test_backend_seat_aliases_preserve_seat_code(self):
        nested = {"id": "114", "seat": {"seat_code": "BEG-ROX-F8-D-114"}}

        self.assertEqual(ChatEngine._backend_seat_id(nested), 114)
        self.assertEqual(ChatEngine._backend_seat_code(nested, 114), "BEG-ROX-F8-D-114")

    def test_current_booking_action_blocked_message_uses_action(self):
        message = ChatEngine._current_booking_action_blocked_message(
            "modify",
            {"booking_ref": "749", "booking_date": "2026-07-23T00:00:00Z"},
        )

        self.assertIn("Booking **749**", message)
        self.assertIn("cannot be modified", message)

    async def test_previous_booking_is_used_for_default_profile(self):
        engine = ChatEngine()
        booking_row = {
            "booking_id": "booking-1",
            "booking_date": "2026-07-20",
            "site_id": 8,
            "building_id": 15,
            "floor_id": 38,
            "seat_id": 114,
            "seat_code": "BEG-ROX-F8-D-114",
            "site_name": "Hyderabad Begumpet Office",
            "building_name": "Roxana Towers",
            "floor_name": "8th Floor",
            "seat_type": "STANDARD",
            "status": "CONFIRMED",
        }

        with patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings",
            AsyncMock(return_value=[]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings",
            AsyncMock(return_value=([booking_row], False)),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_past_bookings",
            AsyncMock(return_value=([], False)),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.preferences",
            AsyncMock(return_value={"site_id": 1, "building_id": 2, "floor_id": 3}),
        ):
            profile = await engine._get_external_default_booking_profile()

        self.assertEqual(profile["source"], "previous_booking")
        self.assertEqual(profile["site_id"], 8)
        self.assertEqual(profile["building_id"], 15)
        self.assertEqual(profile["floor_id"], 38)
        self.assertEqual(profile["seat_code"], "BEG-ROX-F8-D-114")
        self.assertEqual(profile["floor_name"], "8th Floor")
        self.assertEqual(profile["favorite_seat_ids"], [])

    async def test_favorite_seat_ids_are_carried_with_previous_booking_profile(self):
        engine = ChatEngine()
        booking_row = {
            "booking_id": "booking-1",
            "booking_date": "2026-07-20",
            "site_id": 8,
            "building_id": 15,
            "floor_id": 38,
            "seat_id": 114,
            "seat_code": "BEG-ROX-F8-D-114",
            "site_name": "Hyderabad Begumpet Office",
            "building_name": "Roxana Towers",
            "floor_name": "8th Floor",
            "seat_type": "STANDARD",
            "status": "CONFIRMED",
        }

        with patch(
            "app.services.chat_engine.seat_backend_api_service.preferences",
            AsyncMock(return_value={"favorite_seats": [{"seat_id": 501}, {"id": "502"}]}),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings",
            AsyncMock(return_value=[]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings",
            AsyncMock(return_value=([booking_row], False)),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_past_bookings",
            AsyncMock(return_value=([], False)),
        ):
            profile = await engine._get_external_default_booking_profile()

        self.assertEqual(profile["source"], "previous_booking")
        self.assertEqual(profile["favorite_seat_ids"], [501, 502])

    async def test_quick_book_history_ranking_prefers_frequent_location_over_latest_one_off(self):
        engine = ChatEngine()
        noida_future = {
            "booking_id": "booking-noida",
            "booking_date": "2026-08-08",
            "site_id": 57,
            "building_id": 87,
            "floor_id": 64,
            "seat_id": 4162,
            "seat_code": "NDA-ACE-F9-D-101",
            "site_name": "Nodia",
            "building_name": "Ace Capitol",
            "floor_name": "F9",
            "status": "CONFIRMED",
        }
        begumpet_rows = [
            {
                "booking_id": f"booking-beg-{index}",
                "booking_date": f"2026-08-0{index}",
                "site_id": 8,
                "building_id": 15,
                "floor_id": 38,
                "seat_id": 114,
                "seat_code": "BEG-ROX-F8-D-114",
                "site_name": "Hyderabad Begumpet Office",
                "building_name": "Roxana Towers",
                "floor_name": "8th Floor",
                "status": "CONFIRMED",
            }
            for index in (1, 2, 3)
        ]

        with patch(
            "app.services.chat_engine.seat_backend_api_service.preferences",
            AsyncMock(return_value={}),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings",
            AsyncMock(return_value=[]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings",
            AsyncMock(return_value=([noida_future, *begumpet_rows], False)),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_past_bookings",
            AsyncMock(return_value=([], False)),
        ):
            profile = await engine._get_external_default_booking_profile()

        self.assertEqual(profile["site_name"], "Hyderabad Begumpet Office")
        self.assertEqual(profile["seat_code"], "BEG-ROX-F8-D-114")
        self.assertEqual(profile["previous_seat_ids"], [114])

    async def test_preferences_are_used_when_previous_booking_has_no_location_ids(self):
        engine = ChatEngine()
        unusable_booking = {
            "booking_id": "booking-1",
            "booking_date": "2026-07-20",
            "site_name": "Hyderabad Begumpet Office",
        }

        with patch(
            "app.services.chat_engine.seat_backend_api_service.my_current_bookings",
            AsyncMock(return_value=[]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_future_bookings",
            AsyncMock(return_value=([unusable_booking], False)),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.my_past_bookings",
            AsyncMock(return_value=([], False)),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.preferences",
            AsyncMock(
                return_value={
                    "site_id": 1,
                    "building_id": 2,
                    "floor_id": 3,
                    "site_name": "Default Site",
                    "building_name": "Default Building",
                    "floor_name": "Default Floor",
                }
            ),
        ):
            profile = await engine._get_external_default_booking_profile()

        self.assertEqual(profile["source"], "default_location")
        self.assertEqual(profile["site_id"], 1)
        self.assertEqual(profile["building_id"], 2)
        self.assertEqual(profile["floor_id"], 3)

    async def test_quick_book_starts_with_date_prompt(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", user_name="Maha")
        profile = {
            "source": "previous_booking",
            "site_id": 8,
            "building_id": 15,
            "floor_id": 38,
            "site_name": "Hyderabad Begumpet Office",
            "building_name": "Roxana Towers",
            "floor_name": "8th Floor",
            "favorite_seat_ids": [501],
            "previous_seat_ids": [114],
            "last_seat_id": "114",
            "seat_code": "BEG-ROX-F8-D-114",
            "seat_type": "STANDARD",
            "headcount": 1,
            "amenity_ids": [],
        }

        with patch.object(engine, "_get_default_booking_profile", AsyncMock(return_value=profile)), patch.object(
            engine,
            "_set_context_bulk",
            AsyncMock(),
        ), patch.object(engine, "_update_node", AsyncMock()):
            resp = await engine._start_quick_book_entry(session, db=object())

        self.assertEqual(resp.current_node, "QUICK_BOOK_DATE")
        self.assertEqual(resp.messages[0].type.value, "TEXT")
        self.assertEqual(resp.messages[1].type.value, "FORM_CARD")
        self.assertEqual(resp.messages[1].form_card.fields[0].key, "booking_date")

    async def test_quick_book_without_profile_still_starts_with_date_prompt(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", user_name="Maha", current_menu_id=None)

        with patch.object(engine, "_get_default_booking_profile", AsyncMock(return_value=None)), patch.object(
            engine,
            "_set_context_bulk",
            AsyncMock(),
        ) as set_context, patch.object(engine, "_update_node", AsyncMock()) as update_node:
            resp = await engine._start_quick_book_entry(session, db=object())

        self.assertEqual(resp.current_node, "QUICK_BOOK_DATE")
        self.assertEqual(resp.messages[0].type.value, "TEXT")
        self.assertEqual(resp.messages[1].type.value, "FORM_CARD")
        self.assertEqual(resp.messages[1].form_card.node, "QUICK_BOOK_DATE")
        set_context.assert_awaited_once()
        update_node.assert_awaited_once()

    async def test_book_a_seat_fallback_from_quick_book_date_starts_full_booking_flow(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", user_name="Maha")

        with patch.object(engine, "_start_book_seat_entry", AsyncMock(return_value="book-seat-response")) as start_book_seat:
            resp = await engine._handle_quick_book_date(session, "book_seat_from_bookings", None, db=object())

        self.assertEqual(resp, "book-seat-response")
        start_book_seat.assert_awaited_once()

    async def test_quick_book_from_booking_list_shortcut_is_global(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", user_name="Maha", current_node="MAIN_MENU")

        with patch.object(engine, "_start_quick_book_entry", AsyncMock(return_value="quick-book-response")) as start_quick_book:
            resp = await engine.process(session, "quick_book_from_bookings", None, db=object())

        self.assertEqual(resp, "quick-book-response")
        start_quick_book.assert_awaited_once()

    async def test_quick_book_free_text_uses_extracted_date(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1", user_name="Maha")
        db = object()

        with patch.object(engine, "_start_quick_book_entry", AsyncMock(return_value="quick-book-response")) as start_quick_book:
            resp = await engine._execute_free_text_intent(
                session,
                Intent.QUICK_BOOK,
                {"booking_date": "2026-07-31"},
                db=db,
            )

        self.assertEqual(resp, "quick-book-response")
        start_quick_book.assert_awaited_once_with(session, db, booking_date_str="2026-07-31")

    async def test_quick_book_auto_selects_first_available_preferred_seat(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1")
        ctx = {
            "booking_date": "2026-07-27",
            "site_id": "8",
            "building_id": "15",
            "floor_id": "38",
            "site_name": "Hyderabad Begumpet Office",
            "building_name": "Roxana Towers",
            "floor_name": "8th Floor",
            "favorite_seat_ids": "501",
            "previous_seat_ids": "114",
            "last_seat_id": "114",
            "seat_type": "STANDARD",
            "headcount": "1",
            "quick_book_mode": "true",
        }

        async def get_context(_session_id, _db):
            return dict(ctx)

        async def set_context(_session_id, updates, _db):
            ctx.update({key: str(value) for key, value in updates.items()})

        with patch.object(engine, "_get_context", AsyncMock(side_effect=get_context)), patch.object(
            engine,
            "_set_context_bulk",
            AsyncMock(side_effect=set_context),
        ) as set_context_mock, patch.object(engine, "_update_node", AsyncMock()) as update_node, patch(
            "app.services.chat_engine.seat_backend_api_service.available_seats",
            AsyncMock(
                return_value=[
                    {
                        "seat_id": 114,
                        "seat_code": "BEG-ROX-F8-D-114",
                        "availability": {"status": "AVAILABLE"},
                    },
                    {
                        "seat_id": 501,
                        "seat_code": "BEG-ROX-F8-D-501",
                        "availability": {"status": "AVAILABLE"},
                    },
                ]
            ),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_floors",
            AsyncMock(return_value=[{"floor_id": 38, "floor_name": "8th Floor"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_buildings",
            AsyncMock(return_value=[{"building_id": 15, "building_name": "Roxana Towers"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_sites",
            AsyncMock(return_value=[{"site_id": 8, "site_name": "Hyderabad Begumpet Office"}]),
        ):
            resp = await engine._build_external_seat_list_response(
                session,
                db=object(),
                site_id=8,
                building_id=15,
                floor_id=38,
                booking_date_str="2026-07-27",
                amenity_ids=[],
            )

        self.assertIsNotNone(resp)
        self.assertEqual(resp.current_node, "CONFIRM")
        self.assertIn("BEG-ROX-F8-D-501", resp.messages[0].text)
        self.assertEqual(resp.messages[1].confirmation.seat_code, "BEG-ROX-F8-D-501")
        self.assertEqual(ctx["selected_seat_ids"], "501")
        update_node.assert_awaited()
        set_context_mock.assert_awaited()

    async def test_quick_book_shows_fallback_seats_when_no_preferred_seat_is_available(self):
        engine = ChatEngine()
        session = SimpleNamespace(id="session-1")
        ctx = {
            "booking_date": "2026-07-27",
            "site_id": "8",
            "building_id": "15",
            "floor_id": "38",
            "site_name": "Hyderabad Begumpet Office",
            "building_name": "Roxana Towers",
            "floor_name": "8th Floor",
            "favorite_seat_ids": "501",
            "previous_seat_ids": "114",
            "last_seat_id": "114",
            "seat_type": "STANDARD",
            "headcount": "1",
            "quick_book_mode": "true",
        }

        with patch.object(engine, "_get_context", AsyncMock(return_value=ctx)), patch.object(
            engine,
            "_set_context_bulk",
            AsyncMock(),
        ), patch.object(engine, "_update_node", AsyncMock()), patch(
            "app.services.chat_engine.random.sample",
            return_value=[
                {
                    "seat_id": 777,
                    "seat_code": "BEG-ROX-F8-D-777",
                    "availability": {"status": "AVAILABLE"},
                }
            ],
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.available_seats",
            AsyncMock(
                return_value=[
                    {
                        "seat_id": 777,
                        "seat_code": "BEG-ROX-F8-D-777",
                        "availability": {"status": "AVAILABLE"},
                    },
                ]
            ),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_floors",
            AsyncMock(return_value=[{"floor_id": 38, "floor_name": "8th Floor"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_buildings",
            AsyncMock(return_value=[{"building_id": 15, "building_name": "Roxana Towers"}]),
        ), patch(
            "app.services.chat_engine.seat_backend_api_service.list_sites",
            AsyncMock(return_value=[{"site_id": 8, "site_name": "Hyderabad Begumpet Office"}]),
        ):
            resp = await engine._build_external_seat_list_response(
                session,
                db=object(),
                site_id=8,
                building_id=15,
                floor_id=38,
                booking_date_str="2026-07-27",
                amenity_ids=[],
            )

        self.assertIsNotNone(resp)
        self.assertEqual(resp.current_node, "AVAILABLE_SEATS")
        self.assertIn("not available", resp.messages[0].text)
        self.assertEqual(resp.messages[0].seat_list.seats[0].seat_code, "BEG-ROX-F8-D-777")

    async def test_rebook_calendar_marks_same_seat_availability(self):
        engine = ChatEngine()
        today_value = date.today()
        today = today_value.isoformat()
        tomorrow = (today_value + timedelta(days=1)).isoformat()

        def seats_for_date(*, floor_id, booking_date, amenity_ids=None, modify_booking_id=None):
            if booking_date == today:
                return [{"seat_id": 114, "seat_code": "BEG-ROX-F8-D-114", "availability": {"status": "AVAILABLE"}}]
            return [{"seat_id": 115, "seat_code": "BEG-ROX-F8-D-115", "availability": {"status": "AVAILABLE"}}]

        with patch(
            "app.services.chat_engine.seat_backend_api_service.available_seats",
            AsyncMock(side_effect=seats_for_date),
        ):
            days = await engine._rebook_calendar_days(floor_id=38, seat_id=114, month_start=today_value, days=2)

        self.assertEqual([day.date for day in days], [today, tomorrow])
        self.assertEqual([day.available for day in days], [True, False])
        self.assertEqual([day.selectable for day in days], [True, True])

    async def test_rebook_calendar_disables_past_dates(self):
        engine = ChatEngine()
        yesterday = date.today() - timedelta(days=1)

        with patch(
            "app.services.chat_engine.seat_backend_api_service.available_seats",
            AsyncMock(return_value=[]),
        ) as available_seats:
            days = await engine._rebook_calendar_days(floor_id=38, seat_id=114, month_start=yesterday, days=1)

        self.assertFalse(days[0].selectable)
        self.assertFalse(days[0].available)
        available_seats.assert_not_awaited()


class InputGuardServiceTests(unittest.TestCase):
    def setUp(self):
        self.guard = InputGuardService()

    def test_out_of_scope_prompt_is_detected(self):
        result = self.guard.check(normalize_message("what is the weather today"))

        self.assertIsNotNone(result)
        self.assertEqual(result.category, "out_of_scope")

    def test_toxic_prompt_is_detected(self):
        result = self.guard.check(normalize_message("you are stupid"))

        self.assertIsNotNone(result)
        self.assertEqual(result.category, "toxic")

    def test_booking_prompt_is_allowed(self):
        result = self.guard.check(normalize_message("book a window seat tomorrow"))

        self.assertIsNone(result)

    def test_hotel_seat_booking_is_out_of_scope(self):
        result = self.guard.check(normalize_message("book a seat at a hotel"))

        self.assertIsNotNone(result)
        self.assertEqual(result.category, "out_of_scope")

    def test_travel_seat_booking_is_out_of_scope(self):
        for prompt in ("reserve a train seat", "book a bus seat", "need a seat at the cinema"):
            with self.subTest(prompt=prompt):
                result = self.guard.check(normalize_message(prompt))
                self.assertIsNotNone(result)
                self.assertEqual(result.category, "out_of_scope")

    def test_clean_seat_prompt_is_out_of_scope(self):
        result = self.guard.check(normalize_message("i want to clean my seat"))

        self.assertIsNotNone(result)
        self.assertEqual(result.category, "facility_service")

    def test_maintenance_prompt_is_out_of_scope(self):
        result = self.guard.check(normalize_message("my chair is broken near my desk"))

        self.assertIsNotNone(result)
        self.assertEqual(result.category, "facility_service")


class SeatSelectionEditTests(unittest.TestCase):
    def test_change_building_routes_to_when_where(self):
        target = BookingEditService.detect_seat_preference_change_target("i want to change the building")
        self.assertEqual(target, "when_where")

    def test_change_amenities_routes_to_details(self):
        target = BookingEditService.detect_seat_preference_change_target("change amenities to window seat")
        self.assertEqual(target, "details")

    def test_plain_seat_number_does_not_route_to_edit(self):
        target = BookingEditService.detect_seat_preference_change_target("1")
        self.assertIsNone(target)

    def test_building_change_clears_dependent_location(self):
        updates = BookingEditService.context_clear_for_when_where_change("change the building")
        self.assertEqual(updates["building_id"], "")
        self.assertEqual(updates["floor_id"], "")
        self.assertEqual(updates["selected_seat_ids"], "")


class NavigationCommandTests(unittest.TestCase):
    def test_back_to_main_menu_label_is_navigation_command(self):
        self.assertTrue(NavigationService.is_main_menu_command("Back to main menu"))
        self.assertTrue(NavigationService.is_main_menu_command("0"))
        self.assertTrue(NavigationService.is_main_menu_command("main menu"))

    def test_non_navigation_text_is_not_main_menu_command(self):
        self.assertFalse(NavigationService.is_main_menu_command("book a seat"))


if __name__ == "__main__":
    unittest.main()
