"""Add config_snapshots and config_changes tables

Revision ID: 016_add_change_tracking
Revises: 015_add_policies
Create Date: 2026-03-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "016_add_change_tracking"
down_revision: str = "015_add_policies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- config_snapshots ------------------------------------------------------
    op.create_table(
        "config_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "snapshot_type",
            sa.Enum(
                "hardware",
                "software",
                "security",
                "network",
                name="snapshottype",
            ),
            nullable=False,
        ),
        sa.Column("data", JSONB, nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column(
            "captured_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_config_snapshots_device_id", "config_snapshots", ["device_id"])
    op.create_index(
        "ix_config_snapshots_snapshot_type", "config_snapshots", ["snapshot_type"]
    )
    op.create_index(
        "ix_config_snapshots_captured_at", "config_snapshots", ["captured_at"]
    )
    op.create_index(
        "ix_config_snapshots_device_type",
        "config_snapshots",
        ["device_id", "snapshot_type", "captured_at"],
    )

    # -- config_changes --------------------------------------------------------
    op.create_table(
        "config_changes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "snapshot_before_id",
            UUID(as_uuid=True),
            sa.ForeignKey("config_snapshots.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "snapshot_after_id",
            UUID(as_uuid=True),
            sa.ForeignKey("config_snapshots.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "change_type",
            sa.Enum("added", "modified", "removed", name="changetype"),
            nullable=False,
        ),
        sa.Column("field_path", sa.String(512), nullable=False),
        sa.Column("old_value", JSONB, nullable=True),
        sa.Column("new_value", JSONB, nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_config_changes_device_id", "config_changes", ["device_id"])
    op.create_index("ix_config_changes_change_type", "config_changes", ["change_type"])
    op.create_index("ix_config_changes_detected_at", "config_changes", ["detected_at"])
    op.create_index(
        "ix_config_changes_snapshot_after", "config_changes", ["snapshot_after_id"]
    )


def downgrade() -> None:
    op.drop_table("config_changes")
    op.drop_table("config_snapshots")
    op.execute("DROP TYPE IF EXISTS changetype")
    op.execute("DROP TYPE IF EXISTS snapshottype")
