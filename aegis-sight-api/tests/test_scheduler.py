"""Tests for Scheduler API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scheduled_task import ScheduledTask, TaskType


async def _create_task(
    db: AsyncSession,
    name: str = "Test Task",
    task_type: TaskType = TaskType.sam_check,
    cron_expression: str = "0 3 * * *",
    is_enabled: bool = True,
    description: str | None = "A test scheduled task",
) -> ScheduledTask:
    """Helper to insert a test scheduled task."""
    task = ScheduledTask(
        name=name,
        task_type=task_type,
        cron_expression=cron_expression,
        is_enabled=is_enabled,
        description=description,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@pytest.mark.asyncio
async def test_list_tasks_unauthorized(client: AsyncClient):
    """Test that listing tasks requires authentication."""
    response = await client.get("/api/v1/scheduler/tasks")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_tasks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing scheduled tasks."""
    await _create_task(db_session)
    response = await client.get("/api/v1/scheduler/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_tasks_filter_by_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering tasks by type."""
    await _create_task(db_session, task_type=TaskType.backup, name="Backup Task")
    response = await client.get(
        "/api/v1/scheduler/tasks?task_type=backup", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["task_type"] == "backup"


@pytest.mark.asyncio
async def test_list_tasks_filter_by_enabled(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering tasks by enabled status."""
    await _create_task(db_session, is_enabled=False, name="Disabled Task")
    response = await client.get(
        "/api/v1/scheduler/tasks?is_enabled=false", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["is_enabled"] is False


@pytest.mark.asyncio
async def test_update_task_toggle_enabled(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Test toggling task enabled/disabled."""
    task = await _create_task(db_session, is_enabled=True)
    response = await client.patch(
        f"/api/v1/scheduler/tasks/{task.id}",
        json={"is_enabled": False},
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_enabled"] is False


@pytest.mark.asyncio
async def test_update_task_change_cron(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Test changing task cron expression."""
    task = await _create_task(db_session)
    response = await client.patch(
        f"/api/v1/scheduler/tasks/{task.id}",
        json={"cron_expression": "0 */2 * * *"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["cron_expression"] == "0 */2 * * *"


@pytest.mark.asyncio
async def test_update_task_not_found(client: AsyncClient, admin_headers: dict):
    """Test updating a non-existent task returns 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.patch(
        f"/api/v1/scheduler/tasks/{fake_id}",
        json={"is_enabled": False},
        headers=admin_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_task_forbidden_for_readonly(
    client: AsyncClient, readonly_headers: dict, db_session: AsyncSession
):
    """Test that updating tasks requires admin role."""
    task = await _create_task(db_session)
    response = await client.patch(
        f"/api/v1/scheduler/tasks/{task.id}",
        json={"is_enabled": False},
        headers=readonly_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_run_task(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Test triggering immediate task execution."""
    task = await _create_task(db_session)
    response = await client.post(
        f"/api/v1/scheduler/tasks/{task.id}/run",
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == str(task.id)
    assert data["status"] == "triggered"


@pytest.mark.asyncio
async def test_run_task_not_found(client: AsyncClient, admin_headers: dict):
    """Test running a non-existent task returns 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.post(
        f"/api/v1/scheduler/tasks/{fake_id}/run",
        headers=admin_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_run_task_forbidden_for_operator(
    client: AsyncClient, operator_headers: dict, db_session: AsyncSession
):
    """Test that running tasks requires admin role."""
    task = await _create_task(db_session)
    response = await client.post(
        f"/api/v1/scheduler/tasks/{task.id}/run",
        headers=operator_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_task_history_unauthorized(client: AsyncClient):
    """Test that task history requires authentication."""
    response = await client.get("/api/v1/scheduler/history")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_task_history(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Test task execution history after running a task."""
    task = await _create_task(db_session)
    # Run the task first
    await client.post(
        f"/api/v1/scheduler/tasks/{task.id}/run",
        headers=admin_headers,
    )
    # Check history
    response = await client.get("/api/v1/scheduler/history", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["last_run_at"] is not None
