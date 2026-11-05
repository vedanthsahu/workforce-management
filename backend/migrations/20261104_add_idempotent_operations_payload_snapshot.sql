-- Additive, nullable: reconciliation (CREATE/MODIFY) needs the original
-- request's resource identities (seat_id, booked_for_user_id,
-- booking_date, ...) to know which advisory lock keys to probe --
-- payload_hash is a one-way digest and can't be reversed to recover
-- them. See dev-notes/backend/idempotency_recovery_design.md, Task 2.
ALTER TABLE idempotent_operations
    ADD COLUMN IF NOT EXISTS payload_snapshot JSONB;
