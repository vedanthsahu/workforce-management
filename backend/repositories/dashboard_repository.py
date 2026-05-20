"""
Repository queries for admin dashboard analytics.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection


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
            WITH filtered_sites AS (
                SELECT s.id
                FROM sites AS s
                WHERE s.tenant_id = %(tenant_id)s
                  AND s.status = 'ACTIVE'
                  AND (
                        %(site_id)s IS NULL
                        OR s.id = %(site_id)s::bigint
                  )
            ),

            filtered_floors AS (
                SELECT f.id
                FROM floors AS f
                WHERE f.tenant_id = %(tenant_id)s
                  AND f.status = 'ACTIVE'
                  AND (
                        %(site_id)s IS NULL
                        OR f.site_id = %(site_id)s::bigint
                  )
                  AND (
                        %(floor_id)s IS NULL
                        OR f.id = %(floor_id)s::bigint
                  )
            ),

            filtered_seats AS (
                SELECT st.id
                FROM seats AS st
                WHERE st.tenant_id = %(tenant_id)s
                  AND st.status = 'ACTIVE'
                  AND st.is_bookable = TRUE
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
                    b.user_id
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
                        FROM filtered_sites
                    ) AS total_offices,

                    (
                        SELECT COUNT(*)
                        FROM filtered_floors
                    ) AS total_floors,

                    (
                        SELECT COUNT(*)
                        FROM filtered_seats
                    ) AS total_seats,

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
                        SELECT COUNT(DISTINCT user_id)
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
                total_floors,
                total_seats,
                booked_seats_count AS booked_today,
                blocked_seats,
                booking_utilization_percentage AS occupancy_percentage,
                total_bookings,
                unique_users_booked,
                booking_utilization_percentage
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
