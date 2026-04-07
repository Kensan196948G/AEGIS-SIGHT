"""Add alerts table

Revision ID: 004_add_alerts
Revises: 003_add_audit_log
Create Date: 2026-03-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_add_alerts"
down_revision: str | None = "003_add_audit_log"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Enum types
alert_severity_enum = postgresql.ENUM(
    "critical", "warning", "info",
    name="alertseverity",
    create_type=False,
)

alert_category_enum = postgresql.ENUM(
    "security", "license", "hardware", "network",
    name="alertcategory",
    create_type=False,
)


def upgrade() -> None:
    # Create enums
    op.execute(
        "CREATE TYPE alertseverity AS ENUM ('critical', 'warning', 'info')"
    )
    op.execute(
        "CREATE TYPE alertcategory AS ENUM ('security', 'license', 'hardware', 'network')"
    )

    op.create_table(
        "alerts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("severity", alert_severity_enum, nullable=False),
        sa.Column("category", alert_category_enum, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "is_acknowledged",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "acknowledged_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # Indexes for common query patterns
    op.create_index("ix_alerts_device_id", "alerts", ["device_id"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_category", "alerts", ["category"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])
    op.create_index("ix_alerts_is_acknowledged", "alerts", ["is_acknowledged"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.execute("DROP TYPE IF EXISTS alertseverity")
    op.execute("DROP TYPE IF EXISTS alertcategory")
