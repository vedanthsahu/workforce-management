-- Trial_001_create_group_permission_tables.sql
-- DRAFT for review -- not yet applied to any database.
--
-- PHASE 1 / SKELETON: tables and their FK relationships only. Deliberately
-- excludes triggers, generated columns, and views for this pass -- the goal
-- is to get the core group-based permission model live and the backend code
-- adapted to it first. The following are deferred to a later enhancement
-- migration, not forgotten:
--   - group_name_normalized (generated column) + case/whitespace-insensitive
--     uniqueness on groups.group_name -- replaced here with a plain exact-
--     match UNIQUE (tenant_id, group_name).
--   - permission_set_hash + its trigger + its uniqueness constraint
--     (duplicate-permission-set prevention across groups in a tenant).
--   - Tenant-match triggers on user_groups and role_groups -- until they're
--     added back, nothing in the database stops a user or role from being
--     linked to a group in a different tenant; that check must be enforced
--     in application code for this phase.
--
-- Safe for a live, deployed database: every statement is purely additive.
-- roles / permissions / role_permissions / app_users are untouched.
-- role_permissions stays in place as the rollback path; the app just stops
-- reading it once user_groups/group_permissions are live.

BEGIN;

CREATE TABLE groups (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NOT NULL REFERENCES tenants(id),
    group_name        VARCHAR(100) NOT NULL,
    description       TEXT,
    is_system         BOOLEAN NOT NULL DEFAULT FALSE,   -- true for the 16 base/add-on groups; not tenant-editable
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    version           INTEGER NOT NULL DEFAULT 1,        -- optimistic locking: UPDATE ... WHERE id=:id AND version=:expected
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_groups_tenant_name UNIQUE (tenant_id, group_name)
);
CREATE INDEX idx_groups_tenant_id ON groups (tenant_id);

CREATE TABLE group_permissions (
    id                BIGSERIAL PRIMARY KEY,
    group_id          BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    permission_id     BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_permission UNIQUE (group_id, permission_id)
);
CREATE INDEX idx_group_permissions_group_id ON group_permissions (group_id);
CREATE INDEX idx_group_permissions_permission_id ON group_permissions (permission_id);

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

-- Security constraint, NOT an authorization path: which groups a role is
-- even allowed to receive. Check this table before every INSERT into
-- user_groups; reject the assignment if (target user's role_id, group_id)
-- isn't present here.
--
-- Gotcha confirmed against the live schema: app_users has no role_id column
-- (only role_name VARCHAR, no FK to roles). Resolving "which groups is this
-- logged-in user eligible for" needs the same join the app must already do
-- for role_permissions today: app_users.(tenant_id, role_name) ->
-- roles.(tenant_id, role_name) -> roles.id -> role_groups. Also confirmed
-- live: role_name for Front Office is stored as 'FRONT OFFICE' (a space),
-- so any such join must normalize with UPPER(REPLACE(role_name, ' ', '_')).
CREATE TABLE role_groups (
    id                BIGSERIAL PRIMARY KEY,
    role_id           BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    group_id          BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_role_group UNIQUE (role_id, group_id)
);
CREATE INDEX idx_role_groups_role_id ON role_groups (role_id);
CREATE INDEX idx_role_groups_group_id ON role_groups (group_id);

-- UI vs backend permission distinction: same table, one column. Existing
-- rows default to 'backend' -- correct for all of them. Safe on a live,
-- populated permissions table: NOT NULL with a DEFAULT does not require a
-- table rewrite and doesn't change the meaning of any existing row.
ALTER TABLE permissions
  ADD COLUMN enforcement_scope VARCHAR(20) NOT NULL DEFAULT 'backend'
    CONSTRAINT chk_permissions_enforcement_scope
    CHECK (enforcement_scope IN ('backend', 'frontend_only'));

COMMIT;
