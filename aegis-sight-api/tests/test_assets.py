import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_assets_unauthorized(client: AsyncClient):
    """Test that listing assets requires authentication."""
    response = await client.get("/api/v1/assets")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_assets(client: AsyncClient, auth_headers: dict):
    """Test listing assets with authentication."""
    response = await client.get("/api/v1/assets", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_asset(client: AsyncClient, auth_headers: dict):
    """Test creating a new device asset."""
    payload = {
        "hostname": "test-pc-001",
        "os_version": "Windows 11 Pro 23H2",
        "ip_address": "192.168.1.100",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "domain": "aegis.local",
    }
    response = await client.post(
        "/api/v1/assets", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["hostname"] == "test-pc-001"
    assert data["os_version"] == "Windows 11 Pro 23H2"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_asset_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent asset returns 404."""
    response = await client.get(
        "/api/v1/assets/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_duplicate_hostname(client: AsyncClient, auth_headers: dict):
    """Test that duplicate hostnames are rejected."""
    payload = {
        "hostname": "duplicate-pc-001",
        "os_version": "Windows 11",
    }
    await client.post("/api/v1/assets", json=payload, headers=auth_headers)
    response = await client.post(
        "/api/v1/assets", json=payload, headers=auth_headers
    )
    assert response.status_code == 409
