"""repository/booking_repository functions scoped by tenant and aligned to bookings schema."""

from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection

SOURCE_CHANNELS = {"WEB", "MOBILE", "ADMIN", "API"}

BOOKING_SELECT_FIELDS = """
    b.id::text AS booking_id,
    b.tenant_id::text AS tenant_id,
    b.booked_for_user_id::text AS booked_for_user_id,
    b.booked_for_guest_id::text AS booked_for_guest_id,
    b.booked_by_user_id::text AS booked_by_user_id,
    b.guest_visit_id::text AS guest_visit_id,
    b.booking_type,
    b.seat_id::text AS seat_id,
    b.site_id::text AS site_id,
    b.building_id::text AS building_id,
    b.floor_id::text AS floor_id,
    s.seat_code,
    si.site_name,
    bu.building_name,
    f.floor_name,
    b.booking_date,
    b.booking_status,
    b.source_channel,
    b.check_in_at,
    b.checked_out_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.created_at,
    b.updated_at,
    g.full_name AS guest_name,
    g.email AS guest_email,
    g.phone AS guest_phone,
    g.organization AS guest_organization,
    gv.guest_type,
    gv.visit_status,
    gv.purpose_of_visit,
    gv.start_time,
    gv.end_time,
    gv.notes,
    gv.requires_seat,
    host.id::text AS host_user_id,
    host.full_name AS host_name
"""

BOOKING_SELECT_FROM = """
    FROM bookings AS b
    INNER JOIN seats AS s
        ON s.id = b.seat_id
       AND s.tenant_id = b.tenant_id
    INNER JOIN floors AS f
        ON f.id = b.floor_id
       AND f.tenant_id = b.tenant_id
    INNER JOIN buildings AS bu
        ON bu.id = b.building_id
       AND bu.tenant_id = b.tenant_id
    INNER JOIN sites AS si
        ON si.id = b.site_id
       AND si.tenant_id = b.tenant_id
    LEFT JOIN guests AS g
        ON g.id = b.booked_for_guest_id
       AND g.tenant_id = b.tenant_id
    LEFT JOIN guest_visits AS gv
        ON gv.id = b.guest_visit_id
       AND gv.tenant_id = b.tenant_id
    LEFT JOIN app_users AS host
        ON host.id = gv.host_user_id
       AND host.tenant_id = b.tenant_id
"""


