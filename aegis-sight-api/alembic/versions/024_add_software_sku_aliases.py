"""Add software_sku_aliases for explicit M365 SKU → license mapping

Revision ID: 024_add_software_sku_aliases
Revises: 023_add_knowledge_base
Create Date: 2026-04-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "024_add_software_sku_aliases"
down_revision: str = "023_add_knowledge_base"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "software_sku_aliases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "software_license_id",
            UUID(as_uuid=True),
            sa.ForeignKey("software_licenses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sku_part_number", sa.String(100), nullable=False),
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
        sa.UniqueConstraint("sku_part_number", name="uq_software_sku_aliases_sku"),
    )
    op.create_index(
        "ix_software_sku_aliases_license_id",
        "software_sku_aliases",
        ["software_license_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_software_sku_aliases_license_id",
        table_name="software_sku_aliases",
    )
    op.drop_table("software_sku_aliases")
