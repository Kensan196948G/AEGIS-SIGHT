"""Add log event and software inventory tables

Revision ID: 002_add_log_software_tables
Revises: 001_initial_schema
Create Date: 2026-03-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002_add_log_software_tables"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------- Enum types ----------
usb_action_enum = postgresql.ENUM(
    "connected", "disconnected",
    name="usbaction",
    create_type=False,
)

file_action_enum = postgresql.ENUM(
    "create", "modify", "delete", "read",
    name="fileaction",
    create_type=False,
)


def upgrade() -> None:
    # ---- Create enum types ----
    op.execute("CREATE TYPE usbaction AS ENUM ('connected', 'disconnected')")
    op.execute(
        "CREATE TYPE fileaction AS ENUM ('create', 'modify', 'delete', 'read')"
    )

    # ---- logon_events ----
    op.create_table(
        "logon_events",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column(
            "event_id",
            sa.Integer(),
            nullable=False,
            comment="Windows Event ID (4624/4634)",
        ),
        sa.Column("logon_type", sa.Integer(), nullable=True),
        sa.Column("source_ip", postgresql.INET(), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_logon_events_device_id", "logon_events", ["device_id"]
    )
    op.create_index(
        "ix_logon_events_occurred_at", "logon_events", ["occurred_at"]
    )

    # ---- usb_events ----
    op.create_table(
        "usb_events",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("device_name", sa.String(255), nullable=False),
        sa.Column("vendor_id", sa.String(10), nullable=True),
        sa.Column("product_id", sa.String(10), nullable=True),
        sa.Column("serial_number", sa.String(255), nullable=True),
        sa.Column("action", usb_action_enum, nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_usb_events_device_id", "usb_events", ["device_id"]
    )
    op.create_index(
        "ix_usb_events_occurred_at", "usb_events", ["occurred_at"]
    )

    # ---- file_events ----
    op.create_table(
        "file_events",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("action", file_action_enum, nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_file_events_device_id", "file_events", ["device_id"]
    )
    op.create_index(
        "ix_file_events_occurred_at", "file_events", ["occurred_at"]
    )

    # ---- software_inventory ----
    op.create_table(
        "software_inventory",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("software_name", sa.String(255), nullable=False),
        sa.Column("version", sa.String(100), nullable=True),
        sa.Column("publisher", sa.String(255), nullable=True),
        sa.Column("install_date", sa.Date(), nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_software_inventory_device_id",
        "software_inventory",
        ["device_id"],
    )
    op.create_index(
        "ix_software_inventory_software_name",
        "software_inventory",
        ["software_name"],
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("software_inventory")
    op.drop_table("file_events")
    op.drop_table("usb_events")
    op.drop_table("logon_events")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS fileaction")
    op.execute("DROP TYPE IF EXISTS usbaction")
