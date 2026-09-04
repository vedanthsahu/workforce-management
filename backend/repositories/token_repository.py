"""Repository helpers for DB-backed refresh-token sessions."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import Json, RealDictCursor


def ensure_refresh_tokens_table(conn: PGConnection) -> None:
    """Legacy compatibility no-op for the provided schema."""
    del conn


def ensure_sessions_table(conn: PGConnection) -> None:
    """Legacy compatibility no-op for the provided schema."""
    del conn


def revoke_all_user_sessions(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> int:
    """Revoke all active sessions for one tenant-scoped user."""

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE user_sessions
            SET revoked_at = NOW(),
                updated_at = NOW()
            WHERE tenant_id = %s
              AND user_id = %s
              AND revoked_at IS NULL
            """,
            (
                tenant_id,
                user_id,
            ),
        )

        return cur.rowcount


def fetch_active_session(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    session_id: str,
) -> dict[str, Any] | None:
    """Fetch one active non-revoked session."""

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                session_id::text AS session_id,
                tenant_id::text AS tenant_id,
                user_id::text AS user_id,
                revoked_at,
                expires_at
            FROM user_sessions
            WHERE tenant_id = %s
              AND user_id = %s
              AND session_id = %s
              AND revoked_at IS NULL
            """,
            (
                tenant_id,
                user_id,
                session_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def create_user_session(
    conn: PGConnection,
    *,
    session_id: str,
    tenant_id: str,
    user_id: str,
    refresh_token_hash: str,
    user_agent: str | None,
    ip_address: str | None,
    expires_at: datetime,
) -> dict[str, Any]:
    """Insert one user_sessions row for a successful login."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO user_sessions (
                session_id,
                tenant_id,
                user_id,
                refresh_token_hash,
                user_agent,
                ip_address,
                expires_at,
                last_used_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING
                session_id::text AS session_id,
                tenant_id::text AS tenant_id,
                user_id::text AS user_id,
                refresh_token_hash,
                user_agent,
                ip_address::text AS ip_address,
                revoked_at,
                (revoked_at IS NOT NULL) AS is_revoked,
                created_at,
                updated_at,
                expires_at,
                last_used_at
            """,
            (
                session_id,
                tenant_id,
                user_id,
                refresh_token_hash,
                user_agent,
                ip_address,
                expires_at,
            ),
        )
        result = cur.fetchone()
    return dict(result)


def fetch_session_by_refresh_token(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    session_id: str,
    refresh_token_hash: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped session by its rotated refresh-token hash."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                session_id::text AS session_id,
                tenant_id::text AS tenant_id,
                user_id::text AS user_id,
                refresh_token_hash,
                user_agent,
                ip_address::text AS ip_address,
                revoked_at,
                (revoked_at IS NOT NULL) AS is_revoked,
                created_at,
                updated_at,
                expires_at,
                last_used_at
            FROM user_sessions
            WHERE tenant_id = %s
              AND user_id = %s
              AND session_id = %s
              AND refresh_token_hash = %s
            """,
            (tenant_id, user_id, session_id, refresh_token_hash),
        )
        result = cur.fetchone()
    return dict(result) if result else None


REFRESH_TOKEN_GRACE_SECONDS = 10


def rotate_refresh_token(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    session_id: str,
    current_refresh_token_hash: str,
    new_refresh_token_hash: str,
    user_agent: str | None,
    ip_address: str | None,
    expires_at: datetime,
) -> dict[str, Any] | None:
    """Rotate the hashed refresh token for one active session.

    Also stashes the hash being replaced into previous_refresh_token_hash
    with a short grace window (REFRESH_TOKEN_GRACE_SECONDS) -- this is what
    lets a legitimate concurrent request that presents the just-replaced
    token be recognized as a race, not token reuse/theft. See
    fetch_session_by_previous_refresh_token.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE user_sessions
            SET previous_refresh_token_hash = refresh_token_hash,
                previous_token_grace_expires_at = NOW() + (%s || ' seconds')::interval,
                refresh_token_hash = %s,
                user_agent = %s,
                ip_address = %s,
                expires_at = %s,
                last_used_at = NOW(),
                updated_at = NOW()
            WHERE tenant_id = %s
              AND user_id = %s
              AND session_id = %s
              AND refresh_token_hash = %s
              AND revoked_at IS NULL
            RETURNING
                session_id::text AS session_id,
                tenant_id::text AS tenant_id,
                user_id::text AS user_id,
                refresh_token_hash,
                user_agent,
                ip_address::text AS ip_address,
                revoked_at,
                (revoked_at IS NOT NULL) AS is_revoked,
                created_at,
                updated_at,
                expires_at,
                last_used_at
            """,
            (
                str(REFRESH_TOKEN_GRACE_SECONDS),
                new_refresh_token_hash,
                user_agent,
                ip_address,
                expires_at,
                tenant_id,
                user_id,
                session_id,
                current_refresh_token_hash,
            ),
        )
        result = cur.fetchone()
    return dict(result) if result else None