def fetch_seat_for_booking(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    seat_id: str,
) -> dict[str, Any] | None:
    """Fetch a tenant-scoped seat matching the requested hierarchy."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                s.id::text AS seat_id,
                s.tenant_id::text AS tenant_id,
                s.site_id::text AS site_id,
                s.building_id::text AS building_id,
                s.floor_id::text AS floor_id,

                s.seat_code,

                si.site_name,
                bu.building_name,
                f.floor_name,

                s.status,
                s.is_bookable

            FROM seats s

            JOIN sites si
                ON si.id = s.site_id
            AND si.tenant_id = s.tenant_id

            JOIN buildings bu
                ON bu.id = s.building_id
            AND bu.tenant_id = s.tenant_id

            JOIN floors f
                ON f.id = s.floor_id
            AND f.tenant_id = s.tenant_id

            WHERE s.id = %s
            AND s.floor_id = %s
            AND s.building_id = %s
            AND s.site_id = %s
            AND s.tenant_id = %s
            """,
            (seat_id, floor_id, building_id, site_id, tenant_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


# def has_active_booking_conflict(
#     conn: PGConnection,
#     *,
#     tenant_id: str,
#     seat_id: str,
#     booking_date: date,
# ) -> bool:
#     """Return whether a seat is already actively booked for a date."""
#     with conn.cursor() as cur:
#         cur.execute(
#             """
#             SELECT 1
#             FROM bookings
#             WHERE tenant_id = %s
#               AND seat_id = %s
#               AND booking_date = %s
#               AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
#             LIMIT 1
#             """,
#             (tenant_id, seat_id, booking_date),
#         )
#         return cur.fetchone() is not None

def has_active_booking_conflict(
    conn,
    *,
    tenant_id: str,
    seat_id: str,
    booking_date,
    exclude_booking_id: str | None = None,
) -> bool:
    """Return whether a seat is already actively booked for a date.
 
    Pass exclude_booking_id when modifying an existing booking so the
    original booking row is not treated as a conflict with itself.
    """
    with conn.cursor() as cur:
        if exclude_booking_id:
            cur.execute(
                """
                SELECT 1
                FROM bookings
                WHERE tenant_id = %s
                  AND seat_id = %s
                  AND booking_date = %s
                  AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
                  AND id::text <> %s
                LIMIT 1
                """,
                (tenant_id, seat_id, booking_date, exclude_booking_id),
            )
        else:
            cur.execute(
                """
                SELECT 1
                FROM bookings
                WHERE tenant_id = %s
                  AND seat_id = %s
                  AND booking_date = %s
                  AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
                LIMIT 1
                """,
                (tenant_id, seat_id, booking_date),
            )
        return cur.fetchone() is not None



def user_has_active_booking_on_date(
    conn: PGConnection,
    *,
    tenant_id: str,
    booked_for_user_id: str,
    booking_date: date,
    exclude_booking_id: str | None = None,
) -> bool:
    """Return whether a booking owner already has an active booking."""
    query = """
        SELECT 1
        FROM bookings
        WHERE tenant_id = %s
          AND booked_for_user_id = %s
          AND booking_date = %s
          AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
    """
    params: list[Any] = [tenant_id, booked_for_user_id, booking_date]

    if exclude_booking_id is not None:
        query += " AND id::text <> %s"
        params.append(exclude_booking_id)

    query += " LIMIT 1"

    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone() is not None


def user_has_active_booking_in_range(
    conn: PGConnection,
    *,
    tenant_id: str,
    booked_for_user_id: str,
    start_date: date,
    end_date: date,
    exclude_booking_id: str | None = None,
) -> bool:
    """Return whether a booking owner has an active booking in a date range."""
    query = """
        SELECT 1
        FROM bookings
        WHERE tenant_id = %s
          AND booked_for_user_id = %s
          AND booking_date BETWEEN %s AND %s
          AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
    """
    params: list[Any] = [
        tenant_id,
        booked_for_user_id,
        start_date,
        end_date,
    ]

    if exclude_booking_id is not None:
        query += " AND id::text <> %s"
        params.append(exclude_booking_id)

    query += " LIMIT 1"

    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone() is not None


def guest_has_active_booking_on_date(
    conn: PGConnection,
    *,
    tenant_id: str,
    booked_for_guest_id: str,
    booking_date: date,
    exclude_booking_id: str | None = None,
) -> bool:
    """Return whether a guest already has an active booking for a date."""
    query = """
        SELECT 1
        FROM bookings
        WHERE tenant_id = %s
          AND booked_for_guest_id = %s
          AND booking_date = %s
          AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
    """
    params: list[Any] = [tenant_id, booked_for_guest_id, booking_date]
    if exclude_booking_id is not None:
        query += " AND id::text <> %s"
        params.append(exclude_booking_id)
    query += " LIMIT 1"

    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone() is not None


def insert_booking(
    conn: PGConnection,
    *,
    tenant_id: str,
    booked_for_user_id: str,
    booked_by_user_id: str,
    seat: dict[str, Any],
    booking_date: date,
    source_channel: str = "WEB",
) -> dict[str, Any]:
    """
    Insert an EMPLOYEE booking using hierarchy values
    derived from the seat row.
    """

    normalized_source = source_channel.strip().upper()

    if normalized_source not in SOURCE_CHANNELS:
        raise ValueError(
            "source_channel is not allowed by chk_bookings_source."
        )

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            INSERT INTO bookings (
                tenant_id,

                booked_for_user_id,
                booked_by_user_id,

                seat_id,
                site_id,
                building_id,
                floor_id,

                booking_date,

                booking_type,

                booking_status,

                source_channel
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

                'EMPLOYEE',

                'CONFIRMED',

                %s
            )
            RETURNING id::text AS booking_id
            """,
            (
                tenant_id,

                booked_for_user_id,
                booked_by_user_id,

                seat["seat_id"],
                seat["site_id"],
                seat["building_id"],
                seat["floor_id"],

                booking_date,

                normalized_source,
            ),
        )

        created = cur.fetchone()

    if created is None:
        raise LookupError(
            "Booking insert did not return an id."
        )

    booking = fetch_booking_by_id(
        conn,
        tenant_id=tenant_id,
        booking_id=str(created["booking_id"]),
    )

    if booking is None:
        raise LookupError(
            "Created booking could not be reloaded."
        )

    return booking


def fetch_booking_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    booking_id: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {BOOKING_SELECT_FIELDS}
            {BOOKING_SELECT_FROM}
            WHERE b.id = %s
              AND b.tenant_id = %s
            """,
            (booking_id, tenant_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def fetch_booking_by_id_for_update(
    conn: PGConnection,
    *,
    tenant_id: str,
    booking_id: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {BOOKING_SELECT_FIELDS}
            {BOOKING_SELECT_FROM}
            WHERE b.id = %s
              AND b.tenant_id = %s
            FOR UPDATE OF b
            """,
            (booking_id, tenant_id),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def cancel_booking(
    conn: PGConnection,
    *,
    tenant_id: str,
    booking_id: str,
    cancellation_reason: str,
    booking_status: str = "CANCELLED",

) -> None:
    """Soft-cancel one booking."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE bookings
            SET
                booking_status = %s,
                cancelled_at = NOW(),
                cancellation_reason = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                booking_status,
                cancellation_reason,
                booking_id,
                tenant_id,
            ),
        )
        if cur.rowcount != 1:
            raise LookupError("Booking was not found for cancellation.")


def fetch_past_bookings_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Fetch bookings for one user within one tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                b.id::text AS booking_id,
                b.tenant_id::text AS tenant_id,
                b.booked_for_user_id::text AS booked_for_user_id,
                b.booked_by_user_id::text AS booked_by_user_id,
                b.booking_type,
                b.seat_id::text AS seat_id,
                b.site_id::text AS site_id,
                b.building_id::text AS building_id,
                b.floor_id::text AS floor_id,
                s.seat_code,
                si.site_name,
                bu.building_name,
                f.floor_name,
                b.booking_date,
                b.booking_status,
                b.source_channel,
                b.check_in_at,
                b.checked_out_at,
                b.cancelled_at,
                b.cancellation_reason,
                b.created_at,
                b.updated_at
            FROM bookings AS b
            JOIN seats AS s
                ON b.seat_id = s.id
               AND b.tenant_id = s.tenant_id
            JOIN floors AS f
                ON b.floor_id = f.id
               AND b.tenant_id = f.tenant_id
            JOIN buildings AS bu
                ON b.building_id = bu.id
               AND b.tenant_id = bu.tenant_id
            JOIN sites AS si
                ON b.site_id = si.id
               AND b.tenant_id = si.tenant_id
            WHERE b.booked_for_user_id = %s
              AND b.tenant_id = %s
              AND b.booking_status = 'CONFIRMED'
              AND b.booking_date < CURRENT_DATE
            ORDER BY b.booking_date DESC
            """,
            (user_id, tenant_id),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]

def fetch_current_bookings_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Fetch bookings for one user within one tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                b.id::text AS booking_id,
                b.tenant_id::text AS tenant_id,
                b.booked_for_user_id::text AS booked_for_user_id,
                b.booked_by_user_id::text AS booked_by_user_id,
                b.booking_type,
                b.seat_id::text AS seat_id,
                b.site_id::text AS site_id,
                b.building_id::text AS building_id,
                b.floor_id::text AS floor_id,
                s.seat_code,
                si.site_name,
                bu.building_name,
                f.floor_name,
                b.booking_date,
                b.booking_status,
                b.source_channel,
                b.check_in_at,
                b.checked_out_at,
                b.cancelled_at,
                b.cancellation_reason,
                b.created_at,
                b.updated_at
            FROM bookings AS b
            JOIN seats AS s
                ON b.seat_id = s.id
               AND b.tenant_id = s.tenant_id
            JOIN floors AS f
                ON b.floor_id = f.id
               AND b.tenant_id = f.tenant_id
            JOIN buildings AS bu
                ON b.building_id = bu.id
               AND b.tenant_id = bu.tenant_id
            JOIN sites AS si
                ON b.site_id = si.id
               AND b.tenant_id = si.tenant_id
            WHERE b.booked_for_user_id = %s
              AND b.tenant_id = %s
              AND b.booking_status = 'CONFIRMED'
              AND b.booking_date = CURRENT_DATE
            ORDER BY b.booking_date DESC
            """,
            (user_id, tenant_id),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]

