"""Tests for security monitoring endpoints.

Covers:
  - GET /api/v1/security/overview  (Defender/BitLocker/Patch summaries)
  - GET /api/v1/security/devices/{device_id}
  - 404 for non-existent device
  - Authentication requirement
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device, DeviceStatus
from app.models.security_status import SecurityStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _seed_security_data(db: AsyncSession) -> dict[str, uuid.UUID]:
    """Insert devices with security statuses. Returns dict of device UUIDs."""
    now = datetime.now(timezone.utc)

    dev1_id = uuid.uuid4()
    dev2_id = uuid.uuid4()
    dev3_id = uuid.uuid4()

    dev1 = Device(
        id=dev1_id,
        hostname=f"SEC-PC-{uuid.uuid4().hex[:6]}",
        os_version="Windows 11 Pro 23H2",
        status=DeviceStatus.active,
        last_seen=now,
    )
    dev2 = Device(
        id=dev2_id,
        hostname=f"SEC-PC-{uuid.uuid4().hex[:6]}",
        os_version="Windows 11 Pro 23H2",
        status=DeviceStatus.active,
        last_seen=now,
    )
    dev3 = Device(
        id=dev3_id,
        hostname=f"SEC-PC-{uuid.uuid4().hex[:6]}",
        os_version="Windows 10 Pro",
        status=DeviceStatus.active,
        last_seen=now,
    )
    db.add_all([dev1, dev2, dev3])
    await db.flush()

    # dev1: Defender ON, BitLocker ON, 0 patches
    sec1 = SecurityStatus(
        device_id=dev1_id,
        defender_on=True,
        bitlocker_on=True,
        pattern_date="2026-03-25",
        pending_patches=0,
        checked_at=now,
    )
    # dev2: Defender OFF, BitLocker ON, 5 patches
    sec2 = SecurityStatus(
        device_id=dev2_id,
        defender_on=False,
        bitlocker_on=True,
        pattern_date="2026-03-20",
        pending_patches=5,
        checked_at=now,
    )
    # dev3: Defender ON, BitLocker OFF, 2 patches
    sec3 = SecurityStatus(
        device_id=dev3_id,
        defender_on=True,
        bitlocker_on=False,
        pattern_date="2026-03-22",
        pending_patches=2,
        checked_at=now,
    )
    db.add_all([sec1, sec2, sec3])
    await db.flush()

    return {"dev1": dev1_id, "dev2": dev2_id, "dev3": dev3_id}


# ---------------------------------------------------------------------------
# Tests: Security overview
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_security_overview_empty(client: AsyncClient, auth_headers: dict):
    """Overview on an empty DB returns zero defaults."""
    response = await client.get("/api/v1/security/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_devices_with_status"] >= 0
    assert "defender" in data
    assert "bitlocker" in data
    assert "patches" in data


@pytest.mark.asyncio
async def test_security_overview_with_data(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Overview reflects seeded security data (Defender/BitLocker/Patches)."""
    ids = await _seed_security_data(db_session)

    response = await client.get("/api/v1/security/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_devices_with_status"] >= 3

    # Defender: 2 on, 1 off
    defender = data["defender"]
    assert defender["enabled_count"] >= 2
    assert defender["disabled_count"] >= 1
    assert 0 <= defender["enabled_percentage"] <= 100

    # BitLocker: 2 on, 1 off
    bitlocker = data["bitlocker"]
    assert bitlocker["enabled_count"] >= 2
    assert bitlocker["disabled_count"] >= 1

    # Patches: total >= 7, devices_with_pending >= 2
    patches = data["patches"]
    assert patches["total_pending"] >= 7
    assert patches["devices_with_pending"] >= 2
    assert patches["devices_fully_patched"] >= 1


# ---------------------------------------------------------------------------
# Tests: Device security detail
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_device_security_detail(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """GET /security/devices/{id} returns the latest security status."""
    ids = await _seed_security_data(db_session)
    dev2_id = ids["dev2"]

    response = await client.get(
        f"/api/v1/security/devices/{dev2_id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == str(dev2_id)
    assert data["defender_on"] is False
    assert data["bitlocker_on"] is True
    assert data["pending_patches"] == 5


@pytest.mark.asyncio
async def test_device_security_not_found(client: AsyncClient, auth_headers: dict):
    """Non-existent device returns 404."""
    fake_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/security/devices/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_device_security_no_status(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Device exists but has no security data returns 404."""
    dev = Device(
        id=uuid.uuid4(),
        hostname=f"SEC-NOSTAT-{uuid.uuid4().hex[:6]}",
        os_version="Windows 11",
        status=DeviceStatus.active,
        last_seen=datetime.now(timezone.utc),
    )
    db_session.add(dev)
    await db_session.flush()

    response = await client.get(
        f"/api/v1/security/devices/{dev.id}", headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tests: Authentication
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_security_overview_requires_auth(client: AsyncClient):
    """GET /security/overview without auth returns 401."""
    response = await client.get("/api/v1/security/overview")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_device_security_requires_auth(client: AsyncClient):
    """GET /security/devices/{id} without auth returns 401."""
    response = await client.get(
        f"/api/v1/security/devices/{uuid.uuid4()}"
    )
    assert response.status_code == 401
