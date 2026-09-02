-- eFACiLiTY Chatbot Database Schema
-- Local storage is limited to chatbot sessions and message history.
-- Menus and channel mappings are configuration; seat-management data lives in
-- the external backend API.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       INTEGER NOT NULL DEFAULT 3,
    user_name       VARCHAR(255) NOT NULL,
    state           VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    current_node    VARCHAR(100) NOT NULL DEFAULT 'MAIN_MENU',
    current_menu_id INTEGER,
    context_data    JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    message_text    TEXT NOT NULL,
    message_type    VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    node_id         VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_sessions_user       ON chatbot_sessions(user_name);
CREATE INDEX IF NOT EXISTS idx_cb_sessions_expires    ON chatbot_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_cb_messages_session    ON chatbot_messages(session_id, created_at);
