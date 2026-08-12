"""Add chatbot user identity map.

Revision ID: 20260714_0001
Revises:
Create Date: 2026-07-14
"""

from alembic import op

revision = "20260714_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_user_identity_map (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 3,
            channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
            external_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT uq_chatbot_user_identity_map
                UNIQUE (tenant_id, channel, external_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_cb_identity_lookup
            ON chatbot_user_identity_map (tenant_id, channel, external_id, is_active)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS chatbot_user_identity_map")
