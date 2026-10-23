"""
Service layer for business rules that combine to drive layout scheduling.

Most business rules are independent and can be updated one at a time via
`business_rule_repository.upsert_tenant_business_rule`. The layout
scheduling minimum-gap is not stored as its own rule -- it's computed live
from two independent ones (employee booking window + safety buffer)
whenever it's needed, so the two can never drift out of sync the way a
separately-stored, cascade-written value could.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from psycopg2.extensions import connection as PGConnection

from backend.repositories.business_rule_repository import (
    fetch_business_rule_value,
    upsert_tenant_business_rule,
)

EMPLOYEE_MAX_ADVANCE_DAYS_KEY = "booking.max_advance_days.employee"
GUEST_MAX_ADVANCE_DAYS_KEY = "booking.max_advance_days.guest"
LAYOUT_SCHEDULING_BUFFER_DAYS_KEY = "floor_layouts.min_advance_days.buffer"
ACTIVITY_RECORD_COUNT_KEY = "activity.recent_record_count"
CHATBOT_EMPLOYEE_ACCESS_KEY = "chatbot.employee_access_enabled"

# How far ahead (in days) a seat block can be set -- applies to creating,
# modifying and re-blocking. A separate key, not part of
# BLOCKED_SEAT_DAYS_KEYS, because those drive the list's status tabs while
# this one limits the dates an admin can pick.
BLOCKED_SEAT_MAX_ADVANCE_DAYS_KEY = "blocked_seats.max_advance_days"

LAYOUT_VISIBILITY_DAYS_KEYS: dict[str, str] = {
    "DRAFT": "floor_layouts.visibility_days.draft",
    "ARCHIVED": "floor_layouts.visibility_days.archived",
    "DELETED": "floor_layouts.visibility_days.deleted",
}

BLOCKED_SEAT_DAYS_KEYS: dict[str, str] = {
    "UPCOMING": "blocked_seats.upcoming_days",
    "EXPIRING_SOON": "blocked_seats.expiring_soon_days",
    "EXPIRED_WINDOW": "blocked_seats.expired_window_days",
}

# Hard floor for the buffer rule, enforced here AND at the DB level (see
# chk_business_rules_scheduling_buffer_min / chk_tenant_business_rules_
# scheduling_buffer_min) -- a zero or negative buffer would let an admin
# schedule a layout to take effect today, defeating the whole point of the
# gap: no in-flight employee booking should ever be able to land on a
# layout that's about to be replaced.
MIN_LAYOUT_SCHEDULING_BUFFER_DAYS = 1

# Fallback defaults used only if the rules haven't been seeded in the
# catalog yet -- keeps scheduling working out of the box before the
# one-time seed query runs. Mirror the values these replaced (see
# booking_service.book_seat, guest_service.create_guest_visit/
# create_guest_booking, and the old LAYOUT_VISIBILITY_THRESHOLDS constant
# in floor_layout_service.py).
_DEFAULT_EMPLOYEE_MAX_ADVANCE_DAYS = 30
_DEFAULT_GUEST_MAX_ADVANCE_DAYS = 15
_DEFAULT_LAYOUT_SCHEDULING_BUFFER_DAYS = 15
# Mirrors the RECENT_BOOKINGS_LIMIT the admin dashboard hardcoded before
# this rule existed.
_DEFAULT_ACTIVITY_RECORD_COUNT = 20
_DEFAULT_CHATBOT_EMPLOYEE_ACCESS = False
# Upper bound for the rule: GET /admin/activities never returns more than
# 100 rows, so a larger count could never be filled.
MAX_ACTIVITY_RECORD_COUNT = 100
# Used when the rule hasn't been seeded in the catalog yet (about six months).
_DEFAULT_BLOCKED_SEAT_MAX_ADVANCE_DAYS = 180
# Upper bound so a typo can't turn the window into "effectively unlimited".
MAX_BLOCKED_SEAT_ADVANCE_DAYS = 730
_DEFAULT_LAYOUT_VISIBILITY_DAYS: dict[str, int] = {
    "DRAFT": 15,
    "ARCHIVED": 30,
    "DELETED": 5,
}
# Mirrors the values these replaced (the hardcoded "+ 3" in
# blocked_seat_repository.py's "expiring" category, and the previously
# unbounded "upcoming" category).
_DEFAULT_BLOCKED_SEAT_DAYS: dict[str, int] = {
    "UPCOMING": 1,
    "EXPIRING_SOON": 3,
    "EXPIRED_WINDOW": 10,
}


def update_employee_max_advance_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update a tenant's employee booking-advance-window rule."""
    if new_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Value should be greater than 0.",
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=EMPLOYEE_MAX_ADVANCE_DAYS_KEY,
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_layout_scheduling_buffer_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update a tenant's layout-scheduling safety-buffer rule.

    This is application-level defense in depth -- the DB CHECK constraints
    on business_rules.default_value / tenant_business_rules.value enforce
    the same floor even if this function is bypassed somehow.
    """
    if new_value < MIN_LAYOUT_SCHEDULING_BUFFER_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Value should be greater than 0.",
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=LAYOUT_SCHEDULING_BUFFER_DAYS_KEY,
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_guest_max_advance_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update a tenant's guest booking-advance-window rule."""
    if new_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Value should be greater than 0.",
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=GUEST_MAX_ADVANCE_DAYS_KEY,
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_activity_record_count(
    conn: PGConnection,
    *,
    tenant_id: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update how many rows the admin dashboard's Recent Activities table
    shows."""
    if new_value <= 0 or new_value > MAX_ACTIVITY_RECORD_COUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": (
                    "Value should be greater than 0 and less than or equal "
                    f"to {MAX_ACTIVITY_RECORD_COUNT}."
                ),
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=ACTIVITY_RECORD_COUNT_KEY,
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_chatbot_employee_access(
    conn: PGConnection,
    *,
    tenant_id: str,
    enabled: bool,
    updated_by_user_id: str,
) -> None:
    """Enable or disable the employee chatbot for one tenant."""
    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=CHATBOT_EMPLOYEE_ACCESS_KEY,
        value="true" if enabled else "false",
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_layout_visibility_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    status_key: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update how long a DRAFT/ARCHIVED/DELETED layout stays listed before
    dropping out of the admin list. `status_key` is one of
    LAYOUT_VISIBILITY_DAYS_KEYS's keys ("DRAFT"/"ARCHIVED"/"DELETED")."""
    if status_key not in LAYOUT_VISIBILITY_DAYS_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": f"Unknown layout visibility status: {status_key}",
            },
        )
    if new_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Value should be greater than 0.",
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=LAYOUT_VISIBILITY_DAYS_KEYS[status_key],
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_blocked_seat_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    setting_key: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update one of the Blocked Seats thresholds. `setting_key` is one of
    BLOCKED_SEAT_DAYS_KEYS's keys ("UPCOMING"/"EXPIRING_SOON"/
    "EXPIRED_WINDOW")."""
    if setting_key not in BLOCKED_SEAT_DAYS_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": f"Unknown blocked seat setting: {setting_key}",
            },
        )
    if new_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Value should be greater than 0.",
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=BLOCKED_SEAT_DAYS_KEYS[setting_key],
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def update_blocked_seat_max_advance_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update how many days ahead a seat block can be set."""
    if new_value <= 0 or new_value > MAX_BLOCKED_SEAT_ADVANCE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": (
                    "Value should be greater than 0 and less than or equal "
                    f"to {MAX_BLOCKED_SEAT_ADVANCE_DAYS}."
                ),
            },
        )

    _upsert_or_500(
        conn,
        tenant_id=tenant_id,
        business_rule_key=BLOCKED_SEAT_MAX_ADVANCE_DAYS_KEY,
        value=str(new_value),
        updated_by_user_id=updated_by_user_id,
    )
    conn.commit()


