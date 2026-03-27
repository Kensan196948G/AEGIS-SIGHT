"""Add vpn_connections and remote_access_policies tables

Revision ID: 020_add_remote_work
Revises: 019_add_print_management
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "020_add_remote_work"
down_revision: str = "019_add_print_management"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- vpn_connections -------------------------------------------------------
    op.create_table(
        "vpn_connections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("vpn_server", sa.String(500), nullable=False),
        sa.Column("client_ip", sa.String(45), nullable=False),
        sa.Column("assigned_ip", sa.String(45), nullable=False),
        sa.Column(
            "protocol",
            sa.Enum("ipsec", "ssl", "wireguard", "l2tp", name="vpnprotocol"),
            nullable=False,
        ),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("bytes_sent", sa.BigInteger, nullable=True),
        sa.Column("bytes_received", sa.BigInteger, nullable=True),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
    )
    op.create_index("ix_vpn_connections_device_id", "vpn_connections", ["device_id"])
    op.create_index("ix_vpn_connections_user_name", "vpn_connections", ["user_name"])
    op.create_index("ix_vpn_connections_protocol", "vpn_connections", ["protocol"])
    op.create_index(
        "ix_vpn_connections_connected_at", "vpn_connections", ["connected_at"]
    )

    # -- remote_access_policies ------------------------------------------------
    op.create_table(
        "remote_access_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("allowed_hours_start", sa.Time, nullable=False),
        sa.Column("allowed_hours_end", sa.Time, nullable=False),
        sa.Column("allowed_days", JSONB, nullable=False),
        sa.Column(
            "require_mfa", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
        sa.Column("max_session_hours", sa.Integer, nullable=False),
        sa.Column("geo_restriction", JSONB, nullable=True),
        sa.Column(
            "is_enabled", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_remote_access_policies_name", "remote_access_policies", ["name"]
    )


def downgrade() -> None:
    op.drop_table("remote_access_policies")
    op.drop_table("vpn_connections")
    op.execute("DROP TYPE IF EXISTS vpnprotocol")
