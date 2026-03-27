"""Add audit_logs table

Revision ID: 003_add_audit_log
Revises: 002_add_log_software_tables
Create Date: 2026-03-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003_add_audit_log"
down_revision: Union[str, None] = "002_add_log_software_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum type
audit_action_enum = postgresql.ENUM(
    "create", "update", "delete", "login", "logout", "export", "approve", "reject",
    name="auditaction",
    create_type=False,
)


def upgrade() -> None:
    # Create enum
    op.execute(
        "CREATE TYPE auditaction AS ENUM "
        "('create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject')"
    )

    op.create_table(
        "audit_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("action", audit_action_enum, nullable=False),
        sa.Column("resource_type", sa.String(255), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=True),
        sa.Column("detail", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # Indexes for common query patterns
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.execute("DROP TYPE IF EXISTS auditaction")
