"""Tenant-scoped repository helpers for guest visits."""

from __future__ import annotations

from datetime import date, time
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


GUEST_VISIT_LIST_SELECT = """
    gv.id::text AS guest_visit_id,

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
                created_by_user_id
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                'SCHEDULED', %s
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
                requires_seat = TRUE,
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
            raise LookupError("Guest visit was not found for update.")



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

        INNER JOIN sites si
            ON si.id = gv.site_id
        AND si.tenant_id = gv.tenant_id

        INNER JOIN buildings bu
            ON bu.id = gv.building_id
        AND bu.tenant_id = gv.tenant_id

        LEFT JOIN floors fl
            ON fl.id = gv.floor_id
        AND fl.tenant_id = gv.tenant_id

        LEFT JOIN bookings b
            ON b.guest_visit_id = gv.id
        AND b.tenant_id = gv.tenant_id
        AND b.booking_type = 'GUEST'
        AND b.booking_status IN (
                'CONFIRMED',
                'CHECKED_IN',
                'COMPLETED'
        )
        AND b.tenant_id = gv.tenant_id
        AND b.booking_type = 'GUEST'

        LEFT JOIN seats s
            ON s.id = b.seat_id
        AND s.tenant_id = b.tenant_id

        WHERE gv.tenant_id = %s
    """

    params: list[Any] = [tenant_id]

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
            """,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError("Guest visit not found.")
        

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
            """,
            (
                guest_visit_id,
                tenant_id,
            ),
        )

        if cur.rowcount != 1:
            raise LookupError("Guest visit not found.")
        
def fetch_guest_visit_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    guest_visit_id: str,
) -> dict[str, Any] | None:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
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
                    'CHECKED_IN'
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
) -> None:

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE guest_visits
            SET
                visit_status = 'CANCELLED',
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
              AND tenant_id = %s
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
                    'CHECKED_IN'
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
                    'CHECKED_IN'
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

