"""SQL operations for tenant-scoped blocked-seat administration."""

from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor

from backend.schemas.blocked_seat import BlockedSeatListQuery


def _filtered_base(query: BlockedSeatListQuery) -> tuple[str, list[Any]]:
    sql = """
        FROM blocked_seats AS bs
        INNER JOIN seats AS st ON st.id = bs.seat_id AND st.tenant_id = bs.tenant_id
        INNER JOIN sites AS si ON si.id = bs.site_id AND si.tenant_id = bs.tenant_id
        INNER JOIN buildings AS bu ON bu.id = bs.building_id AND bu.tenant_id = bs.tenant_id
        INNER JOIN floors AS fl ON fl.id = bs.floor_id AND fl.tenant_id = bs.tenant_id
        LEFT JOIN app_users AS au ON au.id = bs.blocked_by_user_id
        WHERE bs.tenant_id = %s
          AND bs.status <> 'CANCELLED'
    """
    params: list[Any] = []
    if query.search:
        sql += " AND (st.seat_code ILIKE %s OR COALESCE(bs.reason, '') ILIKE %s)"
        pattern = f"%{query.search.strip()}%"
        params.extend([pattern, pattern])
    for value, column in (
        (query.site_id, "bs.site_id"),
        (query.building_id, "bs.building_id"),
        (query.floor_id, "bs.floor_id"),
    ):
        if value is not None:
            sql += f" AND {column} = %s"
            params.append(value)
    if query.block_type is not None:
        sql += " AND bs.block_type = %s"
        params.append(query.block_type)
    if query.selected_date is not None:
        sql += " AND %s BETWEEN bs.blocked_from AND bs.blocked_to"
        params.append(query.selected_date)
    return sql, params


def _category_condition(category: str) -> str:
    return {
        "active": "bs.status = 'ACTIVE' AND %s BETWEEN bs.blocked_from AND bs.blocked_to",
        "today": "bs.status = 'ACTIVE' AND (bs.created_at AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date = %s",
        "upcoming": "bs.status = 'ACTIVE' AND bs.blocked_from > %s",
        "expiring": "bs.status = 'ACTIVE' AND bs.blocked_to BETWEEN %s AND (%s + 3)",
        "expired": "bs.blocked_to < %s",
    }[category]


def fetch_blocked_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    query: BlockedSeatListQuery,
    reference_date: date,
    page: int,
    limit: int,
) -> tuple[list[dict[str, Any]], int]:
    base, filter_params = _filtered_base(query)
    category_sql = _category_condition(query.category)
    category_params = [reference_date, reference_date] if query.category == "expiring" else [reference_date]
    select = """
        SELECT bs.id::text AS block_id, bs.seat_id::text AS seat_id,
               st.seat_code, bs.site_id::text AS site_id, si.site_name,
               bs.building_id::text AS building_id, bu.building_name,
               bs.floor_id::text AS floor_id, fl.floor_name,
               bs.blocked_from, bs.blocked_to, bs.block_type,
               COALESCE(bs.reason, '') AS reason,
               CASE WHEN bs.blocked_to < %s THEN 'EXPIRED'
                    WHEN bs.blocked_from > %s THEN 'UPCOMING'
                    ELSE 'ACTIVE' END AS display_status,
               bs.blocked_by_user_id::text AS blocked_by_user_id,
               au.full_name AS blocked_by_name, bs.created_at
    """
    params: list[Any] = [reference_date, reference_date, tenant_id, *filter_params, *category_params]
    sql = select + base + f" AND {category_sql} ORDER BY bs.blocked_from DESC, bs.id DESC LIMIT %s OFFSET %s"
    params.extend([limit, (page - 1) * limit])
    count_sql = "SELECT COUNT(*)::integer AS total " + base + f" AND {category_sql}"
    count_params: list[Any] = [tenant_id, *filter_params, *category_params]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        rows = [dict(row) for row in cur.fetchall()]
        cur.execute(count_sql, count_params)
        total = int(cur.fetchone()["total"])
    return rows, total


