"""Add BRIN indexes and composite indexes for query optimization

Revision ID: 008_add_indexes_partitions
Revises: 007_add_scheduler_tasks
Create Date: 2026-03-27

BRIN indexes are ideal for time-series columns that correlate with physical
row order (append-only tables).  They are dramatically smaller than B-tree
indexes and faster for range scans on timestamp columns.

Composite indexes target the most common query patterns identified in the
application layer.

NOTE -- Monthly partitioning (PostgreSQL Declarative Partitioning):
  Partitioning for logon_events, usb_events, file_events, and
  hardware_snapshots is planned as a future migration.  It requires:
    1. Creating a new partitioned table with identical schema.
    2. Migrating existing data into the partitioned table.
    3. Renaming tables atomically.
    4. Attaching monthly partitions and setting up an auto-creation job.
  This will be implemented in a separate migration (009+) once data
  volume justifies the additional operational complexity.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_add_indexes_partitions"
down_revision: str | None = "007_add_scheduler_tasks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # BRIN indexes on timestamp columns (time-series tables)
    # ------------------------------------------------------------------
    op.create_index(
        "ix_logon_events_occurred_at_brin",
        "logon_events",
        ["occurred_at"],
        postgresql_using="brin",
        postgresql_with={"pages_per_range": 128},
    )

    op.create_index(
        "ix_usb_events_occurred_at_brin",
        "usb_events",
        ["occurred_at"],
        postgresql_using="brin",
        postgresql_with={"pages_per_range": 128},
    )

    op.create_index(
        "ix_file_events_occurred_at_brin",
        "file_events",
        ["occurred_at"],
        postgresql_using="brin",
        postgresql_with={"pages_per_range": 128},
    )

    op.create_index(
        "ix_hardware_snapshots_snapped_at_brin",
        "hardware_snapshots",
        ["snapped_at"],
        postgresql_using="brin",
        postgresql_with={"pages_per_range": 128},
    )

    op.create_index(
        "ix_audit_logs_created_at_brin",
        "audit_logs",
        ["created_at"],
        postgresql_using="brin",
        postgresql_with={"pages_per_range": 128},
    )

    # ------------------------------------------------------------------
    # Composite indexes for common query patterns
    # ------------------------------------------------------------------

    # Devices: filter by status + last_seen (dashboard "active in last N days")
    op.create_index(
        "ix_devices_status_last_seen",
        "devices",
        ["status", "last_seen"],
    )

    # Software licenses: expiry_date + compliance queries
    # This supports queries like "expiring within N days" and
    # "purchased_count vs installed_count + m365_assigned"
    op.create_index(
        "ix_software_licenses_expiry_compliance",
        "software_licenses",
        ["expiry_date", "purchased_count", "installed_count", "m365_assigned"],
    )


def downgrade() -> None:
    op.drop_index("ix_software_licenses_expiry_compliance", table_name="software_licenses")
    op.drop_index("ix_devices_status_last_seen", table_name="devices")
    op.drop_index("ix_audit_logs_created_at_brin", table_name="audit_logs")
    op.drop_index("ix_hardware_snapshots_snapped_at_brin", table_name="hardware_snapshots")
    op.drop_index("ix_file_events_occurred_at_brin", table_name="file_events")
    op.drop_index("ix_usb_events_occurred_at_brin", table_name="usb_events")
    op.drop_index("ix_logon_events_occurred_at_brin", table_name="logon_events")
