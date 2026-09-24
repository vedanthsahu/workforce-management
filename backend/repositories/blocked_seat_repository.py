"""SQL operations for tenant-scoped blocked-seat administration."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor, execute_values

from backend.schemas.blocked_seat import BlockedSeatListQuery


def _filtered_base(
    query: BlockedSeatListQuery,
    *,
    details: bool = True,
    window: tuple[date, date] | None = None,
) -> tuple[str, list[Any]]:
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
    if not details:
        # Counts need location IDs on blocked_seats, not display-name joins.
        sql = """
            FROM blocked_seats AS bs
            INNER JOIN sites AS si ON si.id = bs.site_id AND si.tenant_id = bs.tenant_id
        """
        if query.search:
            sql += " INNER JOIN seats AS st ON st.id = bs.seat_id AND st.tenant_id = bs.tenant_id"
        sql += " WHERE bs.tenant_id = %s AND bs.status <> 'CANCELLED'"
    params: list[Any] = []
    if window is not None:
        # Table listing only -- callers that want tenant-wide totals
        # (fetch_blocked_seat_summary) never pass a window, so stat cards
        # keep reflecting true totals regardless of this rolling cutoff.
        window_start, window_end = window
        sql += " AND bs.blocked_to >= %s AND bs.blocked_from <= %s"
        params.extend([window_start, window_end])
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


def _category_condition(category: str) -> str | None:
    return {
        "all": None,
        "active": "bs.status = 'ACTIVE' AND %s BETWEEN bs.blocked_from AND bs.blocked_to",
        "today": "bs.status = 'ACTIVE' AND (bs.created_at AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date = %s",
        "upcoming": "bs.status = 'ACTIVE' AND bs.blocked_from > %s AND bs.blocked_from <= (%s + %s)",
        "expiring": "bs.status = 'ACTIVE' AND bs.blocked_to BETWEEN %s AND (%s + %s)",
        "expired": "bs.blocked_to < %s",
    }[category]


def _category_params(category: str, *, reference_date: date, upcoming_days: int, expiring_soon_days: int) -> list[Any]:
    if category == "all":
        return []
    if category == "upcoming":
        return [reference_date, reference_date, upcoming_days]
    if category == "expiring":
        return [reference_date, reference_date, expiring_soon_days]
    return [reference_date]


def fetch_blocked_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    query: BlockedSeatListQuery,
    reference_date: date,
    page: int,
    limit: int,
    upcoming_days: int,
    expiring_soon_days: int,
    expired_window_days: int,
) -> tuple[list[dict[str, Any]], int]:
    if query.category == "expired":
        window = (
            reference_date - timedelta(days=expired_window_days),
            reference_date,
        )
    else:
        window = None
    base, filter_params = _filtered_base(query, window=window)
    category_sql = _category_condition(query.category)
    category_params = _category_params(
        query.category, reference_date=reference_date,
        upcoming_days=upcoming_days, expiring_soon_days=expiring_soon_days,
    )
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
    params: list[Any] = [
        reference_date,
        reference_date,
        tenant_id,
        *filter_params,
        *category_params,
    ]
    category_clause = f" AND {category_sql}" if category_sql else ""
    sql = select + base + category_clause
    sql += " ORDER BY bs.blocked_from DESC, bs.id DESC LIMIT %s OFFSET %s"
    params.extend([limit, (page - 1) * limit])
    count_base, _ = _filtered_base(query, details=False, window=window)
    count_sql = "SELECT COUNT(*)::integer AS total " + count_base + category_clause
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
    upcoming_days: int,
    expiring_soon_days: int,
) -> dict[str, int]:
    # No window here, deliberately -- these are tenant-wide totals for the
    # stat cards, unaffected by the table's rolling display window.
    base, filter_params = _filtered_base(query, details=False)
    sql = (
        """
        SELECT
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND %s BETWEEN bs.blocked_from AND bs.blocked_to)::integer AS active_blocks,
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND (bs.created_at AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date = %s)::integer AS seats_blocked_today,
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND bs.blocked_from > %s AND bs.blocked_from <= (%s + %s))::integer AS upcoming_blocks,
          COUNT(*) FILTER (WHERE bs.status = 'ACTIVE' AND bs.blocked_to BETWEEN %s AND (%s + %s))::integer AS expiring_soon,
          COUNT(*) FILTER (WHERE bs.blocked_to < %s)::integer AS expired
    """
        + base
    )
    params: list[Any] = [
        reference_date,
        reference_date,
        reference_date, reference_date, upcoming_days,
        reference_date, reference_date, expiring_soon_days,
        reference_date,
        tenant_id, *filter_params,
    ]
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


def fetch_blockable_floor_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: int,
    blocked_from: date,
    blocked_to: date,
    view: str = "resources",
    page: int = 1,
    limit: int = 100,
    seat_ids: list[int] | None = None,
) -> dict[str, Any] | None:
    """Return the one layout and its resources valid for the entire block range."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if view == "schedule":
            cur.execute(
                """
                SELECT fl.id::text AS layout_id, fl.layout_name, fl.status,
                       (fl.effective_from AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date
                         AS effective_from,
                       (fl.effective_till AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date
                         AS effective_till
                FROM floor_layouts AS fl
                INNER JOIN sites AS si
                  ON si.id = fl.site_id AND si.tenant_id = fl.tenant_id
                WHERE fl.tenant_id = %s
                  AND fl.floor_id = %s
                  AND (
                        fl.status IN ('PUBLISHED', 'SCHEDULED')
                        OR (fl.status = 'ARCHIVED' AND fl.effective_till IS NOT NULL)
                      )
                  AND (
                        fl.effective_till IS NULL
                        OR (fl.effective_till AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date > %s
                      )
                ORDER BY fl.effective_from ASC NULLS FIRST, fl.version_no ASC
                """,
                (tenant_id, floor_id, blocked_from),
            )
            return {"layouts": [dict(row) for row in cur.fetchall()]}
        cur.execute(
            """
            SELECT fl.id::text AS layout_id, fl.layout_name,
                   fl.layout_file_url, fl.effective_from, fl.effective_till
            FROM floor_layouts AS fl
            INNER JOIN sites AS si
              ON si.id = fl.site_id AND si.tenant_id = fl.tenant_id
            WHERE fl.tenant_id = %s
              AND fl.floor_id = %s
              AND (
                    fl.status IN ('PUBLISHED', 'SCHEDULED')
                    OR (fl.status = 'ARCHIVED' AND fl.effective_till IS NOT NULL)
                  )
              AND COALESCE(
                    (fl.effective_from AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date,
                    '-infinity'::date
                  ) <= %s
              AND (
                    fl.effective_till IS NULL
                    OR (fl.effective_till AT TIME ZONE COALESCE(si.timezone, 'UTC'))::date > %s
                  )
            ORDER BY fl.effective_from DESC NULLS LAST, fl.version_no DESC
            LIMIT 1
            """,
            (tenant_id, floor_id, blocked_from, blocked_to),
        )
        layout = cur.fetchone()
        if layout is None:
            return None
        result = dict(layout)
        result["resources"] = []
        if view == "metadata":
            return result
        if view == "conflicts":
            seat_filter = " AND b.seat_id = ANY(%s)" if seat_ids else ""
            cur.execute(
                f"""
                SELECT b.id::text AS booking_id, b.seat_id::text AS seat_id,
                       b.site_id::text AS site_id, b.building_id::text AS building_id,
                       b.floor_id::text AS floor_id, st.seat_code, b.booking_date,
                       b.booking_type, b.booking_status,
                       COALESCE(u.full_name, g.full_name) AS booked_for_name
                FROM bookings AS b
                INNER JOIN seats AS st ON st.id = b.seat_id AND st.tenant_id = b.tenant_id
                LEFT JOIN app_users AS u ON u.id = b.booked_for_user_id AND u.tenant_id = b.tenant_id
                LEFT JOIN guests AS g ON g.id = b.booked_for_guest_id AND g.tenant_id = b.tenant_id
                WHERE b.tenant_id = %s AND st.floor_id = %s AND st.layout_id = %s
                  AND b.booking_date BETWEEN %s AND %s
                  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
                  {seat_filter}
                ORDER BY b.booking_date DESC, b.id DESC
                LIMIT %s OFFSET %s
                """,
                (
                    tenant_id,
                    floor_id,
                    layout["layout_id"],
                    blocked_from,
                    blocked_to,
                    *([seat_ids] if seat_ids else []),
                    limit + 1,
                    (page - 1) * limit,
                ),
            )
            rows = [dict(row) for row in cur.fetchall()]
            result["conflicts"] = rows[:limit]
            result["has_more_conflicts"] = len(rows) > limit
            return result

        cur.execute(
            """
            SELECT st.id::text AS resource_id, st.seat_code AS resource_code,
                   st.seat_name AS resource_name,
                   COALESCE(st.seat_type, 'STANDARD') AS resource_type,
                   COALESCE(st.svg_element_id, st.seat_code) AS svg_element_id,
                   st.capacity, st.is_bookable,
                   st.status = 'ACTIVE' AS is_active,
                   EXISTS (
                     SELECT 1 FROM bookings AS b
                     WHERE b.tenant_id = st.tenant_id
                       AND b.seat_id = st.id
                       AND b.booking_date BETWEEN %s AND %s
                       AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
                   ) AS has_booking,
                   EXISTS (
                     SELECT 1 FROM blocked_seats AS bs
                     WHERE bs.tenant_id = st.tenant_id
                       AND bs.seat_id = st.id
                       AND bs.status = 'ACTIVE'
                       AND bs.blocked_from <= %s
                       AND bs.blocked_to >= %s
                   ) AS has_block
            FROM seats AS st
            WHERE st.tenant_id = %s
              AND st.floor_id = %s
              AND st.layout_id = %s
            ORDER BY st.seat_code, st.id
            """,
            (
                blocked_from,
                blocked_to,
                blocked_to,
                blocked_from,
                tenant_id,
                floor_id,
                layout["layout_id"],
            ),
        )
        result = dict(layout)
        result["resources"] = [dict(row) for row in cur.fetchall()]
        return result


