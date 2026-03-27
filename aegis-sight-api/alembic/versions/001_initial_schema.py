"""Initial schema: all tables for AEGIS-SIGHT

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-03-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------- Enum types ----------
user_role_enum = postgresql.ENUM(
    "admin", "operator", "auditor", "readonly",
    name="userrole",
    create_type=False,
)

device_status_enum = postgresql.ENUM(
    "active", "inactive", "decommissioned", "maintenance",
    name="devicestatus",
    create_type=False,
)

license_type_enum = postgresql.ENUM(
    "perpetual", "subscription", "oem", "volume", "freeware", "open_source",
    name="licensetype",
    create_type=False,
)

procurement_category_enum = postgresql.ENUM(
    "hardware", "software", "service", "consumable",
    name="procurementcategory",
    create_type=False,
)

procurement_status_enum = postgresql.ENUM(
    "draft", "submitted", "approved", "rejected",
    "ordered", "received", "registered", "active",
    "disposal_requested", "disposed",
    name="procurementstatus",
    create_type=False,
)


def upgrade() -> None:
    # ---- Create enum types ----
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'operator', 'auditor', 'readonly')")
    op.execute(
        "CREATE TYPE devicestatus AS ENUM "
        "('active', 'inactive', 'decommissioned', 'maintenance')"
    )
    op.execute(
        "CREATE TYPE licensetype AS ENUM "
        "('perpetual', 'subscription', 'oem', 'volume', 'freeware', 'open_source')"
    )
    op.execute(
        "CREATE TYPE procurementcategory AS ENUM "
        "('hardware', 'software', 'service', 'consumable')"
    )
    op.execute(
        "CREATE TYPE procurementstatus AS ENUM "
        "('draft', 'submitted', 'approved', 'rejected', "
        "'ordered', 'received', 'registered', 'active', "
        "'disposal_requested', 'disposed')"
    )

    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column(
            "role",
            user_role_enum,
            nullable=False,
            server_default="readonly",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ---- devices ----
    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("hostname", sa.String(255), nullable=False),
        sa.Column("os_version", sa.String(255), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("mac_address", sa.String(17), nullable=True),
        sa.Column("domain", sa.String(255), nullable=True),
        sa.Column(
            "status",
            device_status_enum,
            nullable=False,
            server_default="active",
        ),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_devices_hostname", "devices", ["hostname"], unique=True)

    # ---- hardware_snapshots ----
    op.create_table(
        "hardware_snapshots",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cpu_model", sa.String(255), nullable=True),
        sa.Column("memory_gb", sa.Numeric(8, 2), nullable=True),
        sa.Column("disk_total_gb", sa.Numeric(10, 2), nullable=True),
        sa.Column("disk_free_gb", sa.Numeric(10, 2), nullable=True),
        sa.Column("serial_number", sa.String(255), nullable=True),
        sa.Column(
            "snapped_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_hardware_snapshots_device_id",
        "hardware_snapshots",
        ["device_id"],
    )

    # ---- security_statuses ----
    op.create_table(
        "security_statuses",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "defender_on", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "bitlocker_on", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("pattern_date", sa.String(50), nullable=True),
        sa.Column(
            "pending_patches", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "checked_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_security_statuses_device_id",
        "security_statuses",
        ["device_id"],
    )

    # ---- software_licenses ----
    op.create_table(
        "software_licenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("software_name", sa.String(255), nullable=False),
        sa.Column("vendor", sa.String(255), nullable=False),
        sa.Column("license_type", license_type_enum, nullable=False),
        sa.Column("license_key", sa.String(512), nullable=True),
        sa.Column(
            "purchased_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "installed_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "m365_assigned", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("cost_per_unit", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default="JPY",
        ),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("vendor_contract_id", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
    op.create_index(
        "ix_software_licenses_software_name",
        "software_licenses",
        ["software_name"],
    )

    # ---- procurement_requests ----
    op.create_table(
        "procurement_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_number", sa.String(50), nullable=False),
        sa.Column("item_name", sa.String(255), nullable=False),
        sa.Column("category", procurement_category_enum, nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "unit_price",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_price",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "requester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("department", sa.String(255), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column(
            "status",
            procurement_status_enum,
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "approver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ordered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("disposal_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disposal_cert", sa.String(512), nullable=True),
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
    op.create_index(
        "ix_procurement_requests_request_number",
        "procurement_requests",
        ["request_number"],
        unique=True,
    )
    op.create_index(
        "ix_procurement_requests_status",
        "procurement_requests",
        ["status"],
    )
    op.create_index(
        "ix_procurement_requests_requester_id",
        "procurement_requests",
        ["requester_id"],
    )


def downgrade() -> None:
    # Drop tables in reverse order (respect FK dependencies)
    op.drop_table("procurement_requests")
    op.drop_table("software_licenses")
    op.drop_table("security_statuses")
    op.drop_table("hardware_snapshots")
    op.drop_table("devices")
    op.drop_table("users")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS procurementstatus")
    op.execute("DROP TYPE IF EXISTS procurementcategory")
    op.execute("DROP TYPE IF EXISTS licensetype")
    op.execute("DROP TYPE IF EXISTS devicestatus")
    op.execute("DROP TYPE IF EXISTS userrole")