def resolve_blocked_seat_max_advance_days(conn: PGConnection, *, tenant_id: str) -> int:
    """Return how many days ahead a seat block can be set for a tenant."""
    return int(
        fetch_business_rule_value(
            conn, tenant_id=tenant_id, business_rule_key=BLOCKED_SEAT_MAX_ADVANCE_DAYS_KEY,
            default=_DEFAULT_BLOCKED_SEAT_MAX_ADVANCE_DAYS,
        )
    )


def resolve_layout_scheduling_gap(conn: PGConnection, *, tenant_id: str) -> dict[str, Any]:
    """Return the employee booking window, the safety buffer, and their
    sum -- the minimum number of days out an admin must schedule a new
    layout. This is the one place that combines the two rules; everything
    else (the activate-layout validation, and any future UI display of
    "earliest date you can pick") should call this instead of reading
    either rule directly, so both always agree.
    """
    employee_max_advance_days = int(
        fetch_business_rule_value(
            conn, tenant_id=tenant_id, business_rule_key=EMPLOYEE_MAX_ADVANCE_DAYS_KEY,
            default=_DEFAULT_EMPLOYEE_MAX_ADVANCE_DAYS,
        )
    )
    buffer_days = int(
        fetch_business_rule_value(
            conn, tenant_id=tenant_id, business_rule_key=LAYOUT_SCHEDULING_BUFFER_DAYS_KEY,
            default=_DEFAULT_LAYOUT_SCHEDULING_BUFFER_DAYS,
        )
    )
    # Belt and suspenders: even if a bad value somehow made it into the
    # database (e.g. seeded by hand, bypassing update_layout_scheduling_
    # buffer_days above), never let it produce a non-positive buffer here.
    buffer_days = max(buffer_days, MIN_LAYOUT_SCHEDULING_BUFFER_DAYS)

    return {
        "employee_max_advance_days": employee_max_advance_days,
        "buffer_days": buffer_days,
        "min_advance_days": employee_max_advance_days + buffer_days,
    }


