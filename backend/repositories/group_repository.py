"""Repository helpers for the group-based permission model: group CRUD,
group permissions, user<->group assignment, and role<->group eligibility."""

from __future__ import annotations

from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


def fetch_groups_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Return the groups currently assigned to a user, tenant-scoped."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                g.id::text AS group_id,
                g.group_name,
                g.description,
                g.is_system,
                ug.created_at AS assigned_at,
                ug.assigned_by_user_id::text AS assigned_by_user_id
            FROM user_groups AS ug
            INNER JOIN groups AS g
                ON g.id = ug.group_id
            WHERE ug.user_id = %s
              AND g.tenant_id = %s
            ORDER BY g.group_name
            """,
            (user_id, tenant_id),
        )
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_group_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    group_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped group by id."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id::text AS group_id,
                tenant_id::text AS tenant_id,
                group_name,
                description,
                is_system,
                is_active,
                group_tier,
                version
            FROM groups
            WHERE id = %s
              AND tenant_id = %s
            """,
            (group_id, tenant_id),
        )
        result = cur.fetchone()

    return dict(result) if result else None


def is_group_eligible_for_role(
    conn: PGConnection,
    *,
    tenant_id: str,
    group_id: str,
    role_name: str,
) -> bool:
    """Return whether a group is in the target role's eligibility list.

    Matches role_name the same way the rest of the app already does
    (app_users.role_name is not guaranteed to be underscore-normalized --
    confirmed live that Front Office is stored as 'FRONT OFFICE').
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM role_groups AS rg
            INNER JOIN roles AS r
                ON r.id = rg.role_id
            WHERE rg.group_id = %s
              AND r.tenant_id = %s
              AND UPPER(REPLACE(r.role_name, ' ', '_')) = UPPER(REPLACE(%s, ' ', '_'))
            LIMIT 1
            """,
            (group_id, tenant_id, role_name),
        )
        return cur.fetchone() is not None


def insert_user_group(
    conn: PGConnection,
    *,
    user_id: str,
    group_id: str,
    assigned_by_user_id: str | None,
) -> None:
    """Assign a group to a user.

    Raises psycopg2.errors.UniqueViolation if the user already has this
    group -- callers should catch it and translate to a 409.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_groups (user_id, group_id, assigned_by_user_id)
            VALUES (%s, %s, %s)
            """,
            (user_id, group_id, assigned_by_user_id),
        )


def delete_user_group(
    conn: PGConnection,
    *,
    user_id: str,
    group_id: str,
) -> bool:
    """Remove a group from a user. Returns whether a row was actually deleted."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM user_groups WHERE user_id = %s AND group_id = %s",
            (user_id, group_id),
        )
        return cur.rowcount > 0


def fetch_groups_for_tenant(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[dict[str, Any]]:
    """List every group in a tenant with aggregate permission/user counts.

    One query, not N+1 -- counts come from LEFT JOINs + GROUP BY rather than
    a per-group follow-up query.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                g.id::text AS group_id,
                g.group_name,
                g.description,
                g.is_system,
                g.is_active,
                g.group_tier,
                g.version,
                COUNT(DISTINCT gp.permission_id) AS permission_count,
                COUNT(DISTINCT ug.user_id) AS assigned_user_count
            FROM groups AS g
            LEFT JOIN group_permissions AS gp ON gp.group_id = g.id
            LEFT JOIN user_groups AS ug ON ug.group_id = g.id
            WHERE g.tenant_id = %s
            GROUP BY g.id
            ORDER BY g.group_name
            """,
            (tenant_id,),
        )
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_group_detail(
    conn: PGConnection,
    *,
    tenant_id: str,
    group_id: str,
) -> dict[str, Any] | None:
    """Fetch one group plus its current permission list."""
    group = fetch_group_by_id(conn, tenant_id=tenant_id, group_id=group_id)
    if group is None:
        return None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT p.id::text AS permission_id, p.permission_key, p.module_name
            FROM group_permissions AS gp
            INNER JOIN permissions AS p ON p.id = gp.permission_id
            WHERE gp.group_id = %s
            ORDER BY p.module_name, p.permission_key
            """,
            (group_id,),
        )
        group["permissions"] = [dict(row) for row in cur.fetchall()]

    return group


def fetch_permission_ids_for_group(
    conn: PGConnection,
    *,
    group_id: str,
) -> set[int]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT permission_id FROM group_permissions WHERE group_id = %s",
            (group_id,),
        )
        return {row[0] for row in cur.fetchall()}


