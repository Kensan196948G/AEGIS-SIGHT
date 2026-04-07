"""Tests for the data export API endpoints."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertCategory, AlertSeverity
from app.models.audit_log import AuditAction, AuditLog
from app.models.device import Device, DeviceStatus
from app.models.license import LicenseType, SoftwareLicense

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_device(db: AsyncSession, hostname: str = "EXPORT-PC-001") -> Device:
    device = Device(hostname=hostname, os_version="Windows 11", status=DeviceStatus.active)
    db.add(device)
    await db.flush()
    return device


async def _seed_license(db: AsyncSession) -> SoftwareLicense:
    lic = SoftwareLicense(
        software_name="Adobe CC",
        vendor="Adobe",
        license_type=LicenseType.subscription,
        purchased_count=100,
        installed_count=90,
    )
    db.add(lic)
    await db.flush()
    return lic


async def _seed_alert(db: AsyncSession) -> Alert:
    alert = Alert(
        severity=AlertSeverity.warning,
        category=AlertCategory.security,
        title="Export Test Alert",
        message="Alert for export testing",
    )
    db.add(alert)
    await db.flush()
    return alert


async def _seed_audit_log(db: AsyncSession) -> AuditLog:
    log = AuditLog(
        action=AuditAction.export,
        resource_type="device",
        resource_id=str(uuid.uuid4()),
        detail={"reason": "test export"},
    )
    db.add(log)
    await db.flush()
    return log


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_devices_unauthorized(client: AsyncClient):
    """Export endpoints require authentication."""
    response = await client.get("/api/v1/export/devices")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_export_devices_readonly_forbidden(
    client: AsyncClient, readonly_headers: dict
):
    """Readonly users cannot export devices."""
    response = await client.get("/api/v1/export/devices", headers=readonly_headers)
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_devices_csv(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Export devices as CSV returns valid CSV with header."""
    await _seed_device(db_session, hostname=f"EXP-{uuid.uuid4().hex[:6]}")

    response = await client.get(
        "/api/v1/export/devices?format=csv", headers=admin_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "devices_export.csv" in response.headers.get("content-disposition", "")
    body = response.text
    assert "hostname" in body


@pytest.mark.asyncio
async def test_export_devices_json(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Export devices as JSON returns valid JSON array."""
    await _seed_device(db_session, hostname=f"EXPJ-{uuid.uuid4().hex[:6]}")

    response = await client.get(
        "/api/v1/export/devices?format=json", headers=admin_headers
    )
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "hostname" in data[0]


# ---------------------------------------------------------------------------
# Licenses
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_licenses_csv(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    await _seed_license(db_session)
    response = await client.get(
        "/api/v1/export/licenses?format=csv", headers=admin_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "software_name" in response.text


@pytest.mark.asyncio
async def test_export_licenses_json(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    await _seed_license(db_session)
    response = await client.get(
        "/api/v1/export/licenses?format=json", headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_alerts_csv(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    await _seed_alert(db_session)
    response = await client.get(
        "/api/v1/export/alerts?format=csv", headers=admin_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]


@pytest.mark.asyncio
async def test_export_alerts_json(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    await _seed_alert(db_session)
    response = await client.get(
        "/api/v1/export/alerts?format=json", headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_audit_logs_csv(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    await _seed_audit_log(db_session)
    response = await client.get(
        "/api/v1/export/audit-logs?format=csv", headers=admin_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]


@pytest.mark.asyncio
async def test_export_audit_logs_json(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    await _seed_audit_log(db_session)
    response = await client.get(
        "/api/v1/export/audit-logs?format=json", headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_export_audit_logs_operator_forbidden(
    client: AsyncClient, operator_headers: dict
):
    """Operators cannot export audit logs (admin/auditor only)."""
    response = await client.get(
        "/api/v1/export/audit-logs", headers=operator_headers
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Date range filtering
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_devices_date_filter(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    """Date range parameters are accepted without error."""
    await _seed_device(db_session, hostname=f"EXPD-{uuid.uuid4().hex[:6]}")
    response = await client.get(
        "/api/v1/export/devices?format=json"
        "&date_from=2020-01-01T00:00:00"
        "&date_to=2099-12-31T23:59:59",
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