def fetch_blocked_seat_summary(
    conn: PGConnection,
    *,
    tenant_id: str,
    query: BlockedSeatListQuery,
    reference_date: date,
) -> dict[str, int]:
    base, filter_params = _filtered_base(query)
    sql = """
        SELECT
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND %s BETWEEN bs.blocked_from AND bs.blocked_to)::integer AS active_blocks,
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND (bs.created_at AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date = %s)::integer AS seats_blocked_today,
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND bs.blocked_from > %s)::integer AS upcoming_blocks,
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND bs.blocked_to BETWEEN %s AND (%s + 3))::integer AS expiring_soon,
          COUNT(*) FILTER (WHERE bs.blocked_to < %s)::integer AS expired
    """ + base
    params: list[Any] = [reference_date] * 6 + [tenant_id, *filter_params]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return dict(cur.fetchone())


def fetch_seats_for_block(
    conn: PGConnection, *, tenant_id: str, seat_ids: list[int]
) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT st.id, st.seat_code, st.site_id, st.building_id, st.floor_id,
                   st.status, st.is_bookable
            FROM seats AS st
            WHERE st.tenant_id = %s AND st.id = ANY(%s)
            ORDER BY st.id
            """,
            (tenant_id, seat_ids),
        )
        return [dict(row) for row in cur.fetchall()]


def fetch_conflicting_booking_seat_codes(
    conn: PGConnection, *, tenant_id: str, seat_ids: list[int], blocked_from: date, blocked_to: date
) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT st.seat_code
            FROM bookings AS b
            INNER JOIN seats AS st ON st.id = b.seat_id AND st.tenant_id = b.tenant_id
            WHERE b.tenant_id = %s AND b.seat_id = ANY(%s)
              AND b.booking_date BETWEEN %s AND %s
              AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
            ORDER BY st.seat_code
            """,
            (tenant_id, seat_ids, blocked_from, blocked_to),
        )
        return [str(row[0]) for row in cur.fetchall()]


def insert_blocked_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat: dict[str, Any],
    block_type: str,
    blocked_from: date,
    blocked_to: date,
    reason: str,
    blocked_by_user_id: str,
) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO blocked_seats (
              tenant_id, seat_id, site_id, building_id, floor_id,
              blocked_from, blocked_to, reason, block_type, status, blocked_by_user_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE', %s)
            RETURNING id::text
            """,
            (tenant_id, seat["id"], seat["site_id"], seat["building_id"], seat["floor_id"],
             blocked_from, blocked_to, reason, block_type, blocked_by_user_id),
        )
        return str(cur.fetchone()[0])


def fetch_blocked_seats_by_ids(
    conn: PGConnection, *, tenant_id: str, block_ids: list[str], reference_date: date
) -> list[dict[str, Any]]:
    query = BlockedSeatListQuery(category="active")
    base, _ = _filtered_base(query)
    sql = """
        SELECT bs.id::text AS block_id, bs.seat_id::text AS seat_id,
               st.seat_code, bs.site_id::text AS site_id, si.site_name,
               bs.building_id::text AS building_id, bu.building_name,
               bs.floor_id::text AS floor_id, fl.floor_name,
               bs.blocked_from, bs.blocked_to, bs.block_type,
               COALESCE(bs.reason, '') AS reason,
               CASE WHEN bs.blocked_to < %s THEN 'EXPIRED'
                    WHEN bs.blocked_from > %s THEN 'UPCOMING'
                    ELSE 'ACTIVE' END AS display_status,
               bs.blocked_by_user_id::text AS blocked_by_user_id,
               au.full_name AS blocked_by_name, bs.created_at
    """ + base + " AND bs.id = ANY(%s::bigint[]) ORDER BY bs.id"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (reference_date, reference_date, tenant_id, block_ids))
        return [dict(row) for row in cur.fetchall()]


def cancel_blocked_seat(
    conn: PGConnection, *, tenant_id: str, block_id: str
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE blocked_seats SET status = 'CANCELLED', updated_at = NOW()
            WHERE tenant_id = %s AND id = %s AND status = 'ACTIVE'
              AND blocked_to >= CURRENT_DATE
            RETURNING id::text AS block_id, seat_id::text AS seat_id,
                      blocked_from, blocked_to, block_type, reason
            """,
            (tenant_id, block_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None