def resolve_booking_advance_days(conn: PGConnection, *, tenant_id: str) -> dict[str, int]:
    """Return the employee and guest booking-advance-window rules for a
    tenant. The single place both book_seat's and create_guest_visit's/
    create_guest_booking's advance-window checks should read from, instead
    of each hardcoding its own number."""
    return {
        "employee_max_advance_days": int(
            fetch_business_rule_value(
                conn, tenant_id=tenant_id, business_rule_key=EMPLOYEE_MAX_ADVANCE_DAYS_KEY,
                default=_DEFAULT_EMPLOYEE_MAX_ADVANCE_DAYS,
            )
        ),
        "guest_max_advance_days": int(
            fetch_business_rule_value(
                conn, tenant_id=tenant_id, business_rule_key=GUEST_MAX_ADVANCE_DAYS_KEY,
                default=_DEFAULT_GUEST_MAX_ADVANCE_DAYS,
            )
        ),
    }


def resolve_activity_record_count(conn: PGConnection, *, tenant_id: str) -> int:
    """Return how many rows the admin dashboard's Recent Activities table
    shows for a tenant."""
    return int(
        fetch_business_rule_value(
            conn, tenant_id=tenant_id, business_rule_key=ACTIVITY_RECORD_COUNT_KEY,
            default=_DEFAULT_ACTIVITY_RECORD_COUNT,
        )
    )


def resolve_chatbot_employee_access(conn: PGConnection, *, tenant_id: str) -> bool:
    """Return whether employees in a tenant may use the chatbot."""
    return bool(
        fetch_business_rule_value(
            conn,
            tenant_id=tenant_id,
            business_rule_key=CHATBOT_EMPLOYEE_ACCESS_KEY,
            default=_DEFAULT_CHATBOT_EMPLOYEE_ACCESS,
        )
    )


def resolve_layout_visibility_days(conn: PGConnection, *, tenant_id: str) -> dict[str, int]:
    """Return how many days a DRAFT/ARCHIVED/DELETED layout may sit
    untouched before it drops out of the admin layout list for an
    enrolled floor (PUBLISHED is never subject to this and has no rule).
    Keys match floor_layouts.status values."""
    return {
        status_key: int(
            fetch_business_rule_value(
                conn, tenant_id=tenant_id, business_rule_key=rule_key,
                default=_DEFAULT_LAYOUT_VISIBILITY_DAYS[status_key],
            )
        )
        for status_key, rule_key in LAYOUT_VISIBILITY_DAYS_KEYS.items()
    }


