import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag, TagAssignment, TagCategory


async def _create_tag(
    db: AsyncSession,
    name: str = "test-tag",
    color: str = "#ff0000",
    category: TagCategory = TagCategory.general,
) -> Tag:
    """Helper to insert a test tag."""
    tag = Tag(name=name, color=color, category=category)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return tag


# ---------------------------------------------------------------------------
# Tag CRUD tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_tags_unauthorized(client: AsyncClient):
    """Test that listing tags requires authentication."""
    response = await client.get("/api/v1/tags")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_tags(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test listing tags with authentication."""
    await _create_tag(db_session, name=f"tag-list-{uuid.uuid4().hex[:6]}")
    response = await client.get("/api/v1/tags", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_tags_filter_category(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering tags by category."""
    await _create_tag(
        db_session,
        name=f"device-tag-{uuid.uuid4().hex[:6]}",
        category=TagCategory.device,
    )
    response = await client.get(
        "/api/v1/tags?category=device", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["category"] == "device"


@pytest.mark.asyncio
async def test_create_tag(client: AsyncClient, auth_headers: dict):
    """Test creating a new tag."""
    payload = {
        "name": f"new-tag-{uuid.uuid4().hex[:6]}",
        "color": "#00ff00",
        "category": "license",
    }
    response = await client.post("/api/v1/tags", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["color"] == "#00ff00"
    assert data["category"] == "license"


@pytest.mark.asyncio
async def test_create_tag_duplicate_name(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that creating a tag with duplicate name returns 409."""
    tag_name = f"dup-tag-{uuid.uuid4().hex[:6]}"
    await _create_tag(db_session, name=tag_name)
    payload = {"name": tag_name, "color": "#0000ff", "category": "general"}
    response = await client.post("/api/v1/tags", json=payload, headers=auth_headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_delete_tag(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test deleting a tag."""
    tag = await _create_tag(db_session, name=f"del-tag-{uuid.uuid4().hex[:6]}")
    response = await client.delete(f"/api/v1/tags/{tag.id}", headers=auth_headers)
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_tag_not_found(client: AsyncClient, auth_headers: dict):
    """Test deleting a non-existent tag returns 404."""
    response = await client.delete(
        "/api/v1/tags/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tag assignment tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_assign_tag(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device
):
    """Test assigning a tag to a device."""
    tag = await _create_tag(db_session, name=f"assign-tag-{uuid.uuid4().hex[:6]}")
    payload = {
        "tag_id": str(tag.id),
        "entity_type": "device",
        "entity_id": str(sample_device.id),
    }
    response = await client.post("/api/v1/tags/assign", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["tag_id"] == str(tag.id)
    assert data["entity_type"] == "device"
    assert data["entity_id"] == str(sample_device.id)


@pytest.mark.asyncio
async def test_assign_tag_duplicate(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device
):
    """Test that assigning the same tag to the same entity twice returns 409."""
    tag = await _create_tag(db_session, name=f"dup-assign-{uuid.uuid4().hex[:6]}")
    assignment = TagAssignment(
        tag_id=tag.id, entity_type="device", entity_id=sample_device.id
    )
    db_session.add(assignment)
    await db_session.flush()

    payload = {
        "tag_id": str(tag.id),
        "entity_type": "device",
        "entity_id": str(sample_device.id),
    }
    response = await client.post("/api/v1/tags/assign", json=payload, headers=auth_headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_assign_tag_not_found(client: AsyncClient, auth_headers: dict):
    """Test assigning a non-existent tag returns 404."""
    payload = {
        "tag_id": "00000000-0000-0000-0000-000000000000",
        "entity_type": "device",
        "entity_id": str(uuid.uuid4()),
    }
    response = await client.post("/api/v1/tags/assign", json=payload, headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unassign_tag(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device
):
    """Test unassigning a tag from an entity."""
    tag = await _create_tag(db_session, name=f"unassign-tag-{uuid.uuid4().hex[:6]}")
    assignment = TagAssignment(
        tag_id=tag.id, entity_type="device", entity_id=sample_device.id
    )
    db_session.add(assignment)
    await db_session.flush()

    payload = {
        "tag_id": str(tag.id),
        "entity_type": "device",
        "entity_id": str(sample_device.id),
    }
    response = await client.request(
        "DELETE", "/api/v1/tags/assign", json=payload, headers=auth_headers
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_unassign_tag_not_found(client: AsyncClient, auth_headers: dict):
    """Test unassigning a non-existent assignment returns 404."""
    payload = {
        "tag_id": str(uuid.uuid4()),
        "entity_type": "device",
        "entity_id": str(uuid.uuid4()),
    }
    response = await client.request(
        "DELETE", "/api/v1/tags/assign", json=payload, headers=auth_headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tag entities list tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_tag_entities(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device
):
    """Test listing entities for a tag."""
    tag = await _create_tag(db_session, name=f"entities-tag-{uuid.uuid4().hex[:6]}")
    assignment = TagAssignment(
        tag_id=tag.id, entity_type="device", entity_id=sample_device.id
    )
    db_session.add(assignment)
    await db_session.flush()

    response = await client.get(
        f"/api/v1/tags/{tag.id}/entities", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["items"][0]["entity_type"] == "device"


@pytest.mark.asyncio
async def test_list_tag_entities_not_found(client: AsyncClient, auth_headers: dict):
    """Test listing entities for a non-existent tag returns 404."""
    response = await client.get(
        "/api/v1/tags/00000000-0000-0000-0000-000000000000/entities",
        headers=auth_headers,
    )
    assert response.status_code == 404
