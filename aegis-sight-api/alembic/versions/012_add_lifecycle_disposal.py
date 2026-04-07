"""Add asset_lifecycle_events and disposal_requests tables

Revision ID: 012_add_lifecycle_disposal
Revises: 011_add_device_groups_views
Create Date: 2026-03-27
"""

from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "012_add_lifecycle_disposal"
down_revision: str = "011_add_device_groups_views"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- asset_lifecycle_events ------------------------------------------------
    op.create_table(
        "asset_lifecycle_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "event_type",
            sa.Enum(
                "procured",
                "deployed",
                "reassigned",
                "maintenance",
                "disposal_requested",
                "disposal_approved",
                "disposed",
                name="lifecycleeventtype",
            ),
            nullable=False,
        ),
        sa.Column(
            "performed_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("detail", JSONB, nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_asset_lifecycle_events_device_id",
        "asset_lifecycle_events",
        ["device_id"],
    )
    op.create_index(
        "ix_asset_lifecycle_events_event_type",
        "asset_lifecycle_events",
        ["event_type"],
    )
    op.create_index(
        "ix_asset_lifecycle_events_occurred_at",
        "asset_lifecycle_events",
        ["occurred_at"],
    )

    # -- disposal_requests -----------------------------------------------------
    op.create_table(
        "disposal_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column(
            "method",
            sa.Enum(
                "recycle",
                "destroy",
                "donate",
                "return_to_vendor",
                name="disposalmethod",
            ),
            nullable=False,
        ),
        sa.Column(
            "requested_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "approved_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "approved",
                "rejected",
                "completed",
                name="disposalstatus",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("certificate_path", sa.String(512), nullable=True),
        sa.Column("certificate_number", sa.String(255), nullable=True),
        sa.Column("disposal_date", sa.Date, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_disposal_requests_device_id",
        "disposal_requests",
        ["device_id"],
    )
    op.create_index(
        "ix_disposal_requests_status",
        "disposal_requests",
        ["status"],
    )
    op.create_index(
        "ix_disposal_requests_requested_by",
        "disposal_requests",
        ["requested_by"],
    )


def downgrade() -> None:
    op.drop_table("disposal_requests")
    op.drop_table("asset_lifecycle_events")
    op.execute("DROP TYPE IF EXISTS disposalstatus")
    op.execute("DROP TYPE IF EXISTS disposalmethod")
    op.execute("DROP TYPE IF EXISTS lifecycleeventtype")
