"""Tenant-scoped repository helpers for guest visits."""

from __future__ import annotations

from datetime import date, time
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor

ACTIVE_GUEST_BOOKING_STATUSES = (
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
)

GUEST_VISIT_LIST_SELECT = """
    gv.id::text AS guest_visit_id,
    gv.tenant_id::text AS tenant_id,

    gv.visit_date,
    gv.start_time,
    gv.end_time,

    gv.visit_status,
    gv.guest_type,
    gv.purpose_of_visit,
    gv.notes,

    gv.requires_seat,

    gv.checked_in_at,
    gv.checked_out_at,

    gv.modified_from_guest_visit_id::text AS modified_from_guest_visit_id,
    gv.modification_reason,

    g.id::text AS guest_id,
    g.full_name AS guest_name,
    g.email AS guest_email,
    g.phone AS guest_phone,

    au.id::text AS host_user_id,
    au.full_name AS host_name,
    au.email AS host_email,
    au.mobile_phone AS host_phone,
    au.department AS host_department,
    au.job_title AS host_job_title,

    gv.created_by_user_id::text AS created_by_user_id,
    creator.full_name AS created_by_name,
    creator.email AS created_by_email,

    si.id::text AS site_id,
    si.site_name,

    bu.id::text AS building_id,
    bu.building_name,

    fl.id::text AS floor_id,
    fl.floor_name,

    b.id::text AS booking_id,
    b.booking_status,

    s.id::text AS seat_id,
    s.seat_code
"""


def _append_guest_visit_filters(
    query: str,
    params: list[Any],
    *,
    visit_scope: str,
    site_id: str | None,
    visit_status: str | None,
    requires_seat: bool | None,
    search: str | None,
) -> str:
    if visit_scope == "CURRENT":
        query += " AND gv.visit_date = CURRENT_DATE"
    elif visit_scope == "UPCOMING":
        query += " AND gv.visit_date > CURRENT_DATE"
    elif visit_scope == "PAST":
        query += " AND gv.visit_date < CURRENT_DATE"

    if site_id:
        query += " AND gv.site_id = %s"
        params.append(site_id)

    if visit_status:
        query += " AND gv.visit_status = %s"
        params.append(visit_status)

    if requires_seat is not None:
        query += " AND gv.requires_seat = %s"
        params.append(requires_seat)

    if search:
        pattern = f"%{search.strip()}%"
        query += """
            AND (
                g.full_name ILIKE %s
                OR g.email ILIKE %s
                OR g.phone ILIKE %s
            )
        """
        params.extend([pattern, pattern, pattern])

    return query

GUEST_VISIT_RETURNING_FIELDS = """
    id::text AS guest_visit_id,
    tenant_id::text AS tenant_id,
    guest_id::text AS guest_id,
    host_user_id::text AS host_user_id,
    site_id::text AS site_id,
    building_id::text AS building_id,
    floor_id::text AS floor_id,
    visit_date,
    start_time,
    end_time,
    guest_type,
    purpose_of_visit,
    requires_seat,
    visit_status,
    notes,
    created_by_user_id::text AS created_by_user_id,
    modified_from_guest_visit_id::text AS modified_from_guest_visit_id,
    modification_reason,
    created_at,
    updated_at
"""


