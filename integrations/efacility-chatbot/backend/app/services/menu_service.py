"""
Menu Service — loads, caches, and navigates the DB-driven menu tree.
"""
from __future__ import annotations
import logging
from datetime import datetime, date, timedelta, timezone
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chatbot import ChatbotMenuItem
from app.config import settings

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300


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

    def __init__(self):
        self._cache: Dict[int, Dict[Optional[int], List[MenuNode]]] = {}
        self._by_id: Dict[int, Dict[int, MenuNode]] = {}
        self._loaded_at: Dict[int, datetime] = {}

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

    def _is_stale(self, tenant_id: int) -> bool:
        loaded = self._loaded_at.get(tenant_id)
        if not loaded:
            return True
        return (datetime.now(timezone.utc) - loaded).total_seconds() > CACHE_TTL_SECONDS

    async def _ensure_loaded(self, tenant_id: int, db: AsyncSession):
        if not self._is_stale(tenant_id):
            return
        await self._load(tenant_id, db)

    async def _load(self, tenant_id: int, db: AsyncSession):
        result = await db.execute(
            select(ChatbotMenuItem)
            .where(ChatbotMenuItem.tenant_id == tenant_id, ChatbotMenuItem.is_active == True)
            .order_by(ChatbotMenuItem.parent_id, ChatbotMenuItem.display_order)
        )
        rows = result.scalars().all()

        nodes: Dict[int, MenuNode] = {}
        for r in rows:
            nodes[r.id] = MenuNode(
                id=r.id,
                menu_key=r.menu_key,
                label=r.label,
                display_order=r.display_order,
                target_node=r.target_node,
                context_preset=r.context_preset or {},
                placeholder_msg=r.placeholder_msg,
                icon=r.icon,
                parent_id=r.parent_id,
            )

        children_map: Dict[Optional[int], List[MenuNode]] = {}
        for node in nodes.values():
            pid = node.parent_id
            children_map.setdefault(pid, []).append(node)
            if pid and pid in nodes:
                nodes[pid].children.append(node)

        self._cache[tenant_id] = children_map
        self._by_id[tenant_id] = nodes
        self._loaded_at[tenant_id] = datetime.now(timezone.utc)
        logger.info("Menu tree loaded for tenant %s: %d items", tenant_id, len(nodes))

    async def get_children(self, parent_id: Optional[int], tenant_id: int, db: AsyncSession) -> List[MenuNode]:
        await self._ensure_loaded(tenant_id, db)
        children = self._cache.get(tenant_id, {}).get(parent_id, [])
        if not children and parent_id is None:
            return self._default_root_menu()
        return children

    async def get_menu_item(self, menu_id: int, tenant_id: int, db: AsyncSession) -> Optional[MenuNode]:
        await self._ensure_loaded(tenant_id, db)
        return self._by_id.get(tenant_id, {}).get(menu_id)

    async def invalidate_cache(self, tenant_id: Optional[int] = None):
        if tenant_id:
            self._loaded_at.pop(tenant_id, None)
            self._cache.pop(tenant_id, None)
            self._by_id.pop(tenant_id, None)
        else:
            self._loaded_at.clear()
            self._cache.clear()
            self._by_id.clear()

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
