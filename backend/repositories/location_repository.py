"""Tenant-scoped location lookup repository functions."""

from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import Json, RealDictCursor

from backend.core.enums import NON_DELETED_LAYOUT_STATUSES


def fetch_sites(
    conn: PGConnection,
    *,
    tenant_id: str,
    page: int | None = None,
    limit: int | None = None,
    search: str | None = None,
    status_filter: str | None = None,
) -> list[dict[str, Any]]:
    """Fetch tenant-scoped sites with additive admin aggregate fields."""
    query = f"""
        SELECT
            s.id::text AS site_id,
            s.site_code,
            s.site_name,
            s.city,
            s.country,
            s.timezone,
            s.address_line1,
            s.address_line2,
            s.status,
            COALESCE(building_counts.building_count, 0)::integer AS building_count,
            COALESCE(floor_counts.floor_count, 0)::integer AS floor_count,
            COALESCE(seat_counts.seat_count, 0)::integer AS seat_count,
            COALESCE(seat_counts.active_seat_count, 0)::integer AS active_seat_count,
            COALESCE(seat_counts.bookable_seat_count, 0)::integer AS bookable_seat_count
        FROM sites AS s
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS building_count
            FROM buildings AS b
            WHERE b.tenant_id = s.tenant_id
              AND b.site_id = s.id
        ) AS building_counts ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS floor_count
            FROM floors AS f
            WHERE f.tenant_id = s.tenant_id
              AND f.site_id = s.id
        ) AS floor_counts ON TRUE
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::integer AS seat_count,
                COUNT(*) FILTER (WHERE st.status = 'ACTIVE')::integer AS active_seat_count,
                COUNT(*) FILTER (
                    WHERE st.status = 'ACTIVE'
                      AND st.is_bookable = TRUE
                )::integer AS bookable_seat_count
            FROM seats AS st
            WHERE st.tenant_id = s.tenant_id
              AND st.site_id = s.id
              {_SEAT_IN_PUBLISHED_LAYOUT_SQL}
        ) AS seat_counts ON TRUE
        WHERE s.tenant_id = %s
    """
    params: list[Any] = [tenant_id]
    query, params = _apply_status_filter(query, params, "s.status", status_filter)
    query, params = _apply_search_filter(
        query,
        params,
        search,
        ("s.site_code", "s.site_name", "s.city", "s.country"),
    )
    query += " ORDER BY s.site_name, s.site_code, s.id"
    query, params = _apply_pagination(query, params, page=page, limit=limit)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_buildings_by_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str | None = None,
    page: int | None = None,
    limit: int | None = None,
    search: str | None = None,
    status_filter: str | None = None,
) -> list[dict[str, Any]]:
    """Fetch buildings under one active tenant-scoped site."""
    query = f"""
        SELECT
            b.id::text AS building_id,
            b.site_id::text AS site_id,
            s.site_name,
            b.building_code,
            b.building_name,
            b.status,
            COALESCE(floor_counts.floor_count, 0)::integer AS floor_count,
            COALESCE(seat_counts.seat_count, 0)::integer AS seat_count,
            COALESCE(seat_counts.active_seat_count, 0)::integer AS active_seat_count,
            COALESCE(seat_counts.bookable_seat_count, 0)::integer AS bookable_seat_count
        FROM buildings AS b
        INNER JOIN sites AS s
            ON s.tenant_id = b.tenant_id
           AND s.id = b.site_id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS floor_count
            FROM floors AS f
            WHERE f.tenant_id = b.tenant_id
              AND f.building_id = b.id
        ) AS floor_counts ON TRUE
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::integer AS seat_count,
                COUNT(*) FILTER (WHERE st.status = 'ACTIVE')::integer AS active_seat_count,
                COUNT(*) FILTER (
                    WHERE st.status = 'ACTIVE'
                      AND st.is_bookable = TRUE
                )::integer AS bookable_seat_count
            FROM seats AS st
            WHERE st.tenant_id = b.tenant_id
              AND st.building_id = b.id
              {_SEAT_IN_PUBLISHED_LAYOUT_SQL}
        ) AS seat_counts ON TRUE
        WHERE b.tenant_id = %s
    """
    params: list[Any] = [tenant_id]
    if site_id is not None:
        query += """
        AND b.site_id = %s
    """
        params.append(site_id)
    query, params = _apply_status_filter(query, params, "b.status", status_filter)
    query, params = _apply_search_filter(
        query,
        params,
        search,
        ("b.building_code", "b.building_name"),
    )
    query += " ORDER BY b.building_code, b.id"
    query, params = _apply_pagination(query, params, page=page, limit=limit)
  

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_floors_by_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
    page: int | None = None,
    limit: int | None = None,
    search: str | None = None,
    status_filter: str | None = None,
) -> list[dict[str, Any]]:
    """Fetch floors under given building for one tenant-scoped site."""
    query = f"""
        SELECT
            f.id::text AS floor_id,
            f.site_id::text AS site_id,
            f.building_id::text AS building_id,
            b.building_code,
            b.building_name,
            f.floor_code,
            f.floor_name,
            f.status,
            COALESCE(seat_counts.seat_count, 0)::integer AS seat_count,
            COALESCE(seat_counts.active_seat_count, 0)::integer AS active_seat_count,
            COALESCE(seat_counts.bookable_seat_count, 0)::integer AS bookable_seat_count,
            COALESCE(layout_counts.layout_count, 0)::integer AS layout_count,
            COALESCE(layout_counts.published_layout_exists, FALSE) AS published_layout_exists,
            fl.id::text AS layout_id,
            fl.layout_name,
            fl.layout_file_url,
            fl.status AS layout_status,
            fl.is_published AS layout_is_published,
            fl.version_no AS layout_version_no,
            fl.updated_at AS layout_last_updated,
            pub.full_name AS published_by_name
        FROM floors AS f
        JOIN buildings AS b
            ON f.building_id = b.id
           AND f.tenant_id = b.tenant_id
           AND f.site_id = b.site_id
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::integer AS seat_count,
                COUNT(*) FILTER (WHERE st.status = 'ACTIVE')::integer AS active_seat_count,
                COUNT(*) FILTER (
                    WHERE st.status = 'ACTIVE'
                      AND st.is_bookable = TRUE
                )::integer AS bookable_seat_count
            FROM seats AS st
            WHERE st.tenant_id = f.tenant_id
              AND st.floor_id = f.id
              {_SEAT_IN_PUBLISHED_LAYOUT_SQL}
        ) AS seat_counts ON TRUE
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::integer AS layout_count,
                BOOL_OR(
                    flc.is_published = TRUE
                    AND flc.status = 'PUBLISHED'
                ) AS published_layout_exists
            FROM floor_layouts AS flc
            WHERE flc.tenant_id = f.tenant_id
              AND flc.floor_id = f.id
              AND flc.status = ANY(%s)
        ) AS layout_counts ON TRUE
        LEFT JOIN LATERAL (
            SELECT
                fl.id,
                fl.layout_name,
                fl.layout_file_url,
                fl.status,
                fl.is_published,
                fl.version_no,
                fl.created_at,
                fl.updated_at,
                fl.published_by_user_id
            FROM floor_layouts AS fl
            WHERE fl.tenant_id = f.tenant_id
              AND fl.site_id = f.site_id
              AND fl.building_id = f.building_id
              AND fl.floor_id = f.id
              AND fl.status = ANY(%s)
            ORDER BY
                CASE
                    WHEN fl.is_published = TRUE
                         AND fl.status = 'PUBLISHED'
                        THEN 0
                    ELSE 1
                END,
                fl.version_no DESC,
                fl.created_at DESC,
                fl.id DESC
            LIMIT 1
        ) AS fl ON TRUE
        LEFT JOIN app_users AS pub
            ON pub.id = fl.published_by_user_id
           AND pub.tenant_id = f.tenant_id
        WHERE b.id = %s
          AND f.tenant_id = %s
    """
    params: list[Any] = [
        list(NON_DELETED_LAYOUT_STATUSES),
        list(NON_DELETED_LAYOUT_STATUSES),
        building_id,
        tenant_id,
    ]
    query, params = _apply_status_filter(query, params, "f.status", status_filter)
    query, params = _apply_search_filter(
        query,
        params,
        search,
        ("f.floor_code", "f.floor_name"),
    )
    query += " ORDER BY b.building_code, f.floor_code, f.id"
    query, params = _apply_pagination(query, params, page=page, limit=limit)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_site_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped site with aggregate counts."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                s.id::text AS site_id,
                s.site_code,
                s.site_name,
                s.city,
                s.country,
                s.timezone,
                s.address_line1,
                s.address_line2,
                s.status,
                COALESCE(building_counts.building_count, 0)::integer AS building_count,
                COALESCE(floor_counts.floor_count, 0)::integer AS floor_count,
                COALESCE(seat_counts.seat_count, 0)::integer AS seat_count,
                COALESCE(seat_counts.active_seat_count, 0)::integer AS active_seat_count,
                COALESCE(seat_counts.bookable_seat_count, 0)::integer AS bookable_seat_count
            FROM sites AS s
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::integer AS building_count
                FROM buildings AS b
                WHERE b.tenant_id = s.tenant_id
                  AND b.site_id = s.id
            ) AS building_counts ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::integer AS floor_count
                FROM floors AS f
                WHERE f.tenant_id = s.tenant_id
                  AND f.site_id = s.id
            ) AS floor_counts ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::integer AS seat_count,
                    COUNT(*) FILTER (WHERE st.status = 'ACTIVE')::integer AS active_seat_count,
                    COUNT(*) FILTER (
                        WHERE st.status = 'ACTIVE'
                          AND st.is_bookable = TRUE
                    )::integer AS bookable_seat_count
                FROM seats AS st
                WHERE st.tenant_id = s.tenant_id
                  AND st.site_id = s.id
                  {_SEAT_IN_PUBLISHED_LAYOUT_SQL}
            ) AS seat_counts ON TRUE
            WHERE s.tenant_id = %s
              AND s.id = %s
            """,
            (tenant_id, site_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_site_duplicates(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_code: str | None = None,
    site_name: str | None = None,
    exclude_site_id: str | None = None,
) -> list[dict[str, Any]]:
    """Find site code/name conflicts within a tenant."""
    query = """
        SELECT
            id::text AS site_id,
            site_code,
            site_name
        FROM sites
        WHERE tenant_id = %s
          AND (
                (%s IS NOT NULL AND site_code = %s)
                OR (%s IS NOT NULL AND site_name = %s)
          )
    """
    params: list[Any] = [tenant_id, site_code, site_code, site_name, site_name]
    if exclude_site_id is not None:
        query += " AND id <> %s"
        params.append(exclude_site_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def insert_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_code: str,
    site_name: str,
    city: str,
    country: str,
    timezone: str,
    address_line1: str | None,
    address_line2: str | None,
    status: str,
) -> dict[str, Any]:
    """Insert one tenant-scoped site and reload it with aggregate fields."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO sites (
                tenant_id,
                site_code,
                site_name,
                city,
                country,
                timezone,
                address_line1,
                address_line2,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id::text AS site_id
            """,
            (
                tenant_id,
                site_code,
                site_name,
                city,
                country,
                timezone,
                address_line1,
                address_line2,
                status,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Created site could not be resolved.")

    site = fetch_site_by_id(conn, tenant_id=tenant_id, site_id=str(row["site_id"]))
    if site is None:
        raise LookupError("Created site could not be reloaded.")
    return site


def update_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update mutable site metadata only."""
    assignments: list[str] = []
    params: list[Any] = []
    for field_name, value in updates.items():
        assignments.append(f"{field_name} = %s")
        params.append(value)
    assignments.append("updated_at = NOW()")
    params.extend([tenant_id, site_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE sites
            SET {", ".join(assignments)}
            WHERE tenant_id = %s
              AND id = %s
            RETURNING id::text AS site_id
            """,
            params,
        )
        row = cur.fetchone()

    if row is None:
        return None
    return fetch_site_by_id(conn, tenant_id=tenant_id, site_id=str(row["site_id"]))



def fetch_building_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped building with aggregate counts."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                b.id::text AS building_id,
                b.site_id::text AS site_id,
                s.site_name,
                b.building_code,
                b.building_name,
                b.status,
                COALESCE(floor_counts.floor_count, 0)::integer AS floor_count,
                COALESCE(seat_counts.seat_count, 0)::integer AS seat_count,
                COALESCE(seat_counts.active_seat_count, 0)::integer AS active_seat_count,
                COALESCE(seat_counts.bookable_seat_count, 0)::integer AS bookable_seat_count
            FROM buildings AS b
            INNER JOIN sites AS s
                ON s.id = b.site_id
            AND s.tenant_id = b.tenant_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::integer AS floor_count
                FROM floors AS f
                WHERE f.tenant_id = b.tenant_id
                  AND f.building_id = b.id
            ) AS floor_counts ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::integer AS seat_count,
                    COUNT(*) FILTER (WHERE st.status = 'ACTIVE')::integer AS active_seat_count,
                    COUNT(*) FILTER (
                        WHERE st.status = 'ACTIVE'
                          AND st.is_bookable = TRUE
                    )::integer AS bookable_seat_count
                FROM seats AS st
                WHERE st.tenant_id = b.tenant_id
                  AND st.building_id = b.id
                  {_SEAT_IN_PUBLISHED_LAYOUT_SQL}
            ) AS seat_counts ON TRUE
            WHERE b.tenant_id = %s
              AND b.id = %s
            """,
            (tenant_id, building_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None

 
 


def fetch_building_duplicates(
    conn: PGConnection,
    *,
    site_id: str,
    building_code: str | None = None,
    building_name: str | None = None,
    exclude_building_id: str | None = None,
) -> list[dict[str, Any]]:
    """Find building code/name conflicts within a site."""
    query = """
        SELECT
            id::text AS building_id,
            building_code,
            building_name
        FROM buildings
        WHERE site_id = %s
          AND (
                (%s IS NOT NULL AND building_code = %s)
                OR (%s IS NOT NULL AND building_name = %s)
          )
    """
    params: list[Any] = [
        site_id,
        building_code,
        building_code,
        building_name,
        building_name,
    ]
    if exclude_building_id is not None:
        query += " AND id <> %s"
        params.append(exclude_building_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def insert_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_code: str,
    building_name: str,
    status: str,
) -> dict[str, Any]:
    """Insert one building and reload it with aggregate fields."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO buildings (
                tenant_id,
                site_id,
                building_code,
                building_name,
                status
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id::text AS building_id
            """,
            (
                tenant_id,
                site_id,
                building_code,
                building_name,
                status,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Created building could not be resolved.")

    building = fetch_building_by_id(
        conn,
        tenant_id=tenant_id,
        building_id=str(row["building_id"]),
    )
    if building is None:
        raise LookupError("Created building could not be reloaded.")
    return building


def update_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update mutable building metadata only."""
    assignments: list[str] = []
    params: list[Any] = []
    for field_name, value in updates.items():
        assignments.append(f"{field_name} = %s")
        params.append(value)
    assignments.append("updated_at = NOW()")
    params.extend([tenant_id, building_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE buildings
            SET {", ".join(assignments)}
            WHERE tenant_id = %s
              AND id = %s
            RETURNING id::text AS building_id
            """,
            params,
        )
        row = cur.fetchone()

    if row is None:
        return None
    return fetch_building_by_id(
        conn,
        tenant_id=tenant_id,
        building_id=str(row["building_id"]),
    )


def fetch_floor_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped floor with aggregate counts."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                f.id::text AS floor_id,
                f.site_id::text AS site_id,
                f.building_id::text AS building_id,
                b.building_code,
                b.building_name,
                f.floor_code,
                f.floor_name,
                f.status,
                COALESCE(seat_counts.seat_count, 0)::integer AS seat_count,
                COALESCE(seat_counts.active_seat_count, 0)::integer AS active_seat_count,
                COALESCE(seat_counts.bookable_seat_count, 0)::integer AS bookable_seat_count,
                COALESCE(layout_counts.layout_count, 0)::integer AS layout_count,
                COALESCE(layout_counts.published_layout_exists, FALSE) AS published_layout_exists,
                fl.id::text AS layout_id,
                fl.layout_name,
                fl.layout_file_url,
                fl.status AS layout_status,
                fl.is_published AS layout_is_published,
                fl.version_no AS layout_version_no
            FROM floors AS f
            INNER JOIN buildings AS b
                ON b.id = f.building_id
               AND b.tenant_id = f.tenant_id
               AND b.site_id = f.site_id
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::integer AS seat_count,
                    COUNT(*) FILTER (WHERE st.status = 'ACTIVE')::integer AS active_seat_count,
                    COUNT(*) FILTER (
                        WHERE st.status = 'ACTIVE'
                          AND st.is_bookable = TRUE
                    )::integer AS bookable_seat_count
                FROM seats AS st
                WHERE st.tenant_id = f.tenant_id
                  AND st.floor_id = f.id
                  {_SEAT_IN_PUBLISHED_LAYOUT_SQL}
            ) AS seat_counts ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::integer AS layout_count,
                    BOOL_OR(
                        flc.is_published = TRUE
                        AND flc.status = 'PUBLISHED'
                    ) AS published_layout_exists
                FROM floor_layouts AS flc
                WHERE flc.tenant_id = f.tenant_id
                  AND flc.floor_id = f.id
                  AND flc.status = ANY(%s)
            ) AS layout_counts ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    fl.id,
                    fl.layout_name,
                    fl.layout_file_url,
                    fl.status,
                    fl.is_published,
                    fl.version_no,
                    fl.created_at
                FROM floor_layouts AS fl
                WHERE fl.tenant_id = f.tenant_id
                  AND fl.floor_id = f.id
                  AND fl.status = ANY(%s)
                ORDER BY
                    CASE
                        WHEN fl.is_published = TRUE
                             AND fl.status = 'PUBLISHED'
                            THEN 0
                        ELSE 1
                    END,
                    fl.version_no DESC,
                    fl.created_at DESC,
                    fl.id DESC
                LIMIT 1
            ) AS fl ON TRUE
            WHERE f.tenant_id = %s
              AND f.id = %s
            """,
            (
                list(NON_DELETED_LAYOUT_STATUSES),
                list(NON_DELETED_LAYOUT_STATUSES),
                tenant_id,
                floor_id,
            ),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_floor_duplicates(
    conn: PGConnection,
    *,
    building_id: str,
    floor_code: str | None = None,
    floor_name: str | None = None,
    exclude_floor_id: str | None = None,
) -> list[dict[str, Any]]:
    """Find floor code/name conflicts within a building."""
    query = """
        SELECT
            id::text AS floor_id,
            floor_code,
            floor_name
        FROM floors
        WHERE building_id = %s
          AND (
                (%s IS NOT NULL AND floor_code = %s)
                OR (%s IS NOT NULL AND floor_name = %s)
          )
    """
    params: list[Any] = [
        building_id,
        floor_code,
        floor_code,
        floor_name,
        floor_name,
    ]
    if exclude_floor_id is not None:
        query += " AND id <> %s"
        params.append(exclude_floor_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]

def fetch_layout_seat_mapping_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_seat_mapping_id: str,
) -> dict[str, Any] | None:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT
                lsm.*
            FROM layout_seat_mappings AS lsm
            JOIN floor_layouts AS fl
                ON fl.id = lsm.layout_id
               AND fl.tenant_id = lsm.tenant_id
            WHERE lsm.tenant_id = %s
              AND lsm.id = %s
              AND fl.status = ANY(%s)
            """,
            (
                tenant_id,
                layout_seat_mapping_id,
                list(NON_DELETED_LAYOUT_STATUSES),
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def update_layout_seat_mapping_configuration(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_seat_mapping_id: str,
    seat_name: str | None,
    seat_type: str | None,
    status: str | None,
    is_bookable: bool | None,
    is_reserved: bool | None,
    amenity_ids: list[int] | None,
    updated_by: str,
) -> dict[str, Any]:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            UPDATE layout_seat_mappings
            SET
                seat_name = COALESCE(%s, seat_name),
                seat_type = COALESCE(%s, seat_type),
                status = COALESCE(%s, status),
                is_bookable = COALESCE(%s, is_bookable),
                is_reserved = COALESCE(%s, is_reserved),

                amenity_ids = COALESCE(%s::jsonb, amenity_ids),

                is_configured = TRUE,
                configuration_status = 'COMPLETED',

                updated_by = %s,
                updated_at = NOW()

            WHERE tenant_id = %s
              AND id = %s

            RETURNING *
            """,
            (
                seat_name,
                seat_type,
                status,
                is_bookable,
                is_reserved,

                Json(amenity_ids) if amenity_ids is not None else None,

                updated_by,
                tenant_id,
                layout_seat_mapping_id,
            ),
        )

        row = cur.fetchone()

    if row is None:
        raise LookupError("Layout seat mapping update failed.")

    return dict(row)

def upsert_operational_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    seat_code: str,
    seat_name: str | None = None,
    seat_type: str | None,
    status: str | None,
    is_bookable: bool | None,
    is_reserved: bool | None = None,
    svg_element_id: str,
    source_layout_mapping_id: str | None = None,
) -> dict[str, Any]:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            INSERT INTO seats (
                tenant_id,
                layout_id,
                site_id,
                building_id,
                floor_id,
                seat_code,
                seat_name,
                seat_type,
                is_bookable,
                is_reserved,
                status,
                svg_element_id,
                source_layout_mapping_id,
                live_from
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW()
            )

            ON CONFLICT (
                floor_id,
                seat_code
            )

            DO UPDATE SET
                layout_id = EXCLUDED.layout_id,
                seat_name = EXCLUDED.seat_name,
                seat_type = EXCLUDED.seat_type,
                is_bookable = EXCLUDED.is_bookable,
                is_reserved = EXCLUDED.is_reserved,
                status = EXCLUDED.status,
                svg_element_id = EXCLUDED.svg_element_id,
                source_layout_mapping_id = EXCLUDED.source_layout_mapping_id,
                live_from = COALESCE(seats.live_from, NOW()),
                live_until = NULL,
                retired_reason = NULL,
                updated_at = NOW()

            RETURNING
                id::text AS seat_id
            """,
            (
                tenant_id,
                layout_id,
                site_id,
                building_id,
                floor_id,
                seat_code,
                seat_name,
                seat_type,
                is_bookable,
                is_reserved,
                status,
                svg_element_id,
                source_layout_mapping_id,
            ),
        )

        row = cur.fetchone()

    if row is None:
        raise LookupError("Seat upsert failed.")

    return dict(row)
