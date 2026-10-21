CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id UUID PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    current_node VARCHAR(100) NOT NULL DEFAULT 'MAIN_MENU',
    current_menu_id INTEGER,
    context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    message_text TEXT NOT NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    node_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_sessions_user
    ON chatbot_sessions(user_name);
CREATE INDEX IF NOT EXISTS idx_cb_sessions_expires
    ON chatbot_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_cb_messages_session
    ON chatbot_messages(session_id, created_at);
