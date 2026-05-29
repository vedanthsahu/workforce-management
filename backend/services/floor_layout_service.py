"""
Service layer for floor layout workflows.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

import psycopg2
from boto3.exceptions import S3UploadFailedError
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from psycopg2.extensions import connection as PGConnection

from backend.core.config import get_settings
from backend.core.enums import LayoutStatus
from backend.core.logging import LOGGER_NAME
from backend.core.storage import upload_svg_to_s3
from backend.repositories.floor_layout_repository import (
    activate_floor_layout as activate_floor_layout_record,
    archive_existing_published_layout,
    archive_existing_published_layouts,
    sync_published_layout_seats,
    fetch_floor_for_layout,
    fetch_floor_layout_by_id,
    fetch_floor_layouts_by_floor,
    fetch_layout_seats_by_layout_id,
    get_next_layout_version,
    insert_floor_layout,
)
from backend.repositories.user_repository import fetch_admin_notification_emails
from backend.schemas.floor_layout import (
    CreateFloorLayoutRequest,
    FloorLayoutResponse,
    LayoutSeatListResponse,
    LayoutSeatResponse,
)
from backend.services.notification_service import queue_floor_layout_uploaded_notification
from backend.repositories.layout_seat_mapping_repository import (
    bulk_insert_layout_seat_mappings,
)

logger = logging.getLogger(f"{LOGGER_NAME}.floor_layouts")


def create_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    payload: CreateFloorLayoutRequest,
    file: UploadFile,
    background_tasks: BackgroundTasks | None = None,
) -> FloorLayoutResponse:

    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    try:
        floor = fetch_floor_for_layout(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
        )

        if floor is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_floor_hierarchy",
                    "message": "Floor does not belong to provided hierarchy.",
                },
            )

        version_no = get_next_layout_version(
            conn,
            tenant_id=tenant_id,
            floor_id=str(payload.floor_id),
        )

        layout_file_url = upload_svg_to_s3(
            file=file,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            version_no=version_no,
        )

        if payload.status == "PUBLISHED":
            archive_existing_published_layout(
                conn,
                tenant_id=tenant_id,
                floor_id=str(payload.floor_id),
            )

        created_layout = insert_floor_layout(
            conn,
            tenant_id=tenant_id,
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            layout_name=payload.layout_name,
            layout_file_url=layout_file_url,
            version_no=version_no,
            status=payload.status,
            layout_metadata=payload.layout_metadata,
            uploaded_by_user_id=user_id,
        )
        print("DEBUG_SEAT_IDS", payload.seat_ids)
        print("DEBUG_SEAT_IDS_TYPE", type(payload.seat_ids))
        bulk_insert_layout_seat_mappings(
            conn,
            tenant_id=tenant_id,
            layout_id=str(created_layout["layout_id"]),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_ids=payload.seat_ids,
            created_by=user_id,
        )

        conn.commit()

        _queue_floor_layout_uploaded_email(
            background_tasks,
            conn=conn,
            tenant_id=tenant_id,
            layout=created_layout,
        )

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_create_failed",
                "message": "Failed to create floor layout.",
            },
        ) from exc

    except (BotoCoreError, ClientError, S3UploadFailedError) as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_upload_failed",
                "message": "Failed to upload floor layout SVG.",
            },
        ) from exc

    return FloorLayoutResponse(**created_layout)


def get_floor_layouts_by_floor(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    floor_id: str,
) -> list[FloorLayoutResponse]:
    """Return all layouts for one tenant-scoped floor."""
    try:
        layouts = fetch_floor_layouts_by_floor(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            floor_id=floor_id,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_lookup_failed",
                "message": "Failed to fetch floor layouts.",
            },
        ) from exc

    return [FloorLayoutResponse(**layout) for layout in layouts]


def get_floor_layout_seats(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout_id: str,
) -> LayoutSeatListResponse:

    try:

        seats = fetch_layout_seats_by_layout_id(
            conn,
            tenant_id=str(current_user["tenant_id"]),
            layout_id=layout_id,
        )

    except psycopg2.Error as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "layout_seat_lookup_failed",
                "message": "Failed to fetch layout seats.",
            },
        ) from exc

    configured_count = sum(
        1
        for seat in seats
        if seat.get("is_configured") is True
    )

    items = [
        LayoutSeatResponse(**seat)
        for seat in seats
    ]

    return LayoutSeatListResponse(
        layout_id=layout_id,
        total_seats=len(items),
        configured_seats=configured_count,
        pending_seats=len(items) - configured_count,
        items=items,
    )

def activate_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout_id: str,
    background_tasks: BackgroundTasks | None = None,
) -> FloorLayoutResponse:
    """Publish one layout and archive any currently active layout on the floor."""
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])

    try:
        layout = fetch_floor_layout_by_id(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
        )

        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )

        if (
            layout.get("is_published") is True
            and layout.get("status") == LayoutStatus.PUBLISHED.value
        ):
            return FloorLayoutResponse(**layout)

        archive_existing_published_layouts(
            conn,
            tenant_id=tenant_id,
            floor_id=str(layout["floor_id"]),
        )

        activated_layout = activate_floor_layout_record(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
            published_by_user_id=user_id,
        )

        if activated_layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )
        sync_published_layout_seats(
                conn,
                tenant_id=tenant_id,
                floor_id=str(layout["floor_id"]),
                layout_id=layout_id,
            )

        conn.commit()

        _queue_floor_layout_uploaded_email(
            background_tasks,
            conn=conn,
            tenant_id=tenant_id,
            layout=activated_layout,
        )

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as exc:
        conn.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_activate_failed",
                "message": "Failed to activate floor layout.",
            },
        ) from exc

    return FloorLayoutResponse(**activated_layout)


def _queue_floor_layout_uploaded_email(
    background_tasks: BackgroundTasks | None,
    *,
    conn: PGConnection,
    tenant_id: str,
    layout: dict[str, Any],
) -> None:
    if background_tasks is None:
        return

    try:
        queue_floor_layout_uploaded_notification(
            background_tasks,
            to_emails=_resolve_admin_notification_recipients(
                conn,
                tenant_id=tenant_id,
            ),
            context=_floor_layout_email_context(layout),
        )
    except Exception:
        logger.exception(
            "notification.queue_failed event=floor_layout_uploaded layout_id=%s tenant_id=%s",
            layout.get("layout_id"),
            tenant_id,
        )


def _resolve_admin_notification_recipients(
    conn: PGConnection,
    *,
    tenant_id: str,
) -> list[str]:
    settings = get_settings()
    recipients = list(settings.notification_admin_emails)

    try:
        recipients.extend(
            fetch_admin_notification_emails(
                conn,
                tenant_id=tenant_id,
            )
        )
    except psycopg2.Error:
        logger.exception(
            "notification.recipient_lookup_failed event=floor_layout_uploaded tenant_id=%s",
            tenant_id,
        )

    normalized: list[str] = []
    seen: set[str] = set()
    for email in recipients:
        candidate = str(email or "").strip()
        if not candidate:
            continue
        key = candidate.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(candidate)
    return normalized


def _floor_layout_email_context(layout: dict[str, Any]) -> dict[str, str]:
    uploader_name = (
        layout.get("uploaded_by_name")
        or layout.get("uploaded_by_email")
        or layout.get("uploaded_by_user_id")
        or "Unknown"
    )
    return {
        "layout_name": _format_template_value(layout.get("layout_name")),
        "version_no": _format_template_value(layout.get("version_no")),
        "layout_type": _format_template_value(layout.get("layout_type")),
        "uploaded_by": str(uploader_name),
        "uploaded_by_email": _format_template_value(layout.get("uploaded_by_email")),
        "floor_name": _format_template_value(layout.get("floor_name") or layout.get("floor_id")),
        "building_name": _format_template_value(layout.get("building_name") or layout.get("building_id")),
        "site_name": _format_template_value(layout.get("site_name") or layout.get("site_id")),
        "uploaded_at": _format_template_value(layout.get("created_at")),
        "status": _format_template_value(layout.get("status")),
    }


def _format_template_value(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    if value is None:
        return "Not available"
    return str(value)
