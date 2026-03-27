import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.network_device import NetworkDevice, NetworkDeviceType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _seed_network_device(
    session: AsyncSession,
    mac: str = "AA:BB:CC:DD:EE:01",
    ip: str = "192.168.1.10",
    managed: bool = False,
) -> NetworkDevice:
    nd = NetworkDevice(
        ip_address=ip,
        mac_address=mac,
        hostname="test-host",
        device_type=NetworkDeviceType.pc,
        is_managed=managed,
    )
    session.add(nd)
    await session.flush()
    await session.refresh(nd)
    return nd


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_network_devices_unauthorized(client: AsyncClient):
    """Listing network devices requires authentication."""
    response = await client.get("/api/v1/network/devices")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_network_devices(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Authenticated user can list discovered network devices."""
    await _seed_network_device(db_session)
    response = await client.get("/api/v1/network/devices", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_unmanaged_devices(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Unmanaged endpoint only returns devices where is_managed is false."""
    await _seed_network_device(db_session, mac="AA:BB:CC:DD:EE:02", managed=False)
    await _seed_network_device(db_session, mac="AA:BB:CC:DD:EE:03", managed=True)

    response = await client.get("/api/v1/network/unmanaged", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["is_managed"] is False


@pytest.mark.asyncio
async def test_register_scan_creates_devices(client: AsyncClient, auth_headers: dict):
    """POST /network/scan creates new device records."""
    payload = {
        "devices": [
            {
                "ip_address": "10.0.0.1",
                "mac_address": "11:22:33:44:55:01",
                "hostname": "switch-01",
                "device_type": "switch",
            },
            {
                "ip_address": "10.0.0.2",
                "mac_address": "11:22:33:44:55:02",
                "device_type": "unknown",
            },
        ]
    }
    response = await client.post(
        "/api/v1/network/scan", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["created"] == 2
    assert data["updated"] == 0


@pytest.mark.asyncio
async def test_register_scan_updates_existing(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """POST /network/scan updates existing devices matched by MAC."""
    await _seed_network_device(db_session, mac="11:22:33:44:55:99", ip="10.0.0.50")
    payload = {
        "devices": [
            {
                "ip_address": "10.0.0.51",
                "mac_address": "11:22:33:44:55:99",
                "hostname": "updated-host",
                "device_type": "server",
            }
        ]
    }
    response = await client.post(
        "/api/v1/network/scan", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["created"] == 0
    assert data["updated"] == 1


@pytest.mark.asyncio
async def test_link_device(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device: Device
):
    """PATCH link associates a network device with a managed device."""
    nd = await _seed_network_device(db_session, mac="AA:BB:CC:DD:EE:10")

    response = await client.patch(
        f"/api/v1/network/devices/{nd.id}/link",
        json={"device_id": str(sample_device.id)},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_managed"] is True
    assert data["device_id"] == str(sample_device.id)


@pytest.mark.asyncio
async def test_link_device_not_found(client: AsyncClient, auth_headers: dict):
    """Linking a non-existent network device returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.patch(
        f"/api/v1/network/devices/{fake_id}/link",
        json={"device_id": str(uuid.uuid4())},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_link_to_nonexistent_managed_device(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Linking to a non-existent managed device returns 404."""
    nd = await _seed_network_device(db_session, mac="AA:BB:CC:DD:EE:11")
    response = await client.patch(
        f"/api/v1/network/devices/{nd.id}/link",
        json={"device_id": str(uuid.uuid4())},
        headers=auth_headers,
    )
    assert response.status_code == 404
