from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device, DeviceStatus
from app.models.policy import DevicePolicy, PolicyType, PolicyViolation

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_device(db: AsyncSession, hostname: str = "PC-POL-001") -> Device:
    """Insert a test device."""
    device = Device(hostname=hostname, status=DeviceStatus.active)
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


async def _create_policy(
    db: AsyncSession,
    name: str = "Test USB Policy",
    policy_type: PolicyType = PolicyType.usb_control,
    is_enabled: bool = True,
    priority: int = 50,
) -> DevicePolicy:
    """Insert a test policy."""
    policy = DevicePolicy(
        name=name,
        description="Test policy description",
        policy_type=policy_type,
        rules={"action": "block"},
        is_enabled=is_enabled,
        priority=priority,
    )
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy


async def _create_violation(
    db: AsyncSession,
    policy: DevicePolicy,
    device: Device,
    is_resolved: bool = False,
) -> PolicyViolation:
    """Insert a test violation."""
    violation = PolicyViolation(
        policy_id=policy.id,
        device_id=device.id,
        violation_type="usb_mass_storage_connected",
        detail={"usb_vendor": "SanDisk"},
        is_resolved=is_resolved,
        resolved_at=datetime.now(timezone.utc) if is_resolved else None,
    )
    db.add(violation)
    await db.flush()
    await db.refresh(violation)
    return violation


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_policies_unauthorized(client: AsyncClient):
    """Listing policies requires authentication."""
    response = await client.get("/api/v1/policies")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Policy CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_policy(client: AsyncClient, auth_headers: dict):
    """Create a new device policy."""
    payload = {
        "name": "USB Storage Block",
        "description": "Block all USB mass storage devices",
        "policy_type": "usb_control",
        "rules": {"action": "block", "device_class": "mass_storage"},
        "is_enabled": True,
        "priority": 100,
    }
    response = await client.post("/api/v1/policies", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "USB Storage Block"
    assert data["policy_type"] == "usb_control"
    assert data["is_enabled"] is True
    assert data["priority"] == 100
    assert data["created_by"] is not None


@pytest.mark.asyncio
async def test_list_policies(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """List policies returns paginated results."""
    await _create_policy(db_session, name="Policy A")
    await _create_policy(db_session, name="Policy B", policy_type=PolicyType.software_restriction)

    response = await client.get("/api/v1/policies", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_list_policies_filter_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter policies by type."""
    await _create_policy(db_session, name="USB Policy", policy_type=PolicyType.usb_control)
    await _create_policy(db_session, name="SW Policy", policy_type=PolicyType.software_restriction)

    response = await client.get(
        "/api/v1/policies?policy_type=usb_control", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["policy_type"] == "usb_control"


@pytest.mark.asyncio
async def test_list_policies_filter_enabled(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter policies by enabled status."""
    await _create_policy(db_session, name="Enabled Policy", is_enabled=True)
    await _create_policy(db_session, name="Disabled Policy", is_enabled=False)

    response = await client.get(
        "/api/v1/policies?is_enabled=true", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["is_enabled"] is True


@pytest.mark.asyncio
async def test_get_policy(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Get a single policy by ID."""
    policy = await _create_policy(db_session, name="Get Me Policy")

    response = await client.get(f"/api/v1/policies/{policy.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Get Me Policy"


@pytest.mark.asyncio
async def test_get_policy_not_found(client: AsyncClient, auth_headers: dict):
    """Non-existent policy returns 404."""
    response = await client.get(
        "/api/v1/policies/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_policy(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Partially update a policy."""
    policy = await _create_policy(db_session, name="Old Name", priority=10)

    response = await client.patch(
        f"/api/v1/policies/{policy.id}",
        json={"name": "New Name", "priority": 99},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["priority"] == 99


@pytest.mark.asyncio
async def test_update_policy_toggle_enabled(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Toggle policy enabled status."""
    policy = await _create_policy(db_session, name="Toggle Policy", is_enabled=True)

    response = await client.patch(
        f"/api/v1/policies/{policy.id}",
        json={"is_enabled": False},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["is_enabled"] is False


@pytest.mark.asyncio
async def test_update_policy_not_found(client: AsyncClient, auth_headers: dict):
    """Updating a non-existent policy returns 404."""
    response = await client.patch(
        "/api/v1/policies/00000000-0000-0000-0000-000000000000",
        json={"name": "New"},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_policy(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Delete a policy."""
    policy = await _create_policy(db_session, name="Delete Me")

    response = await client.delete(
        f"/api/v1/policies/{policy.id}", headers=auth_headers
    )
    assert response.status_code == 204

    # Confirm it is gone
    response = await client.get(
        f"/api/v1/policies/{policy.id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_policy_not_found(client: AsyncClient, auth_headers: dict):
    """Deleting a non-existent policy returns 404."""
    response = await client.delete(
        "/api/v1/policies/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Violations
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_all_violations(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """List all violations across all policies."""
    device = await _create_device(db_session, hostname="PC-VIOL-001")
    policy = await _create_policy(db_session, name="Violation Policy")
    await _create_violation(db_session, policy, device)

    response = await client.get("/api/v1/policies/violations", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_violations_filter_resolved(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter violations by resolved status."""
    device = await _create_device(db_session, hostname="PC-VFILT-001")
    policy = await _create_policy(db_session, name="Filter Violation Policy")
    await _create_violation(db_session, policy, device, is_resolved=False)
    await _create_violation(db_session, policy, device, is_resolved=True)

    response = await client.get(
        "/api/v1/policies/violations?is_resolved=false", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["is_resolved"] is False


@pytest.mark.asyncio
async def test_list_violations_filter_by_policy(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter violations by policy_id."""
    device = await _create_device(db_session, hostname="PC-VPOL-001")
    policy_a = await _create_policy(db_session, name="Policy A Violations")
    policy_b = await _create_policy(db_session, name="Policy B Violations")
    await _create_violation(db_session, policy_a, device)
    await _create_violation(db_session, policy_b, device)

    response = await client.get(
        f"/api/v1/policies/violations?policy_id={policy_a.id}", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["policy_id"] == str(policy_a.id)


@pytest.mark.asyncio
async def test_list_violations_filter_by_device(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter violations by device_id."""
    device_a = await _create_device(db_session, hostname="PC-VDA-001")
    device_b = await _create_device(db_session, hostname="PC-VDB-001")
    policy = await _create_policy(db_session, name="Device Violation Policy")
    await _create_violation(db_session, policy, device_a)
    await _create_violation(db_session, policy, device_b)

    response = await client.get(
        f"/api/v1/policies/violations?device_id={device_a.id}", headers=auth_headers
    )
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["device_id"] == str(device_a.id)


@pytest.mark.asyncio
async def test_list_policy_violations(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """List violations for a specific policy."""
    device = await _create_device(db_session, hostname="PC-PV-001")
    policy = await _create_policy(db_session, name="Specific Policy Violations")
    await _create_violation(db_session, policy, device)

    response = await client.get(
        f"/api/v1/policies/{policy.id}/violations", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["items"][0]["policy_id"] == str(policy.id)


@pytest.mark.asyncio
async def test_list_policy_violations_not_found(client: AsyncClient, auth_headers: dict):
    """Violations for non-existent policy returns 404."""
    response = await client.get(
        "/api/v1/policies/00000000-0000-0000-0000-000000000000/violations",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Compliance & Evaluate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_compliance_empty(client: AsyncClient, auth_headers: dict):
    """Compliance on empty database."""
    response = await client.get("/api/v1/policies/compliance", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_policies" in data
    assert "compliance_rate" in data
    assert data["compliance_rate"] == 100.0


@pytest.mark.asyncio
async def test_compliance_with_violations(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Compliance with some violations."""
    device = await _create_device(db_session, hostname="PC-COMP-001")
    policy = await _create_policy(db_session, name="Compliance Policy")
    await _create_violation(db_session, policy, device, is_resolved=False)
    await _create_violation(db_session, policy, device, is_resolved=True)

    response = await client.get("/api/v1/policies/compliance", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_violations"] >= 2
    assert data["unresolved_violations"] >= 1
    assert data["compliance_rate"] < 100.0


@pytest.mark.asyncio
async def test_evaluate_policies(client: AsyncClient, auth_headers: dict):
    """Trigger policy evaluation."""
    response = await client.post(
        "/api/v1/policies/evaluate",
        json={},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "evaluated_policies" in data
    assert "evaluated_devices" in data
    assert "new_violations" in data


@pytest.mark.asyncio
async def test_evaluate_specific_policies(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Evaluate specific policies only."""
    policy = await _create_policy(db_session, name="Eval Policy")

    response = await client.post(
        "/api/v1/policies/evaluate",
        json={"policy_ids": [str(policy.id)]},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["evaluated_policies"] == 1
