import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device_group import DeviceGroup, DeviceGroupMembership


async def _create_group(
    db: AsyncSession,
    name: str = "test-group",
    created_by: uuid.UUID | None = None,
    is_dynamic: bool = False,
    criteria: dict | None = None,
) -> DeviceGroup:
    """Helper to insert a test device group."""
    group = DeviceGroup(
        name=name,
        is_dynamic=is_dynamic,
        criteria=criteria,
        created_by=created_by,
    )
    db.add(group)
    await db.flush()
    await db.refresh(group)
    return group


# ---------------------------------------------------------------------------
# Device group CRUD tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_device_groups_unauthorized(client: AsyncClient):
    """Test that listing device groups requires authentication."""
    response = await client.get("/api/v1/device-groups")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_device_groups(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing device groups with authentication."""
    await _create_group(db_session, name=f"group-list-{uuid.uuid4().hex[:6]}")
    response = await client.get("/api/v1/device-groups", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_device_group(client: AsyncClient, auth_headers: dict):
    """Test creating a new device group."""
    payload = {
        "name": f"new-group-{uuid.uuid4().hex[:6]}",
        "description": "A test group",
        "is_dynamic": False,
    }
    response = await client.post(
        "/api/v1/device-groups", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["description"] == "A test group"
    assert data["is_dynamic"] is False
    assert data["member_count"] == 0


@pytest.mark.asyncio
async def test_create_device_group_dynamic(client: AsyncClient, auth_headers: dict):
    """Test creating a dynamic device group with criteria."""
    payload = {
        "name": f"dynamic-group-{uuid.uuid4().hex[:6]}",
        "is_dynamic": True,
        "criteria": {"os": "Windows 11", "status": "online"},
    }
    response = await client.post(
        "/api/v1/device-groups", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["is_dynamic"] is True
    assert data["criteria"]["os"] == "Windows 11"


@pytest.mark.asyncio
async def test_create_device_group_duplicate_name(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that creating a group with duplicate name returns 409."""
    group_name = f"dup-group-{uuid.uuid4().hex[:6]}"
    await _create_group(db_session, name=group_name)
    payload = {"name": group_name}
    response = await client.post(
        "/api/v1/device-groups", json=payload, headers=auth_headers
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_get_device_group_detail(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test getting device group detail."""
    group = await _create_group(
        db_session, name=f"detail-group-{uuid.uuid4().hex[:6]}"
    )
    response = await client.get(
        f"/api/v1/device-groups/{group.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(group.id)
    assert "members" in data


@pytest.mark.asyncio
async def test_get_device_group_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent device group returns 404."""
    response = await client.get(
        "/api/v1/device-groups/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_device_group(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test updating a device group."""
    group = await _create_group(
        db_session, name=f"update-group-{uuid.uuid4().hex[:6]}"
    )
    payload = {"description": "Updated description"}
    response = await client.patch(
        f"/api/v1/device-groups/{group.id}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_device_group(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test deleting a device group."""
    group = await _create_group(
        db_session, name=f"del-group-{uuid.uuid4().hex[:6]}"
    )
    response = await client.delete(
        f"/api/v1/device-groups/{group.id}", headers=auth_headers
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_device_group_not_found(client: AsyncClient, auth_headers: dict):
    """Test deleting a non-existent device group returns 404."""
    response = await client.delete(
        "/api/v1/device-groups/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Membership tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_add_member(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    sample_device,
):
    """Test adding a device to a group."""
    group = await _create_group(
        db_session, name=f"member-group-{uuid.uuid4().hex[:6]}"
    )
    payload = {"device_id": str(sample_device.id)}
    response = await client.post(
        f"/api/v1/device-groups/{group.id}/members",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == str(sample_device.id)
    assert data["group_id"] == str(group.id)


@pytest.mark.asyncio
async def test_add_member_duplicate(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    sample_device,
):
    """Test that adding the same device to the same group twice returns 409."""
    group = await _create_group(
        db_session, name=f"dup-member-{uuid.uuid4().hex[:6]}"
    )
    membership = DeviceGroupMembership(
        group_id=group.id, device_id=sample_device.id
    )
    db_session.add(membership)
    await db_session.flush()

    payload = {"device_id": str(sample_device.id)}
    response = await client.post(
        f"/api/v1/device-groups/{group.id}/members",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_add_member_group_not_found(client: AsyncClient, auth_headers: dict):
    """Test adding a member to a non-existent group returns 404."""
    payload = {"device_id": str(uuid.uuid4())}
    response = await client.post(
        "/api/v1/device-groups/00000000-0000-0000-0000-000000000000/members",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_remove_member(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    sample_device,
):
    """Test removing a device from a group."""
    group = await _create_group(
        db_session, name=f"rm-member-{uuid.uuid4().hex[:6]}"
    )
    membership = DeviceGroupMembership(
        group_id=group.id, device_id=sample_device.id
    )
    db_session.add(membership)
    await db_session.flush()

    response = await client.delete(
        f"/api/v1/device-groups/{group.id}/members/{sample_device.id}",
        headers=auth_headers,
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_remove_member_not_found(client: AsyncClient, auth_headers: dict):
    """Test removing a non-existent membership returns 404."""
    response = await client.delete(
        f"/api/v1/device-groups/00000000-0000-0000-0000-000000000000/members/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert response.status_code == 404
