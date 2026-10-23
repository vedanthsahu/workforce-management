"""Chatbot-owned data shapes (chatbot_sessions, chatbot_messages).

Plain dataclasses, not SQLAlchemy ORM models -- the chatbot used to manage
these tables through its own SQLAlchemy async engine; that's gone, and
backend/repositories/chatbot_repository.py now reads/writes these tables
the same way every other repository in this codebase does (raw psycopg2).
These dataclasses are just the shape repository rows get turned into, so
the rest of the chatbot code (which reads session.tenant_id, session.state,
etc.) didn't need to change.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class ChatbotSession:
    id: uuid.UUID
    tenant_id: int
    user_name: str
    state: str
    current_node: str
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    current_menu_id: int | None = None
    context_data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> ChatbotSession:
        return cls(
            id=row["id"],
            tenant_id=row["tenant_id"],
            user_name=row["user_name"],
            state=row["state"],
            current_node=row["current_node"],
            current_menu_id=row.get("current_menu_id"),
            context_data=dict(row.get("context_data") or {}),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            expires_at=row["expires_at"],
        )


@dataclass
class ChatbotMessage:
    id: uuid.UUID
    session_id: uuid.UUID
    direction: str
    message_text: str
    message_type: str
    created_at: datetime
    node_id: str | None = None


__all__ = ["ChatbotMessage", "ChatbotSession"]
