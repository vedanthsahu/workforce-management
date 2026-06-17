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


# def fetch_admin_dashboard_summary(
#     conn: PGConnection,
#     *,
#     tenant_id: str,
#     selected_date: date,
#     site_id: str | None = None,
#     floor_id: str | None = None,
# ) -> dict[str, Any]:
#     """
#     Fetch aggregated admin dashboard summary metrics.
#     """

#     with conn.cursor(cursor_factory=RealDictCursor) as cur:
#         cur.execute(
#             """
#             WITH scoped_sites AS (
#                 SELECT
#                     s.id,
#                     s.status
#                 FROM sites AS s
#                 WHERE s.tenant_id = %(tenant_id)s
#                   AND (
#                         %(site_id)s IS NULL
#                         OR s.id = %(site_id)s::bigint
#                   )
#                   AND (
#                         %(floor_id)s IS NULL
#                         OR EXISTS (
#                             SELECT 1
#                             FROM floors AS f
#                             WHERE f.tenant_id = s.tenant_id
#                               AND f.site_id = s.id
#                               AND f.id = %(floor_id)s::bigint
#                         )
#                   )
#             ),

#             scoped_buildings AS (
#                 SELECT
#                     b.id,
#                     b.status
#                 FROM buildings AS b
#                 WHERE b.tenant_id = %(tenant_id)s
#                   AND (
#                         %(site_id)s IS NULL
#                         OR b.site_id = %(site_id)s::bigint
#                   )
#                   AND (
#                         %(floor_id)s IS NULL
#                         OR EXISTS (
#                             SELECT 1
#                             FROM floors AS f
#                             WHERE f.tenant_id = b.tenant_id
#                               AND f.site_id = b.site_id
#                               AND f.building_id = b.id
#                               AND f.id = %(floor_id)s::bigint
#                         )
#                   )
#             ),

#             scoped_floors AS (
#                 SELECT
#                     f.id,
#                     f.status
#                 FROM floors AS f
#                 WHERE f.tenant_id = %(tenant_id)s
#                   AND (
#                         %(site_id)s IS NULL
#                         OR f.site_id = %(site_id)s::bigint
#                   )
#                   AND (
#                         %(floor_id)s IS NULL
#                         OR f.id = %(floor_id)s::bigint
#                   )
#             ),

#             scoped_seats AS (
#                 SELECT
#                     st.id,
#                     st.status,
#                     st.is_bookable
#                 FROM seats AS st
#                 WHERE st.tenant_id = %(tenant_id)s
#                   AND (
#                         %(site_id)s IS NULL
#                         OR st.site_id = %(site_id)s::bigint
#                   )
#                   AND (
#                         %(floor_id)s IS NULL
#                         OR st.floor_id = %(floor_id)s::bigint
#                   )
#             ),

#             booked_seats AS (
#                 SELECT
#                     b.id,
#                     b.seat_id,
#                     b.booked_for_user_id
#                 FROM bookings AS b
#                 WHERE b.tenant_id = %(tenant_id)s
#                   AND b.booking_date = %(selected_date)s
#                   AND b.booking_status IN (
#                         'CONFIRMED',
#                         'CHECKED_IN'
#                   )
#                   AND (
#                         %(site_id)s IS NULL
#                         OR b.site_id = %(site_id)s::bigint
#                   )
#                   AND (
#                         %(floor_id)s IS NULL
#                         OR b.floor_id = %(floor_id)s::bigint
#                   )
#             ),

#             blocked_seat_counts AS (
#                 SELECT COUNT(DISTINCT bs.seat_id) AS blocked_seats
#                 FROM blocked_seats AS bs
#                 WHERE bs.tenant_id = %(tenant_id)s
#                   AND bs.status = 'ACTIVE'
#                   AND %(selected_date)s BETWEEN bs.blocked_from AND bs.blocked_to
#                   AND (
#                         %(site_id)s IS NULL
#                         OR bs.site_id = %(site_id)s::bigint
#                   )
#                   AND (
#                         %(floor_id)s IS NULL
#                         OR bs.floor_id = %(floor_id)s::bigint
#                   )
#             ),

#             summary_counts AS (
#                 SELECT
#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_sites
#                         WHERE status = 'ACTIVE'
#                     ) AS total_offices,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_floors
#                         WHERE status = 'ACTIVE'
#                     ) AS total_floors,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_seats
#                         WHERE status = 'ACTIVE'
#                           AND is_bookable = TRUE
#                     ) AS total_seats,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_sites
#                         WHERE status = 'ACTIVE'
#                     ) AS active_sites,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_sites
#                         WHERE status = 'INACTIVE'
#                     ) AS inactive_sites,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_buildings
#                         WHERE status = 'ACTIVE'
#                     ) AS active_buildings,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_buildings
#                         WHERE status = 'INACTIVE'
#                     ) AS inactive_buildings,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_floors
#                         WHERE status = 'ACTIVE'
#                     ) AS active_floors,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_floors
#                         WHERE status = 'INACTIVE'
#                     ) AS inactive_floors,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_seats
#                         WHERE status = 'ACTIVE'
#                     ) AS active_seats,

#                     (
#                         SELECT COUNT(*)
#                         FROM scoped_seats
#                         WHERE status = 'INACTIVE'
#                     ) AS inactive_seats,

