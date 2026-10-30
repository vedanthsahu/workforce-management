BEGIN;

-- The chatbot's own session expiry is removed: a chat session's validity
-- now rides entirely on the user's real app login (checked on every
-- request via get_current_user), not an independent 30-minute clock that
-- could expire the chat while the user is still actively logged in.
-- Application code no longer reads or writes this column.

DROP INDEX IF EXISTS idx_cb_sessions_expires;
ALTER TABLE chatbot_sessions DROP COLUMN IF EXISTS expires_at;

COMMIT;
