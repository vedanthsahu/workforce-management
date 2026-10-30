"""Main-menu cards must work from any screen, not only from the main menu."""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch


def _chatbot_types():
    """Import chatbot services after supplying collection-safe test settings."""
    os.environ.setdefault(
        "DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test"
    )
    os.environ.setdefault(
        "SYNC_DATABASE_URL", "postgresql://test:test@localhost/test"
    )
    from backend.chatbot.services.chat_engine import ChatEngine
    from backend.chatbot.services.menu_service import MenuNode

    return ChatEngine, MenuNode


def _session(node: str = "MAIN_MENU", menu_id=None):
    session = MagicMock()
    session.id = "00000000-0000-0000-0000-000000000001"
    session.user_name = "Test User"
    session.current_node = node
    session.current_menu_id = menu_id
    return session


def test_root_menu_cards_carry_their_menu_item():
    ChatEngine, _ = _chatbot_types()
    engine = ChatEngine()

    response = asyncio.run(
        engine._build_dynamic_menu(_session(), None, "", MagicMock())
    )

    options = response.messages[-1].options
    assert [option.value for option in options] == ["menu:1", "menu:2", "menu:3"]
    assert [option.number for option in options] == [1, 2, 3]


def test_submenu_options_keep_plain_numbers():
    ChatEngine, MenuNode = _chatbot_types()
    engine = ChatEngine()
    children = [
        MenuNode(
            id=11, menu_key="A", label="Item A", display_order=1, target_node=None,
            context_preset={}, placeholder_msg=None, icon=None, parent_id=5,
        ),
    ]

    with patch(
        "backend.chatbot.services.chat_engine.menu_service.get_children",
        new=AsyncMock(return_value=children),
    ):
        response = asyncio.run(
            engine._build_dynamic_menu(_session("DYNAMIC_MENU", 5), 5, "", MagicMock())
        )

    values = [option.value for option in response.messages[-1].options]
    assert values == ["1", "0"]


def test_menu_card_works_from_another_screen():
    ChatEngine, _ = _chatbot_types()
    engine = ChatEngine()
    sentinel = object()
    engine._navigate_menu_choice = AsyncMock(return_value=sentinel)
    session = _session("BOOK_WHEN_WHERE", menu_id=5)
    db = MagicMock()

    result = asyncio.run(engine.process(session, "menu:3", None, db))

    assert result is sentinel
    engine._navigate_menu_choice.assert_awaited_once_with(session, None, 3, db)
    assert session.current_menu_id is None


def test_plain_number_is_still_read_against_the_current_screen():
    ChatEngine, _ = _chatbot_types()
    engine = ChatEngine()
    engine._navigate_menu_choice = AsyncMock()
    engine._handle_when_where = AsyncMock(return_value="form")
    session = _session("BOOK_WHEN_WHERE")

    result = asyncio.run(engine.process(session, "3", None, MagicMock()))

    assert result == "form"
    engine._navigate_menu_choice.assert_not_awaited()
