"""
Repository helpers for floor layout persistence.
"""
from __future__ import annotations
from psycopg2.extras import Json

from typing import Any

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection

from backend.core.enums import LayoutStatus, NON_DELETED_LAYOUT_STATUSES
from backend.repositories.location_repository import (
    upsert_operational_seat,
    replace_seat_amenities,
)

FLOOR_LAYOUT_SELECT_FIELDS = """
    fl.id::text AS layout_id,
    fl.tenant_id::text AS tenant_id,
    fl.site_id::text AS site_id,
    fl.building_id::text AS building_id,
    fl.floor_id::text AS floor_id,
    si.site_name,
    bu.building_name,
    f.floor_name,
    fl.layout_name,
    fl.layout_file_url,
    fl.file_storage_provider,
    fl.layout_type,
    fl.version_no,
    fl.is_published,
    fl.layout_metadata,
    fl.uploaded_by_user_id::text AS uploaded_by_user_id,
    au.full_name AS uploaded_by_name,
    au.email AS uploaded_by_email,
    au.role_name AS uploaded_by_role,
    au.department AS uploaded_by_department,
    au.job_title AS uploaded_by_job_title,
    fl.uploaded_by_user_id::text AS updated_by_user_id,
    au.full_name AS updated_by_name,
    au.email AS updated_by_email,
    au.role_name AS updated_by_role,
    au.department AS updated_by_department,
    au.job_title AS updated_by_job_title,
    fl.published_by_user_id::text AS published_by_user_id,
    pub.full_name AS published_by_name,
    pub.email AS published_by_email,
    pub.role_name AS published_by_role,
    pub.department AS published_by_department,
    pub.job_title AS published_by_job_title,
    fl.published_at,
    fl.status,
    fl.created_at,
    fl.updated_at
"""


FLOOR_LAYOUT_USER_JOINS = """
    LEFT JOIN app_users AS au
        ON au.id = fl.uploaded_by_user_id
       AND au.tenant_id = fl.tenant_id
    LEFT JOIN app_users AS pub
        ON pub.id = fl.published_by_user_id
       AND pub.tenant_id = fl.tenant_id
"""


FLOOR_LAYOUT_LOCATION_JOINS = """
    LEFT JOIN sites AS si
        ON si.id = fl.site_id
       AND si.tenant_id = fl.tenant_id
    LEFT JOIN buildings AS bu
        ON bu.id = fl.building_id
       AND bu.tenant_id = fl.tenant_id
    LEFT JOIN floors AS f
        ON f.id = fl.floor_id
       AND f.tenant_id = fl.tenant_id
"""


def fetch_floor_for_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                f.id::text AS floor_id,
                f.tenant_id::text AS tenant_id,
                f.site_id::text AS site_id,
                f.building_id::text AS building_id
            FROM floors AS f
            WHERE f.id = %s
              AND f.tenant_id = %s
              AND f.site_id = %s
              AND f.building_id = %s
            """,
            (
                floor_id,
                tenant_id,
                site_id,
                building_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


def archive_existing_published_layouts(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE floor_layouts
            SET
                status = %s,
                is_published = FALSE,
                updated_at = NOW()
            WHERE tenant_id = %s
              AND floor_id = %s
              AND is_published = TRUE
              AND status = %s
            """,
            (
                LayoutStatus.ARCHIVED.value,
                tenant_id,
                floor_id,
                LayoutStatus.PUBLISHED.value,
            ),
        )


