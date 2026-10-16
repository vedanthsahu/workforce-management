from __future__ import annotations

import asyncio
import time
from collections import deque

from app.config import settings


class WhatsAppSecurityService:
    """Small, bounded process-local guard for webhook abuse and task pressure."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = {}
        self._active_tasks = 0
        self._lock = asyncio.Lock()

    async def allow_request(self, key: str, configured_limit: int | None = None) -> bool:
        now = time.monotonic()
        cutoff = now - 60.0
        limit = max(1, int(configured_limit or settings.WHATSAPP_RATE_LIMIT_PER_MINUTE))
        async with self._lock:
            events = self._events.setdefault(key, deque())
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(now)
            if len(self._events) > 5000:
                stale = [name for name, values in self._events.items() if not values or values[-1] < cutoff]
                for name in stale[:1000]:
                    self._events.pop(name, None)
            return True

    async def reserve_task(self) -> bool:
        async with self._lock:
            if self._active_tasks >= max(1, int(settings.WHATSAPP_MAX_CONCURRENT_TASKS)):
                return False
            self._active_tasks += 1
            return True

    async def release_task(self) -> None:
        async with self._lock:
            self._active_tasks = max(0, self._active_tasks - 1)


whatsapp_security_service = WhatsAppSecurityService()
