"""
Menu Service — serves the code-defined chatbot menu tree.
"""
from __future__ import annotations
from datetime import date, timedelta
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class MenuNode:
    id: int
    menu_key: str
    label: str
    display_order: int
    target_node: Optional[str]
    context_preset: Dict[str, Any]
    placeholder_msg: Optional[str]
    icon: Optional[str]
    parent_id: Optional[int]
    children: List[MenuNode] = field(default_factory=list)


class MenuService:

    @staticmethod
    def _default_root_menu() -> List[MenuNode]:
        return [
            MenuNode(
                id=-1,
                menu_key="QUICK_BOOK",
                label="Quick Book",
                display_order=1,
                target_node="QUICK_BOOK",
                context_preset={},
                placeholder_msg=None,
                icon=None,
                parent_id=None,
            ),
            MenuNode(
                id=-2,
                menu_key="BOOK_SEAT",
                label="Book a seat",
                display_order=2,
                target_node="BOOK_WHEN_WHERE",
                context_preset={},
                placeholder_msg=None,
                icon=None,
                parent_id=None,
            ),
            MenuNode(
                id=-3,
                menu_key="MY_BOOKINGS",
                label="My Bookings",
                display_order=3,
                target_node="MY_BOOKINGS",
                context_preset={},
                placeholder_msg=None,
                icon=None,
                parent_id=None,
            ),
        ]

    async def get_children(self, parent_id: Optional[int], tenant_id: int, db: AsyncSession) -> List[MenuNode]:
        del tenant_id, db
        return self._default_root_menu() if parent_id is None else []

    async def get_menu_item(self, menu_id: int, tenant_id: int, db: AsyncSession) -> Optional[MenuNode]:
        del tenant_id, db
        return next((node for node in self._default_root_menu() if node.id == menu_id), None)

    async def invalidate_cache(self, tenant_id: Optional[int] = None):
        del tenant_id

    @staticmethod
    def resolve_context_preset(preset: Dict[str, Any]) -> Dict[str, str]:
        resolved = {}
        for k, v in preset.items():
            if v == "__TODAY__":
                resolved[k] = date.today().strftime("%Y-%m-%d")
            elif v == "__TOMORROW__":
                resolved[k] = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                resolved[k] = str(v)
        return resolved


menu_service = MenuService()
