"""Add SLA definitions, measurements, and violations tables

Revision ID: 022_add_sla
Revises: 021_add_incidents
Create Date: 2026-03-27
"""

from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "022_add_sla"
down_revision: str = "021_add_incidents"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- sla_definitions -------------------------------------------------------
    op.create_table(
        "sla_definitions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "metric_type",
            sa.Enum(
                "availability", "response_time", "resolution_time", "patch_compliance",
                name="slametrictype",
            ),
            nullable=False,
        ),
        sa.Column("target_value", sa.Numeric(12, 4), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column(
            "measurement_period",
            sa.Enum("daily", "weekly", "monthly", name="measurementperiod"),
            nullable=False,
        ),
        sa.Column("warning_threshold", sa.Numeric(12, 4), nullable=False),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_sla_definitions_metric_type", "sla_definitions", ["metric_type"])
    op.create_index(
        "ix_sla_definitions_measurement_period", "sla_definitions", ["measurement_period"]
    )
    op.create_index("ix_sla_definitions_is_active", "sla_definitions", ["is_active"])

    # -- sla_measurements ------------------------------------------------------
    op.create_table(
        "sla_measurements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "sla_id",
            UUID(as_uuid=True),
            sa.ForeignKey("sla_definitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("measured_value", sa.Numeric(12, 4), nullable=False),
        sa.Column("target_value", sa.Numeric(12, 4), nullable=False),
        sa.Column("is_met", sa.Boolean, nullable=False),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("detail", JSONB, nullable=True),
        sa.Column(
            "measured_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_sla_measurements_sla_id", "sla_measurements", ["sla_id"])
    op.create_index("ix_sla_measurements_is_met", "sla_measurements", ["is_met"])
    op.create_index(
        "ix_sla_measurements_period", "sla_measurements", ["period_start", "period_end"]
    )

    # -- sla_violations --------------------------------------------------------
    op.create_table(
        "sla_violations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "sla_id",
            UUID(as_uuid=True),
            sa.ForeignKey("sla_definitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "measurement_id",
            UUID(as_uuid=True),
            sa.ForeignKey("sla_measurements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("violation_detail", sa.Text, nullable=False),
        sa.Column(
            "severity",
            sa.Enum("warning", "breach", name="violationseverity"),
            nullable=False,
        ),
        sa.Column(
            "notified", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_sla_violations_sla_id", "sla_violations", ["sla_id"])
    op.create_index(
        "ix_sla_violations_measurement_id", "sla_violations", ["measurement_id"]
    )
    op.create_index("ix_sla_violations_severity", "sla_violations", ["severity"])
    op.create_index("ix_sla_violations_created_at", "sla_violations", ["created_at"])


def downgrade() -> None:
    op.drop_table("sla_violations")
    op.drop_table("sla_measurements")
    op.drop_table("sla_definitions")
    op.execute("DROP TYPE IF EXISTS slametrictype")
    op.execute("DROP TYPE IF EXISTS measurementperiod")
    op.execute("DROP TYPE IF EXISTS violationseverity")
