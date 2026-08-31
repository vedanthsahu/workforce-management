-- Trial_005_backfill_user_groups.sql
-- DRAFT for review -- NOT a mechanical step, a real product decision.
-- Maps every existing user's current role_name to ONE default group so
-- nobody loses access the moment role_permissions stops being read.
-- This picks the "Common" tier per role -- review before running:
--   EMPLOYEE     -> Employee Standard
--   FACILITATOR  -> Facilitator Full
--   FRONT_OFFICE -> Front Office Standard
--   TENANT_ADMIN -> Tenant Admin -- Full
-- Anyone who should start on a leaner variant (Basic, or one of the
-- Employee/Facilitator specialized add-on combos) needs a manual
-- reassignment after this runs, or a per-user CASE branch added here.
-- Requires Trial_001, Trial_003, Trial_004 applied first.

BEGIN;

INSERT INTO user_groups (user_id, group_id)
SELECT u.id, g.id
FROM app_users u
JOIN groups g ON g.tenant_id = u.tenant_id
WHERE UPPER(REPLACE(u.role_name, ' ', '_')) = 'EMPLOYEE'     AND g.group_name = 'Employee Standard'
   OR UPPER(REPLACE(u.role_name, ' ', '_')) = 'FACILITATOR'  AND g.group_name = 'Facilitator Full'
   OR UPPER(REPLACE(u.role_name, ' ', '_')) = 'FRONT_OFFICE' AND g.group_name = 'Front Office Standard'
   OR UPPER(REPLACE(u.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Tenant Admin — Full'
ON CONFLICT (user_id, group_id) DO NOTHING;

COMMIT;
