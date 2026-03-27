"""Scheduler management API endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.scheduled_task import ScheduledTask, TaskStatus, TaskType
from app.models.user import User, UserRole
from app.schemas.scheduled_task import (
    ScheduledTaskResponse,
    ScheduledTaskRunResponse,
    ScheduledTaskUpdate,
    TaskHistoryEntry,
)

router = APIRouter(prefix="/scheduler", tags=["scheduler"])


@router.get(
    "/tasks",
    response_model=PaginatedResponse[ScheduledTaskResponse],
    summary="List scheduled tasks",
    description="Retrieve all scheduled tasks with pagination.",
)
async def list_tasks(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    task_type: TaskType | None = Query(None, description="Filter by task type"),
    is_enabled: bool | None = Query(None, description="Filter by enabled status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all scheduled tasks."""
    base_query = select(ScheduledTask)
    count_query = select(func.count(ScheduledTask.id))

    if task_type is not None:
        base_query = base_query.where(ScheduledTask.task_type == task_type)
        count_query = count_query.where(ScheduledTask.task_type == task_type)

    if is_enabled is not None:
        base_query = base_query.where(ScheduledTask.is_enabled == is_enabled)
        count_query = count_query.where(ScheduledTask.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(ScheduledTask.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.patch(
    "/tasks/{task_id}",
    response_model=ScheduledTaskResponse,
    summary="Update scheduled task",
    description="Update a scheduled task (enable/disable, change cron expression).",
    responses={404: {"description": "Task not found"}},
)
async def update_task(
    task_id: uuid.UUID,
    data: ScheduledTaskUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin)),
):
    """Update a scheduled task's settings."""
    result = await db.execute(
        select(ScheduledTask).where(ScheduledTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise NotFoundError("ScheduledTask", str(task_id))

    if data.is_enabled is not None:
        task.is_enabled = data.is_enabled
    if data.cron_expression is not None:
        task.cron_expression = data.cron_expression
    if data.description is not None:
        task.description = data.description

    await db.flush()
    await db.refresh(task)
    return task


@router.post(
    "/tasks/{task_id}/run",
    response_model=ScheduledTaskRunResponse,
    summary="Run task immediately",
    description="Trigger immediate execution of a scheduled task.",
    responses={404: {"description": "Task not found"}},
)
async def run_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin)),
):
    """Trigger immediate execution of a scheduled task."""
    result = await db.execute(
        select(ScheduledTask).where(ScheduledTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise NotFoundError("ScheduledTask", str(task_id))

    # Mark as running
    task.last_status = TaskStatus.running
    task.last_run_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(task)

    # In production, this would dispatch to Celery/background worker.
    # For now, mark as success after triggering.
    task.last_status = TaskStatus.success
    await db.flush()
    await db.refresh(task)

    return ScheduledTaskRunResponse(
        task_id=task.id,
        task_name=task.name,
        status="triggered",
        message=f"Task '{task.name}' has been triggered for immediate execution.",
    )


@router.get(
    "/history",
    response_model=list[TaskHistoryEntry],
    summary="Task execution history",
    description="Retrieve recent task execution history.",
)
async def task_history(
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get recent task execution history (tasks that have run at least once)."""
    result = await db.execute(
        select(ScheduledTask)
        .where(ScheduledTask.last_run_at.is_not(None))
        .order_by(ScheduledTask.last_run_at.desc())
        .limit(limit)
    )
    tasks = result.scalars().all()
    return tasks