def insert_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    host_user_id: str,
    site_id: str,
    building_id: str,
    floor_id: str | None,
    visit_date: date,
    guest_type: str,
    purpose_of_visit: str | None,
    start_time: time | None,
    end_time: time | None,
    notes: str | None,
    requires_seat: bool,
    created_by_user_id: str,
    modified_from_guest_visit_id: str | None = None,
) -> dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO guest_visits (
                tenant_id,
                guest_id,
                host_user_id,
                site_id,
                building_id,
                floor_id,
                visit_date,
                guest_type,
                purpose_of_visit,
                start_time,
                end_time,
                notes,
                requires_seat,
                visit_status,
                created_by_user_id,
                modified_from_guest_visit_id
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                'SCHEDULED', %s, %s
            )
            RETURNING {GUEST_VISIT_RETURNING_FIELDS}
            """,
            (
                tenant_id,
                guest_id,
                host_user_id,
                site_id,
                building_id,
                floor_id,
                visit_date,
                guest_type,
                purpose_of_visit,
                start_time,
                end_time,
                notes,
                requires_seat,
                created_by_user_id,
                modified_from_guest_visit_id,
            ),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Guest visit insert did not return a row.")
    return dict(row)

def update_guest_visit_booking_details(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    visit_date: date,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                site_id = %s,
                building_id = %s,
                floor_id = %s,
                visit_date = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                site_id,
                building_id,
                floor_id,
                visit_date,
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError(
                "Guest visit was not found for update."
            )



def fetch_guest_visits(
    conn: PGConnection,
    *,
    tenant_id: str,
    visit_scope: str,
    site_id: str | None = None,
    visit_status: str | None = None,
    requires_seat: bool | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:

    query = f"""
        SELECT
            {GUEST_VISIT_LIST_SELECT}
        FROM guest_visits gv

        INNER JOIN guests g
            ON g.id = gv.guest_id
        AND g.tenant_id = gv.tenant_id

        LEFT JOIN app_users au
            ON au.id = gv.host_user_id
        AND au.tenant_id = gv.tenant_id

        LEFT JOIN app_users creator
            ON creator.id = gv.created_by_user_id
        AND creator.tenant_id = gv.tenant_id

        INNER JOIN sites si
            ON si.id = gv.site_id
        AND si.tenant_id = gv.tenant_id

        INNER JOIN buildings bu
            ON bu.id = gv.building_id
        AND bu.tenant_id = gv.tenant_id

        LEFT JOIN floors fl
            ON fl.id = gv.floor_id
        AND fl.tenant_id = gv.tenant_id

        LEFT JOIN LATERAL (
            SELECT b.*
            FROM bookings b
            WHERE b.guest_visit_id = gv.id
              AND b.tenant_id = gv.tenant_id
              AND b.booking_type = 'GUEST'
              AND b.booking_status IN (
                'CONFIRMED',
                'CHECKED_IN',
                'COMPLETED'
              )
            ORDER BY b.updated_at DESC, b.id DESC
            LIMIT 1
        ) b ON TRUE

        LEFT JOIN seats s
            ON s.id = b.seat_id
        AND s.tenant_id = b.tenant_id

        WHERE gv.tenant_id = %s
        AND gv.visit_status IN (
            'SCHEDULED',
            'CHECKED_IN',
            'CHECKED_OUT'
        )
    """

    params: list[Any] = [tenant_id]

    query = _append_guest_visit_filters(
        query,
        params,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
    )

    query += """
        ORDER BY
            gv.visit_date,
            gv.created_at DESC
        LIMIT %s
        OFFSET %s
    """

    params.extend([limit, offset])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_guest_visit_summary(
    conn: PGConnection,
    *,
    tenant_id: str,
    visit_scope: str,
    site_id: str | None = None,
    visit_status: str | None = None,
    requires_seat: bool | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    query = """
        SELECT
            COUNT(*)::integer AS total,
            COUNT(*) FILTER (
                WHERE gv.visit_status = 'SCHEDULED'
            )::integer AS scheduled,
            COUNT(*) FILTER (
                WHERE gv.visit_status = 'CHECKED_IN'
            )::integer AS checked_in,
            COUNT(*) FILTER (
                WHERE gv.visit_status = 'CHECKED_OUT'
            )::integer AS checked_out,
            COUNT(*) FILTER (
                WHERE gv.visit_status = 'CANCELLED'
            )::integer AS cancelled,
            COUNT(*) FILTER (
                WHERE gv.visit_status = 'MODIFIED'
                   OR EXISTS (
                        SELECT 1
                        FROM bookings mb
                        WHERE mb.tenant_id = gv.tenant_id
                          AND mb.guest_visit_id = gv.id
                          AND mb.booking_type = 'GUEST'
                          AND mb.booking_status = 'MODIFIED'
                   )
            )::integer AS modified,
            2::integer AS overdue
        FROM guest_visits gv
        INNER JOIN guests g
            ON g.id = gv.guest_id
           AND g.tenant_id = gv.tenant_id
        WHERE gv.tenant_id = %s
    """
    params: list[Any] = [tenant_id]
    query = _append_guest_visit_filters(
        query,
        params,
        visit_scope=visit_scope,
        site_id=site_id,
        visit_status=visit_status,
        requires_seat=requires_seat,
        search=search,
    )

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()

    return dict(row) if row else {
        "total": 0,
        "scheduled": 0,
        "checked_in": 0,
        "checked_out": 0,
        "cancelled": 0,
        "modified": 0,
        "overdue": 2,
    }


def check_in_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> None:

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                visit_status = 'CHECKED_IN',
                checked_in_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
              AND visit_status = 'SCHEDULED'
            """,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount == 1:
            return

        cur.execute(
            """
            SELECT visit_status
            FROM guest_visits
            WHERE id = %s
              AND tenant_id = %s
            """,
            (guest_visit_id, tenant_id),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Guest visit not found.")
    raise ValueError("Only scheduled guest visits can be checked in.")
        

def check_out_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> None:

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                visit_status = 'CHECKED_OUT',
                checked_out_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
              AND visit_status = 'CHECKED_IN'
            """,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount == 1:
            return

        cur.execute(
            """
            SELECT visit_status
            FROM guest_visits
            WHERE id = %s
              AND tenant_id = %s
            """,
            (guest_visit_id, tenant_id),
        )
        row = cur.fetchone()

    if row is None:
        raise LookupError("Guest visit not found.")
    raise ValueError("Only checked-in guest visits can be checked out.")
        
def fetch_guest_visit_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> dict[str, Any] | None:

    query = f"""
        SELECT
            {GUEST_VISIT_LIST_SELECT}

        FROM guest_visits gv

        INNER JOIN guests g
            ON g.id = gv.guest_id
           AND g.tenant_id = gv.tenant_id

        LEFT JOIN app_users au
            ON au.id = gv.host_user_id
           AND au.tenant_id = gv.tenant_id

        LEFT JOIN app_users creator
            ON creator.id = gv.created_by_user_id
           AND creator.tenant_id = gv.tenant_id

        INNER JOIN sites si
            ON si.id = gv.site_id
           AND si.tenant_id = gv.tenant_id

        INNER JOIN buildings bu
            ON bu.id = gv.building_id
           AND bu.tenant_id = gv.tenant_id

        LEFT JOIN floors fl
            ON fl.id = gv.floor_id
           AND fl.tenant_id = gv.tenant_id

        LEFT JOIN LATERAL (
            SELECT b.*
            FROM bookings b
            WHERE b.guest_visit_id = gv.id
              AND b.tenant_id = gv.tenant_id
              AND b.booking_type = 'GUEST'
            ORDER BY b.updated_at DESC,
                     b.id DESC
            LIMIT 1
        ) b ON TRUE

        LEFT JOIN seats s
            ON s.id = b.seat_id
           AND s.tenant_id = b.tenant_id

        WHERE gv.id = %s
          AND gv.tenant_id = %s
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            query,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def fetch_guest_visit_by_id_for_update(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> dict[str, Any] | None:
    """Fetch and lock one tenant-scoped guest visit."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT {GUEST_VISIT_RETURNING_FIELDS}
            FROM guest_visits
            WHERE id = %s
              AND tenant_id = %s
            FOR UPDATE
            """,
            (guest_visit_id, tenant_id),
        )
        row = cur.fetchone()

    return dict(row) if row else None


def guest_visit_has_active_booking(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> bool:

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM bookings
            WHERE tenant_id = %s
              AND guest_visit_id = %s
              AND booking_type = 'GUEST'
              AND booking_status IN (
                    'CONFIRMED',
                    'CHECKED_IN',
                    'COMPLETED'
              )
            LIMIT 1
            """,
            (
                tenant_id,
                guest_visit_id,
            ),
        )

        return cur.fetchone() is not None
    

def update_guest_visit_requires_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    requires_seat: bool,
) -> None:

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                requires_seat = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                requires_seat,
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError(
                "Guest visit not found."
            )
        

def cancel_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    cancellation_reason: str | None = None,
) -> None:

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                visit_status = 'CANCELLED',
                cancelled_at = NOW(),
                cancellation_reason = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                cancellation_reason,
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError(
                "Guest visit not found."
            )
        


def fetch_active_booking_by_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> dict[str, Any] | None:

    with conn.cursor(
        cursor_factory=RealDictCursor
    ) as cur:

        cur.execute(
            """
            SELECT
                id::text AS booking_id
            FROM bookings
            WHERE tenant_id = %s
              AND guest_visit_id = %s
              AND booking_status IN (
                    'CONFIRMED',
                    'CHECKED_IN',
                    'COMPLETED'
              )
            LIMIT 1
            """,
            (
                tenant_id,
                guest_visit_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def fetch_active_booking_for_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> dict[str, Any] | None:
    """Fetch and lock the active guest booking attached to a visit."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id::text AS booking_id,
                tenant_id::text AS tenant_id,
                booked_for_guest_id::text AS booked_for_guest_id,
                guest_visit_id::text AS guest_visit_id,
                booking_type,
                seat_id::text AS seat_id,
                site_id::text AS site_id,
                building_id::text AS building_id,
                floor_id::text AS floor_id,
                booking_date,
                booking_status
            FROM bookings
            WHERE tenant_id = %s
              AND guest_visit_id = %s
              AND booking_type = 'GUEST'
              AND booking_status IN (
                    'CONFIRMED',
                    'CHECKED_IN',
                    'COMPLETED'
              )
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            FOR UPDATE
            """,
            (tenant_id, guest_visit_id),
        )
        row = cur.fetchone()

    return dict(row) if row else None

def fetch_guest_visit_status(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> dict[str, Any]:

    with conn.cursor(
        cursor_factory=RealDictCursor
    ) as cur:

        cur.execute(
            """
            SELECT
                id::text AS guest_visit_id,
                visit_status,
                checked_in_at,
                checked_out_at
            FROM guest_visits
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        row = cur.fetchone()

    if row is None:
        raise LookupError(
            "Guest visit not found."
        )

    return dict(row)



def update_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    host_user_id: str,
    site_id: str,
    building_id: str,
    floor_id: str | None,
    visit_date: date,
    guest_type: str,
    purpose_of_visit: str | None,
    start_time: time | None,
    end_time: time | None,
    notes: str | None,
) -> None:

    with conn.cursor() as cur:

        cur.execute(
            """
            UPDATE guest_visits
            SET
                host_user_id = %s,
                site_id = %s,
                building_id = %s,
                floor_id = %s,
                visit_date = %s,
                guest_type = %s,
                purpose_of_visit = %s,
                start_time = %s,
                end_time = %s,
                notes = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                host_user_id,
                site_id,
                building_id,
                floor_id,
                visit_date,
                guest_type,
                purpose_of_visit,
                start_time,
                end_time,
                notes,
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError(
                "Guest visit not found."
            )


def update_guest_visit_only(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    host_user_id: str,
    guest_type: str,
    purpose_of_visit: str | None,
    start_time: time | None,
    end_time: time | None,
    notes: str | None,
) -> None:
    """Update only fields allowed by the visit-only workflow action."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                host_user_id = %s,
                guest_type = %s,
                purpose_of_visit = %s,
                start_time = %s,
                end_time = %s,
                notes = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                host_user_id,
                guest_type,
                purpose_of_visit,
                start_time,
                end_time,
                notes,
                guest_visit_id,
                tenant_id,
            ),
        )
        if cur.rowcount != 1:
            raise LookupError("Guest visit not found.")


