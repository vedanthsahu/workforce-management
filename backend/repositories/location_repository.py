"""Tenant-scoped location lookup repository functions."""

from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection


def fetch_sites(conn: PGConnection, *, tenant_id: str) -> list[dict[str, Any]]:
    """Fetch active sites for one tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id::text AS site_id,
                site_code,
                site_name,
                city,
                country,
                timezone,
                address_line1,
                address_line2,
                status
            FROM sites
            WHERE tenant_id = %s
              AND status = 'ACTIVE'
            ORDER BY site_name, site_code, id
            """,
            (tenant_id,),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_buildings_by_site(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
) -> list[dict[str, Any]]:
    """Fetch active buildings under one active tenant-scoped site."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                b.id::text AS building_id,
                b.site_id::text AS site_id,
                b.building_code,
                b.building_name,
                b.status
            FROM buildings AS b
            INNER JOIN sites AS s
                ON s.tenant_id = b.tenant_id
               AND s.id = b.site_id
            WHERE b.tenant_id = %s
              AND b.site_id = %s
              AND b.status = 'ACTIVE'
              AND s.status = 'ACTIVE'
            ORDER BY b.building_code, b.id
            """,
            (tenant_id, site_id),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_floors_by_building(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
) -> list[dict[str, Any]]:
    """Fetch floors under given building for one tenant-scoped site."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                f.id::text AS floor_id,
                f.site_id::text AS site_id,
                f.building_id::text AS building_id,
                b.building_code,
                b.building_name,
                f.floor_code,
                f.floor_name,
                f.status,
                fl.id::text AS layout_id,
                fl.layout_name,
                fl.layout_file_url,
                fl.status AS layout_status,
                fl.is_published AS layout_is_published,
                fl.version_no AS layout_version_no
            FROM floors AS f
            JOIN buildings AS b
                ON f.building_id = b.id
               AND f.tenant_id = b.tenant_id
               AND f.site_id = b.site_id
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
                  AND fl.site_id = f.site_id
                  AND fl.building_id = f.building_id
                  AND fl.floor_id = f.id
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
            WHERE b.id = %s
              AND f.tenant_id = %s
              AND b.status = %s
            ORDER BY b.building_code, f.floor_code, f.id
            """,
            (building_id, tenant_id,"ACTIVE"),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


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
                JOIN buildings AS b
                    ON f.building_id = b.id
                   AND f.tenant_id = b.tenant_id
                   AND f.site_id = b.site_id
                JOIN sites AS si
                    ON b.site_id = si.id
                   AND b.tenant_id = si.tenant_id
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
                code,
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
