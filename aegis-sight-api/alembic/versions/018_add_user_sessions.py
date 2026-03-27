"""Add user_sessions and user_activities tables

Revision ID: 018_add_user_sessions
Revises: 017_add_dlp
Create Date: 2026-03-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "018_add_user_sessions"
down_revision: str = "017_add_dlp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- user_sessions ---------------------------------------------------------
    op.create_table(
        "user_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column(
            "session_type",
            sa.Enum("local", "rdp", "vpn", "citrix", name="sessiontype"),
            nullable=False,
        ),
        sa.Column("source_ip", sa.String(45), nullable=True),
        sa.Column("source_hostname", sa.String(255), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.text("true")
        ),
    )
    op.create_index("ix_user_sessions_device_id", "user_sessions", ["device_id"])
    op.create_index("ix_user_sessions_user_name", "user_sessions", ["user_name"])
    op.create_index(
        "ix_user_sessions_session_type", "user_sessions", ["session_type"]
    )
    op.create_index("ix_user_sessions_started_at", "user_sessions", ["started_at"])
    op.create_index("ix_user_sessions_is_active", "user_sessions", ["is_active"])

    # -- user_activities -------------------------------------------------------
    op.create_table(
        "user_activities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column(
            "activity_type",
            sa.Enum(
                "app_launch",
                "web_access",
                "file_access",
                "print",
                "email",
                name="activitytype",
            ),
            nullable=False,
        ),
        sa.Column("detail", JSONB, nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_user_activities_device_id", "user_activities", ["device_id"])
    op.create_index(
        "ix_user_activities_user_name", "user_activities", ["user_name"]
    )
    op.create_index(
        "ix_user_activities_activity_type", "user_activities", ["activity_type"]
    )
    op.create_index(
        "ix_user_activities_occurred_at", "user_activities", ["occurred_at"]
    )


def downgrade() -> None:
    op.drop_table("user_activities")
    op.drop_table("user_sessions")
    op.execute("DROP TYPE IF EXISTS activitytype")
    op.execute("DROP TYPE IF EXISTS sessiontype")
