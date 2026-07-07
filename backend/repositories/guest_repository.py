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
    include_inactive: bool = False,
    search_text: str,
    limit: int = 20,
) -> list[dict[str, Any]]:
    search_text = search_text.strip().lower()

    status_clause = ""
    if not include_inactive:
        status_clause = "AND g.status = 'ACTIVE'"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.tenant_id = %s
            {status_clause}
              AND (
                    EXISTS (
                        SELECT 1
                        FROM unnest(
                            regexp_split_to_array(
                                lower(coalesce(g.full_name, '')),
                                '\s+'
                            )
                        ) AS name_part
                        WHERE name_part LIKE %s || '%%'
                    )
                 OR coalesce(g.phone, '')
                        LIKE %s || '%%'
                 OR lower(coalesce(g.email, ''))
                        LIKE '%%' || %s || '%%'
              )
            ORDER BY
                CASE
                    WHEN lower(coalesce(g.full_name, ''))
                         LIKE %s || '%%'
                    THEN 1
                    ELSE 2
                END,
                g.full_name,
                g.id
            LIMIT %s
            """,
            (
                tenant_id,

                # WHERE
                search_text,
                search_text,
                search_text,

                # ORDER BY
                search_text,

                limit,
            ),
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


def fetch_guest_by_email_including_inactive(
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
            ORDER BY g.id
            LIMIT 1
            """,
            (tenant_id, email),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_guest_by_phone_including_inactive(
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
            ORDER BY g.id
            LIMIT 1
            """,
            (tenant_id, phone),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_guest_by_email_excluding_guest(
    conn: PGConnection,
    *,
    tenant_id: str,
    email: str,
    exclude_guest_id: str,
) -> dict[str, Any] | None:
    """Check email uniqueness across ACTIVE and INACTIVE guests, excluding one guest."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.tenant_id = %s
              AND LOWER(g.email) = LOWER(%s)
              AND g.id <> %s
            ORDER BY g.id
            LIMIT 1
            """,
            (tenant_id, email, exclude_guest_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_guest_by_phone_excluding_guest(
    conn: PGConnection,
    *,
    tenant_id: str,
    phone: str,
    exclude_guest_id: str,
) -> dict[str, Any] | None:
    """Check phone uniqueness across ACTIVE and INACTIVE guests, excluding one guest."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_SELECT_FIELDS}
            FROM guests AS g
            WHERE g.tenant_id = %s
              AND g.phone = %s
              AND g.id <> %s
            ORDER BY g.id
            LIMIT 1
            """,
            (tenant_id, phone, exclude_guest_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def update_guest(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    updates: dict[str, Any],
) -> dict[str, Any]:
    """Apply a partial update to one tenant-scoped guest."""
    allowed_fields = ("full_name", "email", "phone", "organization")
    set_clauses = [
        f"{field} = %s" for field in allowed_fields if field in updates
    ]
    if not set_clauses:
        raise ValueError("No fields supplied for guest update.")

    params: list[Any] = [
        updates[field] for field in allowed_fields if field in updates
    ]
    set_clauses.append("updated_at = NOW()")
    params.extend([guest_id, tenant_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE guests AS g
            SET {", ".join(set_clauses)}
            WHERE g.id = %s
              AND g.tenant_id = %s
            RETURNING {GUEST_SELECT_FIELDS}
            """,
            params,
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Guest not found for update.")
    return dict(row)


def update_guest_status(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    status: str,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE guests AS g
            SET
                status = %s,
                updated_at = NOW()
            WHERE g.id = %s
              AND g.tenant_id = %s
            RETURNING {GUEST_SELECT_FIELDS}
            """,
            (status, guest_id, tenant_id),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Guest not found for status update.")
    return dict(row)