def fetch_conflicting_booking_seat_codes(
    conn: PGConnection,
    *,
    tenant_id: str,
    seat_ids: list[int],
    blocked_from: date,
    blocked_to: date,
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


def insert_blocked_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    seats: list[dict[str, Any]],
    block_type: str,
    blocked_from: date,
    blocked_to: date,
    reason: str,
    blocked_by_user_id: str,
) -> list[str]:
    """Insert the validated selection in one statement (API maximum: 200)."""
    values = [
        (tenant_id, seat["id"], seat["site_id"], seat["building_id"], seat["floor_id"],
         blocked_from, blocked_to, reason, block_type, "ACTIVE", blocked_by_user_id)
        for seat in seats
    ]
    with conn.cursor() as cur:
        rows = execute_values(
            cur,
            """
            INSERT INTO blocked_seats (
              tenant_id, seat_id, site_id, building_id, floor_id,
              blocked_from, blocked_to, reason, block_type, status, blocked_by_user_id
            ) VALUES %s RETURNING id::text
            """,
            values,
            page_size=200,
            fetch=True,
        )
        return [str(row[0]) for row in rows]


def fetch_blocked_seats_by_ids(
    conn: PGConnection, *, tenant_id: str, block_ids: list[str], reference_date: date
) -> list[dict[str, Any]]:
    query = BlockedSeatListQuery(category="active")
    base, _ = _filtered_base(query)
    sql = (
        """
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
        + base
        + " AND bs.id = ANY(%s::bigint[]) ORDER BY bs.id"
    )
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (reference_date, reference_date, tenant_id, block_ids))
        return [dict(row) for row in cur.fetchall()]


def cancel_blocked_seat(
    conn: PGConnection, *, tenant_id: str, block_id: str, reason: str
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE blocked_seats
            SET status = 'CANCELLED', reason = %s, updated_at = NOW()
            WHERE tenant_id = %s AND id = %s AND status = 'ACTIVE'
              AND blocked_to >= CURRENT_DATE
            RETURNING id::text AS block_id, seat_id::text AS seat_id,
                      blocked_from, blocked_to, block_type, reason
            """,
            (reason, tenant_id, block_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def update_blocked_seat(
    conn: PGConnection,
    *,
    tenant_id: str,
    block_id: str,
    block_type: str,
    blocked_from: date,
    blocked_to: date,
    reason: str,
) -> bool:
    """Update one non-expired active block after service-level validation."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE blocked_seats
            SET block_type = %s, blocked_from = %s, blocked_to = %s,
                reason = %s, updated_at = NOW()
            WHERE tenant_id = %s AND id = %s AND status = 'ACTIVE'
              AND blocked_to >= CURRENT_DATE
            """,
            (
                block_type,
                blocked_from,
                blocked_to,
                reason,
                tenant_id,
                block_id,
            ),
        )
        return cur.rowcount == 1


def fetch_blocked_seat_history(
    conn: PGConnection, *, tenant_id: str, block_id: str
) -> list[dict[str, Any]]:
    """Return audit events written specifically for one blocked-seat record."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT al.id::text AS id, al.action,
                   COALESCE(au.full_name, al.actor_email) AS actor_name,
                   al.actor_email, al.old_values, al.new_values,
                   al.changed_fields, al.occurred_at
            FROM audit_logs AS al
            LEFT JOIN app_users AS au
              ON au.id = al.actor_user_id AND au.tenant_id = al.tenant_id
            WHERE al.tenant_id = %s
              AND al.entity_type = 'blocked_seat'
              AND al.event_status = 'SUCCESS'
              AND (
                    al.entity_id = %s
                    OR %s = ANY(string_to_array(COALESCE(al.entity_id, ''), ','))
                  )
            ORDER BY al.occurred_at DESC, al.id DESC
            """,
            (tenant_id, block_id, block_id),
        )
        return [dict(row) for row in cur.fetchall()]
