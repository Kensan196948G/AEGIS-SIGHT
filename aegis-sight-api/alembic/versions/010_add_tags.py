"""Add tags and tag_assignments tables

Revision ID: 010_add_tags
Revises: 009_add_notification_channels
Create Date: 2026-03-27
"""

from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "010_add_tags"
down_revision: str = "009_add_notification_channels"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- tags -----------------------------------------------------------------
    op.create_table(
        "tags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6366f1"),
        sa.Column(
            "category",
            sa.Enum("device", "license", "procurement", "general", name="tagcategory"),
            nullable=False,
            server_default="general",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_tags_name", "tags", ["name"])
    op.create_index("ix_tags_category", "tags", ["category"])

    # -- tag_assignments ------------------------------------------------------
    op.create_table(
        "tag_assignments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tag_id",
            UUID(as_uuid=True),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("tag_id", "entity_type", "entity_id", name="uq_tag_entity"),
    )
    op.create_index("ix_tag_assignments_tag_id", "tag_assignments", ["tag_id"])
    op.create_index("ix_tag_assignments_entity_type", "tag_assignments", ["entity_type"])
    op.create_index("ix_tag_assignments_entity_id", "tag_assignments", ["entity_id"])
    op.create_index(
        "ix_tag_assignments_entity_lookup",
        "tag_assignments",
        ["entity_type", "entity_id"],
    )


def downgrade() -> None:
    op.drop_table("tag_assignments")
    op.drop_table("tags")
    op.execute("DROP TYPE IF EXISTS tagcategory")
