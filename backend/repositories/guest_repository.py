"""Tenant-scoped repository helpers for guest profiles."""

from __future__ import annotations

from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


GUEST_SELECT_FIELDS = """
    g.id::text AS guest_id,
    g.tenant_id::text AS tenant_id,
    g.full_name,
    g.email,
    g.phone,
    g.organization,
    g.status,
    g.created_at,
    g.updated_at
"""


def create_guest(
    conn: PGConnection,
    *,
    tenant_id: str,
    full_name: str,
    email: str | None,
    phone: str | None,
    organization: str | None,
    created_by_user_id: str,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO guests (
                tenant_id,
                full_name,
                email,
                phone,
                organization,
                status,
                created_by_user_id
            )
            VALUES (%s, %s, %s, %s, %s, 'ACTIVE', %s)
            RETURNING
                id::text AS guest_id,
                tenant_id::text AS tenant_id,
                full_name,
                email,
                phone,
                organization,
                status,
                created_at,
                updated_at
            """,
            (
                tenant_id,
                full_name,
                email,
                phone,
                organization,
                created_by_user_id,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Guest insert did not return a row.")
    return dict(row)


def fetch_guest_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.id = %s
              AND g.tenant_id = %s
            """,
            (guest_id, tenant_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def search_guests(
    conn: PGConnection,
    *,
    tenant_id: str,
    search_text: str,
    limit: int = 20,
) -> list[dict[str, Any]]:
    pattern = f"%{search_text.strip()}%"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.tenant_id = %s
              AND (
                    g.full_name ILIKE %s
                 OR g.email ILIKE %s
                 OR g.phone ILIKE %s
              )
            ORDER BY
                CASE WHEN g.status = 'ACTIVE' THEN 0 ELSE 1 END,
                g.full_name,
                g.id
            LIMIT %s
            """,
            (tenant_id, pattern, pattern, pattern, limit),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_guest_by_email(
    conn: PGConnection,
    *,
    tenant_id: str,
    email: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.tenant_id = %s
              AND LOWER(g.email) = LOWER(%s)
              AND g.status = 'ACTIVE'
            ORDER BY g.id
            LIMIT 1
            """,
            (tenant_id, email),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_guest_by_phone(
    conn: PGConnection,
    *,
    tenant_id: str,
    phone: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.tenant_id = %s
              AND g.phone = %s
              AND g.status = 'ACTIVE'
            ORDER BY g.id
            LIMIT 1
            """,
            (tenant_id, phone),
        )
        row = cur.fetchone()
    return dict(row) if row else None