def replace_seat_amenities(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_id: str,
    amenity_ids: list[int],
    assigned_by_user_id: str,
) -> None:

    with conn.cursor() as cur:

        cur.execute(
            """
            DELETE FROM seat_amenities
            WHERE tenant_id = %s
              AND seat_id = %s
            """,
            (
                tenant_id,
                seat_id,
            ),
        )

        if not amenity_ids:
            return

        values = [
            (
                tenant_id,
                seat_id,
                amenity_id,
                assigned_by_user_id,
            )
            for amenity_id in amenity_ids
        ]

        cur.executemany(
            """
            INSERT INTO seat_amenities (
                tenant_id,
                seat_id,
                amenity_id,
                assigned_by_user_id
            )
            VALUES (%s, %s, %s, %s)
            """,
            values,
        )

def fetch_seat_amenity_ids(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_id: str,
) -> list[str]:

    with conn.cursor() as cur:

        cur.execute(
            """
            SELECT amenity_id
            FROM seat_amenities
            WHERE tenant_id = %s
              AND seat_id = %s
            ORDER BY amenity_id
            """,
            (
                tenant_id,
                seat_id,
            ),
        )

        rows = cur.fetchall()

    return [int(row[0]) for row in rows]


def fetch_seat_amenity_names(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_id: str,
) -> list[str]:
    """Return amenity display names for a single seat, ordered alphabetically."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.amenity_name
            FROM seat_amenities sa
            INNER JOIN amenities a
                ON a.id = sa.amenity_id
               AND a.tenant_id = sa.tenant_id
            WHERE sa.tenant_id = %s
              AND sa.seat_id = %s
            ORDER BY a.amenity_name
            """,
            (tenant_id, seat_id),
        )
        rows = cur.fetchall()
    return [row[0] for row in rows]







