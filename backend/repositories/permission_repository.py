"""
Repository helpers for database-backed RBAC permissions.
"""

from __future__ import annotations

from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


def fetch_permissions_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[str]:
    """Return active permissions granted to a user via their assigned groups.

    Union across every group the user belongs to (user_groups ->
    group_permissions -> permissions). tenant_id is filtered explicitly here
    as defense-in-depth alongside the tenant-match trigger on user_groups.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT
                p.permission_key
            FROM user_groups AS ug
            INNER JOIN groups AS g
                ON g.id = ug.group_id
            INNER JOIN group_permissions AS gp
                ON gp.group_id = ug.group_id
            INNER JOIN permissions AS p
                ON p.id = gp.permission_id
            WHERE ug.user_id = %s
              AND g.tenant_id = %s
              AND g.is_active = TRUE
              AND p.is_active = TRUE
            ORDER BY p.permission_key
            """,
            (
                user_id,
                tenant_id,
            ),
        )
        rows = cur.fetchall()

    return [str(row[0]) for row in rows]


def fetch_effective_permission_ids_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> set[int]:
    """Return the set of permission ids a user effectively holds.

    Same union as fetch_permissions_for_user, but by id rather than key --
    used for escalation checks (comparing a set of ids being granted against
    what the actor already holds), not for attaching to a request context.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT p.id
            FROM user_groups AS ug
            INNER JOIN groups AS g
                ON g.id = ug.group_id
            INNER JOIN group_permissions AS gp
                ON gp.group_id = ug.group_id
            INNER JOIN permissions AS p
                ON p.id = gp.permission_id
            WHERE ug.user_id = %s
              AND g.tenant_id = %s
              AND g.is_active = TRUE
              AND p.is_active = TRUE
            """,
            (user_id, tenant_id),
        )
        return {row[0] for row in cur.fetchall()}


def fetch_permissions_catalog(
    conn: PGConnection,
    *,
    active_only: bool = True,
) -> list[dict[str, Any]]:
    """Return the full permission catalog (global, not tenant-scoped)."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                id::text AS permission_id,
                permission_key,
                description,
                module_name,
                enforcement_scope,
                is_active
            FROM permissions
            {"WHERE is_active = TRUE" if active_only else ""}
            ORDER BY module_name, permission_key
            """
        )
        rows = cur.fetchall()

    return [dict(row) for row in rows]
