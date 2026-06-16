"""Tenant-scoped repository helpers for guest visits."""

from __future__ import annotations

from datetime import date, time
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


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
