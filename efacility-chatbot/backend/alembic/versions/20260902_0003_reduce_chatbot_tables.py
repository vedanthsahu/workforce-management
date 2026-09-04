"""Consolidate chatbot state and remove optional lookup tables.

Revision ID: 20260902_0003
Revises: 20260819_0002
Create Date: 2026-09-02
"""

from alembic import op

revision = "20260902_0003"
down_revision = "20260819_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Bootstrap the consolidated schema when chatbot is being added directly to
    # an existing application database. Neither table depends on the legacy
    # chatbot_menu_items table.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_sessions (
            id UUID PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 3,
            user_name VARCHAR(255) NOT NULL,
            state VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
            current_node VARCHAR(100) NOT NULL DEFAULT 'MAIN_MENU',
            current_menu_id INTEGER,
            context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_messages (
            id UUID PRIMARY KEY,
            session_id UUID NOT NULL
                REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
            direction VARCHAR(10) NOT NULL
                CHECK (direction IN ('IN', 'OUT')),
            message_text TEXT NOT NULL,
            message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
            node_id VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_cb_sessions_user "
        "ON chatbot_sessions(user_name)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_cb_sessions_expires "
        "ON chatbot_sessions(expires_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_cb_messages_session "
        "ON chatbot_messages(session_id, created_at)"
    )
    op.execute(
        "ALTER TABLE chatbot_sessions "
        "ADD COLUMN IF NOT EXISTS context_data JSONB NOT NULL DEFAULT '{}'::jsonb"
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.chatbot_session_context') IS NOT NULL THEN
                UPDATE chatbot_sessions AS sessions
                SET context_data = COALESCE(contexts.payload, '{}'::jsonb)
                FROM (
                    SELECT session_id, jsonb_object_agg(context_key, context_value) AS payload
                    FROM chatbot_session_context
                    GROUP BY session_id
                ) AS contexts
                WHERE sessions.id = contexts.session_id;
            END IF;
        END $$;
        """
    )
    op.execute(
        "ALTER TABLE chatbot_sessions "
        "DROP CONSTRAINT IF EXISTS chatbot_sessions_current_menu_id_fkey"
    )
    op.execute("UPDATE chatbot_sessions SET current_menu_id = NULL")
    op.execute("DROP TABLE IF EXISTS chatbot_session_context")
    op.execute("DROP TABLE IF EXISTS chatbot_menu_items")
    op.execute("DROP TABLE IF EXISTS chatbot_user_identity_map")


def downgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_session_context (
            id SERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES chatbot_sessions(id),
            context_key VARCHAR(100) NOT NULL,
            context_value TEXT,
            updated_at TIMESTAMPTZ,
            CONSTRAINT uq_session_context_key UNIQUE (session_id, context_key)
        )
        """
    )
    op.execute(
        """
        INSERT INTO chatbot_session_context (session_id, context_key, context_value, updated_at)
        SELECT sessions.id, entry.key, entry.value, sessions.updated_at
        FROM chatbot_sessions AS sessions
        CROSS JOIN LATERAL jsonb_each_text(COALESCE(sessions.context_data, '{}'::jsonb)) AS entry
        ON CONFLICT (session_id, context_key) DO NOTHING
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_menu_items (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 3,
            parent_id INTEGER REFERENCES chatbot_menu_items(id),
            menu_key VARCHAR(100) NOT NULL,
            label VARCHAR(255) NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            target_node VARCHAR(100),
            context_preset JSONB DEFAULT '{}'::jsonb,
            placeholder_msg TEXT,
            icon VARCHAR(50),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_user_identity_map (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 3,
            channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
            external_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255),
            user_name VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ,
            CONSTRAINT uq_chatbot_user_identity_map UNIQUE (tenant_id, channel, external_id)
        )
        """
    )
    op.execute("ALTER TABLE chatbot_sessions DROP COLUMN IF EXISTS context_data")
