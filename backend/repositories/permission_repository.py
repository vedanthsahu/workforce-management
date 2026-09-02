"""
Repository helpers for database-backed RBAC permissions.
"""

from __future__ import annotations

from psycopg2.extensions import connection as PGConnection


def fetch_permissions_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[str]:
    """Return active permissions granted to a user via their assigned groups.

    Union across every group the user belongs to (user_groups ->
    group_permissions -> permissions). tenant_id is filtered explicitly here
    as an application-level guard, since group/user assignment does not yet
    have a database-level tenant-match trigger.
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
