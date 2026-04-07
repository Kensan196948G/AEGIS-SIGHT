"""Add knowledge base articles and categories tables

Revision ID: 023_add_knowledge_base
Revises: 022_add_sla
Create Date: 2026-03-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "023_add_knowledge_base"
down_revision: str = "022_add_sla"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- kb_categories ---------------------------------------------------------
    op.create_table(
        "kb_categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("icon", sa.String(100), nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "parent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("kb_categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "article_count", sa.Integer, nullable=False, server_default="0"
        ),
    )
    op.create_index("ix_kb_categories_parent_id", "kb_categories", ["parent_id"])
    op.create_index("ix_kb_categories_sort_order", "kb_categories", ["sort_order"])

    # -- kb_articles -----------------------------------------------------------
    op.create_table(
        "kb_articles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "how_to",
                "troubleshooting",
                "policy",
                "faq",
                "best_practice",
                name="articlecategory",
            ),
            nullable=False,
        ),
        sa.Column("tags", JSONB, nullable=True),
        sa.Column(
            "author_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("draft", "published", "archived", name="articlestatus"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "view_count", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "helpful_count", sa.Integer, nullable=False, server_default="0"
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
    op.create_index("ix_kb_articles_category", "kb_articles", ["category"])
    op.create_index("ix_kb_articles_status", "kb_articles", ["status"])
    op.create_index("ix_kb_articles_author_id", "kb_articles", ["author_id"])
    op.create_index("ix_kb_articles_view_count", "kb_articles", ["view_count"])
    op.create_index("ix_kb_articles_created_at", "kb_articles", ["created_at"])


def downgrade() -> None:
    op.drop_table("kb_articles")
    op.drop_table("kb_categories")
    op.execute("DROP TYPE IF EXISTS articlecategory")
    op.execute("DROP TYPE IF EXISTS articlestatus")
