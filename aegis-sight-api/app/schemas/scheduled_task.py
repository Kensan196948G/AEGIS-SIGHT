"""Pydantic schemas for scheduled tasks."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.scheduled_task import TaskStatus, TaskType


class ScheduledTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    task_type: TaskType
    cron_expression: str
    is_enabled: bool
    last_run_at: datetime | None
    next_run_at: datetime | None
    last_status: TaskStatus | None
    description: str | None
    created_at: datetime


class ScheduledTaskUpdate(BaseModel):
    """Payload for updating a scheduled task (enable/disable, cron change)."""

    is_enabled: bool | None = None
    cron_expression: str | None = None
    description: str | None = None


class ScheduledTaskRunResponse(BaseModel):
    task_id: uuid.UUID
    task_name: str
    status: str
    message: str


class TaskHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    task_type: TaskType
    last_run_at: datetime | None
    last_status: TaskStatus | None
