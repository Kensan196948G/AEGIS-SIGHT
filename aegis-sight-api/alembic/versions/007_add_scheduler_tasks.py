"""Add scheduled_tasks table

Revision ID: 007_add_scheduler_tasks
Revises: 006_add_config_network
Create Date: 2026-03-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "007_add_scheduler_tasks"
down_revision: Union[str, None] = "006_add_config_network"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- Enum types ----
    task_type_enum = postgresql.ENUM(
        "sam_check", "m365_sync", "report_generation", "backup", "cleanup",
        name="tasktype",
        create_type=True,
    )

    task_status_enum = postgresql.ENUM(
        "success", "failed", "running",
        name="taskstatus",
        create_type=True,
    )

    # ---- scheduled_tasks ----
    op.create_table(
        "scheduled_tasks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("task_type", task_type_enum, nullable=False),
        sa.Column("cron_expression", sa.String(100), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "last_run_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "next_run_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("last_status", task_status_enum, nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_scheduled_tasks_task_type", "scheduled_tasks", ["task_type"])
    op.create_index("ix_scheduled_tasks_is_enabled", "scheduled_tasks", ["is_enabled"])

    # Seed default scheduled tasks
    op.execute(
        """
        INSERT INTO scheduled_tasks (id, name, task_type, cron_expression, is_enabled, description)
        VALUES
            (gen_random_uuid(), 'SAMコンプライアンスチェック', 'sam_check', '0 3 * * *', true,
             '毎日午前3時にSAMコンプライアンスチェックを実行'),
            (gen_random_uuid(), 'M365データ同期', 'm365_sync', '0 */6 * * *', true,
             '6時間ごとにMicrosoft 365データを同期'),
            (gen_random_uuid(), 'レポート生成', 'report_generation', '0 6 1 * *', true,
             '毎月1日の午前6時に月次レポートを生成'),
            (gen_random_uuid(), 'データベースバックアップ', 'backup', '0 2 * * *', true,
             '毎日午前2時にデータベースのバックアップを実行'),
            (gen_random_uuid(), 'データクリーンアップ', 'cleanup', '0 4 * * 0', false,
             '毎週日曜日の午前4時に期限切れデータをクリーンアップ')
        """
    )


def downgrade() -> None:
    op.drop_table("scheduled_tasks")
    op.execute("DROP TYPE IF EXISTS tasktype")
    op.execute("DROP TYPE IF EXISTS taskstatus")
