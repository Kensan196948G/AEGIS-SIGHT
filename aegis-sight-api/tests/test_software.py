"""Tests for software inventory API endpoints."""

import uuid
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.software_inventory import SoftwareInventory
from tests.factories import DeviceFactory


@pytest.fixture
async def device_with_software(db_session: AsyncSession):
    """Create a device with sample software inventory."""
    device = DeviceFactory()
    db_session.add(device)
    await db_session.flush()
    await db_session.refresh(device)

    sw1 = SoftwareInventory(
        device_id=device.id,
        software_name="Microsoft Office 365",
        version="16.0.17328",
        publisher="Microsoft Corporation",
        install_date=date(2026, 1, 15),
    )
    sw2 = SoftwareInventory(
        device_id=device.id,
        software_name="Google Chrome",
        version="123.0.6312.86",
        publisher="Google LLC",
        install_date=date(2026, 2, 1),
    )
    db_session.add_all([sw1, sw2])
    await db_session.flush()
    return device


# ---------- Authentication ----------


@pytest.mark.asyncio
async def test_software_list_unauthorized(client: AsyncClient):
    """Software list endpoint requires authentication."""
    response = await client.get("/api/v1/software")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_device_software_unauthorized(client: AsyncClient):
    """Device software endpoint requires authentication."""
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/v1/software/devices/{fake_id}")
    assert response.status_code == 401


# ---------- Aggregated Software List ----------


@pytest.mark.asyncio
async def test_list_software_empty(client: AsyncClient, auth_headers: dict):
    """Software list returns empty paginated result when no data."""
    response = await client.get("/api/v1/software", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_software_with_data(
    client: AsyncClient, auth_headers: dict, device_with_software: Device
):
    """Software list returns aggregated data."""
    response = await client.get("/api/v1/software", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    names = [item["software_name"] for item in data["items"]]
    assert "Google Chrome" in names
    assert "Microsoft Office 365" in names


@pytest.mark.asyncio
async def test_list_software_search(
    client: AsyncClient, auth_headers: dict, device_with_software: Device
):
    """Software list supports search filter."""
    response = await client.get(
        "/api/v1/software?search=Chrome", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all("Chrome" in item["software_name"] for item in data["items"])


# ---------- Device Software ----------


@pytest.mark.asyncio
async def test_device_software_with_data(
    client: AsyncClient, auth_headers: dict, device_with_software: Device
):
    """Device software endpoint returns installed software."""
    response = await client.get(
        f"/api/v1/software/devices/{device_with_software.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_device_software_empty(
    client: AsyncClient, auth_headers: dict
):
    """Device software returns empty for non-existent device."""
    fake_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/software/devices/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
