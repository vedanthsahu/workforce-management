from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection


def fetch_active_amenities(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[dict[str, Any]]:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                amenities.id::text AS id,
                amenities.amenity_key AS key,
                amenities.amenity_name AS name,
                COALESCE(ac.category_name, amenities.category) AS category,
                amenities.description,
                amenities.icon_name AS icon
            FROM amenities
            LEFT JOIN amenity_categories AS ac
                ON ac.id = amenities.category_id
               AND (
                    ac.tenant_id = amenities.tenant_id
                    OR ac.tenant_id IS NULL
               )
            WHERE amenities.tenant_id = %s
              AND amenities.is_active = true
            ORDER BY
                COALESCE(ac.category_name, amenities.category),
                amenities.amenity_name
            """,
            (tenant_id,),
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_amenity_categories(
    conn: PGConnection,
    *,
    tenant_id: str,
    page: int = 1,
    limit: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
) -> dict[str, Any]:
    """Fetch system plus tenant categories with usage counts."""
    offset = (page - 1) * limit
    params: dict[str, Any] = {
        "tenant_id": tenant_id,
        "limit": limit,
        "offset": offset,
        "search": f"%{search.strip()}%" if search and search.strip() else None,
        "is_active": is_active,
    }
    base_from = "FROM amenity_categories AS ac"
    where_clause = """
        WHERE (
                ac.tenant_id = %(tenant_id)s
                OR ac.tenant_id IS NULL
          )
          AND (
                %(is_active)s IS NULL
                OR ac.is_active = %(is_active)s
          )
          AND (
                %(search)s IS NULL
                OR ac.category_key ILIKE %(search)s
                OR ac.category_name ILIKE %(search)s
                OR ac.description ILIKE %(search)s
          )
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT COUNT(*)::integer AS total
            {base_from}
            {where_clause}
            """,
            params,
        )
        total_row = cur.fetchone()
        total = int(total_row["total"]) if total_row else 0

        cur.execute(
            f"""
            SELECT
                ac.id::text AS category_id,
                ac.tenant_id::text AS tenant_id,
                ac.category_key,
                ac.category_name,
                ac.description,
                ac.search_keywords,
                ac.is_system_defined,
                ac.is_active,
                COALESCE(amenity_counts.amenity_count, 0)::integer AS amenity_count,
                COALESCE(amenity_counts.active_amenity_count, 0)::integer AS active_amenity_count
            {base_from}
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::integer AS amenity_count,
                    COUNT(*) FILTER (WHERE a.is_active = TRUE)::integer AS active_amenity_count
                FROM amenities AS a
                WHERE a.tenant_id = %(tenant_id)s
                  AND a.category_id = ac.id
            ) AS amenity_counts ON TRUE
            {where_clause}
            ORDER BY ac.category_name, ac.category_key, ac.id
            LIMIT %(limit)s
            OFFSET %(offset)s
            """,
            params,
        )
        rows = cur.fetchall()

    return {
        "items": [_normalize_category_row(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


def fetch_amenity_category_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_id: str,
    active_only: bool = True,
) -> dict[str, Any] | None:
    """Fetch a system or tenant-scoped amenity category."""
    query = """
        SELECT
            id::text AS category_id,
            tenant_id::text AS tenant_id,
            category_key,
            category_name,
            description,
            search_keywords,
            is_system_defined,
            is_active
        FROM amenity_categories
        WHERE id = %s
          AND (
                tenant_id = %s
                OR tenant_id IS NULL
          )
    """
    params: list[Any] = [category_id, tenant_id]
    if active_only:
        query += " AND is_active = TRUE"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()

    return _normalize_category_row(row) if row else None


def fetch_amenity_category_duplicates(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_name: str | None = None,
    category_key: str | None = None,
    exclude_category_id: str | None = None,
) -> list[dict[str, Any]]:
    """Find tenant-scoped category name/key conflicts."""
    query = """
        SELECT
            id::text AS category_id,
            category_key,
            category_name
        FROM amenity_categories
        WHERE tenant_id = %s
          AND (
                (%s IS NOT NULL AND LOWER(category_name) = LOWER(%s))
                OR (%s IS NOT NULL AND LOWER(category_key) = LOWER(%s))
          )
    """
    params: list[Any] = [
        tenant_id,
        category_name,
        category_name,
        category_key,
        category_key,
    ]
    if exclude_category_id is not None:
        query += " AND id <> %s"
        params.append(exclude_category_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def insert_amenity_category(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_key: str,
    category_name: str,
    description: str | None,
    search_keywords: list[str] | None,
    is_active: bool,
) -> dict[str, Any]:
    """Insert one tenant category and reload it."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO amenity_categories (
                tenant_id,
                category_key,
                category_name,
                description,
                search_keywords,
                is_system_defined,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, FALSE, %s)
            RETURNING id::text AS category_id
            """,
            (
                tenant_id,
                category_key,
                category_name,
                description,
                search_keywords,
                is_active,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Created amenity category could not be resolved.")

    category = fetch_amenity_category_by_id(
        conn,
        tenant_id=tenant_id,
        category_id=str(row["category_id"]),
        active_only=False,
    )
    if category is None:
        raise LookupError("Created amenity category could not be reloaded.")
    return category


def update_amenity_category(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update mutable tenant category metadata only."""
    assignments: list[str] = []
    params: list[Any] = []
    for field_name, value in updates.items():
        assignments.append(f"{field_name} = %s")
        params.append(value)
    assignments.append("updated_at = NOW()")
    params.extend([tenant_id, category_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE amenity_categories
            SET {", ".join(assignments)}
            WHERE tenant_id = %s
              AND id = %s
            RETURNING id::text AS category_id
            """,
            params,
        )
        row = cur.fetchone()

        if row is not None and "category_name" in updates:
            cur.execute(
                """
                UPDATE amenities
                SET
                    category = %s,
                    updated_at = NOW()
                WHERE tenant_id = %s
                  AND category_id = %s
                """,
                (
                    updates["category_name"],
                    tenant_id,
                    category_id,
                ),
            )

    if row is None:
        return None
    return fetch_amenity_category_by_id(
        conn,
        tenant_id=tenant_id,
        category_id=str(row["category_id"]),
        active_only=False,
    )


def fetch_amenity_category_metrics(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> dict[str, int]:
    """Fetch admin category dashboard counts for system plus tenant categories."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*)::integer AS total_categories,
                COUNT(*) FILTER (WHERE is_active = TRUE)::integer AS active_categories,
                COUNT(*) FILTER (WHERE is_active = FALSE)::integer AS inactive_categories,
                COUNT(*) FILTER (WHERE tenant_id IS NULL)::integer AS system_categories,
                COUNT(*) FILTER (WHERE tenant_id = %s)::integer AS tenant_categories
            FROM amenity_categories
            WHERE tenant_id = %s
               OR tenant_id IS NULL
            """,
            (
                tenant_id,
                tenant_id,
            ),
        )
        row = cur.fetchone() or {}

    return {
        "total_categories": int(row.get("total_categories") or 0),
        "active_categories": int(row.get("active_categories") or 0),
        "inactive_categories": int(row.get("inactive_categories") or 0),
        "system_categories": int(row.get("system_categories") or 0),
        "tenant_categories": int(row.get("tenant_categories") or 0),
    }


def count_amenities_for_category(
    conn: PGConnection,
    *,
    tenant_id: str,
    category_id: str,
) -> dict[str, int]:
    """Count tenant amenities assigned to one category."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*)::integer AS amenity_count,
                COUNT(*) FILTER (WHERE is_active = TRUE)::integer AS active_amenity_count
            FROM amenities
            WHERE tenant_id = %s
              AND category_id = %s
            """,
            (
                tenant_id,
                category_id,
            ),
        )
        row = cur.fetchone() or {}

    return {
        "amenity_count": int(row.get("amenity_count") or 0),
        "active_amenity_count": int(row.get("active_amenity_count") or 0),
    }


def fetch_amenity_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    amenity_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped amenity with assignment counts."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                a.id::text AS amenity_id,
                a.amenity_key,
                a.amenity_name,
                a.description,
                a.icon_name,
                a.category_id::text AS category_id,
                COALESCE(ac.category_name, a.category) AS category_name,
                a.is_active,
                COALESCE(assignments.assigned_seat_count, 0)::integer AS assigned_seat_count
            FROM amenities AS a
            LEFT JOIN amenity_categories AS ac
                ON ac.id = a.category_id
               AND (
                    ac.tenant_id = a.tenant_id
                    OR ac.tenant_id IS NULL
               )
            LEFT JOIN LATERAL (
                SELECT COUNT(DISTINCT sa.seat_id)::integer AS assigned_seat_count
                FROM seat_amenities AS sa
                WHERE sa.tenant_id = a.tenant_id
                  AND sa.amenity_id = a.id
            ) AS assignments ON TRUE
            WHERE a.tenant_id = %s
              AND a.id = %s
            """,
            (tenant_id, amenity_id),
        )
        row = cur.fetchone()

    return dict(row) if row else None


def fetch_amenity_duplicates(
    conn: PGConnection,
    *,
    tenant_id: str,
    amenity_key: str,
    exclude_amenity_id: str | None = None,
) -> list[dict[str, Any]]:
    """Find tenant-scoped amenity key conflicts."""
    query = """
        SELECT
            id::text AS amenity_id,
            amenity_key
        FROM amenities
        WHERE tenant_id = %s
          AND LOWER(amenity_key) = LOWER(%s)
    """
    params: list[Any] = [tenant_id, amenity_key]
    if exclude_amenity_id is not None:
        query += " AND id <> %s"
        params.append(exclude_amenity_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def insert_amenity(
    conn: PGConnection,
    *,
    tenant_id: str,
    amenity_key: str,
    amenity_name: str,
    description: str | None,
    icon_name: str | None,
    category_id: str,
    category_name: str,
    is_active: bool,
) -> dict[str, Any]:
    """Insert one amenity and reload it with assignment counts."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO amenities (
                tenant_id,
                amenity_key,
                amenity_name,
                description,
                icon_name,
                category_id,
                category,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id::text AS amenity_id
            """,
            (
                tenant_id,
                amenity_key,
                amenity_name,
                description,
                icon_name,
                category_id,
                category_name,
                is_active,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Created amenity could not be resolved.")

    amenity = fetch_amenity_by_id(
        conn,
        tenant_id=tenant_id,
        amenity_id=str(row["amenity_id"]),
    )
    if amenity is None:
        raise LookupError("Created amenity could not be reloaded.")
    return amenity


def update_amenity(
    conn: PGConnection,
    *,
    tenant_id: str,
    amenity_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update mutable amenity metadata only."""
    assignments: list[str] = []
    params: list[Any] = []
    for field_name, value in updates.items():
        assignments.append(f"{field_name} = %s")
        params.append(value)
    assignments.append("updated_at = NOW()")
    params.extend([tenant_id, amenity_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE amenities
            SET {", ".join(assignments)}
            WHERE tenant_id = %s
              AND id = %s
            RETURNING id::text AS amenity_id
            """,
            params,
        )
        row = cur.fetchone()

    if row is None:
        return None
    return fetch_amenity_by_id(
        conn,
        tenant_id=tenant_id,
        amenity_id=str(row["amenity_id"]),
    )


def fetch_amenities(
    conn: PGConnection,
    *,
    tenant_id: str,
    page: int = 1,
    limit: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
) -> dict[str, Any]:
    """Fetch paginated amenity admin rows and dashboard metrics."""
    offset = (page - 1) * limit
    params: dict[str, Any] = {
        "tenant_id": tenant_id,
        "limit": limit,
        "offset": offset,
        "search": f"%{search.strip()}%" if search and search.strip() else None,
        "is_active": is_active,
    }
    from_and_where = """
        FROM amenities AS a
        LEFT JOIN amenity_categories AS ac
            ON ac.id = a.category_id
           AND (
                ac.tenant_id = a.tenant_id
                OR ac.tenant_id IS NULL
           )
        LEFT JOIN LATERAL (
            SELECT COUNT(DISTINCT sa.seat_id)::integer AS assigned_seat_count
            FROM seat_amenities AS sa
            WHERE sa.tenant_id = a.tenant_id
              AND sa.amenity_id = a.id
        ) AS assignments ON TRUE
        WHERE a.tenant_id = %(tenant_id)s
          AND (
                %(is_active)s IS NULL
                OR a.is_active = %(is_active)s
          )
          AND (
                %(search)s IS NULL
                OR a.amenity_key ILIKE %(search)s
                OR a.amenity_name ILIKE %(search)s
                OR COALESCE(ac.category_name, a.category) ILIKE %(search)s
          )
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT COUNT(*)::integer AS total
            {from_and_where}
            """,
            params,
        )
        total_row = cur.fetchone()
        total = int(total_row["total"]) if total_row else 0

        cur.execute(
            f"""
            SELECT
                a.id::text AS amenity_id,
                a.amenity_key,
                a.amenity_name,
                a.description,
                a.icon_name,
                a.category_id::text AS category_id,
                COALESCE(ac.category_name, a.category) AS category_name,
                a.is_active,
                COALESCE(assignments.assigned_seat_count, 0)::integer AS assigned_seat_count
            {from_and_where}
            ORDER BY COALESCE(ac.category_name, a.category), a.amenity_name, a.id
            LIMIT %(limit)s
            OFFSET %(offset)s
            """,
            params,
        )
        rows = cur.fetchall()

        cur.execute(
            """
            SELECT
                COUNT(*)::integer AS total_amenities,
                COUNT(*) FILTER (WHERE is_active = TRUE)::integer AS active_amenities,
                COUNT(*) FILTER (WHERE is_active = FALSE)::integer AS inactive_amenities,
                (
                    SELECT COUNT(DISTINCT sa.amenity_id)::integer
                    FROM seat_amenities AS sa
                    WHERE sa.tenant_id = %(tenant_id)s
                ) AS assigned_amenities
            FROM amenities
            WHERE tenant_id = %(tenant_id)s
            """,
            {"tenant_id": tenant_id},
        )
        metrics = cur.fetchone() or {}

    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
        "total_amenities": int(metrics.get("total_amenities") or 0),
        "active_amenities": int(metrics.get("active_amenities") or 0),
        "inactive_amenities": int(metrics.get("inactive_amenities") or 0),
        "assigned_amenities": int(metrics.get("assigned_amenities") or 0),
    }


def _normalize_category_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(row)
    normalized["search_keywords"] = list(normalized.get("search_keywords") or [])
    return normalized
