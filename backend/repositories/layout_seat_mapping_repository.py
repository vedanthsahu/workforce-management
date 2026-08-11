"""
Repository helpers for layout seat mappings.
"""

from __future__ import annotations

from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor


def bulk_insert_layout_seat_mappings(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    seat_ids: list[str],
    created_by: str,
) -> list[dict[str, Any]]:

    inserted_rows: list[dict[str, Any]] = []

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        for seat_id in seat_ids:

            cur.execute(
                """
                INSERT INTO layout_seat_mappings (
                    tenant_id,
                    layout_id,
                    site_id,
                    building_id,
                    floor_id,
                    svg_element_id,
                    seat_code,
                    created_by
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING
                    id::text AS seat_mapping_id,
                    tenant_id::text AS tenant_id,
                    layout_id::text AS layout_id,
                    site_id::text AS site_id,
                    building_id::text AS building_id,
                    floor_id::text AS floor_id,
                    svg_element_id,
                    seat_code,
                    created_at,
                    updated_at
                """,
                (
                    tenant_id,
                    layout_id,
                    site_id,
                    building_id,
                    floor_id,
                    seat_id,
                    seat_id,
                    created_by,
                ),
            )

            row = cur.fetchone()

            if row is not None:
                inserted_rows.append(dict(row))

    return inserted_rows