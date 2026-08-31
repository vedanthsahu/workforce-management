-- Trial_002_add_refresh_token_grace_columns.sql
-- DRAFT for review -- not yet applied to any database.
-- Independent of the permission-model changes; fixes the concurrent
-- refresh-token rotation race (see conversation history for the mechanism).

BEGIN;

ALTER TABLE user_sessions
  ADD COLUMN previous_refresh_token_hash TEXT NULL,
  ADD COLUMN previous_token_grace_expires_at TIMESTAMPTZ NULL;

-- No new index: these two are only ever read alongside the existing
-- tenant_id/user_id/session_id lookup, already covered by
-- user_sessions_session_id_key.

COMMIT;
