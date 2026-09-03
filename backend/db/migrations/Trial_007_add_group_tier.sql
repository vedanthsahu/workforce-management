-- Trial_007_add_group_tier.sql
-- DRAFT for review -- not yet applied to any database.
--
-- Adds group_tier so the app can reliably answer "which group is this
-- role's mandatory floor / normal default" without guessing from a group's
-- name. Four values, chosen deliberately to avoid implying a false ceiling
-- (a Custom group can always exceed STANDARD -- there is no true maximum):
--   REQUIRED    -- the floor. Always attached for the role, cannot be
--                  removed while the user remains in that role.
--   STANDARD    -- the normal, complete-enough set for everyday use of the
--                  role. NOT a ceiling -- SPECIALIZED/ADD_ON/Custom groups
--                  can still add more on top.
--   SPECIALIZED -- a narrower, focused capability set.
--   ADD_ON      -- a reusable bolt-on, meant to combine with others.
--
-- Backfilled below for the 16 existing system groups, based on the
-- BASE/COMMON/SPECIALIZED/ADD-ON tagging already in Trial_004's comments
-- (REQUIRED = old "BASE", STANDARD = old "COMMON") -- same underlying
-- classification, just cleaner column values.
--
-- Note: Tenant Admin's STANDARD-tier group (Tenant Admin -- Full) is still
-- tagged STANDARD here for classification purposes, but it is NOT the group
-- auto-assigned on an Admin role change -- that's a service-layer rule
-- (Admin defaults to REQUIRED only, since its STANDARD tier grants
-- privilege-management power over other users), not something this column
-- encodes by itself.
--
-- Safe for a live database: column is added nullable, backfilled, then
-- locked to NOT NULL within the same transaction -- by the time the
-- constraint is enforced, every existing row already has a value.

BEGIN;

ALTER TABLE groups
  ADD COLUMN group_tier VARCHAR(20)
    CONSTRAINT chk_groups_tier
    CHECK (group_tier IN ('REQUIRED', 'STANDARD', 'SPECIALIZED', 'ADD_ON'));

UPDATE groups SET group_tier = 'REQUIRED'    WHERE group_name = 'Employee Basic';
UPDATE groups SET group_tier = 'STANDARD'    WHERE group_name = 'Employee Standard';
UPDATE groups SET group_tier = 'SPECIALIZED' WHERE group_name = 'Employee + Guest Booking';
UPDATE groups SET group_tier = 'SPECIALIZED' WHERE group_name = 'Employee + Internal Delegated Booking';
UPDATE groups SET group_tier = 'REQUIRED'    WHERE group_name = 'Facilitator Basic';
UPDATE groups SET group_tier = 'SPECIALIZED' WHERE group_name = 'Facilitator Guest Operations';
UPDATE groups SET group_tier = 'STANDARD'    WHERE group_name = 'Facilitator Full';
UPDATE groups SET group_tier = 'REQUIRED'    WHERE group_name = 'Front Office Basic';
UPDATE groups SET group_tier = 'STANDARD'    WHERE group_name = 'Front Office Standard';
UPDATE groups SET group_tier = 'REQUIRED'    WHERE group_name = 'Tenant Admin — Dashboard & Reporting';
UPDATE groups SET group_tier = 'SPECIALIZED' WHERE group_name = 'Tenant Admin — Booking Operations';
UPDATE groups SET group_tier = 'SPECIALIZED' WHERE group_name = 'Tenant Admin — Workplace Configuration';
UPDATE groups SET group_tier = 'SPECIALIZED' WHERE group_name = 'Tenant Admin — User & Access Administration';
UPDATE groups SET group_tier = 'STANDARD'    WHERE group_name = 'Tenant Admin — Full';
UPDATE groups SET group_tier = 'ADD_ON'      WHERE group_name = 'Guest Booking Add-on';
UPDATE groups SET group_tier = 'ADD_ON'      WHERE group_name = 'Internal Delegated Booking Add-on';

-- Fails loudly here (rather than silently at the NOT NULL step below) if any
-- group_name above doesn't match a real row -- e.g. a typo, or a group
-- renamed since Trial_004 ran.
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM groups WHERE group_tier IS NULL;
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'group_tier backfill incomplete: % group(s) still NULL', missing_count;
  END IF;
END $$;

ALTER TABLE groups ALTER COLUMN group_tier SET NOT NULL;

-- Exactly one REQUIRED (floor) group per role -- if this ever returns a
-- role with 0 or 2+, something about the tier assignment above is wrong.
-- Informational only; not enforced as a constraint here since role_groups
-- eligibility (which groups belong to which role) lives in a separate
-- table this migration doesn't touch.

COMMIT;