def fetch_cancelled_bookings_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Fetch bookings for one user within one tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                b.id::text AS booking_id,
                b.tenant_id::text AS tenant_id,
                b.booked_for_user_id::text AS booked_for_user_id,
                b.booked_by_user_id::text AS booked_by_user_id,
                b.booking_type,
                b.seat_id::text AS seat_id,
                b.site_id::text AS site_id,
                b.building_id::text AS building_id,
                b.floor_id::text AS floor_id,
                s.seat_code,
                si.site_name,
                bu.building_name,
                f.floor_name,
                b.booking_date,
                b.booking_status,
                b.source_channel,
                b.check_in_at,
                b.checked_out_at,
                b.cancelled_at,
                b.cancellation_reason,
                b.created_at,
                b.updated_at
            FROM bookings AS b
            JOIN seats AS s
                ON b.seat_id = s.id
               AND b.tenant_id = s.tenant_id
            JOIN floors AS f
                ON b.floor_id = f.id
               AND b.tenant_id = f.tenant_id
            JOIN buildings AS bu
                ON b.building_id = bu.id
               AND b.tenant_id = bu.tenant_id
            JOIN sites AS si
                ON b.site_id = si.id
               AND b.tenant_id = si.tenant_id
            WHERE b.booked_for_user_id = %s
              AND b.tenant_id = %s
              AND b.booking_status = 'CANCELLED'
            ORDER BY b.booking_date DESC
            """,
            (user_id, tenant_id),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]

def fetch_future_bookings_for_user(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Fetch bookings for one user within one tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                b.id::text AS booking_id,
                b.tenant_id::text AS tenant_id,
                b.booked_for_user_id::text AS booked_for_user_id,
                b.booked_by_user_id::text AS booked_by_user_id,
                b.booking_type,
                b.seat_id::text AS seat_id,
                b.site_id::text AS site_id,
                b.building_id::text AS building_id,
                b.floor_id::text AS floor_id,
                s.seat_code,
                si.site_name,
                bu.building_name,
                f.floor_name,
                b.booking_date,
                b.booking_status,
                b.source_channel,
                b.check_in_at,
                b.checked_out_at,
                b.cancelled_at,
                b.cancellation_reason,
                b.created_at,
                b.updated_at
            FROM bookings AS b
            JOIN seats AS s
                ON b.seat_id = s.id
               AND b.tenant_id = s.tenant_id
            JOIN floors AS f
                ON b.floor_id = f.id
               AND b.tenant_id = f.tenant_id
            JOIN buildings AS bu
                ON b.building_id = bu.id
               AND b.tenant_id = bu.tenant_id
            JOIN sites AS si
                ON b.site_id = si.id
               AND b.tenant_id = si.tenant_id
            WHERE b.booked_for_user_id = %s
              AND b.tenant_id = %s
              AND b.booking_status = 'CONFIRMED'
              AND b.booking_date > CURRENT_DATE
            ORDER BY b.booking_date DESC
            """,
            (user_id, tenant_id),
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]

