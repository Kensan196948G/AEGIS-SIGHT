"""Tests for the telemetry data ingestion endpoint.

Covers:
  - Normal telemetry submission
  - Device UPSERT (create + update)
  - Hardware snapshot persistence
  - Security status persistence
  - Validation errors for malformed payloads
  - Unauthenticated access (telemetry endpoint has no auth guard,
    but we verify the route exists and responds)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.hardware_snapshot import HardwareSnapshot
from app.models.security_status import SecurityStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_telemetry_payload(
    hostname: str = "TELEM-PC-001",
    *,
    include_hardware: bool = True,
    include_security: bool = True,
    include_software: bool = False,
) -> dict:
    """Build a valid TelemetryPayload dict."""
    payload: dict = {
        "device_info": {
            "hostname": hostname,
            "os_version": "Windows 11 Pro 23H2",
            "ip_address": "10.0.1.100",
            "mac_address": "AA:BB:CC:DD:EE:01",
            "domain": "aegis.local",
        },
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    if include_hardware:
        payload["hardware"] = {
            "cpu_model": "Intel Core i7-13700",
            "memory_gb": 32.0,
            "disk_total_gb": 512.0,
            "disk_free_gb": 200.0,
            "serial_number": "SN-TEST-001",
        }
    if include_security:
        payload["security"] = {
            "defender_on": True,
            "bitlocker_on": True,
            "pattern_date": "2026-03-25",
            "pending_patches": 2,
        }
    if include_software:
        payload["software_inventory"] = [
            {
                "name": "Google Chrome",
                "version": "123.0.6312.86",
                "publisher": "Google LLC",
                "install_date": "2026-01-15",
            },
            {
                "name": "Visual Studio Code",
                "version": "1.88.0",
                "publisher": "Microsoft",
            },
        ]
    return payload


# ---------------------------------------------------------------------------
# Test: Normal telemetry submission
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_telemetry_accepted(client: AsyncClient):
    """A well-formed telemetry payload is accepted and returns status='accepted'."""
    payload = _build_telemetry_payload(hostname=f"TELEM-OK-{uuid.uuid4().hex[:6]}")
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"
    assert data["hostname"] == payload["device_info"]["hostname"]
    assert data["snapshots_saved"] == 2  # hardware + security


@pytest.mark.asyncio
async def test_telemetry_with_software_inventory(client: AsyncClient):
    """Software inventory items are counted in snapshots_saved."""
    hostname = f"TELEM-SW-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(
        hostname=hostname,
        include_hardware=True,
        include_security=True,
        include_software=True,
    )
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
    data = response.json()
    # hw(1) + security(1) + software(2)
    assert data["snapshots_saved"] == 4


@pytest.mark.asyncio
async def test_telemetry_minimal_payload(client: AsyncClient):
    """Submitting only device_info + collected_at (no hw/sec) succeeds."""
    hostname = f"TELEM-MIN-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(
        hostname=hostname,
        include_hardware=False,
        include_security=False,
    )
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"
    assert data["snapshots_saved"] == 0


# ---------------------------------------------------------------------------
# Test: Device UPSERT
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_device_upsert_creates_new(client: AsyncClient, db_session: AsyncSession):
    """First telemetry from a hostname creates a new Device record."""
    hostname = f"TELEM-NEW-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(hostname=hostname)
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200

    result = await db_session.execute(
        select(Device).where(Device.hostname == hostname)
    )
    device = result.scalar_one_or_none()
    assert device is not None
    assert device.hostname == hostname
    assert device.os_version == "Windows 11 Pro 23H2"


@pytest.mark.asyncio
async def test_device_upsert_updates_existing(client: AsyncClient, db_session: AsyncSession):
    """Second telemetry from the same hostname updates the existing Device."""
    hostname = f"TELEM-UPD-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(hostname=hostname)

    # First call -- creates
    resp1 = await client.post("/api/v1/telemetry", json=payload)
    assert resp1.status_code == 200
    device_id = resp1.json()["device_id"]

    # Second call with updated OS
    payload["device_info"]["os_version"] = "Windows 11 Pro 24H2"
    resp2 = await client.post("/api/v1/telemetry", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["device_id"] == device_id  # same device

    result = await db_session.execute(
        select(Device).where(Device.hostname == hostname)
    )
    device = result.scalar_one_or_none()
    assert device is not None
    assert device.os_version == "Windows 11 Pro 24H2"


# ---------------------------------------------------------------------------
# Test: Hardware snapshot saved
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_hardware_snapshot_saved(client: AsyncClient, db_session: AsyncSession):
    """Hardware data in the payload is persisted as a HardwareSnapshot."""
    hostname = f"TELEM-HW-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(
        hostname=hostname, include_hardware=True, include_security=False
    )
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
    device_id = uuid.UUID(response.json()["device_id"])

    result = await db_session.execute(
        select(HardwareSnapshot).where(HardwareSnapshot.device_id == device_id)
    )
    snapshots = result.scalars().all()
    assert len(snapshots) >= 1
    hw = snapshots[0]
    assert hw.cpu_model == "Intel Core i7-13700"
    assert float(hw.memory_gb) == pytest.approx(32.0)


# ---------------------------------------------------------------------------
# Test: Security status saved
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_security_status_saved(client: AsyncClient, db_session: AsyncSession):
    """Security data in the payload is persisted as a SecurityStatus."""
    hostname = f"TELEM-SEC-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(
        hostname=hostname, include_hardware=False, include_security=True
    )
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
    device_id = uuid.UUID(response.json()["device_id"])

    result = await db_session.execute(
        select(SecurityStatus).where(SecurityStatus.device_id == device_id)
    )
    statuses = result.scalars().all()
    assert len(statuses) >= 1
    sec = statuses[0]
    assert sec.defender_on is True
    assert sec.bitlocker_on is True
    assert sec.pending_patches == 2


# ---------------------------------------------------------------------------
# Test: Validation errors
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_telemetry_missing_hostname(client: AsyncClient):
    """Hostname is required; omitting it returns 422."""
    payload = {
        "device_info": {
            "os_version": "Windows 11",
        },
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_telemetry_empty_hostname(client: AsyncClient):
    """An empty hostname string fails validation (min_length=1)."""
    payload = {
        "device_info": {
            "hostname": "",
            "os_version": "Windows 11",
        },
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_telemetry_invalid_mac_address(client: AsyncClient):
    """An invalid MAC address format fails validation."""
    payload = {
        "device_info": {
            "hostname": "BAD-MAC-PC",
            "mac_address": "not-a-mac",
        },
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_telemetry_missing_collected_at(client: AsyncClient):
    """collected_at is required; omitting it returns 422."""
    payload = {
        "device_info": {
            "hostname": "NO-TS-PC",
        },
    }
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_telemetry_negative_memory(client: AsyncClient):
    """Negative memory_gb fails validation (ge=0)."""
    payload = {
        "device_info": {"hostname": "NEG-MEM-PC"},
        "hardware": {"memory_gb": -1.0},
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test: Telemetry endpoint has no auth guard
# (unlike dashboard/security endpoints)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_telemetry_no_auth_required(client: AsyncClient):
    """The telemetry endpoint does NOT require authentication."""
    hostname = f"TELEM-NOAUTH-{uuid.uuid4().hex[:6]}"
    payload = _build_telemetry_payload(hostname=hostname)
    # No auth headers -- should still succeed
    response = await client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
