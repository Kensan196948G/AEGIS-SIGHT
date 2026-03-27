import uuid

import pytest
from httpx import AsyncClient


# ---- Authentication ----


@pytest.mark.asyncio
async def test_list_procurement_unauthorized(client: AsyncClient):
    """Test that listing procurement requests requires authentication."""
    response = await client.get("/api/v1/procurement")
    assert response.status_code == 401


# ---- Basic CRUD ----


@pytest.mark.asyncio
async def test_list_procurement(client: AsyncClient, auth_headers: dict):
    """Test listing procurement requests with authentication."""
    response = await client.get("/api/v1/procurement", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "offset" in data
    assert "limit" in data
    assert "has_more" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_procurement_pagination(client: AsyncClient, auth_headers: dict):
    """Test listing procurement requests with custom pagination."""
    response = await client.get(
        "/api/v1/procurement?skip=0&limit=5", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["items"], list)
    assert len(data["items"]) <= 5
    assert data["limit"] == 5


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
    assert data["total_price"] == "925000.00"


@pytest.mark.asyncio
async def test_create_procurement_calculates_total(
    client: AsyncClient, auth_headers: dict
):
    """Test that total_price is correctly calculated from quantity * unit_price."""
    payload = {
        "item_name": "USB-C Hub",
        "category": "hardware",
        "quantity": 20,
        "unit_price": "5000.00",
        "department": "IT",
        "purpose": "Accessory purchase",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["total_price"] == "100000.00"


@pytest.mark.asyncio
async def test_get_procurement_by_id(client: AsyncClient, auth_headers: dict):
    """Test getting a specific procurement request by ID."""
    payload = {
        "item_name": "Keyboard",
        "category": "hardware",
        "quantity": 1,
        "unit_price": "15000.00",
        "department": "IT",
        "purpose": "Replacement",
    }
    create_resp = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = create_resp.json()["id"]

    response = await client.get(
        f"/api/v1/procurement/{request_id}", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["item_name"] == "Keyboard"


@pytest.mark.asyncio
async def test_get_procurement_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent procurement request returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/procurement/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_procurement_in_draft(client: AsyncClient, auth_headers: dict):
    """Test updating a procurement request in draft status."""
    payload = {
        "item_name": "Monitor",
        "category": "hardware",
        "quantity": 3,
        "unit_price": "45000.00",
        "department": "Design",
        "purpose": "Dual monitor setup",
    }
    create_resp = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = create_resp.json()["id"]

    update_payload = {"quantity": 5, "purpose": "Triple monitor setup"}
    response = await client.patch(
        f"/api/v1/procurement/{request_id}",
        json=update_payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["quantity"] == 5
    assert data["purpose"] == "Triple monitor setup"
    assert data["total_price"] == "225000.00"  # recalculated: 5 * 45000


# ---- Full lifecycle: draft -> submit -> approve -> order -> receive ----


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
    assert response.json()["approver_id"] is not None
    assert response.json()["approved_at"] is not None


@pytest.mark.asyncio
async def test_procurement_full_lifecycle(client: AsyncClient, auth_headers: dict):
    """Test complete lifecycle: draft -> submit -> approve -> order -> receive."""
    # Create
    payload = {
        "item_name": "Server Rack",
        "category": "hardware",
        "quantity": 1,
        "unit_price": "500000.00",
        "department": "Infrastructure",
        "purpose": "New server deployment",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    request_id = response.json()["id"]
    assert response.json()["status"] == "draft"

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

    # Order
    response = await client.post(
        f"/api/v1/procurement/{request_id}/order", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ordered"
    assert response.json()["ordered_at"] is not None

    # Receive
    response = await client.post(
        f"/api/v1/procurement/{request_id}/receive", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "received"
    assert response.json()["received_at"] is not None


# ---- Rejection flow ----


@pytest.mark.asyncio
async def test_procurement_reject(client: AsyncClient, auth_headers: dict):
    """Test rejecting a submitted procurement request."""
    # Create & submit
    payload = {
        "item_name": "Expensive Chair",
        "category": "hardware",
        "quantity": 100,
        "unit_price": "200000.00",
        "department": "Office",
        "purpose": "Luxury office upgrade",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = response.json()["id"]

    await client.post(
        f"/api/v1/procurement/{request_id}/submit", headers=auth_headers
    )

    # Reject
    response = await client.post(
        f"/api/v1/procurement/{request_id}/reject", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


# ---- Invalid state transitions ----


@pytest.mark.asyncio
async def test_cannot_submit_non_draft(client: AsyncClient, auth_headers: dict):
    """Test that submitting a non-draft request fails."""
    # Create & submit
    payload = {
        "item_name": "Transition Test Item",
        "category": "software",
        "quantity": 1,
        "unit_price": "10000.00",
        "department": "IT",
        "purpose": "State transition test",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = response.json()["id"]

    await client.post(
        f"/api/v1/procurement/{request_id}/submit", headers=auth_headers
    )

    # Try to submit again (status is now 'submitted', not 'draft')
    response = await client.post(
        f"/api/v1/procurement/{request_id}/submit", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cannot_approve_non_submitted(client: AsyncClient, auth_headers: dict):
    """Test that approving a non-submitted request fails."""
    payload = {
        "item_name": "Draft Approve Test",
        "category": "hardware",
        "quantity": 1,
        "unit_price": "5000.00",
        "department": "IT",
        "purpose": "Test",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = response.json()["id"]

    # Try to approve a draft (not submitted)
    response = await client.post(
        f"/api/v1/procurement/{request_id}/approve", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cannot_order_non_approved(client: AsyncClient, auth_headers: dict):
    """Test that ordering a non-approved request fails."""
    payload = {
        "item_name": "Order Test Item",
        "category": "hardware",
        "quantity": 1,
        "unit_price": "5000.00",
        "department": "IT",
        "purpose": "Test",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = response.json()["id"]

    # Try to order a draft
    response = await client.post(
        f"/api/v1/procurement/{request_id}/order", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cannot_receive_non_ordered(client: AsyncClient, auth_headers: dict):
    """Test that receiving a non-ordered request fails."""
    payload = {
        "item_name": "Receive Test Item",
        "category": "hardware",
        "quantity": 1,
        "unit_price": "5000.00",
        "department": "IT",
        "purpose": "Test",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = response.json()["id"]

    # Try to receive a draft
    response = await client.post(
        f"/api/v1/procurement/{request_id}/receive", headers=auth_headers
    )
    assert response.status_code == 400


# ---- Disposal flow ----


@pytest.mark.asyncio
async def test_cannot_dispose_non_active(client: AsyncClient, auth_headers: dict):
    """Test that disposing a non-active request fails."""
    payload = {
        "item_name": "Dispose Draft Test",
        "category": "hardware",
        "quantity": 1,
        "unit_price": "5000.00",
        "department": "IT",
        "purpose": "Test",
    }
    response = await client.post(
        "/api/v1/procurement", json=payload, headers=auth_headers
    )
    request_id = response.json()["id"]

    # Try to dispose a draft
    response = await client.post(
        f"/api/v1/procurement/{request_id}/dispose", headers=auth_headers
    )
    assert response.status_code == 400


# ---- Category types ----


@pytest.mark.asyncio
async def test_create_procurement_all_categories(
    client: AsyncClient, auth_headers: dict
):
    """Test creating procurement requests for all category types."""
    categories = ["hardware", "software", "service", "consumable"]
    for cat in categories:
        payload = {
            "item_name": f"Test {cat} item",
            "category": cat,
            "quantity": 1,
            "unit_price": "1000.00",
            "department": "IT",
            "purpose": f"Test {cat} category",
        }
        response = await client.post(
            "/api/v1/procurement", json=payload, headers=auth_headers
        )
        assert response.status_code == 201, f"Failed to create {cat} category"
        assert response.json()["category"] == cat
