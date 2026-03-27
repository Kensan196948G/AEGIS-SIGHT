import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device, DeviceStatus
from app.models.patch import (
    DevicePatchStatus,
    PatchStatus,
    UpdateSeverity,
    Vulnerability,
    VulnerabilitySeverity,
    WindowsUpdate,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_device(db: AsyncSession, hostname: str = "PC-TEST-001") -> Device:
    """Insert a test device."""
    device = Device(hostname=hostname, status=DeviceStatus.active)
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


async def _create_update(
    db: AsyncSession,
    kb_number: str = "KB5034763",
    severity: UpdateSeverity = UpdateSeverity.critical,
    title: str = "Cumulative Update for Windows 11",
) -> WindowsUpdate:
    """Insert a test Windows Update."""
    update = WindowsUpdate(
        kb_number=kb_number,
        title=title,
        severity=severity,
        release_date=datetime(2026, 3, 1, tzinfo=timezone.utc),
    )
    db.add(update)
    await db.flush()
    await db.refresh(update)
    return update


async def _create_vulnerability(
    db: AsyncSession,
    cve_id: str = "CVE-2024-21338",
    severity: VulnerabilitySeverity = VulnerabilitySeverity.critical,
    cvss_score: Decimal = Decimal("9.8"),
) -> Vulnerability:
    """Insert a test vulnerability."""
    vuln = Vulnerability(
        cve_id=cve_id,
        title="Windows Kernel Elevation of Privilege",
        severity=severity,
        cvss_score=cvss_score,
        published_at=datetime(2024, 2, 13, tzinfo=timezone.utc),
    )
    db.add(vuln)
    await db.flush()
    await db.refresh(vuln)
    return vuln


# ---------------------------------------------------------------------------
# Windows Update CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_updates_unauthorized(client: AsyncClient):
    """Listing updates requires authentication."""
    response = await client.get("/api/v1/patches/updates")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_update(client: AsyncClient, auth_headers: dict):
    """Create a new Windows Update."""
    payload = {
        "kb_number": "KB5034999",
        "title": "Security Update for Windows 11",
        "severity": "critical",
        "release_date": "2026-03-15T00:00:00Z",
        "description": "Addresses multiple security vulnerabilities.",
    }
    response = await client.post("/api/v1/patches/updates", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["kb_number"] == "KB5034999"
    assert data["severity"] == "critical"


@pytest.mark.asyncio
async def test_create_duplicate_update(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Duplicate KB number should return 400."""
    await _create_update(db_session, kb_number="KB5034001")
    payload = {
        "kb_number": "KB5034001",
        "title": "Duplicate",
        "severity": "low",
        "release_date": "2026-03-15T00:00:00Z",
    }
    response = await client.post("/api/v1/patches/updates", json=payload, headers=auth_headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_updates(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """List updates returns paginated results."""
    await _create_update(db_session, kb_number="KB5034100")
    await _create_update(db_session, kb_number="KB5034101", severity=UpdateSeverity.low)

    response = await client.get("/api/v1/patches/updates", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_list_updates_filter_severity(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter updates by severity."""
    await _create_update(db_session, kb_number="KB5034200", severity=UpdateSeverity.critical)
    await _create_update(db_session, kb_number="KB5034201", severity=UpdateSeverity.low)

    response = await client.get(
        "/api/v1/patches/updates?severity=critical", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["severity"] == "critical"


# ---------------------------------------------------------------------------
# Device Patch Status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_report_device_patch_status(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Report patch status for a device."""
    device = await _create_device(db_session)
    update = await _create_update(db_session, kb_number="KB5034300")

    payload = {
        "device_id": str(device.id),
        "update_id": str(update.id),
        "status": "installed",
        "installed_at": "2026-03-20T10:00:00Z",
    }
    response = await client.post(
        "/api/v1/patches/device-status", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "installed"
    assert data["device_id"] == str(device.id)


@pytest.mark.asyncio
async def test_device_patch_status_upsert(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Reporting the same device+update again should update, not duplicate."""
    device = await _create_device(db_session, hostname="PC-UPSERT-001")
    update = await _create_update(db_session, kb_number="KB5034400")

    payload = {
        "device_id": str(device.id),
        "update_id": str(update.id),
        "status": "not_installed",
    }
    r1 = await client.post("/api/v1/patches/device-status", json=payload, headers=auth_headers)
    assert r1.status_code == 201
    record_id = r1.json()["id"]

    # Update status to installed
    payload["status"] = "installed"
    payload["installed_at"] = "2026-03-20T10:00:00Z"
    r2 = await client.post("/api/v1/patches/device-status", json=payload, headers=auth_headers)
    assert r2.status_code == 201
    assert r2.json()["id"] == record_id
    assert r2.json()["status"] == "installed"


# ---------------------------------------------------------------------------
# Compliance
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_compliance_empty(client: AsyncClient, auth_headers: dict):
    """Compliance on empty database."""
    response = await client.get("/api/v1/patches/compliance", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_devices" in data
    assert "compliance_rate" in data


@pytest.mark.asyncio
async def test_patch_compliance_with_data(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Compliance with some patch data."""
    device = await _create_device(db_session, hostname="PC-COMP-001")
    update = await _create_update(db_session, kb_number="KB5034500")

    # Mark as not installed
    dps = DevicePatchStatus(
        device_id=device.id,
        update_id=update.id,
        status=PatchStatus.not_installed,
    )
    db_session.add(dps)
    await db_session.flush()

    response = await client.get("/api/v1/patches/compliance", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_devices"] >= 1
    assert data["critical_missing"] >= 1


# ---------------------------------------------------------------------------
# Device-specific patch view
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_device_patches(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Get patch status for a specific device."""
    device = await _create_device(db_session, hostname="PC-DEVP-001")
    update = await _create_update(db_session, kb_number="KB5034600")
    dps = DevicePatchStatus(
        device_id=device.id,
        update_id=update.id,
        status=PatchStatus.installed,
    )
    db_session.add(dps)
    await db_session.flush()

    response = await client.get(
        f"/api/v1/patches/devices/{device.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["items"][0]["kb_number"] == "KB5034600"


@pytest.mark.asyncio
async def test_device_patches_not_found(client: AsyncClient, auth_headers: dict):
    """Non-existent device returns 404."""
    response = await client.get(
        "/api/v1/patches/devices/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Missing Patches
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_patches(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """List missing patches across devices."""
    device = await _create_device(db_session, hostname="PC-MISS-001")
    update = await _create_update(db_session, kb_number="KB5034700")
    dps = DevicePatchStatus(
        device_id=device.id,
        update_id=update.id,
        status=PatchStatus.not_installed,
    )
    db_session.add(dps)
    await db_session.flush()

    response = await client.get("/api/v1/patches/missing", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["missing_device_count"] >= 1


# ---------------------------------------------------------------------------
# Vulnerabilities
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_vulnerabilities_unauthorized(client: AsyncClient):
    """Listing vulnerabilities requires authentication."""
    response = await client.get("/api/v1/patches/vulnerabilities")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_vulnerability(client: AsyncClient, auth_headers: dict):
    """Create a new vulnerability."""
    payload = {
        "cve_id": "CVE-2024-99999",
        "title": "Test Vulnerability",
        "severity": "high",
        "cvss_score": 8.5,
        "published_at": "2024-03-01T00:00:00Z",
        "remediation": "Apply KB5034763",
    }
    response = await client.post(
        "/api/v1/patches/vulnerabilities", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["cve_id"] == "CVE-2024-99999"
    assert data["is_resolved"] is False


@pytest.mark.asyncio
async def test_create_duplicate_vulnerability(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Duplicate CVE ID should return 400."""
    await _create_vulnerability(db_session, cve_id="CVE-2024-88888")
    payload = {
        "cve_id": "CVE-2024-88888",
        "title": "Duplicate",
        "severity": "low",
        "cvss_score": 2.0,
        "published_at": "2024-03-01T00:00:00Z",
    }
    response = await client.post(
        "/api/v1/patches/vulnerabilities", json=payload, headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_vulnerabilities(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """List vulnerabilities returns paginated results."""
    await _create_vulnerability(db_session, cve_id="CVE-2024-10001")
    await _create_vulnerability(
        db_session,
        cve_id="CVE-2024-10002",
        severity=VulnerabilitySeverity.low,
        cvss_score=Decimal("3.1"),
    )

    response = await client.get("/api/v1/patches/vulnerabilities", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_list_vulnerabilities_filter_resolved(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter vulnerabilities by resolved status."""
    vuln = await _create_vulnerability(db_session, cve_id="CVE-2024-10003")
    vuln.is_resolved = True
    await db_session.flush()

    response = await client.get(
        "/api/v1/patches/vulnerabilities?is_resolved=true", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["is_resolved"] is True


@pytest.mark.asyncio
async def test_resolve_vulnerability(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Mark a vulnerability as resolved."""
    vuln = await _create_vulnerability(db_session, cve_id="CVE-2024-10004")
    response = await client.patch(
        f"/api/v1/patches/vulnerabilities/{vuln.id}/resolve",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_resolved"] is True
    assert data["resolved_at"] is not None


@pytest.mark.asyncio
async def test_resolve_already_resolved(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Resolving an already resolved vulnerability returns 400."""
    vuln = await _create_vulnerability(db_session, cve_id="CVE-2024-10005")
    await client.patch(
        f"/api/v1/patches/vulnerabilities/{vuln.id}/resolve",
        headers=auth_headers,
    )
    response = await client.patch(
        f"/api/v1/patches/vulnerabilities/{vuln.id}/resolve",
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_resolve_vulnerability_not_found(client: AsyncClient, auth_headers: dict):
    """Resolving a non-existent vulnerability returns 404."""
    response = await client.patch(
        "/api/v1/patches/vulnerabilities/00000000-0000-0000-0000-000000000000/resolve",
        headers=auth_headers,
    )
    assert response.status_code == 404
