import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_licenses_unauthorized(client: AsyncClient):
    """Test that listing licenses requires authentication."""
    response = await client.get("/api/v1/sam/licenses")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_licenses(client: AsyncClient, auth_headers: dict):
    """Test listing licenses with authentication."""
    response = await client.get("/api/v1/sam/licenses", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_license(client: AsyncClient, auth_headers: dict):
    """Test creating a new software license."""
    payload = {
        "software_name": "Microsoft Office 365",
        "vendor": "Microsoft",
        "license_type": "subscription",
        "purchased_count": 100,
        "installed_count": 85,
        "m365_assigned": 90,
        "cost_per_unit": "1500.00",
        "currency": "JPY",
    }
    response = await client.post(
        "/api/v1/sam/licenses", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["software_name"] == "Microsoft Office 365"
    assert data["purchased_count"] == 100


@pytest.mark.asyncio
async def test_compliance_check(client: AsyncClient, auth_headers: dict):
    """Test running a compliance check."""
    response = await client.post(
        "/api/v1/sam/compliance/check", headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_compliance(client: AsyncClient, auth_headers: dict):
    """Test getting compliance status."""
    response = await client.get(
        "/api/v1/sam/compliance", headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
