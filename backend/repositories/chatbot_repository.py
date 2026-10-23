"""Repository helpers for the chatbot's own tables (chatbot_sessions,
chatbot_messages). Same connection/cursor/%s-param style as every other
repository in this codebase -- the chatbot used to run its own, separate
SQLAlchemy async stack against these tables; this is that access folded
onto the main app's shared psycopg2 connection instead.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import Json, RealDictCursor


def insert_chatbot_session(
    conn: PGConnection,
    *,
    session_id: uuid.UUID,
    tenant_id: int,
    user_name: str,
    state: str,
    current_node: str,
    created_at: datetime,
    updated_at: datetime,
    expires_at: datetime,
    context_data: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO chatbot_sessions (
                id, tenant_id, user_name, state, current_node,
                created_at, updated_at, expires_at, context_data
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, tenant_id, user_name, state, current_node,
                      current_menu_id, context_data, created_at, updated_at, expires_at
            """,
            (
                session_id, tenant_id, user_name, state, current_node,
                created_at, updated_at, expires_at, Json(context_data),
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return dict(row)


def fetch_chatbot_session(
    conn: PGConnection, *, session_id: uuid.UUID,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, tenant_id, user_name, state, current_node,
                   current_menu_id, context_data, created_at, updated_at, expires_at
            FROM chatbot_sessions
            WHERE id = %s
            """,
            (session_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def update_chatbot_session_node(
    conn: PGConnection,
    *,
    session_id: uuid.UUID,
    current_node: str,
    state: str,
    current_menu_id: int | None,
    updated_at: datetime,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE chatbot_sessions
            SET current_node = %s, state = %s, current_menu_id = %s, updated_at = %s
            WHERE id = %s
            """,
            (current_node, state, current_menu_id, updated_at, session_id),
        )
    conn.commit()


def update_chatbot_session_state(
    conn: PGConnection, *, session_id: uuid.UUID, state: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE chatbot_sessions SET state = %s WHERE id = %s",
            (state, session_id),
        )
    conn.commit()


def update_chatbot_session_context(
    conn: PGConnection,
    *,
    session_id: uuid.UUID,
    context_data: dict[str, Any],
    updated_at: datetime,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE chatbot_sessions
            SET context_data = %s, updated_at = %s
            WHERE id = %s
            """,
            (Json(context_data), updated_at, session_id),
        )
    conn.commit()


def insert_chatbot_message(
    conn: PGConnection,
    *,
    message_id: uuid.UUID,
    session_id: uuid.UUID,
    direction: str,
    message_text: str,
    message_type: str,
    node_id: str | None,
    created_at: datetime,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO chatbot_messages (
                id, session_id, direction, message_text, message_type, node_id, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (message_id, session_id, direction, message_text, message_type, node_id, created_at),
        )
    conn.commit()
