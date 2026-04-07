import uuid

import pytest
from httpx import AsyncClient

# ---- Authentication ----


@pytest.mark.asyncio
async def test_lifecycle_summary_unauthorized(client: AsyncClient):
    """Test that lifecycle summary requires authentication."""
    response = await client.get("/api/v1/lifecycle/summary")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_disposals_list_unauthorized(client: AsyncClient):
    """Test that listing disposals requires authentication."""
    response = await client.get("/api/v1/lifecycle/disposals")
    assert response.status_code == 401


# ---- Lifecycle Summary ----


@pytest.mark.asyncio
async def test_lifecycle_summary(client: AsyncClient, auth_headers: dict):
    """Test lifecycle summary returns expected fields."""
    response = await client.get("/api/v1/lifecycle/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "procured" in data
    assert "deployed" in data
    assert "maintenance" in data
    assert "disposed" in data
    assert "disposal_pending" in data
    assert "disposal_approved" in data
    assert "total_events" in data


# ---- Device History ----


@pytest.mark.asyncio
async def test_device_history_not_found(client: AsyncClient, auth_headers: dict):
    """Test that requesting history for a non-existent device returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/lifecycle/devices/{fake_id}/history",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_device_history_empty(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test getting history for a device with no events."""
    response = await client.get(
        f"/api/v1/lifecycle/devices/{sample_device.id}/history",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


# ---- Add Lifecycle Event ----


@pytest.mark.asyncio
async def test_add_lifecycle_event(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test adding a lifecycle event to a device."""
    payload = {
        "event_type": "procured",
        "detail": {"vendor": "Dell", "cost": 150000},
    }
    response = await client.post(
        f"/api/v1/lifecycle/devices/{sample_device.id}/events",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["event_type"] == "procured"
    assert data["device_id"] == str(sample_device.id)
    assert data["detail"]["vendor"] == "Dell"
    assert data["performed_by"] is not None


@pytest.mark.asyncio
async def test_add_lifecycle_event_device_not_found(
    client: AsyncClient, auth_headers: dict
):
    """Test adding event to non-existent device returns 404."""
    fake_id = str(uuid.uuid4())
    payload = {"event_type": "deployed"}
    response = await client.post(
        f"/api/v1/lifecycle/devices/{fake_id}/events",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_device_history_after_adding_events(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test that device history reflects added events."""
    # Add two events
    for event_type in ["procured", "deployed"]:
        await client.post(
            f"/api/v1/lifecycle/devices/{sample_device.id}/events",
            json={"event_type": event_type},
            headers=auth_headers,
        )

    response = await client.get(
        f"/api/v1/lifecycle/devices/{sample_device.id}/history",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    types = [item["event_type"] for item in data["items"]]
    assert "procured" in types
    assert "deployed" in types


# ---- Disposal Requests ----


@pytest.mark.asyncio
async def test_list_disposals_empty(client: AsyncClient, auth_headers: dict):
    """Test listing disposal requests with authentication."""
    response = await client.get("/api/v1/lifecycle/disposals", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_create_disposal_request(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test creating a disposal request."""
    payload = {
        "device_id": str(sample_device.id),
        "reason": "End of life - 5 years old",
        "method": "recycle",
    }
    response = await client.post(
        "/api/v1/lifecycle/disposals",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == str(sample_device.id)
    assert data["reason"] == "End of life - 5 years old"
    assert data["method"] == "recycle"
    assert data["status"] == "pending"
    assert data["requested_by"] is not None


@pytest.mark.asyncio
async def test_create_disposal_device_not_found(
    client: AsyncClient, auth_headers: dict
):
    """Test creating disposal for non-existent device returns 404."""
    fake_id = str(uuid.uuid4())
    payload = {
        "device_id": fake_id,
        "reason": "Test",
        "method": "destroy",
    }
    response = await client.post(
        "/api/v1/lifecycle/disposals",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---- Disposal Workflow: approve / reject / complete ----


@pytest.mark.asyncio
async def test_approve_disposal(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test approving a pending disposal request."""
    # Create disposal
    create_resp = await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Hardware failure",
            "method": "destroy",
        },
        headers=auth_headers,
    )
    disposal_id = create_resp.json()["id"]

    # Approve
    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/approve",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["approved_by"] is not None


@pytest.mark.asyncio
async def test_reject_disposal(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test rejecting a pending disposal request."""
    create_resp = await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Lease return",
            "method": "return_to_vendor",
        },
        headers=auth_headers,
    )
    disposal_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/reject",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_complete_disposal(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test completing an approved disposal with certificate."""
    # Create and approve
    create_resp = await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Donation to school",
            "method": "donate",
        },
        headers=auth_headers,
    )
    disposal_id = create_resp.json()["id"]

    await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/approve",
        headers=auth_headers,
    )

    # Complete
    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/complete",
        json={
            "certificate_number": "CERT-2026-0042",
            "certificate_path": "/certs/CERT-2026-0042.pdf",
            "disposal_date": "2026-03-27",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["certificate_number"] == "CERT-2026-0042"
    assert data["certificate_path"] == "/certs/CERT-2026-0042.pdf"
    assert data["disposal_date"] == "2026-03-27"


# ---- Invalid state transitions ----


@pytest.mark.asyncio
async def test_cannot_approve_non_pending(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test that approving a non-pending request fails."""
    create_resp = await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Test",
            "method": "recycle",
        },
        headers=auth_headers,
    )
    disposal_id = create_resp.json()["id"]

    # Approve first
    await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/approve",
        headers=auth_headers,
    )

    # Try to approve again
    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/approve",
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cannot_reject_non_pending(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test that rejecting a non-pending request fails."""
    create_resp = await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Test",
            "method": "recycle",
        },
        headers=auth_headers,
    )
    disposal_id = create_resp.json()["id"]

    # Approve first
    await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/approve",
        headers=auth_headers,
    )

    # Try to reject
    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/reject",
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cannot_complete_non_approved(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test that completing a non-approved request fails."""
    create_resp = await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Test",
            "method": "recycle",
        },
        headers=auth_headers,
    )
    disposal_id = create_resp.json()["id"]

    # Try to complete a pending request
    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{disposal_id}/complete",
        json={"certificate_number": "CERT-TEST"},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_disposal_not_found(client: AsyncClient, auth_headers: dict):
    """Test that accessing a non-existent disposal returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.patch(
        f"/api/v1/lifecycle/disposals/{fake_id}/approve",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---- Disposal filtering ----


@pytest.mark.asyncio
async def test_list_disposals_with_status_filter(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test filtering disposals by status."""
    # Create a disposal
    await client.post(
        "/api/v1/lifecycle/disposals",
        json={
            "device_id": str(sample_device.id),
            "reason": "Filter test",
            "method": "recycle",
        },
        headers=auth_headers,
    )

    # Filter by pending
    response = await client.get(
        "/api/v1/lifecycle/disposals?status=pending",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["status"] == "pending"


# ---- All disposal methods ----


@pytest.mark.asyncio
async def test_all_disposal_methods(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test creating disposal requests with all method types."""
    methods = ["recycle", "destroy", "donate", "return_to_vendor"]
    for method in methods:
        response = await client.post(
            "/api/v1/lifecycle/disposals",
            json={
                "device_id": str(sample_device.id),
                "reason": f"Test {method}",
                "method": method,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201, f"Failed for method {method}"
        assert response.json()["method"] == method


# ---- All lifecycle event types ----


@pytest.mark.asyncio
async def test_all_event_types(
    client: AsyncClient, auth_headers: dict, sample_device
):
    """Test adding lifecycle events with all event types."""
    event_types = [
        "procured",
        "deployed",
        "reassigned",
        "maintenance",
        "disposal_requested",
        "disposal_approved",
        "disposed",
    ]
    for event_type in event_types:
        response = await client.post(
            f"/api/v1/lifecycle/devices/{sample_device.id}/events",
            json={"event_type": event_type},
            headers=auth_headers,
        )
        assert response.status_code == 201, f"Failed for event type {event_type}"
        assert response.json()["event_type"] == event_type