def fetch_session_by_previous_refresh_token(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    session_id: str,
    refresh_token_hash: str,
) -> dict[str, Any] | None:
    """Find a session whose refresh token was JUST rotated past, within the
    grace window, by a concurrent request -- distinguishes a legitimate
    concurrent refresh from real token reuse/theft. Returns the session's
    CURRENT row (i.e. the winner's already-rotated hash), not a match on
    refresh_token_hash itself.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                session_id::text AS session_id,
                tenant_id::text AS tenant_id,
                user_id::text AS user_id,
                refresh_token_hash,
                user_agent,
                ip_address::text AS ip_address,
                revoked_at,
                (revoked_at IS NOT NULL) AS is_revoked,
                created_at,
                updated_at,
                expires_at,
                last_used_at
            FROM user_sessions
            WHERE tenant_id = %s
              AND user_id = %s
              AND session_id = %s
              AND previous_refresh_token_hash = %s
              AND previous_token_grace_expires_at IS NOT NULL
              AND previous_token_grace_expires_at > NOW()
              AND revoked_at IS NULL
            """,
            (tenant_id, user_id, session_id, refresh_token_hash),
        )
        result = cur.fetchone()
    return dict(result) if result else None


def revoke_user_session(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    session_id: str,
    refresh_token_hash: str | None = None,
) -> bool:
    """Mark one schema-native session as revoked."""
    query = """
        UPDATE user_sessions
        SET revoked_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = %s
          AND user_id = %s
          AND session_id = %s
          AND revoked_at IS NULL
    """
    params: list[Any] = [tenant_id, user_id, session_id]
    if refresh_token_hash is not None:
        query += " AND refresh_token_hash = %s"
        params.append(refresh_token_hash)

    with conn.cursor() as cur:
        cur.execute(query, tuple(params))
        return cur.rowcount > 0


def record_auth_event(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    session_id: str | None = None,
    event_type: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Insert an auth lifecycle event."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO auth_token_events (
                tenant_id,
                user_id,
                session_id,
                event_type,
                user_agent,
                ip_address,
                metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                tenant_id,
                user_id,
                session_id,
                event_type,
                user_agent,
                ip_address,
                Json(metadata) if metadata is not None else None,
            ),
        )


def _fetch_active_tenant_ids(conn: PGConnection) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text
            FROM tenants
            WHERE status = 'ACTIVE'
            ORDER BY id
            """
        )
        rows = cur.fetchall()
    return [str(row[0]) for row in rows]


def purge_expired_refresh_tokens(conn: PGConnection, *, tenant_id: str | None = None) -> None:
    """Delete expired refresh sessions with explicit tenant scoping."""
    tenant_ids = [tenant_id] if tenant_id is not None else _fetch_active_tenant_ids(conn)
    with conn.cursor() as cur:
        for scoped_tenant_id in tenant_ids:
            cur.execute(
                """
                DELETE FROM user_sessions
                WHERE tenant_id = %s
                  AND expires_at <= NOW()
                """,
                (scoped_tenant_id,),
            )


def purge_expired_sessions(conn: PGConnection, session_ttl: int, *, tenant_id: str | None = None) -> None:
    """Keep startup compatibility by purging expired user sessions."""
    del session_ttl
    purge_expired_refresh_tokens(conn, tenant_id=tenant_id)