def insert_floor(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_code: str,
    floor_name: str,
    status: str,
) -> dict[str, Any]:
    """Insert one floor and reload it with aggregate fields."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO floors (
                tenant_id,
                site_id,
                building_id,
                floor_code,
                floor_name,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id::text AS floor_id
            """,
            (
                tenant_id,
                site_id,
                building_id,
                floor_code,
                floor_name,
                status,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Created floor could not be resolved.")

    floor = fetch_floor_by_id(conn, tenant_id=tenant_id, floor_id=str(row["floor_id"]))
    if floor is None:
        raise LookupError("Created floor could not be reloaded.")
    return floor


def update_floor(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update mutable floor metadata only."""
    assignments: list[str] = []
    params: list[Any] = []
    for field_name, value in updates.items():
        assignments.append(f"{field_name} = %s")
        params.append(value)
    assignments.append("updated_at = NOW()")
    params.extend([tenant_id, floor_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE floors
            SET {", ".join(assignments)}
            WHERE tenant_id = %s
              AND id = %s
            RETURNING id::text AS floor_id
            """,
            params,
        )
        row = cur.fetchone()

    if row is None:
        return None
    return fetch_floor_by_id(conn, tenant_id=tenant_id, floor_id=str(row["floor_id"]))


def fetch_seat_configuration(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_id: str,
    require_current_layout: bool = False,
) -> dict[str, Any] | None:
    """Fetch one tenant-scoped seat for configuration updates.

    Admin seat-configuration callers intentionally leave
    ``require_current_layout`` False -- they must still be able to find and
    fix a seat left over from a superseded layout. Callers validating
    booking-time eligibility should pass True so a stale seat is treated as
    not found, matching the booking/availability queries.
    """
    query = """
        SELECT
            id::text AS seat_id,
            site_id::text AS site_id,
            building_id::text AS building_id,
            floor_id::text AS floor_id,
            seat_code,
            status,
            is_bookable
        FROM seats
        WHERE tenant_id = %s
          AND id = %s
    """
    if require_current_layout:
        query += """
          AND layout_id = (
              SELECT id
              FROM floor_layouts
              WHERE floor_id = seats.floor_id
                AND tenant_id = seats.tenant_id
                AND is_published = TRUE
                AND status = 'PUBLISHED'
          )
        """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, (tenant_id, seat_id))
        row = cur.fetchone()
    return dict(row) if row else None


