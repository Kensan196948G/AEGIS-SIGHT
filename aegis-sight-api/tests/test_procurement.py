import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_procurement_unauthorized(client: AsyncClient):
    """Test that listing procurement requests requires authentication."""
    response = await client.get("/api/v1/procurement")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_procurement(client: AsyncClient, auth_headers: dict):
    """Test listing procurement requests with authentication."""
    response = await client.get("/api/v1/procurement", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_procurement_request(client: AsyncClient, auth_headers: dict):
    """Test creating a new procurement request."""
    payload = {
        "item_name": "Dell Latitude 5540",
        "category": "hardware",
        "quantity": 5,
        "unit_price": "185000.00",
        "department": "Engineering",
        "purpose": "Developer laptop refresh Q1 2026",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["item_name"] == "Dell Latitude 5540"
    assert data["status"] == "draft"
    assert data["request_number"].startswith("PRQ-")


@pytest.mark.asyncio
async def test_procurement_workflow(client: AsyncClient, auth_headers: dict):
    """Test the procurement lifecycle: create -> submit -> approve."""
    # Create
    payload = {
        "item_name": "Adobe Creative Cloud",
        "category": "software",
        "quantity": 10,
        "unit_price": "72000.00",
        "department": "Design",
        "purpose": "Annual license renewal",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    request_id = response.json()["id"]

    # Submit
    response = await client.post(
        f"/api/v1/procurement/{request_id}/submit", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"

    # Approve
    response = await client.post(
        f"/api/v1/procurement/{request_id}/approve", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"
