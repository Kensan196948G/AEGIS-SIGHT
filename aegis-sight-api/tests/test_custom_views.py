import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custom_view import CustomView
from app.models.user import User


async def _create_view(
    db: AsyncSession,
    owner_id: uuid.UUID,
    name: str = "test-view",
    entity_type: str = "devices",
    is_shared: bool = False,
) -> CustomView:
    """Helper to insert a test custom view."""
    view = CustomView(
        name=name,
        entity_type=entity_type,
        owner_id=owner_id,
        is_shared=is_shared,
    )
    db.add(view)
    await db.flush()
    await db.refresh(view)
    return view


# ---------------------------------------------------------------------------
# Custom view CRUD tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_views_unauthorized(client: AsyncClient):
    """Test that listing views requires authentication."""
    response = await client.get("/api/v1/views")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_views(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user: User,
):
    """Test listing views returns own views."""
    await _create_view(
        db_session,
        owner_id=test_user.id,
        name=f"view-list-{uuid.uuid4().hex[:6]}",
    )
    response = await client.get("/api/v1/views", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_views_shows_shared(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Test that shared views from other users are visible."""
    other_user_id = uuid.uuid4()
    await _create_view(
        db_session,
        owner_id=other_user_id,
        name=f"shared-view-{uuid.uuid4().hex[:6]}",
        is_shared=True,
    )
    response = await client.get("/api/v1/views", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_views_filter_entity_type(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user: User,
):
    """Test filtering views by entity_type."""
    await _create_view(
        db_session,
        owner_id=test_user.id,
        name=f"license-view-{uuid.uuid4().hex[:6]}",
        entity_type="licenses",
    )
    response = await client.get(
        "/api/v1/views?entity_type=licenses", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["entity_type"] == "licenses"


@pytest.mark.asyncio
async def test_create_view(
    client: AsyncClient, auth_headers: dict, test_user: User
):
    """Test creating a new custom view."""
    payload = {
        "name": f"new-view-{uuid.uuid4().hex[:6]}",
        "entity_type": "devices",
        "columns": {"visible": ["name", "status", "os"]},
        "filters": {"status": "online"},
        "sort_by": "name",
        "sort_order": "asc",
    }
    response = await client.post(
        "/api/v1/views", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["entity_type"] == "devices"
    assert data["columns"]["visible"] == ["name", "status", "os"]
    assert data["owner_id"] == str(test_user.id)
    assert data["is_shared"] is False


@pytest.mark.asyncio
async def test_update_view(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user: User,
):
    """Test updating a custom view."""
    view = await _create_view(
        db_session,
        owner_id=test_user.id,
        name=f"update-view-{uuid.uuid4().hex[:6]}",
    )
    payload = {"name": f"renamed-view-{uuid.uuid4().hex[:6]}"}
    response = await client.patch(
        f"/api/v1/views/{view.id}", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]


@pytest.mark.asyncio
async def test_update_view_not_found(client: AsyncClient, auth_headers: dict):
    """Test updating a non-existent view returns 404."""
    payload = {"name": "whatever"}
    response = await client.patch(
        "/api/v1/views/00000000-0000-0000-0000-000000000000",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_view_not_owner(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Test updating a view you don't own returns 403."""
    other_user_id = uuid.uuid4()
    view = await _create_view(
        db_session,
        owner_id=other_user_id,
        name=f"other-view-{uuid.uuid4().hex[:6]}",
        is_shared=True,
    )
    payload = {"name": "hijack"}
    response = await client.patch(
        f"/api/v1/views/{view.id}", json=payload, headers=auth_headers
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_view(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user: User,
):
    """Test deleting a custom view."""
    view = await _create_view(
        db_session,
        owner_id=test_user.id,
        name=f"del-view-{uuid.uuid4().hex[:6]}",
    )
    response = await client.delete(
        f"/api/v1/views/{view.id}", headers=auth_headers
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_view_not_owner(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Test deleting a view you don't own returns 403."""
    other_user_id = uuid.uuid4()
    view = await _create_view(
        db_session,
        owner_id=other_user_id,
        name=f"other-del-{uuid.uuid4().hex[:6]}",
        is_shared=True,
    )
    response = await client.delete(
        f"/api/v1/views/{view.id}", headers=auth_headers
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Share toggle tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_toggle_share(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
    test_user: User,
):
    """Test toggling the share status of a view."""
    view = await _create_view(
        db_session,
        owner_id=test_user.id,
        name=f"share-view-{uuid.uuid4().hex[:6]}",
    )
    # Share
    response = await client.post(
        f"/api/v1/views/{view.id}/share",
        json={"is_shared": True},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["is_shared"] is True

    # Unshare
    response = await client.post(
        f"/api/v1/views/{view.id}/share",
        json={"is_shared": False},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["is_shared"] is False


@pytest.mark.asyncio
async def test_toggle_share_not_owner(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Test toggling share on a view you don't own returns 403."""
    other_user_id = uuid.uuid4()
    view = await _create_view(
        db_session,
        owner_id=other_user_id,
        name=f"share-other-{uuid.uuid4().hex[:6]}",
        is_shared=True,
    )
    response = await client.post(
        f"/api/v1/views/{view.id}/share",
        json={"is_shared": False},
        headers=auth_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_toggle_share_not_found(client: AsyncClient, auth_headers: dict):
    """Test toggling share on a non-existent view returns 404."""
    response = await client.post(
        "/api/v1/views/00000000-0000-0000-0000-000000000000/share",
        json={"is_shared": True},
        headers=auth_headers,
    )
    assert response.status_code == 404
