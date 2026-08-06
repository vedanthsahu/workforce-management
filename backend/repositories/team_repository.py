"""This file is team_repository.py this is to get the user's team related info"""
from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


def fetch_team_members_with_today_booking(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    member_user_id: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> list[dict]:
    where_clauses = ["tm_target.user_id = %s", "tm_target.tenant_id = %s"]
    params: list = [user_id, tenant_id]

    if member_user_id is not None:
        where_clauses.append("tm.user_id = %s")
        params.append(member_user_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        sql = (
            """
            SELECT DISTINCT ON (t.id, u.id)
                u.id::text AS user_id,
                u.full_name,
                u.email,

                t.id::text AS team_id,
                t.team_name,

                b.id::text AS booking_id,
                b.seat_id::text AS seat_id,
                b.source_channel,

                s.seat_code,
                s.seat_type,
                s.floor_id::text AS floor_id,
                fl.floor_name,
                s.building_id::text AS building_id,
                bu.building_name,

                COALESCE(amenity_agg.amenities, '[]'::json) AS amenities,

                CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END AS has_booking_today

            FROM team_members tm_target

            JOIN team_members tm
                ON tm.team_id = tm_target.team_id
                AND tm.tenant_id = tm_target.tenant_id

            JOIN app_users u
                ON u.id = tm.user_id
                AND u.tenant_id = tm.tenant_id

            JOIN teams t
                ON t.id = tm.team_id
                AND t.tenant_id = tm.tenant_id

            LEFT JOIN bookings b
                ON b.booked_for_user_id = u.id
                AND b.tenant_id = u.tenant_id
                AND b.booking_type = 'EMPLOYEE'
                AND b.booking_date = CURRENT_DATE
                AND b.booking_status = 'CONFIRMED'

            LEFT JOIN seats s
                ON s.id = b.seat_id
                AND s.tenant_id = b.tenant_id

            LEFT JOIN floors fl
                ON fl.id = s.floor_id
                AND fl.tenant_id = s.tenant_id

            LEFT JOIN buildings bu
                ON bu.id = s.building_id
                AND bu.tenant_id = s.tenant_id

            LEFT JOIN LATERAL (
                SELECT json_agg(
                    jsonb_build_object(
                        'id', a.id,
                        'name', a.amenity_name
                    )
                    ORDER BY a.amenity_name
                ) AS amenities
                FROM seat_amenities sa
                JOIN amenities a
                    ON a.id = sa.amenity_id
                    AND a.tenant_id = sa.tenant_id
                WHERE sa.seat_id = s.id
                  AND sa.tenant_id = s.tenant_id
            ) AS amenity_agg ON TRUE

            WHERE """
            + " AND ".join(where_clauses)
            + """

            ORDER BY t.id, u.id, b.created_at DESC NULLS LAST
            """
        )

        if limit is not None:
            sql += " LIMIT %s OFFSET %s"
            params.extend([limit, offset or 0])

        cur.execute(sql, tuple(params))

        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_team_member_counts(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
) -> dict[str, dict]:
    """team_id -> {total_members, booked_today_count}, unaffected by pagination
    on the member list -- these reflect the full team, not the current page."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                t.id::text AS team_id,
                COUNT(DISTINCT u.id) AS total_members,
                COUNT(DISTINCT u.id) FILTER (WHERE b.id IS NOT NULL) AS booked_today_count

            FROM team_members tm_target

            JOIN team_members tm
                ON tm.team_id = tm_target.team_id
                AND tm.tenant_id = tm_target.tenant_id

            JOIN app_users u
                ON u.id = tm.user_id
                AND u.tenant_id = tm.tenant_id

            JOIN teams t
                ON t.id = tm.team_id
                AND t.tenant_id = tm.tenant_id

            LEFT JOIN bookings b
                ON b.booked_for_user_id = u.id
                AND b.tenant_id = u.tenant_id
                AND b.booking_type = 'EMPLOYEE'
                AND b.booking_date = CURRENT_DATE
                AND b.booking_status = 'CONFIRMED'

            WHERE tm_target.user_id = %s
              AND tm_target.tenant_id = %s

            GROUP BY t.id
            """,
            (user_id, tenant_id),
        )

        rows = cur.fetchall()

    return {row["team_id"]: dict(row) for row in rows}



def search_team_members(
    conn: PGConnection,
    *,
    tenant_id: str,
    user_id: str,
    search_text: str,
    include_inactive: bool = False,
    limit: int = 20,
) -> list[dict]:
    """Search within the caller's own team(s) only -- scoped by tm_target.user_id,
    so this can never be used to enumerate members of a team the caller isn't in."""
    search_text = search_text.strip().lower()

    status_clause = ""
    if not include_inactive:
        status_clause = "AND u.status = 'ACTIVE'"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                user_id,
                tenant_id,
                full_name,
                email,
                UPPER(REPLACE(role_name, ' ', '_')) AS role_name,
                status,
                employee_id,
                department
            FROM (
                SELECT DISTINCT ON (u.id)
                    u.id::text AS user_id,
                    u.tenant_id::text AS tenant_id,
                    u.full_name,
                    u.email,
                    u.role_name,
                    u.status,
                    u.employee_id,
                    u.department,
                    COALESCE(mp.match_position, 999) AS match_position

                FROM team_members tm_target

                JOIN team_members tm
                    ON tm.team_id = tm_target.team_id
                AND tm.tenant_id = tm_target.tenant_id

                JOIN app_users u
                    ON u.id = tm.user_id
                AND u.tenant_id = tm.tenant_id

                LEFT JOIN LATERAL (
                    SELECT MIN(pos) AS match_position
                    FROM unnest(
                        regexp_split_to_array(
                            lower(coalesce(u.full_name, '')),
                            '\\s+'
                        )
                    ) WITH ORDINALITY AS t(word, pos)
                    WHERE word LIKE %s || '%%'
                ) mp ON TRUE

                WHERE tm_target.user_id = %s
                AND tm_target.tenant_id = %s
                {status_clause}
                AND (
                        mp.match_position IS NOT NULL
                        OR lower(coalesce(u.employee_id, '')) LIKE %s || '%%'
                        OR lower(coalesce(u.email, '')) LIKE %s || '%%'
                )

                ORDER BY
                    u.id,
                    COALESCE(mp.match_position, 999),
                    u.full_name
            ) ranked

            ORDER BY
                match_position,
                full_name,
                user_id

            LIMIT %s
            """,
            (
                search_text,
                user_id,
                tenant_id,
                search_text,
                search_text,
                limit,
            ),
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]
 