def fetch_group_reference_counts(
    conn: PGConnection,
    *,
    group_id: str,
) -> dict[str, int]:
    """How many users/roles currently reference a group -- used to decide
    whether it's safe to delete."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM user_groups WHERE group_id = %s", (group_id,))
        user_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM role_groups WHERE group_id = %s", (group_id,))
        role_count = cur.fetchone()[0]
    return {"user_count": user_count, "role_count": role_count}


def insert_group(
    conn: PGConnection,
    *,
    tenant_id: str,
    group_name: str,
    description: str | None,
    group_tier: str,
) -> dict[str, Any]:
    """Create a new (custom) group. Raises psycopg2.errors.UniqueViolation on
    a duplicate normalized name -- caller translates to a 409."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO groups (tenant_id, group_name, description, group_tier, is_system)
            VALUES (%s, %s, %s, %s, FALSE)
            RETURNING id::text AS group_id, group_name, description, group_tier, is_system, is_active, version
            """,
            (tenant_id, group_name, description, group_tier),
        )
        return dict(cur.fetchone())


def insert_group_permissions(
    conn: PGConnection,
    *,
    group_id: str,
    permission_ids: list[int],
) -> None:
    """Attach a list of permissions to a group. Raises
    psycopg2.errors.UniqueViolation (tenant_id, permission_set_hash) if the
    resulting set duplicates another group's -- caller translates to a 409."""
    if not permission_ids:
        return
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO group_permissions (group_id, permission_id) VALUES (%s, %s)",
            [(group_id, pid) for pid in permission_ids],
        )


def replace_group_permissions(
    conn: PGConnection,
    *,
    group_id: str,
    permission_ids: list[int],
) -> None:
    """Replace a group's entire permission set. Raises
    psycopg2.errors.UniqueViolation if the new set duplicates another
    group's."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM group_permissions WHERE group_id = %s", (group_id,))
    insert_group_permissions(conn, group_id=group_id, permission_ids=permission_ids)


def update_group_metadata(
    conn: PGConnection,
    *,
    tenant_id: str,
    group_id: str,
    group_name: str | None,
    description: str | None,
    expected_version: int,
) -> dict[str, Any] | None:
    """Update a group's name/description with optimistic locking. Returns
    None if the version didn't match (caller translates to a 409) or the
    group doesn't exist."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE groups
            SET
                group_name = COALESCE(%s, group_name),
                description = COALESCE(%s, description),
                version = version + 1,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
              AND version = %s
            RETURNING id::text AS group_id, group_name, description, group_tier, is_system, is_active, version
            """,
            (group_name, description, group_id, tenant_id, expected_version),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def deactivate_group(
    conn: PGConnection,
    *,
    tenant_id: str,
    group_id: str,
) -> bool:
    """Soft-delete: mark a group inactive rather than removing the row."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE groups SET is_active = FALSE, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
            """,
            (group_id, tenant_id),
        )
        return cur.rowcount > 0


def fetch_groups_for_role(
    conn: PGConnection,
    *,
    tenant_id: str,
    role_id: str,
) -> list[dict[str, Any]]:
    """Groups currently eligible for a role (role_groups)."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT g.id::text AS group_id, g.group_name, g.group_tier, g.is_system
            FROM role_groups AS rg
            INNER JOIN groups AS g ON g.id = rg.group_id
            WHERE rg.role_id = %s
              AND g.tenant_id = %s
            ORDER BY g.group_tier, g.group_name
            """,
            (role_id, tenant_id),
        )
        return [dict(row) for row in cur.fetchall()]


def insert_role_group(
    conn: PGConnection,
    *,
    role_id: str,
    group_id: str,
) -> None:
    """Raises psycopg2.errors.UniqueViolation if already eligible."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO role_groups (role_id, group_id) VALUES (%s, %s)",
            (role_id, group_id),
        )


def delete_role_group(
    conn: PGConnection,
    *,
    role_id: str,
    group_id: str,
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM role_groups WHERE role_id = %s AND group_id = %s",
            (role_id, group_id),
        )
        return cur.rowcount > 0


def fetch_role_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    role_id: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id::text AS role_id, role_name, tenant_id::text AS tenant_id
            FROM roles
            WHERE id = %s AND tenant_id = %s
            """,
            (role_id, tenant_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None
