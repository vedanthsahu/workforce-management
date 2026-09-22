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

LAYOUT_VISIBILITY_DAYS_KEYS: dict[str, str] = {
    "DRAFT": "floor_layouts.visibility_days.draft",
    "ARCHIVED": "floor_layouts.visibility_days.archived",
    "DELETED": "floor_layouts.visibility_days.deleted",
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
_DEFAULT_LAYOUT_VISIBILITY_DAYS: dict[str, int] = {
    "DRAFT": 15,
    "ARCHIVED": 30,
    "DELETED": 5,
}


def update_employee_max_advance_days(
    conn: PGConnection,
    *,
    tenant_id: str,
    new_value: int,
    updated_by_user_id: str,
) -> None:
    """Update a tenant's employee booking-advance-window rule."""
    if new_value < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Booking advance window cannot be negative.",
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
                "message": (
                    f"The layout scheduling buffer cannot be less than "
                    f"{MIN_LAYOUT_SCHEDULING_BUFFER_DAYS} day -- a zero or "
                    "negative buffer would let a layout be scheduled to take "
                    "effect immediately, with no safety margin at all."
                ),
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
    if new_value < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Booking advance window cannot be negative.",
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
    if new_value < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_business_rule_value",
                "message": "Visibility window cannot be negative.",
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
