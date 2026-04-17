"""Tests for the change tracking API endpoints."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.change_tracking import (
    ChangeType,
    ConfigChange,
    ConfigSnapshot,
    SnapshotType,
)
from app.models.device import Device, DeviceStatus

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_device(db: AsyncSession, hostname: str = "PC-CHG-001") -> Device:
    device = Device(hostname=hostname, status=DeviceStatus.active)
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


async def _create_snapshot(
    db: AsyncSession,
    device: Device,
    snapshot_type: SnapshotType = SnapshotType.hardware,
    data: dict | None = None,
    checksum: str = "abc123",
) -> ConfigSnapshot:
    snap = ConfigSnapshot(
        device_id=device.id,
        snapshot_type=snapshot_type,
        data=data or {"cpu": "i7", "memory_gb": 16},
        checksum=checksum,
        captured_at=datetime.now(UTC),
    )
    db.add(snap)
    await db.flush()
    await db.refresh(snap)
    return snap


async def _create_change(
    db: AsyncSession,
    device: Device,
    snap_before: ConfigSnapshot | None,
    snap_after: ConfigSnapshot,
    change_type: ChangeType = ChangeType.modified,
    field_path: str = "memory_gb",
) -> ConfigChange:
    change = ConfigChange(
        device_id=device.id,
        snapshot_before_id=snap_before.id if snap_before else None,
        snapshot_after_id=snap_after.id,
        change_type=change_type,
        field_path=field_path,
        old_value={"value": 16},
        new_value={"value": 32},
        detected_at=datetime.now(UTC),
    )
    db.add(change)
    await db.flush()
    await db.refresh(change)
    return change


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_changes_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/changes")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_summary_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/changes/summary")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /changes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_changes_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/changes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 0
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_changes_with_data(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-LIST")
    snap1 = await _create_snapshot(db_session, device, checksum="aaa")
    snap2 = await _create_snapshot(db_session, device, checksum="bbb")
    await _create_change(db_session, device, snap1, snap2)

    response = await client.get("/api/v1/changes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_changes_filter_device(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-FILTER")
    snap = await _create_snapshot(db_session, device, checksum="fff")
    await _create_change(db_session, device, None, snap, change_type=ChangeType.added)

    response = await client.get(
        f"/api/v1/changes?device_id={device.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["device_id"] == str(device.id) for item in data["items"])


@pytest.mark.asyncio
async def test_list_changes_filter_change_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-CTFILTER")
    snap = await _create_snapshot(db_session, device, checksum="ccc")
    await _create_change(db_session, device, None, snap, change_type=ChangeType.removed)

    response = await client.get(
        "/api/v1/changes?change_type=removed", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["change_type"] == "removed" for item in data["items"])


# ---------------------------------------------------------------------------
# GET /changes/summary
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_summary(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/changes/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_changes" in data
    assert "by_change_type" in data
    assert "by_snapshot_type" in data
    assert "daily" in data


# ---------------------------------------------------------------------------
# GET /changes/snapshots/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_snapshot(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-SNAP")
    snap = await _create_snapshot(db_session, device, checksum="ddd")

    response = await client.get(
        f"/api/v1/changes/snapshots/{snap.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(snap.id)
    assert data["checksum"] == "ddd"


@pytest.mark.asyncio
async def test_get_snapshot_not_found(client: AsyncClient, auth_headers: dict):
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/changes/snapshots/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /changes/diff/{id1}/{id2}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_diff_snapshots(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-DIFF")
    snap1 = await _create_snapshot(
        db_session, device, data={"cpu": "i7", "memory_gb": 16}, checksum="e1"
    )
    snap2 = await _create_snapshot(
        db_session, device, data={"cpu": "i7", "memory_gb": 32, "gpu": "RTX4090"}, checksum="e2"
    )

    response = await client.get(
        f"/api/v1/changes/diff/{snap1.id}/{snap2.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_changes"] == 2  # memory_gb modified + gpu added
    paths = {d["field_path"] for d in data["differences"]}
    assert "memory_gb" in paths
    assert "gpu" in paths


@pytest.mark.asyncio
async def test_diff_snapshot_not_found(client: AsyncClient, auth_headers: dict):
    fake1 = str(uuid.uuid4())
    fake2 = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/changes/diff/{fake1}/{fake2}", headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /changes/devices/{id}/timeline
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_device_timeline(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-TL")
    snap = await _create_snapshot(db_session, device, checksum="tl1")
    await _create_change(db_session, device, None, snap, change_type=ChangeType.added)

    response = await client.get(
        f"/api/v1/changes/devices/{device.id}/timeline", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ---------------------------------------------------------------------------
# POST /changes/snapshots
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_snapshot(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    device = await _create_device(db_session, "PC-CHG-CREATE")

    body = {
        "device_id": str(device.id),
        "snapshot_type": "hardware",
        "data": {"cpu": "i9", "memory_gb": 64},
    }
    response = await client.post(
        "/api/v1/changes/snapshots", json=body, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == str(device.id)
    assert data["snapshot_type"] == "hardware"
    assert data["data"]["cpu"] == "i9"
    assert len(data["checksum"]) == 64  # SHA-256 hex digest