def update_seat_configuration(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update soft seat configuration flags only."""
    assignments: list[str] = []
    params: list[Any] = []
    for field_name, value in updates.items():
        assignments.append(f"{field_name} = %s")
        params.append(value)
    assignments.append("updated_at = NOW()")
    params.extend([tenant_id, seat_id])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE seats
            SET {", ".join(assignments)}
            WHERE tenant_id = %s
              AND id = %s
            RETURNING
                id::text AS seat_id,
                site_id::text AS site_id,
                building_id::text AS building_id,
                floor_id::text AS floor_id,
                seat_code,
                status,
                is_bookable
            """,
            params,
        )
        row = cur.fetchone()
    return dict(row) if row else None


def _apply_status_filter(
    query: str,
    params: list[Any],
    column: str,
    status_filter: str | None,
) -> tuple[str, list[Any]]:
    if status_filter is None:
        return query, params
    query += f" AND {column} = %s"
    params.append(status_filter)
    return query, params


def _apply_search_filter(
    query: str,
    params: list[Any],
    search: str | None,
    columns: tuple[str, ...],
) -> tuple[str, list[Any]]:
    normalized = str(search or "").strip()
    if not normalized:
        return query, params

    query += " AND (" + " OR ".join(f"{column} ILIKE %s" for column in columns) + ")"
    params.extend([f"%{normalized}%" for _ in columns])
    return query, params


