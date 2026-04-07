"""Add device_groups, device_group_memberships, and custom_views tables

Revision ID: 011_add_device_groups_views
Revises: 010_add_tags
Create Date: 2026-03-27
"""

from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "011_add_device_groups_views"
down_revision: str = "010_add_tags"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- device_groups --------------------------------------------------------
    op.create_table(
        "device_groups",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("criteria", JSONB, nullable=True),
        sa.Column("is_dynamic", sa.Boolean, nullable=False, server_default="false"),
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
    op.create_index("ix_device_groups_name", "device_groups", ["name"])
    op.create_index("ix_device_groups_created_by", "device_groups", ["created_by"])

    # -- device_group_memberships ---------------------------------------------
    op.create_table(
        "device_group_memberships",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "group_id",
            UUID(as_uuid=True),
            sa.ForeignKey("device_groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "added_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("group_id", "device_id", name="uq_group_device"),
    )
    op.create_index(
        "ix_device_group_memberships_group_id",
        "device_group_memberships",
        ["group_id"],
    )
    op.create_index(
        "ix_device_group_memberships_device_id",
        "device_group_memberships",
        ["device_id"],
    )

    # -- custom_views ---------------------------------------------------------
    op.create_table(
        "custom_views",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("columns", JSONB, nullable=True),
        sa.Column("filters", JSONB, nullable=True),
        sa.Column("sort_by", sa.String(100), nullable=True),
        sa.Column(
            "sort_order",
            sa.String(4),
            nullable=False,
            server_default="asc",
        ),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "owner_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_shared", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_custom_views_name", "custom_views", ["name"])
    op.create_index("ix_custom_views_entity_type", "custom_views", ["entity_type"])
    op.create_index("ix_custom_views_owner_id", "custom_views", ["owner_id"])
    op.create_index(
        "ix_custom_views_owner_shared",
        "custom_views",
        ["owner_id", "is_shared"],
    )


def downgrade() -> None:
    op.drop_table("custom_views")
    op.drop_table("device_group_memberships")
    op.drop_table("device_groups")
