"""
Service layer for floor layout workflows.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import psycopg2
from boto3.exceptions import S3UploadFailedError
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from psycopg2.extensions import connection as PGConnection

from backend.core.app_logging import LOGGER_NAME
from backend.core.audit_actions import (
    FLOOR_LAYOUT_CUTOVER_PROMOTED,
    FLOOR_LAYOUT_DELETED,
    FLOOR_LAYOUT_PUBLISHED,
    FLOOR_LAYOUT_RESCHEDULED,
    FLOOR_LAYOUT_SCHEDULE_CANCELLED,
    FLOOR_LAYOUT_SCHEDULED,
)
from backend.core.config import get_settings
from backend.core.enums import LayoutStatus
from backend.core.error_diagnostics import print_error_diagnostic
from backend.core.storage import upload_svg_to_s3
from backend.repositories.audit_repository import safe_write_audit_log
from backend.repositories.floor_layout_repository import (
    acquire_floor_publish_lock,
    archive_existing_published_layouts,
    fetch_floor_for_layout,
    fetch_floor_layout_by_id,
    fetch_floor_layouts_by_floor,
    fetch_layout_seats_by_layout_id,
    fetch_published_layout_for_floor,
    fetch_scheduled_layout_for_floor,
    fetch_scheduled_layouts_due,
    fetch_site_timezone,
    get_next_layout_version,
    insert_floor_layout,
    publish_layout_seat_configurations,
    reconcile_published_layout_seats,
    retire_layout_seats,
    set_published_layout_effective_till,
    soft_delete_floor_layout,
)
from backend.repositories.floor_layout_repository import (
    activate_floor_layout as activate_floor_layout_record,
)
from backend.repositories.floor_layout_repository import (
    schedule_floor_layout as schedule_floor_layout_record,
)
from backend.repositories.layout_seat_mapping_repository import (
    bulk_insert_layout_seat_mappings,
)
from backend.services.business_rule_service import (
    resolve_layout_scheduling_gap,
    resolve_layout_visibility_days,
)

# Floors enrolled in the age-based list-visibility rule when
# LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS (below) is False. Pilot: Roxana
# Towers / 7th Floor, Hyderabad Begumpet Office (tenant_id=3, floor_id=9 --
# confirmed against the dev DB).
LAYOUT_VISIBILITY_PILOT_FLOOR_IDS: frozenset[str] = frozenset({"9"})

# Master switch for the rollout. True = every floor gets the rule (ignores
# the pilot set above); False = only floors in LAYOUT_VISIBILITY_PILOT_FLOOR_IDS
# do. Flipping this is the whole "pilot on one floor, then everywhere"
# rollout -- no DB change, no other code change.
LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS: bool = True

# How long a layout may sit in each status before it drops out of the list
# for an enrolled floor. Tenant-configurable -- see resolve_layout_
# visibility_days (business_rule_service.py), keys floor_layouts.
# visibility_days.{draft,archived,deleted}. This does not delete data —
# rows stay in the database and are still reachable outside this filtered
# list. PUBLISHED is never hidden. Based on updated_at (no dedicated
# status-timestamp column today), so an unrelated edit to a DRAFT/ARCHIVED
# layout's seats can reset its clock — a known, accepted tradeoff, not a
# bug.

# "days" is the real production setting. Switch to "minutes" (and the
# business rule values to something small, e.g. 3) to verify the rule end
# to end without an actual multi-day wait -- then switch both back before
# this goes anywhere near production. Nothing else about the code changes
# between the two.
LAYOUT_VISIBILITY_INTERVAL_UNIT: str = "days"
from backend.repositories.user_repository import fetch_admin_notification_emails
from backend.schemas.floor_layout import (
    CreateFloorLayoutRequest,
    FloorLayoutResponse,
    LayoutSeatListResponse,
    LayoutSeatResponse,
)
from backend.services.notification_service import (
    format_notification_value,
    queue_floor_layout_uploaded_notification,
)

logger = logging.getLogger(f"{LOGGER_NAME}.floor_layouts")


def _normalize_seat_ids(seat_ids: list[str]) -> list[str]:
    """Split comma-joined seat IDs, then dedupe and upper-case them.

    Moved from the route layer: this is layout business validation
    (duplicate/empty detection), not request parsing.
    """
    expanded_seat_ids: list[str] = []
    for raw_value in seat_ids:
        expanded_seat_ids.extend(str(raw_value).split(","))

    normalized: list[str] = []
    seen: set[str] = set()

    for raw_value in expanded_seat_ids:
        candidate = str(raw_value or "").strip()

        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_seat_id",
                    "message": "Seat IDs cannot be empty.",
                },
            )

        normalized_candidate = candidate.upper()

        if normalized_candidate in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "duplicate_seat_id",
                    "message": f"Duplicate seat ID detected: {normalized_candidate}",
                },
            )

        seen.add(normalized_candidate)
        normalized.append(normalized_candidate)

    return normalized


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
    normalized_seat_ids = _normalize_seat_ids(payload.seat_ids)

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
            archive_existing_published_layouts(
                conn,
                tenant_id=tenant_id,
                floor_id=str(payload.floor_id),
                archived_by_user_id=user_id,
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
        bulk_insert_layout_seat_mappings(
            conn,
            tenant_id=tenant_id,
            layout_id=str(created_layout["layout_id"]),
            site_id=str(payload.site_id),
            building_id=str(payload.building_id),
            floor_id=str(payload.floor_id),
            seat_ids=normalized_seat_ids,
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
    tenant_id = str(current_user["tenant_id"])
    layout_visibility_enabled = (
        LAYOUT_VISIBILITY_APPLY_TO_ALL_FLOORS
        or floor_id in LAYOUT_VISIBILITY_PILOT_FLOOR_IDS
    )
    visibility_thresholds = (
        resolve_layout_visibility_days(conn, tenant_id=tenant_id)
        if layout_visibility_enabled else None
    )

    try:
        layouts = fetch_floor_layouts_by_floor(
            conn,
            tenant_id=tenant_id,
            floor_id=floor_id,
            visibility_thresholds=visibility_thresholds,
            visibility_unit=LAYOUT_VISIBILITY_INTERVAL_UNIT,
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

    tenant_id = str(current_user["tenant_id"])

    try:

        layout = fetch_floor_layout_by_id(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
            include_deleted=True,
        )

        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )

        seats = fetch_layout_seats_by_layout_id(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
        )

    except HTTPException:
        raise

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

def _resolve_admin_min_advance_days(conn: PGConnection, *, tenant_id: str) -> int:
    """The minimum number of days out an admin must schedule a new layout,
    so it can never take effect before every booking a user could already
    have made against the old layout has passed. Employee window + buffer,
    both live business rules -- see resolve_layout_scheduling_gap."""
    return resolve_layout_scheduling_gap(conn, tenant_id=tenant_id)["min_advance_days"]


def _resolve_employee_max_advance_days(conn: PGConnection, *, tenant_id: str) -> int:
    return resolve_layout_scheduling_gap(conn, tenant_id=tenant_id)["employee_max_advance_days"]


def _site_local_today(tz_name: str | None) -> date:
    if not tz_name:
        return datetime.now().date()
    return datetime.now(ZoneInfo(tz_name)).date()


def _effective_instant_for_date(effective_date: date, tz_name: str | None) -> datetime:
    """Midnight on `effective_date`, in the target site's own timezone --
    not the server's. "26 Aug" means midnight in Jakarta for a Jakarta
    floor, not midnight UTC."""
    naive_midnight = datetime.combine(effective_date, time.min)
    if not tz_name:
        return naive_midnight.replace(tzinfo=ZoneInfo("UTC"))
    return naive_midnight.replace(tzinfo=ZoneInfo(tz_name))


def _schedule_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout: dict[str, Any],
    effective_date: date,
) -> FloorLayoutResponse:
    """Schedule a DRAFT layout to take over automatically once its
    effective date arrives, instead of publishing it immediately.

    Publishes the new layout's seat configurations right away (not just
    at cutover): date-aware reads (fetch_available_seats_by_range etc.)
    resolve which layout applies to a date purely from
    floor_layouts.status/effective_from/effective_till, so the moment
    effective_from arrives that layout must already have real rows in
    `seats` -- otherwise every booking/availability query for that date
    finds a layout but no seats and 404s. Deliberately does NOT call
    reconcile_published_layout_seats here, though -- that retires the
    *other* layout's seats on the floor, and the currently PUBLISHED
    layout is still genuinely live until cutover actually happens;
    retiring its seats now would break today's bookings early.
    promote_scheduled_floor_layouts re-runs publish_layout_seat_configurations
    at cutover (idempotent upsert -- picks up any seat-mapping edits made
    between scheduling and cutover) and only then runs reconcile.
    """
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])
    layout_id = str(layout["layout_id"])
    floor_id = str(layout["floor_id"])

    tz_name = fetch_site_timezone(conn, tenant_id=tenant_id, site_id=str(layout["site_id"]))
    site_today = _site_local_today(tz_name)
    min_advance_days = _resolve_admin_min_advance_days(conn, tenant_id=tenant_id)

    if effective_date < site_today + timedelta(days=min_advance_days):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "effective_date_too_soon",
                "message": (
                    f"Effective date must be at least {min_advance_days} days out, "
                    "so no user booking can ever land on a layout that's about to "
                    "be replaced."
                ),
            },
        )

    existing_scheduled = fetch_scheduled_layout_for_floor(
        conn, tenant_id=tenant_id, floor_id=floor_id,
    )
    if existing_scheduled is not None and existing_scheduled["layout_id"] != layout_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "floor_already_has_scheduled_layout",
                "message": (
                    "This floor already has a layout scheduled. Discard it "
                    "first, or wait for it to take effect, before scheduling "
                    "another one."
                ),
            },
        )

    acquire_floor_publish_lock(conn, tenant_id=tenant_id, floor_id=floor_id)

    effective_instant = _effective_instant_for_date(effective_date, tz_name)

    # Must close the current PUBLISHED layout's window BEFORE writing the
    # new SCHEDULED row -- excl_floor_layouts_no_overlap is checked per
    # statement, not deferred, so doing this in the other order would
    # reject the new row as overlapping the old one's still-open window.
    published = fetch_published_layout_for_floor(conn, tenant_id=tenant_id, floor_id=floor_id)
    if published is not None:
        set_published_layout_effective_till(
            conn,
            tenant_id=tenant_id,
            layout_id=published["layout_id"],
            effective_till=effective_instant,
            updated_by_user_id=user_id,
        )

    scheduled_layout = schedule_floor_layout_record(
        conn,
        tenant_id=tenant_id,
        layout_id=layout_id,
        effective_from=effective_instant,
        scheduled_by_user_id=user_id,
    )

    publish_layout_seat_configurations(
        conn,
        tenant_id=tenant_id,
        layout_id=layout_id,
        published_by_user_id=user_id,
    )

    conn.commit()

    safe_write_audit_log(
        conn,
        action=FLOOR_LAYOUT_SCHEDULED,
        tenant_id=tenant_id,
        current_user=current_user,
        resource_type="floor_layout",
        resource_id=layout_id,
        old_values={"status": layout["status"]},
        new_values={
            "status": scheduled_layout["status"],
            "effective_from": effective_instant.isoformat(),
        },
        changed_fields=["status", "effective_from"],
    )

    return FloorLayoutResponse(**scheduled_layout)


def reschedule_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout_id: str,
    effective_date: date,
) -> FloorLayoutResponse:
    """Change the effective_date of a layout that's already SCHEDULED,
    without cancelling and re-scheduling it from scratch.

    Seat-configuration edits on a SCHEDULED layout go through the normal
    layout-seat-configuration endpoints instead (see
    update_layout_seat_configurations_bulk, which now cascades into
    `seats` for SCHEDULED the same way it already does for PUBLISHED) --
    those are allowed at any time, since they only touch this layout's own
    seats and can't strand anyone else's booking. Only the *date* carries
    the risk this function guards against.

    Guarded the same way delete_floor_layout guards discarding a SCHEDULED
    layout: once today could already reach the *current* effective_from
    within an employee's booking window, real bookings may already exist
    against it -- moving the boundary now could strand them. Past that
    point, nothing about this layout may change; the admin must wait for
    cutover and schedule a fresh layout afterward instead.
    """
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])
    audit_action = FLOOR_LAYOUT_RESCHEDULED

    try:
        layout = fetch_floor_layout_by_id(
            conn, tenant_id=tenant_id, layout_id=layout_id,
        )
        if layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )
        if layout["status"] != LayoutStatus.SCHEDULED.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "floor_layout_not_scheduled",
                    "message": "Only a SCHEDULED layout's effective date can be changed.",
                },
            )

        floor_id = str(layout["floor_id"])
        tz_name = fetch_site_timezone(conn, tenant_id=tenant_id, site_id=str(layout["site_id"]))
        site_today = _site_local_today(tz_name)
        min_advance_days = _resolve_admin_min_advance_days(conn, tenant_id=tenant_id)

        if effective_date < site_today + timedelta(days=min_advance_days):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "effective_date_too_soon",
                    "message": (
                        f"Effective date must be at least {min_advance_days} days out, "
                        "so no user booking can ever land on a layout that's about to "
                        "be replaced."
                    ),
                },
            )

        acquire_floor_publish_lock(conn, tenant_id=tenant_id, floor_id=floor_id)

        # Re-fetch under the lock -- a concurrent cutover could have
        # promoted this layout to PUBLISHED a moment ago.
        layout = fetch_floor_layout_by_id(
            conn, tenant_id=tenant_id, layout_id=layout_id,
        )
        if layout is None or layout["status"] != LayoutStatus.SCHEDULED.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "floor_layout_not_scheduled",
                    "message": (
                        "This layout is no longer scheduled -- it may have "
                        "already taken effect. Refresh and try again."
                    ),
                },
            )

        current_effective_from = layout["effective_from"]
        employee_max_advance_days = _resolve_employee_max_advance_days(
            conn, tenant_id=tenant_id,
        )
        danger_window_start = current_effective_from - timedelta(
            days=employee_max_advance_days,
        )
        if datetime.now(timezone.utc) >= danger_window_start:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "floor_layout_schedule_locked",
                    "message": (
                        "This layout is too close to its effective date to "
                        "modify -- employees may already have bookings "
                        "against it. Handle those bookings first, or wait "
                        "for it to take effect and schedule a new change "
                        "afterward."
                    ),
                },
            )

        new_instant = _effective_instant_for_date(effective_date, tz_name)
        published = fetch_published_layout_for_floor(
            conn, tenant_id=tenant_id, floor_id=floor_id,
        )

        # excl_floor_layouts_no_overlap is checked per statement, not
        # deferred, so which row gets updated first depends on which way
        # the date is moving -- get it backwards and the second UPDATE in
        # the pair momentarily overlaps the other row's still-old window:
        #   moving LATER: widen this SCHEDULED row's effective_from first
        #     (its own window can only shrink the gap, never overlap
        #     PUBLISHED's still-open-until-the-old-date window), then
        #     extend PUBLISHED's effective_till out to match.
        #   moving EARLIER: shrink PUBLISHED's effective_till first, then
        #     pull this row's effective_from back to match.
        if new_instant >= current_effective_from:
            rescheduled = schedule_floor_layout_record(
                conn, tenant_id=tenant_id, layout_id=layout_id,
                effective_from=new_instant, scheduled_by_user_id=user_id,
            )
            if published is not None:
                set_published_layout_effective_till(
                    conn, tenant_id=tenant_id, layout_id=published["layout_id"],
                    effective_till=new_instant, updated_by_user_id=user_id,
                )
        else:
            if published is not None:
                set_published_layout_effective_till(
                    conn, tenant_id=tenant_id, layout_id=published["layout_id"],
                    effective_till=new_instant, updated_by_user_id=user_id,
                )
            rescheduled = schedule_floor_layout_record(
                conn, tenant_id=tenant_id, layout_id=layout_id,
                effective_from=new_instant, scheduled_by_user_id=user_id,
            )

        conn.commit()

        safe_write_audit_log(
            conn,
            action=FLOOR_LAYOUT_RESCHEDULED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="floor_layout",
            resource_id=layout_id,
            old_values={"effective_from": current_effective_from.isoformat()},
            new_values={"effective_from": new_instant.isoformat()},
            changed_fields=["effective_from"],
        )

    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=audit_action, tenant_id=tenant_id,
            current_user=current_user, resource_type="floor_layout", resource_id=layout_id,
            event_status="FAILURE",
            failure_code=_d.get("code"),
            failure_reason=_d.get("message"),
        )
        raise

    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=audit_action, tenant_id=tenant_id,
            current_user=current_user, resource_type="floor_layout", resource_id=layout_id,
            event_status="FAILURE",
            failure_code="floor_layout_reschedule_failed",
            failure_reason="Failed to reschedule floor layout.",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_reschedule_failed",
                "message": "Failed to reschedule floor layout.",
            },
        ) from exc

    return FloorLayoutResponse(**rescheduled)


def activate_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout_id: str,
    background_tasks: BackgroundTasks | None = None,
    effective_date: date | None = None,
) -> FloorLayoutResponse:
    """Publish one layout and archive any currently active layout on the
    floor -- or, if `effective_date` is a future date, schedule it to take
    over automatically once that date arrives instead of publishing now."""
    tenant_id = str(current_user["tenant_id"])
    user_id = str(current_user["user_id"])
    failure_audit_action = FLOOR_LAYOUT_PUBLISHED

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
            # Pure no-op: activate is only a DRAFT/ARCHIVED -> PUBLISHED
            # promotion and never carries seat data. Editing an
            # already-published layout's seats goes through
            # update_layout_seat_configurations_bulk instead (see
            # dev-notes/backend/CURRENT.md) -- that endpoint cascades into
            # `seats` itself, in the same transaction as the edit, when the
            # parent layout is already PUBLISHED. Re-running the
            # publish/reconcile sync here on every activate call would be
            # redundant with that and is deliberately not done.
            return FloorLayoutResponse(**layout)

        if effective_date is not None:
            tz_name = fetch_site_timezone(
                conn, tenant_id=tenant_id, site_id=str(layout["site_id"]),
            )
            if effective_date > _site_local_today(tz_name):
                failure_audit_action = FLOOR_LAYOUT_SCHEDULED
                return _schedule_floor_layout(
                    conn,
                    current_user=current_user,
                    layout=layout,
                    effective_date=effective_date,
                )
            # effective_date is today or in the past: fall through and
            # publish immediately, exactly as if no date had been given.

        # No unique index enforces "one published layout per floor" at the
        # DB level today -- serialize concurrent activate attempts for
        # this floor so archive-then-activate can't race with itself.
        acquire_floor_publish_lock(
            conn,
            tenant_id=tenant_id,
            floor_id=str(layout["floor_id"]),
        )

        archive_existing_published_layouts(
            conn,
            tenant_id=tenant_id,
            floor_id=str(layout["floor_id"]),
            archived_by_user_id=user_id,
        )

        activated_layout = activate_floor_layout_record(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
            published_by_user_id=user_id,
            # Asserts "live as of right now" -- overwrites any stale
            # effective_from left on this row from a prior publish/archive
            # cycle (or the NULL every layout starts with). Without this,
            # date-aware reads (fl.effective_from <= booking_date) exclude
            # the row forever, since NULL <= anything is never true.
            effective_from=datetime.now(timezone.utc),
        )

        publish_layout_seat_configurations(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
            published_by_user_id=user_id,
        )

        reconcile_published_layout_seats(
            conn,
            tenant_id=tenant_id,
            floor_id=str(layout["floor_id"]),
            layout_id=layout_id,
        )

        conn.commit()

        safe_write_audit_log(
            conn,
            action=FLOOR_LAYOUT_PUBLISHED,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="floor_layout",
            resource_id=layout_id,
            old_values={"layout_name": layout["layout_name"], "floor_id": str(layout["floor_id"]), "status": layout["status"]},
            new_values={"layout_name": activated_layout["layout_name"], "floor_id": str(activated_layout["floor_id"]), "status": activated_layout["status"]},
            changed_fields=["status"],
        )

        _queue_floor_layout_uploaded_email(
            background_tasks,
            conn=conn,
            tenant_id=tenant_id,
            layout=activated_layout,
        )

    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=failure_audit_action, tenant_id=tenant_id,
            current_user=current_user, resource_type="floor_layout", resource_id=layout_id,
            event_status="FAILURE",
            failure_code=_d.get("code"),
            failure_reason=_d.get("message"),
        )
        raise

    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=failure_audit_action, tenant_id=tenant_id,
            current_user=current_user, resource_type="floor_layout", resource_id=layout_id,
            event_status="FAILURE",
            failure_code="floor_layout_activate_failed",
            failure_reason="Failed to activate floor layout.",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_activate_failed",
                "message": "Failed to activate floor layout.",
            },
        ) from exc

    return FloorLayoutResponse(**activated_layout)


@dataclass
class LayoutCutoverResult:
    """Summary returned by promote_scheduled_floor_layouts."""

    scanned: int = 0
    promoted: int = 0
    failed: int = 0


def promote_scheduled_floor_layouts(conn: PGConnection) -> LayoutCutoverResult:
    """Cutover job: find every SCHEDULED layout (any tenant, any floor)
    whose effective_from has arrived, and promote it -- archive the
    floor's current PUBLISHED layout, activate the SCHEDULED one, and run
    the same seat publish/reconcile steps activate_floor_layout runs for
    an immediate publish. publish_layout_seat_configurations was already
    run once at schedule time (see _schedule_floor_layout), so this call
    is normally a no-op upsert -- it only picks up seat-mapping edits made
    between scheduling and cutover. reconcile_published_layout_seats, in
    contrast, only runs here: it retires the old layout's seats, which
    would have been premature to do before the old layout was actually
    superseded. One floor's failure does not block the others.

    Intended to run on a recurring background schedule (see
    _start_layout_cutover_scheduler in main.py); can equally be called
    on demand or wired to pg_cron later -- the SQL/transition logic here
    doesn't care what triggered it.

    Uses each layout's own uploaded_by_user_id to stamp the *_by_user_id
    columns (those are NOT NULL in practice / expected to be a real user),
    while the audit log records the actor as the system, not that person
    -- see actor_role="SYSTEM" below.
    """
    due = fetch_scheduled_layouts_due(conn)
    result = LayoutCutoverResult(scanned=len(due))

    for entry in due:
        tenant_id = entry["tenant_id"]
        floor_id = entry["floor_id"]
        layout_id = entry["layout_id"]

        try:
            layout = fetch_floor_layout_by_id(
                conn, tenant_id=tenant_id, layout_id=layout_id,
            )
            if layout is None or layout["status"] != LayoutStatus.SCHEDULED.value:
                # Raced with a manual discard/re-schedule between the scan
                # above and now -- nothing to do, not a failure.
                continue

            actor_user_id = str(layout["uploaded_by_user_id"])

            acquire_floor_publish_lock(conn, tenant_id=tenant_id, floor_id=floor_id)

            archive_existing_published_layouts(
                conn,
                tenant_id=tenant_id,
                floor_id=floor_id,
                archived_by_user_id=actor_user_id,
            )

            activated_layout = activate_floor_layout_record(
                conn,
                tenant_id=tenant_id,
                layout_id=layout_id,
                published_by_user_id=actor_user_id,
            )

            publish_layout_seat_configurations(
                conn,
                tenant_id=tenant_id,
                layout_id=layout_id,
                published_by_user_id=actor_user_id,
            )

            reconcile_published_layout_seats(
                conn,
                tenant_id=tenant_id,
                floor_id=floor_id,
                layout_id=layout_id,
            )

            conn.commit()

            safe_write_audit_log(
                conn,
                action=FLOOR_LAYOUT_CUTOVER_PROMOTED,
                tenant_id=tenant_id,
                actor_user_id=None,
                actor_role="SYSTEM",
                actor_email="system@layout-cutover",
                resource_type="floor_layout",
                resource_id=layout_id,
                old_values={"status": LayoutStatus.SCHEDULED.value},
                new_values={
                    "status": activated_layout["status"],
                    "effective_from": str(entry["effective_from"]),
                },
                changed_fields=["status"],
            )

            result.promoted += 1

        except Exception as exc:
            print_error_diagnostic(exc)
            conn.rollback()
            result.failed += 1
            safe_write_audit_log(
                conn,
                action=FLOOR_LAYOUT_CUTOVER_PROMOTED,
                tenant_id=tenant_id,
                actor_role="SYSTEM",
                actor_email="system@layout-cutover",
                resource_type="floor_layout",
                resource_id=layout_id,
                event_status="FAILURE",
                failure_code="layout_cutover_failed",
                failure_reason="Scheduled layout promotion failed.",
            )

    return result


def delete_floor_layout(
    conn: PGConnection,
    *,
    current_user: dict[str, Any],
    layout_id: str,
) -> FloorLayoutResponse:
    """Soft delete one tenant-scoped floor layout.

    Rows are never removed; PUBLISHED layouts are protected and DELETED
    layouts are treated as already gone (404), never as a distinct state.
    """
    tenant_id = str(current_user["tenant_id"])
    audit_action = FLOOR_LAYOUT_DELETED

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

        if layout["status"] == LayoutStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "floor_layout_published",
                    "message": "Published floor layouts cannot be deleted.",
                },
            )

        if layout["status"] == LayoutStatus.SCHEDULED.value:
            audit_action = FLOOR_LAYOUT_SCHEDULE_CANCELLED

            # Same race reschedule_floor_layout guards against: without the
            # lock + re-fetch, a concurrent cutover could have already
            # promoted this layout to PUBLISHED (or a concurrent reschedule
            # could have moved its effective_from) between the fetch above
            # and the writes below, and everything after would act on a
            # stale snapshot -- reopening/retiring seats for a layout that
            # either no longer needs it or has since moved its own danger
            # window.
            acquire_floor_publish_lock(
                conn, tenant_id=tenant_id, floor_id=str(layout["floor_id"]),
            )
            layout = fetch_floor_layout_by_id(
                conn, tenant_id=tenant_id, layout_id=layout_id,
            )
            if layout is None or layout["status"] != LayoutStatus.SCHEDULED.value:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "floor_layout_not_scheduled",
                        "message": (
                            "This layout is no longer scheduled -- it may "
                            "have already taken effect. Refresh and try "
                            "again."
                        ),
                    },
                )

            # Once an employee's booking window could already reach the
            # scheduled layout's effective date, real bookings may already
            # exist against it -- discarding it now would strand them.
            # Before that point, it's still guaranteed unreachable and can
            # be freely cancelled.
            employee_max_advance_days = _resolve_employee_max_advance_days(
                conn, tenant_id=tenant_id,
            )
            danger_window_start = layout["effective_from"] - timedelta(
                days=employee_max_advance_days,
            )
            if datetime.now(timezone.utc) >= danger_window_start:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "floor_layout_schedule_locked",
                        "message": (
                            "This layout is too close to its effective date to "
                            "cancel -- employees may already have bookings "
                            "against it."
                        ),
                    },
                )

            # Reopen the currently-published layout's window that was
            # closed when this one was scheduled -- it's the active layout
            # again, indefinitely, now that its replacement is cancelled.
            published = fetch_published_layout_for_floor(
                conn, tenant_id=tenant_id, floor_id=str(layout["floor_id"]),
            )
            if published is not None:
                set_published_layout_effective_till(
                    conn,
                    tenant_id=tenant_id,
                    layout_id=published["layout_id"],
                    effective_till=None,
                    updated_by_user_id=str(current_user["user_id"]),
                )

            # Scheduling this layout published its seats immediately (see
            # _schedule_floor_layout), so discarding it must retire them
            # too -- otherwise they'd sit "live" under a DRAFT layout_id
            # indefinitely.
            retire_layout_seats(
                conn,
                tenant_id=tenant_id,
                layout_id=layout_id,
            )

        deleted_layout = soft_delete_floor_layout(
            conn,
            tenant_id=tenant_id,
            layout_id=layout_id,
            target_status=(
                LayoutStatus.DRAFT.value
                if layout["status"] == LayoutStatus.SCHEDULED.value
                else LayoutStatus.DELETED.value
            ),
        )

        if deleted_layout is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "floor_layout_not_found",
                    "message": "Floor layout was not found.",
                },
            )

        conn.commit()

        safe_write_audit_log(
            conn,
            action=audit_action,
            tenant_id=tenant_id,
            current_user=current_user,
            resource_type="floor_layout",
            resource_id=layout_id,
            old_values={"layout_name": layout["layout_name"], "status": layout["status"]},
            new_values={"layout_name": deleted_layout["layout_name"], "status": deleted_layout["status"]},
            changed_fields=["status"],
        )

    except HTTPException as he:
        conn.rollback()
        _d = he.detail if isinstance(he.detail, dict) else {}
        safe_write_audit_log(
            conn, action=audit_action, tenant_id=tenant_id,
            current_user=current_user, resource_type="floor_layout", resource_id=layout_id,
            event_status="FAILURE",
            failure_code=_d.get("code"),
            failure_reason=_d.get("message"),
        )
        raise

    except psycopg2.Error as exc:
        conn.rollback()
        safe_write_audit_log(
            conn, action=audit_action, tenant_id=tenant_id,
            current_user=current_user, resource_type="floor_layout", resource_id=layout_id,
            event_status="FAILURE",
            failure_code="floor_layout_delete_failed",
            failure_reason="Failed to delete floor layout.",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "floor_layout_delete_failed",
                "message": "Failed to delete floor layout.",
            },
        ) from exc

    return FloorLayoutResponse(**deleted_layout)


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
        or ""
    )
    return {
        "layout_name": format_notification_value(layout.get("layout_name")),
        "version_no": format_notification_value(layout.get("version_no")),
        "layout_type": format_notification_value(layout.get("layout_type")),
        "uploaded_by": str(uploader_name),
        "uploaded_by_email": format_notification_value(layout.get("uploaded_by_email")),
        "floor_name": format_notification_value(layout.get("floor_name")),
        "building_name": format_notification_value(layout.get("building_name")),
        "site_name": format_notification_value(layout.get("site_name")),
        "uploaded_at": format_notification_value(layout.get("created_at")),
        "status": format_notification_value(layout.get("status")),
    }