def resolve_blocked_seat_days(conn: PGConnection, *, tenant_id: str) -> dict[str, int]:
    """Return the Blocked Seats thresholds: how soon a block counts as
    Upcoming/Expiring Soon, and how far back the Expired tab should look
    for records."""
    return {
        setting_key: int(
            fetch_business_rule_value(
                conn, tenant_id=tenant_id, business_rule_key=rule_key,
                default=_DEFAULT_BLOCKED_SEAT_DAYS[setting_key],
            )
        )
        for setting_key, rule_key in BLOCKED_SEAT_DAYS_KEYS.items()
    }


def _upsert_or_500(
    conn: PGConnection,
    *,
    tenant_id: str,
    business_rule_key: str,
    value: str,
    updated_by_user_id: str,
) -> None:
    try:
        upsert_tenant_business_rule(
            conn,
            tenant_id=tenant_id,
            business_rule_key=business_rule_key,
            value=value,
            updated_by_user_id=updated_by_user_id,
        )
    except LookupError as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "business_rule_not_seeded",
                "message": str(exc),
            },
        ) from exc


def get_all_business_rules(conn: PGConnection, *, tenant_id: str) -> dict[str, Any]:
    """The tenant's full resolved business-rule state across every policy
    area, in the same shape as BusinessRulesResponse. Used to answer
    POST /business-rules with one combined, up-to-date payload instead
    of making the caller re-fetch each policy's own GET afterward."""
    gap = resolve_layout_scheduling_gap(conn, tenant_id=tenant_id)
    visibility_days = resolve_layout_visibility_days(conn, tenant_id=tenant_id)
    blocked_seat_days = resolve_blocked_seat_days(conn, tenant_id=tenant_id)

    return {
        "booking_policy": resolve_booking_advance_days(conn, tenant_id=tenant_id),
        "layout_policy": {
            "employee_max_advance_days": gap["employee_max_advance_days"],
            "buffer_days": gap["buffer_days"],
            "min_advance_days": gap["min_advance_days"],
            "visibility_days": {
                "draft": visibility_days["DRAFT"],
                "archived": visibility_days["ARCHIVED"],
                "deleted": visibility_days["DELETED"],
            },
        },
        "activity_policy": {
            "record_count": resolve_activity_record_count(conn, tenant_id=tenant_id),
        },
        "blocked_seat_policy": {
            "upcoming_days": blocked_seat_days["UPCOMING"],
            "expiring_soon_days": blocked_seat_days["EXPIRING_SOON"],
            "expired_window_days": blocked_seat_days["EXPIRED_WINDOW"],
            "max_advance_days": resolve_blocked_seat_max_advance_days(conn, tenant_id=tenant_id),
        },
        "chatbot_policy": {
            "employee_access_enabled": resolve_chatbot_employee_access(conn, tenant_id=tenant_id),
        },
    }


def _as_int(value: Any, *, setting_id: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": f"{setting_id} requires a numeric value.",
            },
        )
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": f"{setting_id} requires a numeric value.",
            },
        ) from exc


def _as_bool(value: Any, *, setting_id: str) -> bool:
    if not isinstance(value, bool):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": f"{setting_id} requires a true/false value.",
            },
        )
    return value


def _set_booking_employee_max_advance_days(conn, *, tenant_id, value, updated_by_user_id, setting_id):
    update_employee_max_advance_days(
        conn, tenant_id=tenant_id, new_value=_as_int(value, setting_id=setting_id),
        updated_by_user_id=updated_by_user_id,
    )


def _set_booking_guest_max_advance_days(conn, *, tenant_id, value, updated_by_user_id, setting_id):
    update_guest_max_advance_days(
        conn, tenant_id=tenant_id, new_value=_as_int(value, setting_id=setting_id),
        updated_by_user_id=updated_by_user_id,
    )


def _set_layout_buffer_days(conn, *, tenant_id, value, updated_by_user_id, setting_id):
    update_layout_scheduling_buffer_days(
        conn, tenant_id=tenant_id, new_value=_as_int(value, setting_id=setting_id),
        updated_by_user_id=updated_by_user_id,
    )


