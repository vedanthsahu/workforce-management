"""
Repository helpers for database-backed RBAC permissions.
"""

from __future__ import annotations

from psycopg2.extensions import connection as PGConnection


def fetch_permissions_for_role(
    conn: PGConnection,
    *,
    tenant_id: str,
    role_name: str,
) -> list[str]:
    """Return active permissions assigned to a tenant-scoped role."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT
                p.permission_key
            FROM roles AS r
            INNER JOIN role_permissions AS rp
                ON rp.role_id = r.id
            INNER JOIN permissions AS p
                ON p.id = rp.permission_id
            WHERE r.tenant_id = %s
              AND UPPER(REPLACE(r.role_name, ' ', '_')) = UPPER(REPLACE(%s, ' ', '_'))
              AND r.is_active = TRUE
              AND p.is_active = TRUE
            ORDER BY p.permission_key
            """,
            (
                tenant_id,
                role_name,
            ),
        )
        rows = cur.fetchall()

    return [str(row[0]) for row in rows]