def mark_guest_visit_modified(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    modification_reason: str | None,
) -> None:
    """Retain a replaced guest visit as history without cancelling it."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                visit_status = 'MODIFIED',
                cancelled_at = NOW(),
                cancellation_reason = %s,
                modification_reason = %s,
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
            """,
            (
                modification_reason,
                modification_reason,
                guest_visit_id,
                tenant_id,
            ),
        )
        if cur.rowcount != 1:
            raise LookupError("Guest visit not found.")

def sync_booking_from_guest_visit(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
    site_id: str,
    building_id: str,
    floor_id: str | None,
    booking_date: date,
) -> None:

    with conn.cursor() as cur:

        cur.execute(
            """
            UPDATE bookings
            SET
                site_id = %s,
                building_id = %s,
                floor_id = %s,
                booking_date = %s,
                updated_at = NOW()
            WHERE tenant_id = %s
              AND guest_visit_id = %s
              AND booking_status IN (
                    'CONFIRMED',
                    'CHECKED_IN',
                    'COMPLETED'
              )
            """,
            (
                site_id,
                building_id,
                floor_id,
                booking_date,
                tenant_id,
                guest_visit_id,
            ),
        )


def recalculate_guest_visit_requires_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits gv
            SET
                requires_seat = EXISTS (
                    SELECT 1
                    FROM bookings b
                    WHERE b.tenant_id = gv.tenant_id
                      AND b.guest_visit_id = gv.id
                      AND b.booking_type = 'GUEST'
                      AND b.booking_status IN (
                            'CONFIRMED',
                            'CHECKED_IN',
                            'COMPLETED'
                      )
                ),
                updated_at = NOW()
            WHERE gv.id = %s
              AND gv.tenant_id = %s
            """,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError(
                "Guest visit not found."
            )


def fetch_guest_visit_integrity_findings(
    conn: PGConnection,
    *,
    tenant_id: str,
    limit: int = 100,
) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            WITH active_bookings AS (
                SELECT
                    b.id,
                    b.tenant_id,
                    b.guest_visit_id,
                    b.site_id,
                    b.building_id,
                    b.floor_id,
                    b.booking_date,
                    b.booking_status,
                    b.updated_at
                FROM bookings b
                WHERE b.tenant_id = %s
                  AND b.booking_type = 'GUEST'
                  AND b.booking_status IN (
                        'CONFIRMED',
                        'CHECKED_IN',
                        'COMPLETED'
                  )
            ),
            latest_active_booking AS (
                SELECT DISTINCT ON (guest_visit_id)
                    *
                FROM active_bookings
                ORDER BY guest_visit_id, updated_at DESC NULLS LAST, id DESC
            ),
            findings AS (
                SELECT
                    'requires_seat_without_active_booking' AS issue_type,
                    gv.id::text AS guest_visit_id,
                    NULL::text AS booking_id,
                    gv.visit_date,
                    gv.site_id::text AS visit_site_id,
                    gv.building_id::text AS visit_building_id,
                    gv.floor_id::text AS visit_floor_id,
                    NULL::date AS booking_date,
                    NULL::text AS booking_site_id,
                    NULL::text AS booking_building_id,
                    NULL::text AS booking_floor_id
                FROM guest_visits gv
                WHERE gv.tenant_id = %s
                  AND gv.requires_seat IS TRUE
                  AND NOT EXISTS (
                        SELECT 1
                        FROM active_bookings ab
                        WHERE ab.guest_visit_id = gv.id
                  )

                UNION ALL

                SELECT
                    'active_booking_requires_seat_false' AS issue_type,
                    gv.id::text AS guest_visit_id,
                    lab.id::text AS booking_id,
                    gv.visit_date,
                    gv.site_id::text AS visit_site_id,
                    gv.building_id::text AS visit_building_id,
                    gv.floor_id::text AS visit_floor_id,
                    lab.booking_date,
                    lab.site_id::text AS booking_site_id,
                    lab.building_id::text AS booking_building_id,
                    lab.floor_id::text AS booking_floor_id
                FROM guest_visits gv
                INNER JOIN latest_active_booking lab
                    ON lab.guest_visit_id = gv.id
                WHERE gv.tenant_id = %s
                  AND gv.requires_seat IS FALSE

                UNION ALL

                SELECT
                    'visit_booking_date_mismatch' AS issue_type,
                    gv.id::text AS guest_visit_id,
                    lab.id::text AS booking_id,
                    gv.visit_date,
                    gv.site_id::text AS visit_site_id,
                    gv.building_id::text AS visit_building_id,
                    gv.floor_id::text AS visit_floor_id,
                    lab.booking_date,
                    lab.site_id::text AS booking_site_id,
                    lab.building_id::text AS booking_building_id,
                    lab.floor_id::text AS booking_floor_id
                FROM guest_visits gv
                INNER JOIN latest_active_booking lab
                    ON lab.guest_visit_id = gv.id
                WHERE gv.tenant_id = %s
                  AND gv.visit_date IS DISTINCT FROM lab.booking_date

                UNION ALL

                SELECT
                    'visit_booking_location_mismatch' AS issue_type,
                    gv.id::text AS guest_visit_id,
                    lab.id::text AS booking_id,
                    gv.visit_date,
                    gv.site_id::text AS visit_site_id,
                    gv.building_id::text AS visit_building_id,
                    gv.floor_id::text AS visit_floor_id,
                    lab.booking_date,
                    lab.site_id::text AS booking_site_id,
                    lab.building_id::text AS booking_building_id,
                    lab.floor_id::text AS booking_floor_id
                FROM guest_visits gv
                INNER JOIN latest_active_booking lab
                    ON lab.guest_visit_id = gv.id
                WHERE gv.tenant_id = %s
                  AND (
                        gv.site_id IS DISTINCT FROM lab.site_id
                        OR gv.building_id IS DISTINCT FROM lab.building_id
                        OR gv.floor_id IS DISTINCT FROM lab.floor_id
                  )
            )
            SELECT *
            FROM findings
            ORDER BY guest_visit_id, issue_type
            LIMIT %s
            """,
            (
                tenant_id,
                tenant_id,
                tenant_id,
                tenant_id,
                tenant_id,
                limit,
            ),
        )
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_cancelled_guest_visits(
    conn: PGConnection,
    *,
    tenant_id: str,
    created_by_user_id: str,
    booking_date: date | None = None,
):
    query = """
        SELECT
            'GUEST_VISIT' AS activity_source,

            NULL::text AS booking_id,
            gv.tenant_id::text AS tenant_id,

            NULL::text AS booked_for_user_id,
            gv.guest_id::text AS booked_for_guest_id,

            gv.created_by_user_id::text AS booked_by_user_id,

            creator.full_name AS booked_by_name,
            creator.email AS booked_by_email,

            g.full_name AS booked_for_name,
            g.email AS booked_for_email,
            g.phone AS booked_for_phone,
            g.organization AS booked_for_organization,

            gv.id::text AS guest_visit_id,

            'GUEST' AS booking_type,

            NULL::text AS seat_id,

            gv.site_id::text AS site_id,
            gv.building_id::text AS building_id,
            gv.floor_id::text AS floor_id,

            NULL::text AS seat_code,

            si.site_name,
            bu.building_name,
            fl.floor_name,

            gv.visit_date AS booking_date,
            gv.visit_status AS booking_status,

            NULL::text AS source_channel,

            gv.checked_in_at AS check_in_at,
            gv.checked_out_at,

            gv.cancelled_at,
            gv.cancellation_reason,

            gv.created_at,
            gv.updated_at,

            g.full_name AS guest_name,
            g.email AS guest_email,
            g.phone AS guest_phone,
            g.organization AS guest_organization,

            gv.guest_type,
            gv.purpose_of_visit,
            gv.visit_status,

            gv.host_user_id::text AS host_user_id,
            host.full_name AS host_name,

            gv.start_time,
            gv.end_time,
            gv.notes,
            gv.requires_seat

        FROM guest_visits gv

        INNER JOIN guests g
            ON g.id = gv.guest_id
           AND g.tenant_id = gv.tenant_id

        LEFT JOIN app_users creator
            ON creator.id = gv.created_by_user_id
           AND creator.tenant_id = gv.tenant_id

        LEFT JOIN app_users host
            ON host.id = gv.host_user_id
           AND host.tenant_id = gv.tenant_id

        LEFT JOIN sites si
            ON si.id = gv.site_id
           AND si.tenant_id = gv.tenant_id

        LEFT JOIN buildings bu
            ON bu.id = gv.building_id

        LEFT JOIN floors fl
            ON fl.id = gv.floor_id

        WHERE gv.tenant_id = %s
          AND gv.created_by_user_id = %s
          AND gv.visit_status = 'CANCELLED'
    """
    params: list[Any] = [tenant_id, created_by_user_id]
    if booking_date is not None:
        query += " AND gv.visit_date = %s"
        params.append(booking_date)
    query += " ORDER BY gv.updated_at DESC"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)

        return [dict(row) for row in cur.fetchall()]


