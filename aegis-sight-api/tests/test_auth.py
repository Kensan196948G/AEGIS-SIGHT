"""Authentication flow and JWT verification tests."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User, UserRole

# ---- Password hashing ----


class TestPasswordHashing:
    def test_hash_password(self):
        hashed = get_password_hash("mysecretpassword")
        assert hashed != "mysecretpassword"
        assert hashed.startswith("$2b$")

    def test_verify_correct_password(self):
        hashed = get_password_hash("correctpassword")
        assert verify_password("correctpassword", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_different_hashes_for_same_password(self):
        h1 = get_password_hash("samepassword")
        h2 = get_password_hash("samepassword")
        assert h1 != h2  # bcrypt uses random salt


# ---- JWT tokens ----


class TestJWT:
    def test_create_access_token(self):
        token = create_access_token(data={"sub": "test-user-id"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_valid_token(self):
        user_id = str(uuid.uuid4())
        token = create_access_token(data={"sub": user_id})
        payload = decode_access_token(token)
        assert payload["sub"] == user_id
        assert "exp" in payload

    def test_decode_invalid_token_raises(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            decode_access_token("invalid.token.value")
        assert exc_info.value.status_code == 401

    def test_token_contains_expiry(self):
        token = create_access_token(data={"sub": "test"})
        payload = decode_access_token(token)
        assert "exp" in payload

    def test_custom_expiry(self):
        from datetime import timedelta

        token = create_access_token(
            data={"sub": "test"}, expires_delta=timedelta(minutes=5)
        )
        payload = decode_access_token(token)
        assert "exp" in payload


# ---- Login endpoint ----


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    """Test successful login returns a valid JWT token."""
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "test@aegis-sight.local", "password": "testpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: User):
    """Test login with wrong password returns 401."""
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "test@aegis-sight.local", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent email returns 401."""
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session: AsyncSession):
    """Test login with inactive user returns 403."""
    user = User(
        id=uuid.uuid4(),
        email="inactive@aegis-sight.local",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Inactive User",
        role=UserRole.readonly,
        is_active=False,
    )
    db_session.add(user)
    await db_session.flush()

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "inactive@aegis-sight.local", "password": "testpassword123"},
    )
    assert response.status_code == 403


# ---- /me endpoint ----


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict):
    """Test /me returns current user profile."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@aegis-sight.local"
    assert data["full_name"] == "Test User"
    assert data["role"] == "admin"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    """Test /me without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    """Test /me with invalid token returns 401."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_expired_token(client: AsyncClient, test_user: User):
    """Test /me with expired token returns 401."""
    from datetime import timedelta

    token = create_access_token(
        data={"sub": str(test_user.id)},
        expires_delta=timedelta(seconds=-1),
    )
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


# ---- Register endpoint ----


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test registering a new user."""
    payload = {
        "email": "newuser@aegis-sight.local",
        "password": "strongpassword123",
        "full_name": "New User",
        "role": "readonly",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@aegis-sight.local"
    assert data["full_name"] == "New User"
    assert data["role"] == "readonly"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user: User):
    """Test registering with an already-used email returns 409."""
    payload = {
        "email": "test@aegis-sight.local",
        "password": "somepassword",
        "full_name": "Duplicate User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    """Test registering with an invalid email returns 422."""
    payload = {
        "email": "not-an-email",
        "password": "somepassword",
        "full_name": "Bad Email User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
