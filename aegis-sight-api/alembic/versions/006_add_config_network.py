"""Add system_configs and network_devices tables

Revision ID: 006_add_config_network
Revises: 005_add_departments
Create Date: 2026-03-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "006_add_config_network"
down_revision: str | None = "005_add_departments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- system_configs ----
    op.create_table(
        "system_configs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.String(255), nullable=False, unique=True),
        sa.Column("value", postgresql.JSONB, nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_system_configs_key", "system_configs", ["key"], unique=True)
    op.create_index("ix_system_configs_category", "system_configs", ["category"])

    # Seed default configuration values
    op.execute(
        """
        INSERT INTO system_configs (id, key, value, category, description)
        VALUES
            (gen_random_uuid(), 'collection_interval_minutes', '5'::jsonb, 'agent',
             'Interval in minutes between agent data collection runs'),
            (gen_random_uuid(), 'alert_thresholds', '{"cpu_percent": 90, "disk_free_gb": 10}'::jsonb, 'alert',
             'Threshold values that trigger alerts (CPU %, disk free GB)'),
            (gen_random_uuid(), 'retention_days', '1095'::jsonb, 'storage',
             'Number of days to retain telemetry and log data (default 3 years)'),
            (gen_random_uuid(), 'sam_check_hour', '3'::jsonb, 'sam',
             'Hour of day (0-23 UTC) when the SAM compliance check runs')
        """
    )

    # ---- network_devices ----
    network_device_type = postgresql.ENUM(
        "pc", "server", "printer", "switch", "router", "ap", "unknown",
        name="networkdevicetype",
        create_type=True,
    )

    op.create_table(
        "network_devices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("ip_address", postgresql.INET, nullable=False),
        sa.Column("mac_address", sa.String(17), nullable=False, unique=True),
        sa.Column("hostname", sa.String(255), nullable=True),
        sa.Column(
            "device_type",
            network_device_type,
            nullable=False,
            server_default="unknown",
        ),
        sa.Column("is_managed", sa.Boolean(), nullable=False, server_default="false"),
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
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_network_devices_ip_address", "network_devices", ["ip_address"])
    op.create_index("ix_network_devices_mac_address", "network_devices", ["mac_address"], unique=True)
    op.create_index("ix_network_devices_device_id", "network_devices", ["device_id"])


def downgrade() -> None:
    op.drop_table("network_devices")
    op.execute("DROP TYPE IF EXISTS networkdevicetype")
    op.drop_table("system_configs")
