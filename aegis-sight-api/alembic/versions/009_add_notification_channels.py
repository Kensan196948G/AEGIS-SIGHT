"""Add notification_channels and notification_rules tables

Revision ID: 009_add_notification_channels
Revises: 008_add_indexes_partitions
Create Date: 2026-03-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "009_add_notification_channels"
down_revision: str = "008_add_indexes_partitions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- notification_channels ------------------------------------------------
    op.create_table(
        "notification_channels",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "channel_type",
            sa.Enum("email", "webhook", "slack", "teams", name="channeltype"),
            nullable=False,
        ),
        sa.Column("config", JSONB, nullable=False, server_default="{}"),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_notification_channels_channel_type",
        "notification_channels",
        ["channel_type"],
    )

    # -- notification_rules ---------------------------------------------------
    op.create_table(
        "notification_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "alert_critical",
                "alert_warning",
                "license_violation",
                "license_expiry",
                "procurement_approval",
                "security_incident",
                name="notificationeventtype",
            ),
            nullable=False,
        ),
        sa.Column(
            "channel_id",
            UUID(as_uuid=True),
            sa.ForeignKey("notification_channels.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("conditions", JSONB, nullable=True),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_notification_rules_event_type",
        "notification_rules",
        ["event_type"],
    )
    op.create_index(
        "ix_notification_rules_channel_id",
        "notification_rules",
        ["channel_id"],
    )


def downgrade() -> None:
    op.drop_table("notification_rules")
    op.drop_table("notification_channels")
    op.execute("DROP TYPE IF EXISTS notificationeventtype")
    op.execute("DROP TYPE IF EXISTS channeltype")
