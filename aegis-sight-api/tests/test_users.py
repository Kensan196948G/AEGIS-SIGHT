import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_list_users_unauthorized(client: AsyncClient):
    """Test that listing users requires authentication."""
    response = await client.get("/api/v1/users")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_users_admin(client: AsyncClient, admin_headers: dict):
    """Test listing users as admin."""
    response = await client.get("/api/v1/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_users_non_admin_forbidden(client: AsyncClient, readonly_headers: dict):
    """Test that non-admin users cannot list users."""
    response = await client.get("/api/v1/users", headers=readonly_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_user(
    client: AsyncClient, admin_headers: dict, admin_user: User
):
    """Test getting a specific user."""
    response = await client.get(
        f"/api/v1/users/{admin_user.id}", headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(admin_user.id)


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient, admin_headers: dict):
    """Test getting a non-existent user returns 404."""
    response = await client.get(
        "/api/v1/users/00000000-0000-0000-0000-000000000000",
        headers=admin_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_user_role(
    client: AsyncClient, admin_headers: dict, readonly_user: User
):
    """Test updating a user's role."""
    response = await client.patch(
        f"/api/v1/users/{readonly_user.id}",
        json={"role": "operator"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "operator"


@pytest.mark.asyncio
async def test_update_user_non_admin_forbidden(
    client: AsyncClient, readonly_headers: dict, readonly_user: User
):
    """Test that non-admin users cannot update other users."""
    response = await client.patch(
        f"/api/v1/users/{readonly_user.id}",
        json={"full_name": "Hacker"},
        headers=readonly_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_deactivate_user(
    client: AsyncClient, admin_headers: dict, readonly_user: User
):
    """Test deactivating a user."""
    response = await client.delete(
        f"/api/v1/users/{readonly_user.id}", headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_deactivate_self_forbidden(
    client: AsyncClient, admin_headers: dict, admin_user: User
):
    """Test that admin cannot deactivate themselves."""
    response = await client.delete(
        f"/api/v1/users/{admin_user.id}", headers=admin_headers
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_my_settings(client: AsyncClient, auth_headers: dict):
    """Test getting personal settings."""
    response = await client.get("/api/v1/users/me/settings", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "email_notifications" in data
    assert "language" in data
    assert "theme" in data


@pytest.mark.asyncio
async def test_update_my_settings(client: AsyncClient, auth_headers: dict):
    """Test updating personal settings."""
    response = await client.patch(
        "/api/v1/users/me/settings",
        json={"theme": "dark", "language": "en"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "dark"
    assert data["language"] == "en"
