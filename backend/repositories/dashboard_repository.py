"""
Repository queries for admin dashboard analytics.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection

HierarchyGroupLevel = Literal["site", "building", "floor"]


def fetch_site_scope(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    active_only: bool = False,
) -> dict[str, Any] | None:
    """
    Fetch one tenant-scoped site for hierarchy validation.
    """

    query = """
        SELECT
            id::text AS site_id,
            status
        FROM sites
        WHERE tenant_id = %s
          AND id = %s
    """
    params: list[Any] = [tenant_id, site_id]
    if active_only:
        query += " AND status = 'ACTIVE'"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()

    return dict(row) if row else None


def fetch_building_scope(
    conn: PGConnection,
    *,
    tenant_id: str,
    building_id: str,
    active_only: bool = False,
) -> dict[str, Any] | None:
    """
    Fetch one tenant-scoped building for hierarchy validation.
    """

    query = """
        SELECT
            id::text AS building_id,
            site_id::text AS site_id,
            status
        FROM buildings
        WHERE tenant_id = %s
          AND id = %s
    """
    params: list[Any] = [tenant_id, building_id]
    if active_only:
        query += " AND status = 'ACTIVE'"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()

    return dict(row) if row else None


def fetch_floor_scope(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    active_only: bool = False,
) -> dict[str, Any] | None:
    """
    Fetch one tenant-scoped floor for hierarchy validation.
    """

    query = """
        SELECT
            id::text AS floor_id,
            site_id::text AS site_id,
            building_id::text AS building_id,
            status
        FROM floors
        WHERE tenant_id = %s
          AND id = %s
    """
    params: list[Any] = [tenant_id, floor_id]
    if active_only:
        query += " AND status = 'ACTIVE'"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()

    return dict(row) if row else None


def fetch_admin_dashboard_summary(
    conn: PGConnection,
    *,
    tenant_id: str,
    selected_date: date,
    site_id: str | None = None,
    floor_id: str | None = None,
) -> dict[str, Any]:
    """
    Fetch aggregated admin dashboard summary metrics.
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            WITH scoped_sites AS (
                SELECT
                    s.id,
                    s.status
                FROM sites AS s
                WHERE s.tenant_id = %(tenant_id)s
                  AND (
                        %(site_id)s IS NULL
                        OR s.id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR EXISTS (
                            SELECT 1
                            FROM floors AS f
                            WHERE f.tenant_id = s.tenant_id
                              AND f.site_id = s.id
                              AND f.id = %(floor_id)s::bigint
                        )
                  )
            ),

            scoped_buildings AS (
                SELECT
                    b.id,
                    b.status
                FROM buildings AS b
                WHERE b.tenant_id = %(tenant_id)s
                  AND (
                        %(site_id)s IS NULL
                        OR b.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR EXISTS (
                            SELECT 1
                            FROM floors AS f
                            WHERE f.tenant_id = b.tenant_id
                              AND f.site_id = b.site_id
                              AND f.building_id = b.id
                              AND f.id = %(floor_id)s::bigint
                        )
                  )
            ),

            scoped_floors AS (
                SELECT
                    f.id,
                    f.status
                FROM floors AS f
                WHERE f.tenant_id = %(tenant_id)s
                  AND (
                        %(site_id)s IS NULL
                        OR f.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR f.id = %(floor_id)s::bigint
                  )
            ),

            scoped_seats AS (
                SELECT
                    st.id,
                    st.status,
                    st.is_bookable
                FROM seats AS st
                WHERE st.tenant_id = %(tenant_id)s
                  AND (
                        %(site_id)s IS NULL
                        OR st.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR st.floor_id = %(floor_id)s::bigint
                  )
            ),

            booked_seats AS (
                SELECT
                    b.id,
                    b.seat_id,
                    b.booked_for_user_id
                FROM bookings AS b
                WHERE b.tenant_id = %(tenant_id)s
                  AND b.booking_date = %(selected_date)s
                  AND b.booking_status IN (
                        'CONFIRMED',
                        'CHECKED_IN'
                  )
                  AND (
                        %(site_id)s IS NULL
                        OR b.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR b.floor_id = %(floor_id)s::bigint
                  )
            ),

            blocked_seat_counts AS (
                SELECT COUNT(DISTINCT bs.seat_id) AS blocked_seats
                FROM blocked_seats AS bs
                WHERE bs.tenant_id = %(tenant_id)s
                  AND bs.status = 'ACTIVE'
                  AND %(selected_date)s BETWEEN bs.blocked_from AND bs.blocked_to
                  AND (
                        %(site_id)s IS NULL
                        OR bs.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR bs.floor_id = %(floor_id)s::bigint
                  )
            ),

            summary_counts AS (
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM scoped_sites
                    ) AS total_offices,

                    (
                        SELECT COUNT(*)
                        FROM scoped_buildings
                    ) AS total_buildings,

                    (
                        SELECT COUNT(*)
                        FROM scoped_floors
                    ) AS total_floors,

                    (
                        SELECT COUNT(*)
                        FROM scoped_seats
                        WHERE status = 'ACTIVE'
                          AND is_bookable = TRUE
                    ) AS total_seats,

                    (
                        SELECT COUNT(*)
                        FROM scoped_sites
                        WHERE status = 'ACTIVE'
                    ) AS active_sites,

                    (
                        SELECT COUNT(*)
                        FROM scoped_sites
                        WHERE status = 'INACTIVE'
                    ) AS inactive_sites,

                    (
                        SELECT COUNT(*)
                        FROM scoped_buildings
                        WHERE status = 'ACTIVE'
                    ) AS active_buildings,

                    (
                        SELECT COUNT(*)
                        FROM scoped_buildings
                        WHERE status = 'INACTIVE'
                    ) AS inactive_buildings,

                    (
                        SELECT COUNT(*)
                        FROM scoped_floors
                        WHERE status = 'ACTIVE'
                    ) AS active_floors,

                    (
                        SELECT COUNT(*)
                        FROM scoped_floors
                        WHERE status = 'INACTIVE'
                    ) AS inactive_floors,

                    (
                        SELECT COUNT(*)
                        FROM scoped_seats
                        WHERE status = 'ACTIVE'
                    ) AS active_seats,

                    (
                        SELECT COUNT(*)
                        FROM scoped_seats
                        WHERE status = 'INACTIVE'
                    ) AS inactive_seats,

                    (
                        SELECT COUNT(DISTINCT seat_id)
                        FROM booked_seats
                    ) AS booked_seats_count,

                    (
                        SELECT blocked_seats
                        FROM blocked_seat_counts
                    ) AS blocked_seats,

                    (
                        SELECT COUNT(*)
                        FROM booked_seats
                    ) AS total_bookings,

                    (
                        SELECT COUNT(DISTINCT booked_for_user_id)
                        FROM booked_seats
                    ) AS unique_users_booked
            ),

            utilization_metrics AS (
                SELECT
                    *,
                    COALESCE(
                        ROUND(
                            (
                                booked_seats_count::numeric
                                /
                                NULLIF(total_seats, 0)
                            ) * 100,
                            1
                        ),
                        0.0
                    ) AS booking_utilization_percentage
                FROM summary_counts
            )

            SELECT
                total_offices,
                total_buildings,
                total_floors,
                total_seats,
                booked_seats_count AS booked_today,
                booked_seats_count AS booked_seats_today,
                blocked_seats,
                blocked_seats AS blocked_seats_today,
                booking_utilization_percentage AS occupancy_percentage,
                total_bookings,
                unique_users_booked,
                booking_utilization_percentage,
                active_sites,
                inactive_sites,
                active_buildings,
                inactive_buildings,
                active_floors,
                inactive_floors,
                active_seats,
                inactive_seats
            FROM utilization_metrics
            """,
            {
                "tenant_id": tenant_id,
                "selected_date": selected_date,
                "site_id": site_id,
                "floor_id": floor_id,
            },
        )

        row = cur.fetchone()

    return dict(row) if row else {}
 

def _fetch_employee_activity_rows(
    conn: PGConnection,
    *,
    tenant_id: str,
    activity_date: date | None = None,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch employee booking activities.
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT

                CONCAT('employee-booking-', b.id::text) AS activity_id,

                'EMPLOYEE_BOOKING' AS activity_type,
                TRUE AS has_booking,

                b.id::text AS booking_id,

                NULL::text AS guest_visit_id,

                b.booking_status AS activity_status,

                b.booking_date AS activity_date,

                booked_by.id::text AS booked_by_id,
                booked_by.full_name AS booked_by_name,
                booked_by.email AS booked_by_email,
                booked_by.role_name AS booked_by_role,
                booked_by.department AS booked_by_department,
                booked_by.job_title AS booked_by_job_title,

                booked_for.id::text AS booked_for_id,
                booked_for.full_name AS booked_for_name,
                booked_for.email AS booked_for_email,
                booked_for.role_name AS booked_for_role,
                booked_for.department AS booked_for_department,
                booked_for.job_title AS booked_for_job_title,

                NULL::text AS booked_for_guest_type,

                s.id::text AS seat_id,
                s.seat_code,
                s.seat_type,
                s.seat_neighborhood,

                si.id::text AS site_id,
                si.site_code,
                si.site_name,

                bu.id::text AS building_id,
                bu.building_code,
                bu.building_name,

                fl.id::text AS floor_id,
                fl.floor_code,
                fl.floor_name,

                b.check_in_at,
                b.checked_out_at,
                b.created_at,
                b.updated_at

            FROM bookings b

            INNER JOIN app_users booked_by
                ON booked_by.id = b.booked_by_user_id
               AND booked_by.tenant_id = b.tenant_id

            INNER JOIN app_users booked_for
                ON booked_for.id = b.booked_for_user_id
               AND booked_for.tenant_id = b.tenant_id

            INNER JOIN seats s
                ON s.id = b.seat_id
               AND s.tenant_id = b.tenant_id
               AND s.site_id = b.site_id
               AND s.building_id = b.building_id
               AND s.floor_id = b.floor_id

            INNER JOIN sites si
                ON si.id = b.site_id
               AND si.tenant_id = b.tenant_id

            INNER JOIN buildings bu
                ON bu.id = b.building_id
               AND bu.tenant_id = b.tenant_id
               AND bu.site_id = b.site_id

            INNER JOIN floors fl
                ON fl.id = b.floor_id
               AND fl.tenant_id = b.tenant_id
               AND fl.site_id = b.site_id
               AND fl.building_id = b.building_id

            WHERE b.tenant_id = %(tenant_id)s

              AND b.booking_type = 'EMPLOYEE'

              AND (%(activity_date)s IS NULL
                OR b.booking_date = %(activity_date)s)

              AND (
                    %(site_id)s IS NULL
                    OR b.site_id = %(site_id)s::bigint
              )

              AND (
                    %(building_id)s IS NULL
                    OR b.building_id = %(building_id)s::bigint
              )

              AND (
                    %(floor_id)s IS NULL
                    OR b.floor_id = %(floor_id)s::bigint
              )
            ORDER BY
                b.updated_at DESC,
                b.id DESC
            LIMIT 100
            """,
            {
                "tenant_id": tenant_id,
                "activity_date": activity_date,
                "site_id": site_id,
                "building_id": building_id,
                "floor_id": floor_id,
            },
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]