def get_next_layout_version(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(MAX(version_no), 0)
            FROM floor_layouts
            WHERE tenant_id = %s
              AND floor_id = %s
            """,
            (
                tenant_id,
                floor_id,
            ),
        )

        row = cur.fetchone()

    current_version = int(row[0] or 0)

    return current_version + 1


def fetch_floor_layouts_by_floor(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
) -> list[dict[str, Any]]:
    """
    Fetch all non-deleted layouts for a tenant-scoped floor.

    Ordered PUBLISHED, then DRAFT, then ARCHIVED, then DELETED; within each
    group, most recently updated first.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                {FLOOR_LAYOUT_SELECT_FIELDS}
            FROM floor_layouts AS fl
            {FLOOR_LAYOUT_USER_JOINS}
            {FLOOR_LAYOUT_LOCATION_JOINS}
            WHERE fl.tenant_id = %s
              AND fl.floor_id = %s
              AND fl.status = ANY(%s)
            ORDER BY
                CASE fl.status
                    WHEN 'PUBLISHED' THEN 0
                    WHEN 'DRAFT' THEN 1
                    WHEN 'ARCHIVED' THEN 2
                    WHEN 'DELETED' THEN 3
                    ELSE 4
                END,
                fl.updated_at DESC,
                fl.id DESC
            """,
            (
                tenant_id,
                floor_id,
                list(NON_DELETED_LAYOUT_STATUSES),
            ),
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]


def _fetch_floor_layout_row(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
    include_deleted: bool = False,
) -> dict[str, Any] | None:
    status_filter = "" if include_deleted else "AND fl.status = ANY(%s)"
    params: tuple[Any, ...] = (tenant_id, layout_id)
    if not include_deleted:
        params += (list(NON_DELETED_LAYOUT_STATUSES),)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                {FLOOR_LAYOUT_SELECT_FIELDS}
            FROM floor_layouts AS fl
            {FLOOR_LAYOUT_USER_JOINS}
            {FLOOR_LAYOUT_LOCATION_JOINS}
            WHERE fl.tenant_id = %s
              AND fl.id = %s
              {status_filter}
            """,
            params,
        )

        row = cur.fetchone()

    return dict(row) if row else None


def fetch_floor_layout_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
) -> dict[str, Any] | None:
    """Fetch one non-deleted layout by id within a tenant.

    Deleted layouts must behave as if they do not exist, so this is the
    single place every consumer (activate, seats, delete) goes through.
    """
    return _fetch_floor_layout_row(
        conn,
        tenant_id=tenant_id,
        layout_id=layout_id,
    )


def activate_floor_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
    published_by_user_id: str,
) -> dict[str, Any] | None:
    """Mark one tenant-scoped layout as the published floor layout."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE floor_layouts
            SET
                status = %s,
                is_published = TRUE,
                published_at = NOW(),
                published_by_user_id = %s,
                updated_at = NOW()
            WHERE tenant_id = %s
              AND id = %s
            RETURNING
                id::text AS layout_id
            """,
            (
                LayoutStatus.PUBLISHED.value,
                published_by_user_id,
                tenant_id,
                layout_id,
            ),
        )

        row = cur.fetchone()

    if row is None:
        return None

    return fetch_floor_layout_by_id(
        conn,
        tenant_id=tenant_id,
        layout_id=str(row["layout_id"]),
    )


def soft_delete_floor_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
) -> dict[str, Any] | None:
    """Soft delete one tenant-scoped DRAFT/ARCHIVED layout.

    Rows are never removed; PUBLISHED and already-DELETED layouts are
    excluded here so an out-of-band transition can never sneak through.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE floor_layouts
            SET
                status = %s,
                updated_at = NOW()
            WHERE tenant_id = %s
              AND id = %s
              AND status = ANY(%s)
            RETURNING
                id::text AS layout_id
            """,
            (
                LayoutStatus.DELETED.value,
                tenant_id,
                layout_id,
                [LayoutStatus.DRAFT.value, LayoutStatus.ARCHIVED.value],
            ),
        )

        row = cur.fetchone()

    if row is None:
        return None

    return _fetch_floor_layout_row(
        conn,
        tenant_id=tenant_id,
        layout_id=str(row["layout_id"]),
        include_deleted=True,
    )


