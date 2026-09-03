-- Trial_006_add_group_safety_enhancements.sql
-- DRAFT for review -- not yet applied to any database.
--
-- Reintroduces exactly what Trial_001's header comment deferred: normalized
-- (case/whitespace-insensitive) group-name uniqueness, race-safe duplicate-
-- permission-set detection via a maintained hash, and tenant-match triggers
-- on user_groups/role_groups. Required before building group create/update
-- APIs per the "Group & Permission System" requirements (sections 1, 11,
-- 14, 15) -- none of that was cancelled, just sequenced after the skeleton.
--
-- Safe for a live database: every ADD COLUMN is nullable at first (backfilled
-- at the end of this file), and the new UNIQUE constraint on the normalized
-- name only tightens something that a plain exact-match UNIQUE already
-- partially enforced -- it cannot suddenly reject data that passed before
-- unless two existing groups already differed only by case/whitespace, which
-- the current 16-group seed does not.
--
-- Requires Trial_001 (tables) and Trial_004 (seeded groups) already applied.

BEGIN;

-- ============================================================
-- 1. Case/whitespace-insensitive group name uniqueness
-- ============================================================
ALTER TABLE groups
  ADD COLUMN group_name_normalized VARCHAR(100) GENERATED ALWAYS AS (
    lower(regexp_replace(btrim(group_name), '\s+', ' ', 'g'))
  ) STORED;

ALTER TABLE groups DROP CONSTRAINT uq_groups_tenant_name;
ALTER TABLE groups
  ADD CONSTRAINT uq_groups_tenant_name_normalized UNIQUE (tenant_id, group_name_normalized);

-- ============================================================
-- 2. Duplicate permission-set prevention, kept race-safe by a trigger
--    (a pre-insert SELECT in application code alone can lose a race
--    between two concurrent group-create requests)
-- ============================================================
ALTER TABLE groups ADD COLUMN permission_set_hash VARCHAR(32);

-- Partial: NULL hash (empty/draft-like groups) never collides with another
-- empty group in the same tenant -- only groups with a real, identical
-- permission set are blocked.
CREATE UNIQUE INDEX uq_groups_tenant_permission_set
  ON groups (tenant_id, permission_set_hash)
  WHERE permission_set_hash IS NOT NULL;

-- The FOR UPDATE lock is not optional: without it, two concurrent
-- transactions inserting different permissions into the SAME group can each
-- compute their hash from a snapshot that doesn't include the other's
-- (uncommitted) change, then race to overwrite groups.permission_set_hash --
-- the loser's UPDATE wins with a hash reflecting only its own change,
-- silently desyncing the hash from the group's real permission set. Locking
-- the group row first forces the second transaction to block until the
-- first commits, then re-read fresh data.
CREATE OR REPLACE FUNCTION recompute_group_permission_set_hash() RETURNS TRIGGER AS $$
DECLARE
  affected_group_id BIGINT := COALESCE(NEW.group_id, OLD.group_id);
  new_hash VARCHAR(32);
BEGIN
  PERFORM 1 FROM groups WHERE id = affected_group_id FOR UPDATE;

  SELECT md5(string_agg(permission_id::text, ',' ORDER BY permission_id))
    INTO new_hash
    FROM group_permissions
    WHERE group_id = affected_group_id;

  UPDATE groups
    SET permission_set_hash = new_hash, updated_at = NOW()
    WHERE id = affected_group_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_group_permissions_recompute_hash
  AFTER INSERT OR UPDATE OR DELETE ON group_permissions
  FOR EACH ROW EXECUTE FUNCTION recompute_group_permission_set_hash();

-- ============================================================
-- 3. Tenant-match triggers -- plain FKs can't stop a user/role from Tenant A
--    being linked to a group from Tenant B; Postgres CHECK constraints can't
--    reference other tables, so this has to be a trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION check_user_group_tenant_match() RETURNS TRIGGER AS $$
DECLARE
  user_tenant BIGINT;
  group_tenant BIGINT;
BEGIN
  SELECT tenant_id INTO user_tenant FROM app_users WHERE id = NEW.user_id;
  SELECT tenant_id INTO group_tenant FROM groups WHERE id = NEW.group_id;
  IF user_tenant IS DISTINCT FROM group_tenant THEN
    RAISE EXCEPTION 'user_groups: user (tenant %) and group (tenant %) belong to different tenants',
      user_tenant, group_tenant;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_groups_tenant_match
  BEFORE INSERT OR UPDATE ON user_groups
  FOR EACH ROW EXECUTE FUNCTION check_user_group_tenant_match();

-- Same check, one difference: roles.tenant_id is nullable (a genuinely
-- global/shared role), so NULL is allowed to pair with any tenant's group --
-- only a real, non-null mismatch is rejected.
CREATE OR REPLACE FUNCTION check_role_group_tenant_match() RETURNS TRIGGER AS $$
DECLARE
  role_tenant BIGINT;
  group_tenant BIGINT;
BEGIN
  SELECT tenant_id INTO role_tenant FROM roles WHERE id = NEW.role_id;
  SELECT tenant_id INTO group_tenant FROM groups WHERE id = NEW.group_id;
  IF role_tenant IS NOT NULL AND role_tenant IS DISTINCT FROM group_tenant THEN
    RAISE EXCEPTION 'role_groups: role (tenant %) and group (tenant %) belong to different tenants',
      role_tenant, group_tenant;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_role_groups_tenant_match
  BEFORE INSERT OR UPDATE ON role_groups
  FOR EACH ROW EXECUTE FUNCTION check_role_group_tenant_match();

-- ============================================================
-- 4. Backfill permission_set_hash for groups seeded before this migration
--    existed (Trial_004's 16 system groups) -- the trigger only fires on
--    future group_permissions changes, not retroactively.
-- ============================================================
UPDATE groups g
SET permission_set_hash = sub.hash
FROM (
    SELECT group_id, md5(string_agg(permission_id::text, ',' ORDER BY permission_id)) AS hash
    FROM group_permissions
    GROUP BY group_id
) AS sub
WHERE g.id = sub.group_id;

COMMIT;