#                     (
#                         SELECT COUNT(DISTINCT seat_id)
#                         FROM booked_seats
#                     ) AS booked_seats_count,

#                     (
#                         SELECT blocked_seats
#                         FROM blocked_seat_counts
#                     ) AS blocked_seats,

#                     (
#                         SELECT COUNT(*)
#                         FROM booked_seats
#                     ) AS total_bookings,

#                     (
#                         SELECT COUNT(DISTINCT user_id)
#                         FROM booked_seats
#                     ) AS unique_users_booked
#             ),

#             utilization_metrics AS (
#                 SELECT
#                     *,
#                     COALESCE(
#                         ROUND(
#                             (
#                                 booked_seats_count::numeric
#                                 /
#                                 NULLIF(total_seats, 0)
#                             ) * 100,
#                             1
#                         ),
#                         0.0
#                     ) AS booking_utilization_percentage
#                 FROM summary_counts
#             )

#             SELECT
#                 total_offices,
#                 total_floors,
#                 total_seats,
#                 booked_seats_count AS booked_today,
#                 booked_seats_count AS booked_seats_today,
#                 blocked_seats,
#                 blocked_seats AS blocked_seats_today,
#                 booking_utilization_percentage AS occupancy_percentage,
#                 total_bookings,
#                 unique_users_booked,
#                 booking_utilization_percentage,
#                 active_sites,
#                 inactive_sites,
#                 active_buildings,
#                 inactive_buildings,
#                 active_floors,
#                 inactive_floors,
#                 active_seats,
#                 inactive_seats
#             FROM utilization_metrics
#             """,
#             {
#                 "tenant_id": tenant_id,
#                 "selected_date": selected_date,
#                 "site_id": site_id,
#                 "floor_id": floor_id,
#             },
#         )

#         row = cur.fetchone()

#     return dict(row) if row else {}

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
 


def fetch_admin_booking_list(
    conn: PGConnection,
    *,
    tenant_id: str,
    booking_date: date,
    site_id: str | None = None,
    building_id: str | None = None,
    floor_id: str | None = None,
    booking_status: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> dict[str, Any]:
    """
    Fetch a paginated admin booking list for one tenant and date.
    """

    offset = (page - 1) * limit
    params = {
        "tenant_id": tenant_id,
        "booking_date": booking_date,
        "site_id": site_id,
        "building_id": building_id,
        "floor_id": floor_id,
        "booking_status": booking_status,
        "limit": limit,
        "offset": offset,
    }
    from_and_where = """
        FROM bookings AS b
        INNER JOIN app_users AS u
            ON u.id = b.booked_by_user_id
           AND u.tenant_id = b.tenant_id
        LEFT JOIN app_users AS bfu
            ON bfu.id = b.booked_for_user_id
           AND bfu.tenant_id = b.tenant_id
        INNER JOIN seats AS se
            ON se.id = b.seat_id
           AND se.tenant_id = b.tenant_id
           AND se.site_id = b.site_id
           AND se.building_id = b.building_id
           AND se.floor_id = b.floor_id
        INNER JOIN sites AS si
            ON si.id = b.site_id
           AND si.tenant_id = b.tenant_id
        INNER JOIN buildings AS bu
            ON bu.id = b.building_id
           AND bu.tenant_id = b.tenant_id
           AND bu.site_id = b.site_id
        INNER JOIN floors AS fl
            ON fl.id = b.floor_id
           AND fl.tenant_id = b.tenant_id
           AND fl.site_id = b.site_id
           AND fl.building_id = b.building_id
        WHERE b.tenant_id = %(tenant_id)s
          AND b.booking_date = %(booking_date)s
          AND b.booking_status IN (
                'CONFIRMED',
                'CHECKED_IN',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW'
          )
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
          AND (
                %(booking_status)s IS NULL
                OR b.booking_status = %(booking_status)s
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
                b.id::text AS booking_id,
                b.booking_date,
                b.booking_status,
                b.source_channel,
                b.check_in_at,
                b.checked_out_at,
                b.created_at,

                u.id::text AS user_id,
                u.email AS user_email,
                u.full_name AS user_full_name,
                u.role_name AS user_role_name,
                u.department AS user_department,
                u.job_title AS user_job_title,

                bfu.id::text AS booked_for_user_id,
                bfu.email AS booked_for_user_email,
                bfu.full_name AS booked_for_user_full_name,
                bfu.role_name AS booked_for_user_role_name,
                bfu.department AS booked_for_user_department,
                bfu.job_title AS booked_for_user_job_title,

                se.id::text AS seat_id,
                se.seat_code,
                se.seat_type,
                se.seat_neighborhood,

                si.id::text AS site_id,
                si.site_code,
                si.site_name,

                bu.id::text AS building_id,
                bu.building_code,
                bu.building_name,

                fl.id::text AS floor_id,
                fl.floor_code,
                fl.floor_name
            {from_and_where}
            ORDER BY
                b.booking_date ASC,
                b.created_at DESC,
                b.id DESC
            LIMIT %(limit)s
            OFFSET %(offset)s
            """,
            params,
        )
        rows = cur.fetchall()

    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


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
