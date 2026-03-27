"""Add windows_updates, device_patch_statuses, and vulnerabilities tables

Revision ID: 013_add_patches_vulnerabilities
Revises: 012_add_lifecycle_disposal
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "013_add_patches_vulnerabilities"
down_revision: str = "012_add_lifecycle_disposal"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- windows_updates -------------------------------------------------------
    op.create_table(
        "windows_updates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kb_number", sa.String(50), nullable=False, unique=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column(
            "severity",
            sa.Enum(
                "critical",
                "important",
                "moderate",
                "low",
                name="updateseverity",
            ),
            nullable=False,
        ),
        sa.Column("release_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_windows_updates_kb_number", "windows_updates", ["kb_number"], unique=True)
    op.create_index("ix_windows_updates_severity", "windows_updates", ["severity"])
    op.create_index("ix_windows_updates_release_date", "windows_updates", ["release_date"])

    # -- device_patch_statuses -------------------------------------------------
    op.create_table(
        "device_patch_statuses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "update_id",
            UUID(as_uuid=True),
            sa.ForeignKey("windows_updates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "not_installed",
                "downloading",
                "installed",
                "failed",
                "not_applicable",
                name="patchstatus",
            ),
            nullable=False,
            server_default="not_installed",
        ),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_device_patch_statuses_device_id", "device_patch_statuses", ["device_id"])
    op.create_index("ix_device_patch_statuses_update_id", "device_patch_statuses", ["update_id"])
    op.create_index(
        "ix_device_patch_statuses_device_update",
        "device_patch_statuses",
        ["device_id", "update_id"],
        unique=True,
    )
    op.create_index("ix_device_patch_statuses_status", "device_patch_statuses", ["status"])

    # -- vulnerabilities -------------------------------------------------------
    op.create_table(
        "vulnerabilities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False, unique=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column(
            "severity",
            sa.Enum(
                "critical",
                "high",
                "medium",
                "low",
                name="vulnerabilityseverity",
            ),
            nullable=False,
        ),
        sa.Column("cvss_score", sa.Numeric(4, 1), nullable=False),
        sa.Column("affected_software", JSONB, nullable=True),
        sa.Column("remediation", sa.Text, nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_resolved", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_vulnerabilities_cve_id", "vulnerabilities", ["cve_id"], unique=True)
    op.create_index("ix_vulnerabilities_severity", "vulnerabilities", ["severity"])
    op.create_index("ix_vulnerabilities_cvss_score", "vulnerabilities", ["cvss_score"])
    op.create_index("ix_vulnerabilities_is_resolved", "vulnerabilities", ["is_resolved"])


def downgrade() -> None:
    op.drop_table("device_patch_statuses")
    op.drop_table("windows_updates")
    op.drop_table("vulnerabilities")
    op.execute("DROP TYPE IF EXISTS patchstatus")
    op.execute("DROP TYPE IF EXISTS updateseverity")
    op.execute("DROP TYPE IF EXISTS vulnerabilityseverity")
