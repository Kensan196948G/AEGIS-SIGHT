"""Add dlp_rules and dlp_events tables

Revision ID: 017_add_dlp
Revises: 016_add_change_tracking
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "017_add_dlp"
down_revision: str = "016_add_change_tracking"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- dlp_rules -------------------------------------------------------------
    op.create_table(
        "dlp_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "rule_type",
            sa.Enum(
                "file_extension",
                "path_pattern",
                "content_keyword",
                "size_limit",
                name="dlpruletype",
            ),
            nullable=False,
        ),
        sa.Column("pattern", sa.String(1000), nullable=False),
        sa.Column(
            "action",
            sa.Enum("alert", "block", "log", name="dlpaction"),
            nullable=False,
        ),
        sa.Column(
            "severity",
            sa.Enum("critical", "high", "medium", "low", name="dlpseverity"),
            nullable=False,
        ),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_dlp_rules_name", "dlp_rules", ["name"])
    op.create_index("ix_dlp_rules_rule_type", "dlp_rules", ["rule_type"])
    op.create_index("ix_dlp_rules_severity", "dlp_rules", ["severity"])

    # -- dlp_events ------------------------------------------------------------
    op.create_table(
        "dlp_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "rule_id",
            UUID(as_uuid=True),
            sa.ForeignKey("dlp_rules.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(2000), nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("file_size", sa.BigInteger, nullable=True),
        sa.Column(
            "action_taken",
            sa.Enum("alerted", "blocked", "logged", name="dlpactiontaken"),
            nullable=False,
        ),
        sa.Column("matched_pattern", sa.String(1000), nullable=False),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_dlp_events_rule_id", "dlp_events", ["rule_id"])
    op.create_index("ix_dlp_events_device_id", "dlp_events", ["device_id"])
    op.create_index("ix_dlp_events_action_taken", "dlp_events", ["action_taken"])
    op.create_index("ix_dlp_events_detected_at", "dlp_events", ["detected_at"])


def downgrade() -> None:
    op.drop_table("dlp_events")
    op.drop_table("dlp_rules")
    op.execute("DROP TYPE IF EXISTS dlpactiontaken")
    op.execute("DROP TYPE IF EXISTS dlpseverity")
    op.execute("DROP TYPE IF EXISTS dlpaction")
    op.execute("DROP TYPE IF EXISTS dlpruletype")