def _make_layout_visibility_setter(status_key: str):
    def _setter(conn, *, tenant_id, value, updated_by_user_id, setting_id):
        update_layout_visibility_days(
            conn, tenant_id=tenant_id, status_key=status_key,
            new_value=_as_int(value, setting_id=setting_id),
            updated_by_user_id=updated_by_user_id,
        )

    return _setter


def _set_activity_record_count(conn, *, tenant_id, value, updated_by_user_id, setting_id):
    update_activity_record_count(
        conn, tenant_id=tenant_id, new_value=_as_int(value, setting_id=setting_id),
        updated_by_user_id=updated_by_user_id,
    )


def _make_blocked_seat_days_setter(setting_key: str):
    def _setter(conn, *, tenant_id, value, updated_by_user_id, setting_id):
        update_blocked_seat_days(
            conn, tenant_id=tenant_id, setting_key=setting_key,
            new_value=_as_int(value, setting_id=setting_id),
            updated_by_user_id=updated_by_user_id,
        )

    return _setter


def _set_blocked_seat_max_advance_days(conn, *, tenant_id, value, updated_by_user_id, setting_id):
    update_blocked_seat_max_advance_days(
        conn, tenant_id=tenant_id, new_value=_as_int(value, setting_id=setting_id),
        updated_by_user_id=updated_by_user_id,
    )


def _set_chatbot_employee_access(conn, *, tenant_id, value, updated_by_user_id, setting_id):
    update_chatbot_employee_access(
        conn, tenant_id=tenant_id, enabled=_as_bool(value, setting_id=setting_id),
        updated_by_user_id=updated_by_user_id,
    )


# Every writable business-rule setting, by the dotted id the frontend sends
# in POST /business-rules. Adding a new writable setting means adding one
# entry here (plus its own resolve_*/update_* pair above, same as today) --
# nothing else in the route or dispatch layer changes.
BUSINESS_RULE_SETTERS: dict[str, Any] = {
    "booking_policy.employee_max_advance_days": _set_booking_employee_max_advance_days,
    "booking_policy.guest_max_advance_days": _set_booking_guest_max_advance_days,
    "layout_policy.buffer_days": _set_layout_buffer_days,
    "layout_policy.visibility_days.draft": _make_layout_visibility_setter("DRAFT"),
    "layout_policy.visibility_days.archived": _make_layout_visibility_setter("ARCHIVED"),
    "layout_policy.visibility_days.deleted": _make_layout_visibility_setter("DELETED"),
    "activity_policy.record_count": _set_activity_record_count,
    "blocked_seat_policy.upcoming_days": _make_blocked_seat_days_setter("UPCOMING"),
    "blocked_seat_policy.expiring_soon_days": _make_blocked_seat_days_setter("EXPIRING_SOON"),
    "blocked_seat_policy.expired_window_days": _make_blocked_seat_days_setter("EXPIRED_WINDOW"),
    "blocked_seat_policy.max_advance_days": _set_blocked_seat_max_advance_days,
    "chatbot_policy.employee_access_enabled": _set_chatbot_employee_access,
}


def update_business_rules(
    conn: PGConnection,
    *,
    tenant_id: str,
    updates: list[tuple[str, Any]],
    updated_by_user_id: str,
) -> dict[str, Any]:
    """Apply a batch of individually-identified setting changes (replaces
    the old one-PATCH-per-policy-area routes), then return the tenant's
    full resolved state so the caller never needs a follow-up GET.

    Each setting still validates and commits exactly as it did under its
    old dedicated PATCH route (see each update_* function above) -- this
    only adds a thin id -> setter dispatch in front of them. An update
    that fails partway through a multi-item batch leaves the settings
    before it applied, same as today's single PATCH already does when it
    touches more than one field (e.g. the three visibility_days keys).
    """
    for setting_id, value in updates:
        setter = BUSINESS_RULE_SETTERS.get(setting_id)
        if setter is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "unknown_business_rule_id",
                    "message": f"Unknown business rule id: {setting_id}",
                },
            )
        setter(
            conn,
            tenant_id=tenant_id,
            value=value,
            updated_by_user_id=updated_by_user_id,
            setting_id=setting_id,
        )

    return get_all_business_rules(conn, tenant_id=tenant_id)
