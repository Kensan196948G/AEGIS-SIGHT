"""Add ip_ranges and ip_assignments tables

Revision ID: 014_add_ip_management
Revises: 013_add_patches_vulnerabilities
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "014_add_ip_management"
down_revision: str = "013_add_patches_vulnerabilities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- ip_ranges -------------------------------------------------------------
    op.create_table(
        "ip_ranges",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "network_address",
            sa.String(43),
            nullable=False,
            unique=True,
            comment="CIDR notation, e.g. 192.168.1.0/24",
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("vlan_id", sa.Integer, nullable=True),
        sa.Column("gateway", sa.String(45), nullable=True),
        sa.Column("dns_servers", JSONB, nullable=True),
        sa.Column("dhcp_enabled", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "location",
            sa.String(50),
            nullable=True,
            comment="本社 / 支社 / 現場",
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_ip_ranges_network_address", "ip_ranges", ["network_address"], unique=True)
    op.create_index("ix_ip_ranges_location", "ip_ranges", ["location"])
    op.create_index("ix_ip_ranges_vlan_id", "ip_ranges", ["vlan_id"])

    # -- ip_assignments --------------------------------------------------------
    op.create_table(
        "ip_assignments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("ip_address", sa.dialects.postgresql.INET, nullable=False),
        sa.Column("mac_address", sa.String(17), nullable=True),
        sa.Column("hostname", sa.String(255), nullable=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "range_id",
            UUID(as_uuid=True),
            sa.ForeignKey("ip_ranges.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assignment_type",
            sa.Enum("static", "dhcp", "reserved", name="assignmenttype"),
            nullable=False,
            server_default="static",
        ),
        sa.Column(
            "status",
            sa.Enum("active", "inactive", "reserved", "conflict", name="assignmentstatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "first_seen",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_seen",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("notes", sa.Text, nullable=True),
    )
    op.create_index("ix_ip_assignments_ip_address", "ip_assignments", ["ip_address"])
    op.create_index("ix_ip_assignments_range_id", "ip_assignments", ["range_id"])
    op.create_index("ix_ip_assignments_device_id", "ip_assignments", ["device_id"])
    op.create_index("ix_ip_assignments_status", "ip_assignments", ["status"])
    op.create_index("ix_ip_assignments_assignment_type", "ip_assignments", ["assignment_type"])


def downgrade() -> None:
    op.drop_table("ip_assignments")
    op.drop_table("ip_ranges")
    op.execute("DROP TYPE IF EXISTS assignmenttype")
    op.execute("DROP TYPE IF EXISTS assignmentstatus")
