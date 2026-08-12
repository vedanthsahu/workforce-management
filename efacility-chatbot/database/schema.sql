-- eFACiLiTY Chatbot Database Schema
-- Local storage is limited to chatbot conversations, navigation, identity maps,
-- logs, and optional intent examples. Seat-management data lives in the
-- external backend API.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chatbot_menu_items (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL DEFAULT 3,
    parent_id       INTEGER REFERENCES chatbot_menu_items(id) ON DELETE CASCADE,
    menu_key        VARCHAR(100) NOT NULL,
    label           VARCHAR(255) NOT NULL,
    display_order   INTEGER NOT NULL DEFAULT 0,
    target_node     VARCHAR(100),
    context_preset  JSONB DEFAULT '{}',
    placeholder_msg TEXT,
    icon            VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, menu_key)
);

INSERT INTO chatbot_menu_items
    (tenant_id, parent_id, menu_key, label, display_order, target_node, context_preset, placeholder_msg, icon, is_active)
VALUES
    (3, NULL, 'QUICK_BOOK', 'Quick Book', 1, 'QUICK_BOOK', '{}', NULL, NULL, TRUE),
    (3, NULL, 'BOOK_SEAT', 'Book a seat', 2, 'BOOK_WHEN_WHERE', '{}', NULL, NULL, TRUE),
    (3, NULL, 'MY_BOOKINGS', 'My Bookings', 3, 'MY_BOOKINGS', '{}', NULL, NULL, TRUE)
ON CONFLICT (tenant_id, menu_key) DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    target_node = EXCLUDED.target_node,
    parent_id = EXCLUDED.parent_id,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       INTEGER NOT NULL DEFAULT 3,
    user_name       VARCHAR(255) NOT NULL,
    state           VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    current_node    VARCHAR(100) NOT NULL DEFAULT 'MAIN_MENU',
    current_menu_id INTEGER REFERENCES chatbot_menu_items(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chatbot_session_context (
    id              SERIAL PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
    context_key     VARCHAR(100) NOT NULL,
    context_value   TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, context_key)
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

CREATE TABLE IF NOT EXISTS chatbot_user_identity_map (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL DEFAULT 3,
    channel         VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    external_id     VARCHAR(255) NOT NULL,
    user_name       VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_cb_sessions_user       ON chatbot_sessions(user_name);
CREATE INDEX IF NOT EXISTS idx_cb_sessions_expires    ON chatbot_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_cb_context_session     ON chatbot_session_context(session_id);
CREATE INDEX IF NOT EXISTS idx_cb_messages_session    ON chatbot_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cb_menu_parent         ON chatbot_menu_items(parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_cb_menu_tenant         ON chatbot_menu_items(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cb_menu_key            ON chatbot_menu_items(tenant_id, menu_key);
CREATE INDEX IF NOT EXISTS idx_cb_identity_lookup
    ON chatbot_user_identity_map(tenant_id, channel, external_id, is_active);

DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN undefined_file THEN
        RAISE NOTICE 'pgvector extension is not installed; semantic intent matching is disabled.';
    END;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        EXECUTE $sql$
            CREATE TABLE IF NOT EXISTS chatbot_intent_examples (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL,
                intent_key VARCHAR(100) NOT NULL,
                example_text TEXT NOT NULL,
                embedding vector(384),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (tenant_id, intent_key, example_text)
            )
        $sql$;

        BEGIN
            EXECUTE $sql$
                CREATE INDEX IF NOT EXISTS idx_chatbot_intent_examples_embedding
                ON chatbot_intent_examples
                USING hnsw (embedding vector_cosine_ops)
            $sql$;
        EXCEPTION WHEN undefined_object OR feature_not_supported THEN
            RAISE NOTICE 'pgvector HNSW index is unavailable; semantic matching will use a sequential vector scan.';
        END;

        EXECUTE $sql$
            CREATE INDEX IF NOT EXISTS idx_chatbot_intent_examples_tenant
            ON chatbot_intent_examples(tenant_id, intent_key, is_active)
        $sql$;
    END IF;
END $$;
