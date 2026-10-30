-- Adds a real database-level backstop for guest_visits matching the
-- "at most one active X per Y per day" pattern that bookings ALREADY
-- enforces in the live DB today -- confirmed by direct inspection
-- (2026-10-29) of pg_indexes/pg_constraint, not assumed:
--
--   uq_bookings_tenant_seat_date         (tenant_id, seat_id, booking_date)
--   uq_bookings_tenant_user_date_active  (tenant_id, booked_for_user_id, booking_date)
--   uq_bookings_tenant_guest_date_active (tenant_id, booked_for_guest_id, booking_date)
--
-- None of these three are in this migrations directory -- they were
-- applied directly against the DB at some point, same as the chatbot
-- tables. Nothing new needed for bookings; only guest_visits is missing
-- the equivalent protection, added below with the same naming convention.
--
-- NOTE: bookings' own versions key off ('CONFIRMED', 'CHECKED_IN') --
-- which doesn't match either chk_bookings_status (CHECKED_IN isn't even
-- an allowed value there) or the app-level conflict checks in
-- booking_repository.py (which also treat COMPLETED as active). That
-- drift is real but out of scope here -- logged in
-- dev-notes/backend/pending_followup_work.md for the later DB-practices
-- pass, not fixed in this file.
--
-- guest_visits uses its own existing status taxonomy instead of copying
-- bookings' literal values (SCHEDULED/CHECKED_IN/CHECKED_OUT/CANCELLED/
-- MODIFIED, not CONFIRMED) -- this mirrors what
-- fetch_active_guest_visit_for_date() in guest_visit_repository.py
-- already enforces at the application level today.
--
-- BLOCKING PREREQUISITE -- run the verification query at the bottom of
-- this file FIRST. As of 2026-10-29 it returns 4 violating groups
-- (guests 21, 2, 3, 4 in the dev DB) and this CREATE will fail outright
-- until those rows are resolved. Resolving them is a data decision
-- (which row is the real visit) that needs to be made by hand, not
-- guessed here -- see the chat history for the raw rows.
--
-- NOTE ON CONCURRENCY: CREATE UNIQUE INDEX CONCURRENTLY cannot run
-- inside a transaction block, so this file is deliberately NOT wrapped
-- in BEGIN/COMMIT.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_guest_visits_tenant_guest_date_active
    ON guest_visits (tenant_id, guest_id, visit_date)
    WHERE visit_status NOT IN ('CANCELLED', 'MODIFIED');


-- ---------------------------------------------------------------------
-- Run this FIRST. Must return zero rows before the CREATE above will
-- succeed.
-- ---------------------------------------------------------------------

-- SELECT tenant_id, guest_id, visit_date, COUNT(*)
-- FROM guest_visits
-- WHERE visit_status NOT IN ('CANCELLED', 'MODIFIED')
-- GROUP BY tenant_id, guest_id, visit_date
-- HAVING COUNT(*) > 1;