def _apply_pagination(
    query: str,
    params: list[Any],
    *,
    page: int | None,
    limit: int | None,
) -> tuple[str, list[Any]]:
    if limit is None:
        return query, params

    effective_page = page or 1
    offset = (effective_page - 1) * limit
    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    return query, params


def fetch_seats_by_floor(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    booking_date: date,
    amenity_ids: list[int],
) -> list[dict[str, Any]]:
    """Fetch computed seat state for one tenant-scoped floor."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            WITH requested_amenities AS (
                SELECT DISTINCT UNNEST(%s::bigint[]) AS amenity_id
            ),
            requested_count AS (
                SELECT COUNT(*)::integer AS requested_amenity_count
                FROM requested_amenities
            ),
            booked_seats AS (
                SELECT DISTINCT bkg.seat_id
                FROM bookings AS bkg
                WHERE bkg.tenant_id = %s
                  AND bkg.floor_id = %s
                  AND bkg.booking_date = %s
                  AND bkg.booking_status IN ('CONFIRMED', 'CHECKED_IN')
            ),
            blocked_seats AS (
                SELECT DISTINCT bl.seat_id
                FROM public.blocked_seats AS bl
                WHERE bl.tenant_id = %s
                  AND bl.floor_id = %s
                  AND bl.status = 'ACTIVE'
                  AND bl.blocked_from <= %s
                  AND bl.blocked_to >= %s
            ),
            amenity_matches AS (
                SELECT
                    sa.seat_id,
                    ARRAY_AGG(sa.amenity_id ORDER BY sa.amenity_id) AS matched_amenity_ids,
                    COUNT(sa.amenity_id)::integer AS matched_amenity_count
                FROM seat_amenities AS sa
                INNER JOIN requested_amenities AS ra
                    ON ra.amenity_id = sa.amenity_id
                WHERE sa.tenant_id = %s
                GROUP BY sa.seat_id
            ),
            seat_state AS (
                SELECT
                    s.id,
                    s.seat_code AS code,
                    s.map_x AS x,
                    s.map_y AS y,
                    s.map_width AS w,
                    s.map_height AS h,
                    s.rotation_angle,
                    COALESCE(am.matched_amenity_ids, ARRAY[]::bigint[]) AS matched_amenity_ids,
                    COALESCE(am.matched_amenity_count, 0)::integer AS matched_amenity_count,
                    rc.requested_amenity_count,
                    CASE
                        WHEN s.status <> 'ACTIVE' OR s.is_bookable IS NOT TRUE
                            THEN 'UNAVAILABLE'
                        WHEN bs.seat_id IS NOT NULL
                            THEN 'BOOKED'
                        WHEN bls.seat_id IS NOT NULL
                            THEN 'BLOCKED'
                        ELSE 'AVAILABLE'
                    END AS availability_status
                FROM seats AS s
                JOIN floors AS f
                    ON s.floor_id = f.id
                   AND s.tenant_id = f.tenant_id
                   AND s.site_id = f.site_id
                   AND s.building_id = f.building_id
                   AND f.status = 'ACTIVE'
                JOIN buildings AS b
                    ON f.building_id = b.id
                   AND f.tenant_id = b.tenant_id
                   AND f.site_id = b.site_id
                   AND b.status = 'ACTIVE'
                JOIN sites AS si
                    ON b.site_id = si.id
                   AND b.tenant_id = si.tenant_id
                   AND si.status = 'ACTIVE'
                -- Only seats belonging to the floor's currently published
                -- layout are shown -- everything else is a stale/orphaned
                -- row left over from a superseded layout.
                JOIN floor_layouts AS fl
                    ON fl.floor_id = s.floor_id
                   AND fl.tenant_id = s.tenant_id
                   AND fl.is_published = TRUE
                   AND fl.status = 'PUBLISHED'
                   AND fl.id = s.layout_id
                CROSS JOIN requested_count AS rc
                LEFT JOIN booked_seats AS bs
                    ON bs.seat_id = s.id
                LEFT JOIN blocked_seats AS bls
                    ON bls.seat_id = s.id
                LEFT JOIN amenity_matches AS am
                    ON am.seat_id = s.id
                WHERE s.tenant_id = %s
                  AND s.floor_id = %s
            )
            SELECT
                id::text AS seat_id,
                code AS seat_code,
                x,
                y,
                w,
                h,
                rotation_angle,
                availability_status AS status,
                availability_status = 'AVAILABLE' AS selectable,
                matched_amenity_ids,
                matched_amenity_count,
                requested_amenity_count,
                CASE
                    WHEN requested_amenity_count = 0
                        THEN 'NOT_APPLICABLE'
                    WHEN matched_amenity_count = requested_amenity_count
                        THEN 'FULL_MATCH'
                    WHEN matched_amenity_count > 0
                        THEN 'PARTIAL_MATCH'
                    ELSE 'NO_MATCH'
                END AS preference_match_status,
                CASE
                    WHEN availability_status <> 'AVAILABLE'
                        THEN 'UNAVAILABLE'
                    WHEN requested_amenity_count > 0
                         AND matched_amenity_count = requested_amenity_count
                        THEN 'BEST_MATCH'
                    ELSE 'AVAILABLE'
                END AS ui_state
            FROM seat_state
            ORDER BY code, id
            """,
            (
                amenity_ids,
                tenant_id,
                floor_id,
                booking_date,
                tenant_id,
                floor_id,
                booking_date,
                booking_date,
                tenant_id,
                tenant_id,
                floor_id,
            ),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]
