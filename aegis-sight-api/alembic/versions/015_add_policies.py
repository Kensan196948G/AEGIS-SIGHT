"""Add device_policies and policy_violations tables

Revision ID: 015_add_policies
Revises: 014_add_ip_management
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "015_add_policies"
down_revision: str = "014_add_ip_management"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- device_policies -------------------------------------------------------
    op.create_table(
        "device_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "policy_type",
            sa.Enum(
                "usb_control",
                "software_restriction",
                "patch_requirement",
                "security_baseline",
                name="policytype",
            ),
            nullable=False,
        ),
        sa.Column("rules", JSONB, nullable=True),
        sa.Column(
            "target_groups",
            JSONB,
            nullable=True,
            comment="Array of device group UUIDs",
        ),
        sa.Column(
            "is_enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "priority",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
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
    op.create_index("ix_device_policies_name", "device_policies", ["name"])
    op.create_index("ix_device_policies_policy_type", "device_policies", ["policy_type"])
    op.create_index("ix_device_policies_is_enabled", "device_policies", ["is_enabled"])
    op.create_index("ix_device_policies_priority", "device_policies", ["priority"])

    # -- policy_violations -----------------------------------------------------
    op.create_table(
        "policy_violations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "policy_id",
            UUID(as_uuid=True),
            sa.ForeignKey("device_policies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("violation_type", sa.String(100), nullable=False),
        sa.Column("detail", JSONB, nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_resolved",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index("ix_policy_violations_policy_id", "policy_violations", ["policy_id"])
    op.create_index("ix_policy_violations_device_id", "policy_violations", ["device_id"])
    op.create_index("ix_policy_violations_is_resolved", "policy_violations", ["is_resolved"])
    op.create_index(
        "ix_policy_violations_detected_at", "policy_violations", ["detected_at"]
    )


def downgrade() -> None:
    op.drop_table("policy_violations")
    op.drop_table("device_policies")
    op.execute("DROP TYPE IF EXISTS policytype")
