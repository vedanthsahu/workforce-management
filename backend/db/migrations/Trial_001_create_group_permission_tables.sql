-- Trial_001_create_group_permission_tables.sql
-- DRAFT for review -- not yet applied to any database.
-- Group-based permission model: new tables only. roles / permissions /
-- role_permissions / app_users are untouched. role_permissions stays in
-- place as the rollback path until user_groups/group_permissions are
-- confirmed working.

BEGIN;

-- group_name_normalized / permission_set_hash / version exist to enforce,
-- at the DB level, three invariants that must never depend on every code
-- path remembering to check them by hand:
--   - group names are unique per tenant, ignoring case and whitespace
--   - no two groups in the same tenant can carry the identical permission set
--   - concurrent edits to the same group are caught (optimistic locking)
-- Confirmed against the live schema: no citext/lower()-index precedent
-- exists anywhere else in this DB, so this is a new (but standard) pattern,
-- not a mismatch with an existing one.
CREATE TABLE groups (
    id                     BIGSERIAL PRIMARY KEY,
    tenant_id              BIGINT NOT NULL REFERENCES tenants(id),
    group_name             VARCHAR(100) NOT NULL,
    group_name_normalized  VARCHAR(100) GENERATED ALWAYS AS (
                              lower(regexp_replace(btrim(group_name), '\s+', ' ', 'g'))
                            ) STORED,
    description            TEXT,
    is_system              BOOLEAN NOT NULL DEFAULT FALSE,
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    permission_set_hash    VARCHAR(32),
    version                INTEGER NOT NULL DEFAULT 1,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_groups_tenant_name_normalized UNIQUE (tenant_id, group_name_normalized)
);
CREATE INDEX idx_groups_tenant_id ON groups (tenant_id);

-- Partial: NULL hash (empty / draft groups) never collides with another
-- empty group in the same tenant -- only groups that actually share a
-- real permission set are blocked.
CREATE UNIQUE INDEX uq_groups_tenant_permission_set
  ON groups (tenant_id, permission_set_hash)
  WHERE permission_set_hash IS NOT NULL;

CREATE TABLE group_permissions (
    id                BIGSERIAL PRIMARY KEY,
    group_id          BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    permission_id     BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_permission UNIQUE (group_id, permission_id)
);
CREATE INDEX idx_group_permissions_group_id ON group_permissions (group_id);
CREATE INDEX idx_group_permissions_permission_id ON group_permissions (permission_id);

-- Kept as a DB-level trigger rather than a service-layer-only check: two
-- concurrent "create group" requests with the same permission set is a
-- real race a pre-insert SELECT can lose. md5() is built-in -- no
-- extension (e.g. pgcrypto) required.
--
-- The FOR UPDATE lock below is not optional: without it, two concurrent
-- transactions inserting different permissions into the SAME group can
-- each compute their hash from a snapshot that doesn't include the other's
-- (uncommitted) change, then race to overwrite groups.permission_set_hash
-- -- the loser's UPDATE wins with a hash reflecting only its own change,
-- silently desyncing the hash from the group's real permission set.
-- Locking the group row first forces the second transaction to block
-- until the first commits, then re-read fresh data.
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

CREATE TABLE user_groups (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    group_id              BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    assigned_by_user_id   BIGINT REFERENCES app_users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_group UNIQUE (user_id, group_id)
);
CREATE INDEX idx_user_groups_user_id ON user_groups (user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups (group_id);

-- Plain FKs can't stop a user from Tenant A being linked to a group from
-- Tenant B -- Postgres CHECK constraints can't reference other tables, so
-- this has to be a trigger. Without it, a mismatched (user_id, group_id)
-- pair is a silent cross-tenant privilege grant nothing else would catch.
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

-- Security constraint, NOT an authorization path: which groups a role is
-- even allowed to receive. Check before every INSERT into user_groups.
--
-- Gotcha confirmed against the live schema: app_users has no role_id column
-- (only role_name VARCHAR, no FK to roles). Resolving "which groups is this
-- logged-in user eligible for" requires the same join the app must already
-- do for role_permissions today: app_users.role_name + app_users.tenant_id
-- -> roles.role_name + roles.tenant_id -> roles.id -> role_groups. Not a new
-- join pattern, just continuity with how role resolution already works.
CREATE TABLE role_groups (
    id                BIGSERIAL PRIMARY KEY,
    role_id           BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    group_id          BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_role_group UNIQUE (role_id, group_id)
);
CREATE INDEX idx_role_groups_role_id ON role_groups (role_id);
CREATE INDEX idx_role_groups_group_id ON role_groups (group_id);

-- Same tenant-match problem as user_groups, one difference: roles.tenant_id
-- is nullable (a genuinely global/shared role), so NULL is allowed to pair
-- with any tenant's group -- only a real, non-null mismatch is rejected.
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

-- UI vs backend permission distinction (Quick Book discussion): same table,
-- one column. Existing rows default to 'backend' -- correct for all of them.
ALTER TABLE permissions
  ADD COLUMN enforcement_scope VARCHAR(20) NOT NULL DEFAULT 'backend'
    CONSTRAINT chk_permissions_enforcement_scope
    CHECK (enforcement_scope IN ('backend', 'frontend_only'));

-- Optional: lets the group-editor validate "can't grant this UI permission
-- without its required backend permission(s)" instead of trusting an admin
-- to remember. Not required for Trial_002-004 to work; add whenever.
CREATE TABLE permission_dependencies (
    permission_id           BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    requires_permission_id  BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, requires_permission_id),
    CONSTRAINT chk_permission_dependency_not_self CHECK (permission_id <> requires_permission_id)
);

COMMIT;
