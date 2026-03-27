"""Add incidents and threat_indicators tables

Revision ID: 021_add_incidents
Revises: 020_add_remote_work
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "021_add_incidents"
down_revision: str = "020_add_remote_work"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- incidents -------------------------------------------------------------
    op.create_table(
        "incidents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "severity",
            sa.Enum(
                "P1_critical", "P2_high", "P3_medium", "P4_low",
                name="incidentseverity",
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "detected", "investigating", "containing", "eradicating",
                "recovering", "resolved", "post_mortem",
                name="incidentstatus",
            ),
            nullable=False,
            server_default="detected",
        ),
        sa.Column(
            "category",
            sa.Enum(
                "malware", "unauthorized_access", "data_breach",
                "policy_violation", "hardware_failure", "other",
                name="incidentcategory",
            ),
            nullable=False,
        ),
        sa.Column("affected_devices", JSONB, nullable=True),
        sa.Column(
            "assigned_to",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "reported_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column("timeline", JSONB, nullable=True),
        sa.Column("root_cause", sa.Text, nullable=True),
        sa.Column("resolution", sa.Text, nullable=True),
        sa.Column("lessons_learned", sa.Text, nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_incidents_severity", "incidents", ["severity"])
    op.create_index("ix_incidents_status", "incidents", ["status"])
    op.create_index("ix_incidents_category", "incidents", ["category"])
    op.create_index("ix_incidents_assigned_to", "incidents", ["assigned_to"])
    op.create_index("ix_incidents_created_at", "incidents", ["created_at"])

    # -- threat_indicators -----------------------------------------------------
    op.create_table(
        "threat_indicators",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "indicator_type",
            sa.Enum(
                "ip_address", "domain", "file_hash", "url", "email",
                name="indicatortype",
            ),
            nullable=False,
        ),
        sa.Column("value", sa.String(1000), nullable=False),
        sa.Column(
            "threat_level",
            sa.Enum("critical", "high", "medium", "low", name="threatlevel"),
            nullable=False,
        ),
        sa.Column("source", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.text("true")
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
        sa.Column("related_incidents", JSONB, nullable=True),
    )
    op.create_index(
        "ix_threat_indicators_indicator_type", "threat_indicators", ["indicator_type"]
    )
    op.create_index(
        "ix_threat_indicators_threat_level", "threat_indicators", ["threat_level"]
    )
    op.create_index(
        "ix_threat_indicators_is_active", "threat_indicators", ["is_active"]
    )


def downgrade() -> None:
    op.drop_table("threat_indicators")
    op.drop_table("incidents")
    op.execute("DROP TYPE IF EXISTS incidentseverity")
    op.execute("DROP TYPE IF EXISTS incidentstatus")
    op.execute("DROP TYPE IF EXISTS incidentcategory")
    op.execute("DROP TYPE IF EXISTS indicatortype")
    op.execute("DROP TYPE IF EXISTS threatlevel")