def _fetch_guest_activity_rows(
    conn: PGConnection,
    *,
    tenant_id: str,
    activity_date: date | None = None,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch guest visit activities.
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                CASE
                    WHEN b.id IS NULL
                        THEN CONCAT('guest-visit-', gv.id::text)
                    ELSE CONCAT('guest-booking-', b.id::text)
                END AS activity_id,

                CASE
                    WHEN b.id IS NULL THEN 'GUEST_VISIT'
                    ELSE 'GUEST_BOOKING'
                END AS activity_type,

                (b.id IS NOT NULL) AS has_booking,

                CASE
                    WHEN b.id IS NULL
                        THEN CONCAT('guest-visit-', gv.id::text)
                    ELSE CONCAT('guest-booking-', b.id::text)
                END AS activity_id,

                CASE
                    WHEN b.id IS NULL THEN 'GUEST_VISIT'
                    ELSE 'GUEST_BOOKING'
                END AS activity_type,

                (b.id IS NOT NULL) AS has_booking,

                b.id::text AS booking_id,

                gv.id::text AS guest_visit_id,

                gv.visit_status AS activity_status,

                COALESCE(b.booking_date, gv.visit_date) AS activity_date,

                booked_by.id::text AS booked_by_id,
                booked_by.full_name AS booked_by_name,
                booked_by.email AS booked_by_email,
                booked_by.role_name AS booked_by_role,
                booked_by.department AS booked_by_department,
                booked_by.job_title AS booked_by_job_title,

                g.id::text AS booked_for_id,
                g.full_name AS booked_for_name,
                g.email AS booked_for_email,
                NULL::text AS booked_for_role,
                NULL::text AS booked_for_department,
                NULL::text AS booked_for_job_title,

                gv.guest_type AS booked_for_guest_type,

                gv.id::text AS guest_visit_id,

                gv.visit_status AS activity_status,

                COALESCE(b.booking_date, gv.visit_date) AS activity_date,

                booked_by.id::text AS booked_by_id,
                booked_by.full_name AS booked_by_name,
                booked_by.email AS booked_by_email,
                booked_by.role_name AS booked_by_role,
                booked_by.department AS booked_by_department,
                booked_by.job_title AS booked_by_job_title,

                g.id::text AS booked_for_id,
                g.full_name AS booked_for_name,
                g.email AS booked_for_email,
                NULL::text AS booked_for_role,
                NULL::text AS booked_for_department,
                NULL::text AS booked_for_job_title,

                gv.guest_type AS booked_for_guest_type,

                s.id::text AS seat_id,
                s.seat_code,
                s.seat_type,
                s.seat_neighborhood,
                s.id::text AS seat_id,
                s.seat_code,
                s.seat_type,
                s.seat_neighborhood,

                si.id::text AS site_id,
                si.site_code,
                si.site_name,

                bu.id::text AS building_id,
                bu.building_code,
                bu.building_name,

                fl.id::text AS floor_id,
                fl.floor_code,
                fl.floor_name,

                gv.checked_in_at AS check_in_at,
                gv.checked_out_at,
                COALESCE(b.created_at, gv.created_at) AS created_at,
                COALESCE(b.updated_at, gv.updated_at) AS updated_at

            FROM guest_visits gv

            INNER JOIN guests g
                ON g.id = gv.guest_id
               AND g.tenant_id = gv.tenant_id

            LEFT JOIN LATERAL (
                SELECT guest_booking.*
                FROM bookings guest_booking
                WHERE guest_booking.guest_visit_id = gv.id
                  AND guest_booking.tenant_id = gv.tenant_id
                  AND guest_booking.booking_type = 'GUEST'
                ORDER BY
                    guest_booking.created_at DESC,
                    guest_booking.id DESC
                LIMIT 1
            ) b ON TRUE

            LEFT JOIN app_users booked_by
                ON booked_by.id = COALESCE(
                    b.booked_by_user_id,
                    gv.created_by_user_id
                )
               AND booked_by.tenant_id = gv.tenant_id

            LEFT JOIN seats s
                ON s.id = b.seat_id
               AND s.tenant_id = gv.tenant_id
               AND s.site_id = b.site_id
               AND s.building_id = b.building_id
               AND s.floor_id = b.floor_id

            INNER JOIN sites si
                ON si.id = COALESCE(b.site_id, gv.site_id)
               AND si.tenant_id = gv.tenant_id

            INNER JOIN buildings bu
                ON bu.id = COALESCE(b.building_id, gv.building_id)
               AND bu.tenant_id = gv.tenant_id
               AND bu.site_id = si.id

            LEFT JOIN floors fl
                ON fl.id = COALESCE(b.floor_id, gv.floor_id)
               AND fl.tenant_id = gv.tenant_id
               AND fl.site_id = si.id
               AND fl.building_id = bu.id

            WHERE gv.tenant_id = %(tenant_id)s

            
            AND (%(activity_date)s IS NULL
                OR COALESCE(b.booking_date, gv.visit_date) = %(activity_date)s)
              AND (
                    %(site_id)s IS NULL
                    OR COALESCE(b.site_id, gv.site_id) = %(site_id)s::bigint
              )

              AND (
                    %(building_id)s IS NULL
                    OR COALESCE(b.building_id, gv.building_id) = %(building_id)s::bigint
              )

              AND (
                    %(floor_id)s IS NULL
                    OR COALESCE(b.floor_id, gv.floor_id) = %(floor_id)s::bigint
              )

            ORDER BY
                COALESCE(b.updated_at, gv.updated_at) DESC,
                gv.id DESC
            LIMIT 100
            """,
            {
                "tenant_id": tenant_id,
                "activity_date": activity_date,
                "site_id": site_id,
                "building_id": building_id,
                "floor_id": floor_id,
            },
        )


        rows = cur.fetchall()

    return [dict(row) for row in rows]

def fetch_admin_activity_list(
    conn: PGConnection,
    *,
    tenant_id: str,
    activity_date: date | None = None,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch latest dashboard activities.
    """
    employee_rows = _fetch_employee_activity_rows(
        conn,
        tenant_id=tenant_id,
        activity_date=activity_date,
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
    )
    guest_rows = _fetch_guest_activity_rows(
        conn,
        tenant_id=tenant_id,
        activity_date=activity_date,
        site_id=site_id,
        building_id=building_id,
        floor_id=floor_id,
    )

    activities = employee_rows + guest_rows
    activities.sort(
        key=lambda row: (row.get("updated_at") is not None, row.get("updated_at")),
        reverse=True,
    )

    return activities[:100]


def fetch_date_range_occupancy(
    conn: PGConnection,
    *,
    tenant_id: str,
    start_date: date,
    end_date: date,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch occupancy metrics for each date in a range using PostgreSQL grouping.
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            WITH dates AS (
                SELECT
                    generate_series(
                        %(start_date)s::date,
                        %(end_date)s::date,
                        interval '1 day'
                    )::date AS occupancy_date
            ),

            filtered_seats AS (
                SELECT
                    s.id AS seat_id,
                    s.site_id,
                    s.building_id,
                    s.floor_id
                FROM seats AS s
                WHERE s.tenant_id = %(tenant_id)s
                  AND s.status = 'ACTIVE'
                  AND s.is_bookable = TRUE
                  AND (
                        %(site_id)s IS NULL
                        OR s.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(building_id)s IS NULL
                        OR s.building_id = %(building_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR s.floor_id = %(floor_id)s::bigint
                  )
            ),

            seat_inventory AS (
                SELECT COUNT(*)::integer AS total_seats
                FROM filtered_seats
            ),

            blocked_by_date AS (
                SELECT
                    d.occupancy_date,
                    COUNT(DISTINCT bs.seat_id)::integer AS blocked_seats
                FROM dates AS d
                INNER JOIN blocked_seats AS bs
                    ON bs.tenant_id = %(tenant_id)s
                   AND bs.status = 'ACTIVE'
                   AND d.occupancy_date BETWEEN bs.blocked_from AND bs.blocked_to
                INNER JOIN filtered_seats AS fs
                    ON fs.seat_id = bs.seat_id
                   AND fs.site_id = bs.site_id
                   AND fs.building_id = bs.building_id
                   AND fs.floor_id = bs.floor_id
                GROUP BY d.occupancy_date
            ),

            booked_by_date AS (
                SELECT
                    b.booking_date AS occupancy_date,
                    COUNT(DISTINCT b.seat_id)::integer AS booked_seats
                FROM bookings AS b
                INNER JOIN filtered_seats AS fs
                    ON fs.seat_id = b.seat_id
                   AND fs.site_id = b.site_id
                   AND fs.building_id = b.building_id
                   AND fs.floor_id = b.floor_id
                WHERE b.tenant_id = %(tenant_id)s
                  AND b.booking_date BETWEEN %(start_date)s AND %(end_date)s
                  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
                GROUP BY b.booking_date
            ),

            daily_metrics AS (
                SELECT
                    d.occupancy_date AS date,
                    si.total_seats,
                    COALESCE(bd.blocked_seats, 0)::integer AS blocked_seats,
                    GREATEST(
                        si.total_seats - COALESCE(bd.blocked_seats, 0),
                        0
                    )::integer AS available_seats,
                    COALESCE(bkd.booked_seats, 0)::integer AS booked_seats
                FROM dates AS d
                CROSS JOIN seat_inventory AS si
                LEFT JOIN blocked_by_date AS bd
                    ON bd.occupancy_date = d.occupancy_date
                LEFT JOIN booked_by_date AS bkd
                    ON bkd.occupancy_date = d.occupancy_date
            )

            SELECT
                date,
                total_seats,
                blocked_seats,
                available_seats,
                booked_seats,
                CASE
                    WHEN available_seats = 0
                        THEN 0.0
                    ELSE ROUND(
                        (
                            booked_seats::numeric
                            / available_seats::numeric
                        ) * 100,
                        2
                    )::float
                END AS occupancy_rate
            FROM daily_metrics
            ORDER BY date ASC
            """,
            {
                "tenant_id": tenant_id,
                "start_date": start_date,
                "end_date": end_date,
                "site_id": site_id,
                "building_id": building_id,
                "floor_id": floor_id,
            },
        )
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_hierarchy_occupancy(
    conn: PGConnection,
    *,
    tenant_id: str,
    selected_date: date,
    group_level: HierarchyGroupLevel,
    site_id: str | None = None,
    building_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch occupancy metrics grouped by site, building, or floor.
    """

    group_sql, group_seat_column = _hierarchy_group_sql(group_level)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            WITH groups AS (
                {group_sql}
            ),

            filtered_seats AS (
                SELECT
                    s.id AS seat_id,
                    s.site_id,
                    s.building_id,
                    s.floor_id,
                    g.group_id
                FROM groups AS g
                INNER JOIN seats AS s
                    ON s.{group_seat_column} = g.group_id
                WHERE s.tenant_id = %(tenant_id)s
                  AND s.status = 'ACTIVE'
                  AND s.is_bookable = TRUE
            ),

            seat_counts AS (
                SELECT
                    group_id,
                    COUNT(*)::integer AS total_seats
                FROM filtered_seats
                GROUP BY group_id
            ),

            blocked_counts AS (
                SELECT
                    fs.group_id,
                    COUNT(DISTINCT bs.seat_id)::integer AS blocked_seats
                FROM filtered_seats AS fs
                INNER JOIN blocked_seats AS bs
                    ON bs.seat_id = fs.seat_id
                   AND bs.site_id = fs.site_id
                   AND bs.building_id = fs.building_id
                   AND bs.floor_id = fs.floor_id
                WHERE bs.tenant_id = %(tenant_id)s
                  AND bs.status = 'ACTIVE'
                  AND %(selected_date)s BETWEEN bs.blocked_from AND bs.blocked_to
                GROUP BY fs.group_id
            ),

            booked_counts AS (
                SELECT
                    fs.group_id,
                    COUNT(DISTINCT b.seat_id)::integer AS booked_seats
                FROM filtered_seats AS fs
                INNER JOIN bookings AS b
                    ON b.seat_id = fs.seat_id
                   AND b.site_id = fs.site_id
                   AND b.building_id = fs.building_id
                   AND b.floor_id = fs.floor_id
                WHERE b.tenant_id = %(tenant_id)s
                  AND b.booking_date = %(selected_date)s
                  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
                GROUP BY fs.group_id
            ),

            metrics AS (
                SELECT
                    g.group_id,
                    g.group_name,
                    COALESCE(sc.total_seats, 0)::integer AS total_seats,
                    COALESCE(bl.blocked_seats, 0)::integer AS blocked_seats,
                    GREATEST(
                        COALESCE(sc.total_seats, 0)
                        - COALESCE(bl.blocked_seats, 0),
                        0
                    )::integer AS available_seats,
                    COALESCE(bk.booked_seats, 0)::integer AS booked_seats
                FROM groups AS g
                LEFT JOIN seat_counts AS sc
                    ON sc.group_id = g.group_id
                LEFT JOIN blocked_counts AS bl
                    ON bl.group_id = g.group_id
                LEFT JOIN booked_counts AS bk
                    ON bk.group_id = g.group_id
            )

            SELECT
                group_id::text AS group_id,
                group_name,
                total_seats,
                blocked_seats,
                available_seats,
                booked_seats,
                CASE
                    WHEN available_seats = 0
                        THEN 0.0
                    ELSE ROUND(
                        (
                            booked_seats::numeric
                            / available_seats::numeric
                        ) * 100,
                        2
                    )::float
                END AS occupancy_rate
            FROM metrics
            ORDER BY group_name ASC, group_id ASC
            """,
            {
                "tenant_id": tenant_id,
                "selected_date": selected_date,
                "site_id": site_id,
                "building_id": building_id,
            },
        )
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def _hierarchy_group_sql(group_level: HierarchyGroupLevel) -> tuple[str, str]:
    if group_level == "site":
        return (
            """
            SELECT
                si.id AS group_id,
                si.site_name AS group_name
            FROM sites AS si
            WHERE si.tenant_id = %(tenant_id)s
              AND si.status = 'ACTIVE'
            """,
            "site_id",
        )

    if group_level == "building":
        return (
            """
            SELECT
                bu.id AS group_id,
                bu.building_name AS group_name
            FROM buildings AS bu
            INNER JOIN sites AS si
                ON si.id = bu.site_id
               AND si.tenant_id = bu.tenant_id
            WHERE bu.tenant_id = %(tenant_id)s
              AND bu.site_id = %(site_id)s::bigint
              AND bu.status = 'ACTIVE'
              AND si.status = 'ACTIVE'
            """,
            "building_id",
        )

    if group_level == "floor":
        return (
            """
            SELECT
                fl.id AS group_id,
                fl.floor_name AS group_name
            FROM floors AS fl
            INNER JOIN buildings AS bu
                ON bu.id = fl.building_id
               AND bu.tenant_id = fl.tenant_id
               AND bu.site_id = fl.site_id
            INNER JOIN sites AS si
                ON si.id = fl.site_id
               AND si.tenant_id = fl.tenant_id
            WHERE fl.tenant_id = %(tenant_id)s
              AND fl.site_id = %(site_id)s::bigint
              AND fl.building_id = %(building_id)s::bigint
              AND fl.status = 'ACTIVE'
              AND bu.status = 'ACTIVE'
              AND si.status = 'ACTIVE'
            """,
            "floor_id",
        )

    raise ValueError(f"Unsupported hierarchy group level: {group_level}")