GUEST_VISIT_HISTORY_SELECT = """
    gv.id::text AS guest_visit_id,
    gv.visit_date,
    gv.visit_status,
    gv.guest_type,
    gv.purpose_of_visit,
    gv.start_time,
    gv.end_time,
    gv.notes,
    gv.requires_seat,
    gv.checked_in_at,
    gv.checked_out_at,
    gv.cancelled_at,
    gv.cancellation_reason,

    au.id::text AS host_user_id,
    au.full_name AS host_name,
    au.email AS host_email,

    si.id::text AS site_id,
    si.site_name,

    bu.id::text AS building_id,
    bu.building_name,

    fl.id::text AS floor_id,
    fl.floor_name,

    b.id::text AS booking_id,
    b.booking_status,
    b.seat_id::text AS seat_id,
    s.seat_code,
    b.booking_date
"""

GUEST_VISIT_HISTORY_ORDER = """
    ORDER BY
        CASE WHEN gv.visit_date >= CURRENT_DATE THEN 0 ELSE 1 END,
        CASE WHEN gv.visit_date >= CURRENT_DATE THEN gv.visit_date END ASC,
        CASE WHEN gv.visit_date < CURRENT_DATE THEN gv.visit_date END DESC,
        gv.id DESC
"""


def fetch_guest_visit_history(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    include_cancelled: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Fetch one guest's visit history with embedded booking details."""
    query = f"""
        SELECT
            {GUEST_VISIT_HISTORY_SELECT}
        FROM guest_visits gv

        LEFT JOIN app_users au
            ON au.id = gv.host_user_id
           AND au.tenant_id = gv.tenant_id

        INNER JOIN sites si
            ON si.id = gv.site_id
           AND si.tenant_id = gv.tenant_id

        INNER JOIN buildings bu
            ON bu.id = gv.building_id
           AND bu.tenant_id = gv.tenant_id

        LEFT JOIN floors fl
            ON fl.id = gv.floor_id
           AND fl.tenant_id = gv.tenant_id

        LEFT JOIN LATERAL (
            SELECT b.*
            FROM bookings b
            WHERE b.guest_visit_id = gv.id
              AND b.tenant_id = gv.tenant_id
              AND b.booking_type = 'GUEST'
            ORDER BY b.updated_at DESC, b.id DESC
            LIMIT 1
        ) b ON TRUE

        LEFT JOIN seats s
            ON s.id = b.seat_id
           AND s.tenant_id = b.tenant_id

        WHERE gv.tenant_id = %s
          AND gv.guest_id = %s
    """
    params: list[Any] = [tenant_id, guest_id]

    if not include_cancelled:
        query += " AND gv.visit_status <> 'CANCELLED'"

    query += GUEST_VISIT_HISTORY_ORDER
    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_guest_visit_history_summary(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
) -> dict[str, Any]:
    """Summarize one guest's visits and bookings, regardless of pagination filters."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*)::integer AS total_visits,
                COUNT(*) FILTER (
                    WHERE gv.visit_status = 'SCHEDULED'
                )::integer AS scheduled,
                COUNT(*) FILTER (
                    WHERE gv.visit_status = 'CHECKED_IN'
                )::integer AS checked_in,
                COUNT(*) FILTER (
                    WHERE gv.visit_status = 'CHECKED_OUT'
                )::integer AS checked_out,
                COUNT(*) FILTER (
                    WHERE gv.visit_status = 'CANCELLED'
                )::integer AS cancelled,
                COUNT(*) FILTER (
                    WHERE gv.visit_status = 'MODIFIED'
                )::integer AS modified,
                COUNT(*) FILTER (
                    WHERE gv.requires_seat IS TRUE
                )::integer AS requires_seat_count,
                (
                    SELECT COUNT(*)::integer
                    FROM bookings b
                    WHERE b.tenant_id = %s
                      AND b.booked_for_guest_id = %s
                      AND b.booking_type = 'GUEST'
                ) AS total_bookings
            FROM guest_visits gv
            WHERE gv.tenant_id = %s
              AND gv.guest_id = %s
            """,
            (tenant_id, guest_id, tenant_id, guest_id),
        )
        row = cur.fetchone()

    if row is None:
        return {
            "total_visits": 0,
            "total_bookings": 0,
            "scheduled": 0,
            "checked_in": 0,
            "checked_out": 0,
            "cancelled": 0,
            "modified": 0,
            "requires_seat_count": 0,
        }
    return dict(row)


def cancel_future_guest_visits_for_guest(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_id: str,
    cancellation_reason: str = "Guest deactivated",
) -> int:
    """Cancel one guest's future SCHEDULED visits. Does not touch active/past visits."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                visit_status = 'CANCELLED',
                cancelled_at = NOW(),
                cancellation_reason = %s,
                updated_at = NOW()
            WHERE tenant_id = %s
              AND guest_id = %s
              AND visit_date >= CURRENT_DATE
              AND visit_status = 'SCHEDULED'
            """,
            (cancellation_reason, tenant_id, guest_id),
        )
        return cur.rowcount

