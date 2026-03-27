"""Tests for audit log API endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction, AuditLog
from app.models.user import User


@pytest.mark.asyncio
async def test_list_audit_logs_unauthorized(client: AsyncClient):
    """Unauthenticated requests should be rejected."""
    response = await client.get("/api/v1/audit/logs")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_audit_logs_forbidden_readonly(
    client: AsyncClient, readonly_headers: dict
):
    """Readonly users must not access audit logs."""
    response = await client.get("/api/v1/audit/logs", headers=readonly_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_audit_logs_auditor(
    client: AsyncClient,
    auditor_headers: dict,
    db_session: AsyncSession,
    auditor_user: User,
):
    """Auditors can list audit logs."""
    # Seed a log entry
    entry = AuditLog(
        action=AuditAction.login,
        resource_type="session",
        user_id=auditor_user.id,
        ip_address="127.0.0.1",
    )
    db_session.add(entry)
    await db_session.flush()

    response = await client.get("/api/v1/audit/logs", headers=auditor_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_audit_logs_admin(
    client: AsyncClient, admin_headers: dict
):
    """Admins can list audit logs."""
    response = await client.get("/api/v1/audit/logs", headers=admin_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_audit_logs_filter_action(
    client: AsyncClient,
    auditor_headers: dict,
    db_session: AsyncSession,
    auditor_user: User,
):
    """Filtering by action should work."""
    entry = AuditLog(
        action=AuditAction.export,
        resource_type="report",
        user_id=auditor_user.id,
    )
    db_session.add(entry)
    await db_session.flush()

    response = await client.get(
        "/api/v1/audit/logs",
        params={"action": "export"},
        headers=auditor_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["action"] == "export"


@pytest.mark.asyncio
async def test_export_audit_logs_csv(
    client: AsyncClient, auditor_headers: dict
):
    """CSV export should return text/csv content."""
    response = await client.get(
        "/api/v1/audit/logs/export",
        params={"format": "csv"},
        headers=auditor_headers,
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_export_audit_logs_json(
    client: AsyncClient, auditor_headers: dict
):
    """JSON export should return application/json content."""
    response = await client.get(
        "/api/v1/audit/logs/export",
        params={"format": "json"},
        headers=auditor_headers,
    )
    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_export_audit_logs_forbidden_readonly(
    client: AsyncClient, readonly_headers: dict
):
    """Readonly users must not export audit logs."""
    response = await client.get(
        "/api/v1/audit/logs/export", headers=readonly_headers
    )
    assert response.status_code == 403
