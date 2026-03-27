"""Tests for dashboard statistics and alerts endpoints.

Covers:
  - GET /api/v1/dashboard/stats  (empty DB, populated DB)
  - GET /api/v1/dashboard/alerts (empty, populated)
  - Authentication requirement for both endpoints
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device, DeviceStatus
from app.models.license import LicenseType, SoftwareLicense
from app.models.procurement import (
    ProcurementCategory,
    ProcurementRequest,
    ProcurementStatus,
)
from app.models.security_status import SecurityStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _seed_dashboard_data(db: AsyncSession, requester_id: uuid.UUID) -> None:
    """Insert devices, licenses, procurements, and security statuses for tests."""
    now = datetime.now(timezone.utc)

    # 3 devices -- 2 active/online, 1 inactive
    dev1 = Device(
        id=uuid.uuid4(),
        hostname=f"DASH-PC-{uuid.uuid4().hex[:6]}",
        os_version="Windows 11",
        status=DeviceStatus.active,
        last_seen=now - timedelta(minutes=5),
    )
    dev2 = Device(
        id=uuid.uuid4(),
        hostname=f"DASH-PC-{uuid.uuid4().hex[:6]}",
        os_version="Windows 11",
        status=DeviceStatus.active,
        last_seen=now - timedelta(minutes=10),
    )
    dev3 = Device(
        id=uuid.uuid4(),
        hostname=f"DASH-PC-{uuid.uuid4().hex[:6]}",
        os_version="Windows 10",
        status=DeviceStatus.inactive,
        last_seen=now - timedelta(hours=2),
    )
    db.add_all([dev1, dev2, dev3])
    await db.flush()

    # 2 licenses -- 1 compliant, 1 over-deployed
    lic1 = SoftwareLicense(
        id=uuid.uuid4(),
        software_name="Microsoft 365 E3",
        vendor="Microsoft",
        license_type=LicenseType.subscription,
        purchased_count=100,
        installed_count=80,
        m365_assigned=0,
        currency="JPY",
    )
    lic2 = SoftwareLicense(
        id=uuid.uuid4(),
        software_name="Adobe CC",
        vendor="Adobe",
        license_type=LicenseType.subscription,
        purchased_count=10,
        installed_count=15,  # over-deployed
        m365_assigned=0,
        currency="JPY",
    )
    db.add_all([lic1, lic2])
    await db.flush()

    # Procurement -- 1 draft
    proc = ProcurementRequest(
        id=uuid.uuid4(),
        request_number=f"PR-DASH-{uuid.uuid4().hex[:6]}",
        item_name="Dell Laptop",
        category=ProcurementCategory.hardware,
        quantity=1,
        unit_price=150000,
        total_price=150000,
        requester_id=requester_id,
        department="IT",
        purpose="Replacement",
        status=ProcurementStatus.draft,
    )
    db.add(proc)
    await db.flush()

    # Security statuses -- dev1 Defender off, dev2 pending patches
    sec1 = SecurityStatus(
        device_id=dev1.id,
        defender_on=False,
        bitlocker_on=True,
        pending_patches=0,
        checked_at=now,
    )
    sec2 = SecurityStatus(
        device_id=dev2.id,
        defender_on=True,
        bitlocker_on=False,
        pending_patches=3,
        checked_at=now,
    )
    db.add_all([sec1, sec2])
    await db.flush()


# ---------------------------------------------------------------------------
# Tests: Dashboard stats
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dashboard_stats_empty_db(client: AsyncClient, auth_headers: dict):
    """Stats on an empty (test-clean) DB return zero-ish defaults."""
    response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_devices" in data
    assert "online_devices" in data
    assert "total_licenses" in data
    assert "compliance_rate" in data
    assert "pending_procurements" in data
    assert "active_alerts" in data


@pytest.mark.asyncio
async def test_dashboard_stats_with_data(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user,
):
    """Stats reflect seeded data correctly."""
    await _seed_dashboard_data(db_session, test_user.id)

    response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # At least the seeded devices/licenses are counted
    assert data["total_devices"] >= 3
    assert data["total_licenses"] >= 2
    # 1 draft procurement
    assert data["pending_procurements"] >= 1
    # Alerts from sec statuses (defender off + pending patches)
    assert data["active_alerts"] >= 1


# ---------------------------------------------------------------------------
# Tests: Dashboard alerts
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dashboard_alerts_empty(client: AsyncClient, auth_headers: dict):
    """Alerts on a DB with no security issues returns an empty list."""
    response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "total" in data
    assert isinstance(data["alerts"], list)


@pytest.mark.asyncio
async def test_dashboard_alerts_with_issues(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user,
):
    """Alerts are generated from security statuses with issues."""
    await _seed_dashboard_data(db_session, test_user.id)

    response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total"] >= 1
    alerts = data["alerts"]
    assert len(alerts) >= 1

    # Check alert structure
    alert = alerts[0]
    assert "id" in alert
    assert "severity" in alert
    assert "title" in alert
    assert "description" in alert
    assert "created_at" in alert


@pytest.mark.asyncio
async def test_dashboard_alerts_limit_param(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user,
):
    """The limit query parameter caps the number of alerts returned."""
    await _seed_dashboard_data(db_session, test_user.id)

    response = await client.get(
        "/api/v1/dashboard/alerts?limit=1", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["alerts"]) <= 1


# ---------------------------------------------------------------------------
# Tests: Authentication
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dashboard_stats_requires_auth(client: AsyncClient):
    """GET /dashboard/stats without auth returns 401."""
    response = await client.get("/api/v1/dashboard/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_alerts_requires_auth(client: AsyncClient):
    """GET /dashboard/alerts without auth returns 401."""
    response = await client.get("/api/v1/dashboard/alerts")
    assert response.status_code == 401
