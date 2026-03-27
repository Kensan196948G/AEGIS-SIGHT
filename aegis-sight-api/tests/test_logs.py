"""Tests for log management API endpoints."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.log_event import FileAction, FileEvent, LogonEvent, UsbAction, UsbEvent
from tests.factories import DeviceFactory


@pytest.fixture
async def device_with_logs(db_session: AsyncSession):
    """Create a device with sample log events."""
    device = DeviceFactory()
    db_session.add(device)
    await db_session.flush()
    await db_session.refresh(device)

    logon = LogonEvent(
        device_id=device.id,
        user_name="admin",
        event_id=4624,
        logon_type=10,
        source_ip="192.168.1.100",
    )
    usb = UsbEvent(
        device_id=device.id,
        device_name="SanDisk Ultra USB 3.0",
        vendor_id="0781",
        product_id="5583",
        serial_number="ABC123",
        action=UsbAction.connected,
    )
    file_evt = FileEvent(
        device_id=device.id,
        user_name="admin",
        file_path="C:\\Users\\admin\\secret.docx",
        action=FileAction.read,
    )
    db_session.add_all([logon, usb, file_evt])
    await db_session.flush()
    return device


# ---------- Authentication ----------


@pytest.mark.asyncio
async def test_logon_events_unauthorized(client: AsyncClient):
    """Logon events endpoint requires authentication."""
    response = await client.get("/api/v1/logs/logon")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_usb_events_unauthorized(client: AsyncClient):
    """USB events endpoint requires authentication."""
    response = await client.get("/api/v1/logs/usb")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_file_events_unauthorized(client: AsyncClient):
    """File events endpoint requires authentication."""
    response = await client.get("/api/v1/logs/files")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_summary_unauthorized(client: AsyncClient):
    """Summary endpoint requires authentication."""
    response = await client.get("/api/v1/logs/summary")
    assert response.status_code == 401


# ---------- Logon Events ----------


@pytest.mark.asyncio
async def test_list_logon_events_empty(client: AsyncClient, auth_headers: dict):
    """List logon events returns empty paginated result when no data."""
    response = await client.get("/api/v1/logs/logon", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_logon_events_with_data(
    client: AsyncClient, auth_headers: dict, device_with_logs: Device
):
    """List logon events returns data after insertion."""
    response = await client.get("/api/v1/logs/logon", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    item = data["items"][0]
    assert item["event_id"] == 4624
    assert item["user_name"] == "admin"


@pytest.mark.asyncio
async def test_list_logon_events_filter_by_device(
    client: AsyncClient, auth_headers: dict, device_with_logs: Device
):
    """Filter logon events by device_id."""
    response = await client.get(
        f"/api/v1/logs/logon?device_id={device_with_logs.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    # Non-existent device returns zero results
    fake_id = uuid.uuid4()
    response2 = await client.get(
        f"/api/v1/logs/logon?device_id={fake_id}",
        headers=auth_headers,
    )
    assert response2.status_code == 200
    assert response2.json()["total"] == 0


# ---------- USB Events ----------


@pytest.mark.asyncio
async def test_list_usb_events_with_data(
    client: AsyncClient, auth_headers: dict, device_with_logs: Device
):
    """List USB events returns data after insertion."""
    response = await client.get("/api/v1/logs/usb", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    item = data["items"][0]
    assert item["device_name"] == "SanDisk Ultra USB 3.0"
    assert item["action"] == "connected"


# ---------- File Events ----------


@pytest.mark.asyncio
async def test_list_file_events_with_data(
    client: AsyncClient, auth_headers: dict, device_with_logs: Device
):
    """List file events returns data after insertion."""
    response = await client.get("/api/v1/logs/files", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    item = data["items"][0]
    assert item["action"] == "read"


# ---------- Summary ----------


@pytest.mark.asyncio
async def test_log_summary(
    client: AsyncClient, auth_headers: dict, device_with_logs: Device
):
    """Summary endpoint returns aggregate counts."""
    response = await client.get("/api/v1/logs/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_logon_events" in data
    assert "total_usb_events" in data
    assert "total_file_events" in data
    assert "unique_users" in data
    assert "unique_devices" in data
    assert data["total_logon_events"] >= 1
    assert data["total_usb_events"] >= 1
    assert data["total_file_events"] >= 1