def insert_floor_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    site_id: str,
    building_id: str,
    floor_id: str,
    layout_name: str,
    layout_file_url: str,
    version_no: int,
    status: str,
    layout_metadata: dict[str, Any] | None,
    uploaded_by_user_id: str,
) -> dict[str, Any]:

    is_published = status == "PUBLISHED"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO floor_layouts (
                tenant_id,
                site_id,
                building_id,
                floor_id,
                layout_name,
                layout_file_url,
                file_storage_provider,
                layout_type,
                version_no,
                is_published,
                layout_metadata,
                uploaded_by_user_id,
                published_by_user_id,
                published_at,
                status
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'S3',
                'SVG',
                %s,
                %s,
                %s,
                %s,
                %s,
                CASE
                    WHEN %s = 'PUBLISHED'
                    THEN NOW()
                    ELSE NULL
                END,
                %s
            )
            RETURNING
                id::text AS layout_id
            """,
            (
                tenant_id,
                site_id,
                building_id,
                floor_id,
                layout_name,
                layout_file_url,
                version_no,
                is_published,
                Json(layout_metadata)
                if layout_metadata is not None
                else None,
                uploaded_by_user_id,
                uploaded_by_user_id if is_published else None,
                status,
                status,
            ),
        )

        row = cur.fetchone()

    if row is None:
        raise LookupError("Failed to create floor layout.")

    created_layout = fetch_floor_layout_by_id(
        conn,
        tenant_id=tenant_id,
        layout_id=str(row["layout_id"]),
    )

    if created_layout is None:
        raise LookupError("Created floor layout could not be reloaded.")

    return created_layout

def fetch_layout_seats_by_layout_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
) -> list[dict[str, Any]]:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT
                lsm.id::text AS layout_seat_mapping_id,

                lsm.layout_id::text AS layout_id,

                lsm.site_id::text AS site_id,
                lsm.building_id::text AS building_id,
                lsm.floor_id::text AS floor_id,

                s.id::text AS seat_id,

                lsm.svg_element_id,

                lsm.seat_code,

                lsm.seat_name,

                lsm.seat_type,

                lsm.status,

                lsm.is_bookable,

                lsm.is_reserved,

                lsm.is_configured,

                lsm.configuration_status,

                lsm.notes,

                COALESCE(
                    lsm.amenity_ids,
                    '{}'
                ) AS amenity_ids,

                lsm.created_at,

                lsm.updated_at

            FROM layout_seat_mappings AS lsm

            LEFT JOIN seats AS s
                ON s.tenant_id = lsm.tenant_id
               AND s.floor_id = lsm.floor_id
               AND s.seat_code = lsm.seat_code

            WHERE lsm.tenant_id = %s
              AND lsm.layout_id = %s

            ORDER BY
                lsm.seat_code ASC
            """,
            (
                tenant_id,
                layout_id,
            ),
        )

        rows = cur.fetchall()

    return [
        dict(row)
        for row in rows
    ]

def sync_published_layout_seats(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
    layout_id: str,
) -> None:

    with conn.cursor() as cur:

        cur.execute(
            """
            UPDATE seats
            SET
                status = 'INACTIVE',
                updated_at = NOW()
            WHERE tenant_id = %s
              AND floor_id = %s
              AND layout_id IS NOT NULL
              AND layout_id <> %s
            """,
            (
                tenant_id,
                floor_id,
                layout_id,
            ),
        )

def publish_layout_seat_configurations(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
    published_by_user_id: str,
) -> None:

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT
                *
            FROM layout_seat_mappings
            WHERE tenant_id = %s
              AND layout_id = %s
              AND is_configured = TRUE
            """,
            (
                tenant_id,
                layout_id,
            ),
        )

        mappings = cur.fetchall()

    for mapping in mappings:

        seat = upsert_operational_seat(
            conn,
            tenant_id=tenant_id,
            layout_id=str(mapping["layout_id"]),
            site_id=str(mapping["site_id"]),
            building_id=str(mapping["building_id"]),
            floor_id=str(mapping["floor_id"]),
            seat_code=str(mapping["seat_code"]),
            seat_type=mapping["seat_type"],
            status=mapping["status"],
            is_bookable=mapping["is_bookable"],
            svg_element_id=str(mapping["svg_element_id"]),
        )

        replace_seat_amenities(
            conn,
            tenant_id=tenant_id,
            seat_id=str(seat["seat_id"]),
            amenity_ids=mapping.get("amenity_ids") or [],
            assigned_by_user_id=published_by_user_id,
        )