"""Add printers, print_jobs, and print_policies tables

Revision ID: 019_add_print_management
Revises: 018_add_user_sessions
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "019_add_print_management"
down_revision: str = "018_add_user_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- printers --------------------------------------------------------------
    op.create_table(
        "printers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(500), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("model", sa.String(255), nullable=False),
        sa.Column("is_network", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_printers_name", "printers", ["name"])
    op.create_index("ix_printers_department", "printers", ["department"])

    # -- print_jobs ------------------------------------------------------------
    op.create_table(
        "print_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "printer_id",
            UUID(as_uuid=True),
            sa.ForeignKey("printers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("document_name", sa.String(500), nullable=False),
        sa.Column("pages", sa.Integer, nullable=False),
        sa.Column("copies", sa.Integer, nullable=False, server_default=sa.text("1")),
        sa.Column("color", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("duplex", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("paper_size", sa.String(20), nullable=False, server_default=sa.text("'A4'")),
        sa.Column(
            "status",
            sa.Enum("completed", "failed", "cancelled", name="printjobstatus"),
            nullable=False,
        ),
        sa.Column(
            "printed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_print_jobs_printer_id", "print_jobs", ["printer_id"])
    op.create_index("ix_print_jobs_device_id", "print_jobs", ["device_id"])
    op.create_index("ix_print_jobs_user_name", "print_jobs", ["user_name"])
    op.create_index("ix_print_jobs_status", "print_jobs", ["status"])
    op.create_index("ix_print_jobs_printed_at", "print_jobs", ["printed_at"])

    # -- print_policies --------------------------------------------------------
    op.create_table(
        "print_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("max_pages_per_day", sa.Integer, nullable=True),
        sa.Column("max_pages_per_month", sa.Integer, nullable=True),
        sa.Column("allow_color", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column(
            "allow_duplex_only", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
        sa.Column("target_departments", JSONB, nullable=True),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_print_policies_name", "print_policies", ["name"])


def downgrade() -> None:
    op.drop_table("print_policies")
    op.drop_table("print_jobs")
    op.drop_table("printers")
    op.execute("DROP TYPE IF EXISTS printjobstatus")
