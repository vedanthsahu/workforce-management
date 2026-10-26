"""PostgreSQL concurrency tests for the double-booking guard.

What is proved here cannot be proved with mocks: that two simultaneous
requests for the same seat and day produce exactly one booking. The tests
use the real repository functions (advisory locks and conflict checks in
backend/repositories/booking_repository.py) against a real PostgreSQL.

SAFETY
- Skipped unless SEATBOOK_TEST_DATABASE_URL is set.
- Refuses to run unless the database name ends with "_test".
- Works only inside a new, uniquely named schema and drops it at the end.
- Never use a shared, development, UAT or production database.

Example (disposable local database):
    set SEATBOOK_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/seatbook_test
    python -m pytest backend/tests/integration -q
"""

from __future__ import annotations

import os
import sys
import threading
import time
import uuid
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

DSN = os.getenv("SEATBOOK_TEST_DATABASE_URL", "")
pytestmark = pytest.mark.skipif(not DSN, reason="SEATBOOK_TEST_DATABASE_URL not set (needs a disposable *_test database)")

# Mirrors the live partial unique indexes on bookings (see docs/database/database-design.md).
SCHEMA_SQL = """
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    booked_for_user_id BIGINT,
    booked_for_guest_id BIGINT,
    booking_date DATE NOT NULL,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
);
CREATE UNIQUE INDEX uq_bookings_tenant_seat_date ON bookings (tenant_id, seat_id, booking_date)
    WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN');
CREATE UNIQUE INDEX uq_bookings_tenant_user_date_active ON bookings (tenant_id, booked_for_user_id, booking_date)
    WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN') AND booked_for_user_id IS NOT NULL;
"""


@pytest.fixture
def schema():
    import psycopg2

    conn = psycopg2.connect(DSN)
    if not conn.info.dbname.endswith("_test"):
        conn.close()
        pytest.fail("Refusing to run: database name must end with '_test'")
    name = f"qa_{uuid.uuid4().hex[:12]}"
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(f'CREATE SCHEMA "{name}"')
        cur.execute(f'SET search_path TO "{name}"')
        cur.execute(SCHEMA_SQL)
    try:
        yield name
    finally:
        with conn.cursor() as cur:
            cur.execute(f'DROP SCHEMA "{name}" CASCADE')
        conn.close()


def _connect(schema_name: str):
    import psycopg2

    conn = psycopg2.connect(DSN, options=f"-c search_path={schema_name}")
    conn.autocommit = False
    return conn


def _attempt(schema_name: str, user_id: int, seat_id: int, day: date, barrier: threading.Barrier, results: list, use_locks: bool) -> None:
    import psycopg2

    from backend.repositories.booking_repository import (
        acquire_booking_slot_locks,
        has_active_booking_conflict,
        user_has_active_booking_on_date,
    )

    conn = _connect(schema_name)
    try:
        barrier.wait()
        if use_locks:
            acquire_booking_slot_locks(conn, tenant_id="1", seat_id=str(seat_id), subject_id=str(user_id), booking_date=day)
        seat_taken = has_active_booking_conflict(conn, tenant_id="1", seat_id=str(seat_id), booking_date=day)
        user_busy = user_has_active_booking_on_date(conn, tenant_id="1", booked_for_user_id=str(user_id), booking_date=day)
        if seat_taken or user_busy:
            conn.rollback()
            results.append("conflict-detected")
            return
        time.sleep(0.2)  # widen the race window
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO bookings (tenant_id, seat_id, booked_for_user_id, booking_date) VALUES (1, %s, %s, %s)",
                (seat_id, user_id, day),
            )
        conn.commit()
        results.append("booked")
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        results.append("unique-violation")
    finally:
        conn.close()


def _race(schema_name: str, attempts: list[tuple[int, int]], use_locks: bool) -> list[str]:
    day = date.today() + timedelta(days=3)
    barrier = threading.Barrier(len(attempts))
    results: list[str] = []
    threads = [threading.Thread(target=_attempt, args=(schema_name, u, s, day, barrier, results, use_locks)) for u, s in attempts]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)
    return results


def _count(schema_name: str) -> int:
    conn = _connect(schema_name)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM bookings WHERE booking_status = 'CONFIRMED'")
            return cur.fetchone()[0]
    finally:
        conn.close()


def test_two_users_racing_for_one_seat_get_exactly_one_booking(schema: str) -> None:
    results = _race(schema, [(101, 7), (102, 7)], use_locks=True)
    assert sorted(results) == ["booked", "conflict-detected"]
    assert _count(schema) == 1


def test_one_user_racing_for_two_seats_gets_exactly_one_booking(schema: str) -> None:
    results = _race(schema, [(101, 7), (101, 8)], use_locks=True)
    assert sorted(results) == ["booked", "conflict-detected"]
    assert _count(schema) == 1


def test_unique_index_is_the_backstop_when_locks_are_skipped(schema: str) -> None:
    # Code paths that do not take the advisory locks (some guest-visit
    # workflow paths) rely on the partial unique index alone.
    results = _race(schema, [(101, 7), (102, 7)], use_locks=False)
    assert "booked" in results
    assert _count(schema) == 1


def test_a_cancelled_booking_frees_the_seat(schema: str) -> None:
    conn = _connect(schema)
    day = date.today() + timedelta(days=3)
    with conn.cursor() as cur:
        cur.execute("INSERT INTO bookings (tenant_id, seat_id, booked_for_user_id, booking_date, booking_status) VALUES (1, 7, 101, %s, 'CANCELLED')", (day,))
        cur.execute("INSERT INTO bookings (tenant_id, seat_id, booked_for_user_id, booking_date) VALUES (1, 7, 102, %s)", (day,))
    conn.commit()
    conn.close()
    assert _count(schema) == 1
