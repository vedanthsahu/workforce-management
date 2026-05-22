"""
Repository helpers for floor layout persistence.
"""
from __future__ import annotations
from psycopg2.extras import Json

from typing import Any

from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection as PGConnection

from backend.core.enums import LayoutStatus


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
    fl.published_by_user_id::text AS published_by_user_id,
    fl.published_at,
    fl.status,
    fl.created_at,
    fl.updated_at
"""


FLOOR_LAYOUT_UPLOADER_JOIN = """
    LEFT JOIN app_users AS au
        ON au.id = fl.uploaded_by_user_id
       AND au.tenant_id = fl.tenant_id
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


def archive_existing_published_layout(
    conn: PGConnection,
    *,
    tenant_id: str,
    floor_id: str,
) -> None:
    archive_existing_published_layouts(
        conn,
        tenant_id=tenant_id,
        floor_id=floor_id,
    )


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
    """Fetch all layouts for a tenant-scoped floor, newest version first."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                {FLOOR_LAYOUT_SELECT_FIELDS}
            FROM floor_layouts AS fl
            {FLOOR_LAYOUT_UPLOADER_JOIN}
            {FLOOR_LAYOUT_LOCATION_JOINS}
            WHERE fl.tenant_id = %s
              AND fl.floor_id = %s
            ORDER BY fl.version_no DESC, fl.created_at DESC, fl.id DESC
            """,
            (
                tenant_id,
                floor_id,
            ),
        )

        rows = cur.fetchall()

    return [dict(row) for row in rows]


def fetch_floor_layout_by_id(
    conn: PGConnection,
    *,
    tenant_id: str,
    layout_id: str,
) -> dict[str, Any] | None:
    """Fetch one layout by id within a tenant."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            SELECT
                {FLOOR_LAYOUT_SELECT_FIELDS}
            FROM floor_layouts AS fl
            {FLOOR_LAYOUT_UPLOADER_JOIN}
            {FLOOR_LAYOUT_LOCATION_JOINS}
            WHERE fl.tenant_id = %s
              AND fl.id = %s
            """,
            (
                tenant_id,
                layout_id,
            ),
        )

        row = cur.fetchone()

    return dict(row) if row else None


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
