"""
Repository helpers for layout seat mappings.
"""

from __future__ import annotations

from typing import Any

from psycopg2.extensions import connection as PGConnection
from psycopg2.extras import RealDictCursor

from backend.core.seat_categorization import suggest_seat_type


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

            # Cabins/conference rooms are detected from the svg id's own
            # naming convention (e.g. "...-CBN-05", "...-MR-06") so they land
            # in the right Manage Spaces tab immediately, with no manual
            # per-seat retyping needed after upload. A plain desk's svg id
            # matches nothing here, so seat_type stays NULL for it exactly
            # like before -- only cabins/conference rooms get a value set at
            # upload time.
            initial_seat_type = suggest_seat_type(seat_id)

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
                    seat_type,
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
                    seat_type,
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
                    initial_seat_type,
                    created_by,
                ),
            )

            row = cur.fetchone()

            if row is not None:
                inserted_rows.append(dict(row))

    return inserted_rows