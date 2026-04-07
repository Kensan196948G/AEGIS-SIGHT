"""Add departments table

Revision ID: 005_add_departments
Revises: 004_add_alerts
Create Date: 2026-03-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005_add_departments"
down_revision: str | None = "004_add_alerts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("manager_name", sa.String(255), nullable=True),
        sa.Column("budget_yearly", sa.Numeric(15, 2), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
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

    # Indexes
    op.create_index("ix_departments_code", "departments", ["code"], unique=True)
    op.create_index("ix_departments_parent_id", "departments", ["parent_id"])
    op.create_index("ix_departments_name", "departments", ["name"])


def downgrade() -> None:
    op.drop_table("departments")
