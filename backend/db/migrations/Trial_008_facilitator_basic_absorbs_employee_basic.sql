-- Trial_008_facilitator_basic_absorbs_employee_basic.sql
-- DRAFT for review -- not yet applied to any database.
--
-- Trial_007's group_tier verification surfaced that FACILITATOR was
-- eligible for two REQUIRED (floor) groups: Employee Basic AND
-- Facilitator Basic. Decision: a role should have exactly one REQUIRED
-- group -- Facilitator Basic should stand alone as a true union rather
-- than relying on stacking two separate group memberships.
--
-- Checked directly against the live data before writing this: Facilitator
-- Basic (26 permissions) is ALREADY a strict superset of Employee Basic
-- (17 permissions) -- every one of Employee Basic's permissions is already
-- present in Facilitator Basic. So no group_permissions change is needed
-- at all; the only actual fix is removing the now-redundant role_groups
-- eligibility row. Also checked: no Facilitator user currently holds
-- Employee Basic directly, so there's no user_groups cleanup needed either.
--
-- Requires Trial_004 (seeded groups/role_groups) already applied.

BEGIN;

DELETE FROM role_groups
USING roles AS r, groups AS g
WHERE role_groups.role_id = r.id
  AND role_groups.group_id = g.id
  AND UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR'
  AND g.group_name = 'Employee Basic';

-- Sanity check, fails loudly if FACILITATOR still ends up with something
-- other than exactly one REQUIRED-tier eligible group after this.
DO $$
DECLARE
  required_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO required_count
  FROM role_groups AS rg
  JOIN roles AS r ON r.id = rg.role_id
  JOIN groups AS g ON g.id = rg.group_id
  WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR'
    AND g.group_tier = 'REQUIRED';

  IF required_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 REQUIRED group for FACILITATOR after cleanup, found %', required_count;
  END IF;
END $$;

COMMIT;
