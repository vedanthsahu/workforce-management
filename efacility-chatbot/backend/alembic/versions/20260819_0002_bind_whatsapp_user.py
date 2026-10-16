"""Bind WhatsApp mappings to Workforce user identities.

Revision ID: 20260819_0002
Revises: 20260714_0001
Create Date: 2026-08-19
"""

from alembic import op

revision = "20260819_0002"
down_revision = "20260714_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE chatbot_user_identity_map "
        "ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE chatbot_user_identity_map DROP COLUMN IF EXISTS user_id")