def fetch_available_seats_by_range(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    start_date: date,
    end_date: date,
    amenity_ids: list[int],
    exclude_booking_id: str | None = None,
) -> list[dict[str, Any]]:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            WITH requested_dates AS (

                SELECT
                    generate_series(
                        %s::date,
                        %s::date,
                        interval '1 day'
                    )::date AS booking_date
            ),

            requested_amenities AS (

                SELECT DISTINCT
                    UNNEST(%s::bigint[]) AS amenity_id
            ),

            requested_count AS (

                SELECT
                    COUNT(*)::integer AS requested_amenity_count
                FROM requested_amenities
            ),

            seat_dates AS (

                SELECT
                    s.id AS seat_id,
                    rd.booking_date
                FROM seats s
                CROSS JOIN requested_dates rd
                WHERE s.tenant_id = %s
                  AND s.floor_id = %s
            ),

            booked_seat_dates AS (

                    SELECT
                        bkg.seat_id,
                        bkg.booking_date
                    FROM bookings bkg
                    WHERE bkg.tenant_id = %s
                    AND bkg.floor_id = %s
                    AND bkg.booking_date BETWEEN %s AND %s
                    AND bkg.booking_status IN (
                            'CONFIRMED',
                            'CHECKED_IN'
                    )
                    AND (
                            %s IS NULL
                            OR bkg.id::text <> %s
                    )
                ),

            blocked_seat_dates AS (

                SELECT
                    sd.seat_id,
                    sd.booking_date
                FROM seat_dates sd

                INNER JOIN blocked_seats bl
                    ON bl.seat_id = sd.seat_id
                   AND bl.tenant_id = %s
                   AND bl.status = 'ACTIVE'
                   AND sd.booking_date
                        BETWEEN bl.blocked_from
                        AND bl.blocked_to
            ),

            amenity_matches AS (

                SELECT
                    sa.seat_id,

                    ARRAY_AGG(
                        DISTINCT a.amenity_name
                        ORDER BY a.amenity_name
                    ) AS matched_amenities,

                    COUNT(
                        DISTINCT sa.amenity_id
                    )::integer AS matched_amenity_count

                FROM seat_amenities sa

                INNER JOIN requested_amenities ra
                    ON ra.amenity_id = sa.amenity_id

                INNER JOIN amenities a
                    ON a.id = sa.amenity_id
                   AND a.tenant_id = sa.tenant_id

                WHERE sa.tenant_id = %s

                GROUP BY sa.seat_id
            ),

            seat_day_state AS (

                SELECT

                    s.id,
                    s.tenant_id,
                    s.site_id,
                    s.building_id,
                    s.floor_id,
                    s.seat_code,
                    s.seat_type,
                    s.seat_neighborhood,
                    s.is_bookable,
                    s.map_x AS x,
                    s.map_y AS y,
                    s.map_width AS w,
                    s.map_height AS h,
                    s.rotation_angle,

                    sd.booking_date,

                    COALESCE(
                        am.matched_amenities,
                        ARRAY[]::text[]
                    ) AS matched_amenities,

                    COALESCE(
                        am.matched_amenity_count,
                        0
                    )::integer AS matched_amenity_count,

                    rc.requested_amenity_count,

                    CASE

                        WHEN s.status <> 'ACTIVE'
                             OR s.is_bookable IS NOT TRUE
                            THEN 'UNAVAILABLE'

                        WHEN bsd.seat_id IS NOT NULL
                            THEN 'BOOKED'

                        WHEN blsd.seat_id IS NOT NULL
                            THEN 'BLOCKED'

                        ELSE 'AVAILABLE'

                    END AS daily_status

                FROM seats s

                INNER JOIN seat_dates sd
                    ON sd.seat_id = s.id

                CROSS JOIN requested_count rc

                LEFT JOIN booked_seat_dates bsd
                    ON bsd.seat_id = s.id
                   AND bsd.booking_date = sd.booking_date

                LEFT JOIN blocked_seat_dates blsd
                    ON blsd.seat_id = s.id
                   AND blsd.booking_date = sd.booking_date

                LEFT JOIN amenity_matches am
                    ON am.seat_id = s.id

                WHERE s.tenant_id = %s
                  AND s.floor_id = %s
            )

            SELECT

                sds.id::text AS id,
                sds.id::text AS seat_id,

                sds.tenant_id::text AS tenant_id,
                sds.site_id::text AS site_id,
                sds.building_id::text AS building_id,
                sds.floor_id::text AS floor_id,

                sds.seat_code,
                sds.seat_code AS code,

                sds.seat_type,
                sds.seat_neighborhood,
                sds.is_bookable,

                sds.x,
                sds.y,
                sds.w,
                sds.h,

                sds.rotation_angle,

                MAX(sds.matched_amenities)
                    AS matched_amenities,

                MAX(sds.matched_amenity_count)
                    AS matched_amenity_count,

                MAX(sds.requested_amenity_count)
                    AS requested_amenity_count,

                CASE

                    WHEN MAX(sds.requested_amenity_count) = 0
                        THEN 'NOT_APPLICABLE'

                    WHEN MAX(sds.matched_amenity_count)
                         =
                         MAX(sds.requested_amenity_count)
                        THEN 'FULL_MATCH'

                    WHEN MAX(sds.matched_amenity_count) > 0
                        THEN 'PARTIAL_MATCH'

                    ELSE 'NO_MATCH'

                END AS preference_match_status,

                json_build_object(

                    'status',

                    CASE

                        WHEN COUNT(*) FILTER (
                            WHERE sds.daily_status = 'AVAILABLE'
                        ) = COUNT(*)

                            THEN 'FULLY_AVAILABLE'

                        WHEN COUNT(*) FILTER (
                            WHERE sds.daily_status = 'AVAILABLE'
                        ) = 0

                            THEN 'FULLY_UNAVAILABLE'

                        ELSE 'PARTIALLY_AVAILABLE'

                    END,

                    'available_dates',

                    ARRAY_REMOVE(
                        ARRAY_AGG(
                            CASE
                                WHEN sds.daily_status = 'AVAILABLE'
                                THEN sds.booking_date
                            END
                        ),
                        NULL
                    ),

                    'booked_dates',

                    ARRAY_REMOVE(
                        ARRAY_AGG(
                            CASE
                                WHEN sds.daily_status = 'BOOKED'
                                THEN sds.booking_date
                            END
                        ),
                        NULL
                    ),

                    'blocked_dates',

                    ARRAY_REMOVE(
                        ARRAY_AGG(
                            CASE
                                WHEN sds.daily_status = 'BLOCKED'
                                THEN sds.booking_date
                            END
                        ),
                        NULL
                    ),

                    'unavailable_dates',

                    ARRAY_REMOVE(
                        ARRAY_AGG(
                            CASE
                                WHEN sds.daily_status = 'UNAVAILABLE'
                                THEN sds.booking_date
                            END
                        ),
                        NULL
                    ),

                    'daily_statuses',

                    json_agg(
                        json_build_object(
                            'booking_date',
                            sds.booking_date,
                            'status',
                            sds.daily_status
                        )
                        ORDER BY sds.booking_date
                    ),

                    'total_requested_days',
                    COUNT(*),

                    'total_available_days',

                    COUNT(*) FILTER (
                        WHERE sds.daily_status = 'AVAILABLE'
                    ),

                    'availability_percentage',

                    ROUND(
                        (
                            COUNT(*) FILTER (
                                WHERE sds.daily_status = 'AVAILABLE'
                            )::numeric
                            /
                            COUNT(*)::numeric
                        ) * 100,
                        2
                    )

                ) AS availability

            FROM seat_day_state sds

            GROUP BY
                sds.id,
                sds.tenant_id,
                sds.site_id,
                sds.building_id,
                sds.floor_id,
                sds.seat_code,
                sds.seat_type,
                sds.seat_neighborhood,
                sds.is_bookable,
                sds.x,
                sds.y,
                sds.w,
                sds.h,
                sds.rotation_angle

            ORDER BY sds.seat_code
            """,
            (
                        start_date,
                        end_date,

                        amenity_ids,

                        tenant_id,
                        floor_id,

                        tenant_id,
                        floor_id,
                        start_date,
                        end_date,
                        exclude_booking_id,
                        exclude_booking_id,

                        tenant_id,

                        tenant_id,

                        tenant_id,
                        floor_id,
                    ),
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]

def fetch_available_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    booking_date: date,
    amenity_ids: list[int],
) -> list[dict[str, Any]]:
    """Fetch computed availability and preference state for floor seats."""
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
                    ARRAY_AGG(DISTINCT sa.amenity_id ORDER BY sa.amenity_id) AS matched_amenity_ids,
                    COUNT(DISTINCT sa.amenity_id)::integer AS matched_amenity_count
                FROM seat_amenities AS sa
                INNER JOIN requested_amenities AS ra
                    ON ra.amenity_id = sa.amenity_id
                WHERE sa.tenant_id = %s
                GROUP BY sa.seat_id
            ),
            seat_state AS (
                SELECT
                    s.id,
                    s.tenant_id,
                    s.site_id,
                    s.building_id,
                    s.floor_id,
                    s.seat_code,
                    s.seat_type,
                    s.seat_neighborhood,
                    s.is_bookable,
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
                id::text AS id,
                s.id::text AS seat_id,
                s.tenant_id::text AS tenant_id,
                s.site_id::text AS site_id,
                s.building_id::text AS building_id,
                s.floor_id::text AS floor_id,
                s.seat_code,
                s.seat_code AS code,
                s.seat_type,
                s.seat_neighborhood,
                s.is_bookable,
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
            FROM seat_state AS s
            ORDER BY s.seat_code, s.id
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


def insert_guest_booking(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    guest_visit_id: str,
    booked_by_user_id: str,
    seat: dict[str, Any],
    booking_date: date,
    source_channel: str = "WEB",
) -> dict[str, Any]:
    """
    Insert a GUEST booking linked to a guest visit.
    """

    normalized_source = source_channel.strip().upper()

    if normalized_source not in SOURCE_CHANNELS:
        raise ValueError(
            "source_channel is not allowed by chk_bookings_source."
        )

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            INSERT INTO bookings (

                tenant_id,

                booked_for_guest_id,
                guest_visit_id,

                booked_by_user_id,

                seat_id,
                site_id,
                building_id,
                floor_id,

                booking_date,

                booking_type,

                booking_status,

                source_channel

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

                'GUEST',

                'CONFIRMED',

                %s
            )
            RETURNING id::text AS booking_id
            """,
            (
                tenant_id,

                guest_id,
                guest_visit_id,

                booked_by_user_id,

                seat["seat_id"],
                seat["site_id"],
                seat["building_id"],
                seat["floor_id"],

                booking_date,

                normalized_source,
            ),
        )

        created = cur.fetchone()

    if created is None:
        raise LookupError(
            "Guest booking insert did not return an id."
        )

    booking = fetch_booking_by_id(
        conn,
        tenant_id=tenant_id,
        booking_id=str(created["booking_id"]),
    )

    if booking is None:
        raise LookupError(
            "Created guest booking could not be reloaded."
        )

    return booking


def fetch_guest_bookings(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str | None = None,
    booking_date: date | None = None,
    booking_status: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Fetch administrative guest booking records for one tenant."""
    query = f"""
        SELECT {BOOKING_SELECT_FIELDS}
        {BOOKING_SELECT_FROM}
        WHERE b.tenant_id = %s
          AND b.booking_type = 'GUEST'
    """
    params: list[Any] = [tenant_id]

    if guest_id is not None:
        query += " AND b.booked_for_guest_id = %s"
        params.append(guest_id)
    if booking_date is not None:
        query += " AND b.booking_date = %s"
        params.append(booking_date)
    if booking_status is not None:
        query += " AND b.booking_status = %s"
        params.append(booking_status)

    query += " ORDER BY b.booking_date DESC, b.created_at DESC, b.id DESC LIMIT %s"
    params.append(limit)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]
