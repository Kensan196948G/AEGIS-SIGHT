"""User session and activity API endpoint tests."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_session import ActivityType, SessionType, UserActivity, UserSession


async def _create_session(
    db: AsyncSession,
    user_name: str = "test-user",
    session_type: SessionType = SessionType.rdp,
    source_ip: str | None = "192.168.1.10",
    source_hostname: str | None = "REMOTE-PC",
    is_active: bool = True,
) -> UserSession:
    """Helper to insert a test user session."""
    session = UserSession(
        user_name=user_name,
        session_type=session_type,
        source_ip=source_ip,
        source_hostname=source_hostname,
        is_active=is_active,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def _create_activity(
    db: AsyncSession,
    user_name: str = "test-user",
    activity_type: ActivityType = ActivityType.app_launch,
    detail: dict | None = None,
) -> UserActivity:
    """Helper to insert a test user activity."""
    activity = UserActivity(
        user_name=user_name,
        activity_type=activity_type,
        detail=detail or {"app_name": "test-app"},
    )
    db.add(activity)
    await db.flush()
    await db.refresh(activity)
    return activity


# ---------------------------------------------------------------------------
# Session list / filter tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_sessions_unauthorized(client: AsyncClient):
    """Test that listing sessions requires authentication."""
    response = await client.get("/api/v1/sessions")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_sessions(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing sessions with authentication."""
    await _create_session(db_session, user_name=f"user-{uuid.uuid4().hex[:6]}")
    response = await client.get("/api/v1/sessions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_sessions_filter_by_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering sessions by type."""
    await _create_session(
        db_session,
        user_name=f"vpn-user-{uuid.uuid4().hex[:6]}",
        session_type=SessionType.vpn,
    )
    response = await client.get(
        "/api/v1/sessions?type=vpn", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["session_type"] == "vpn"


@pytest.mark.asyncio
async def test_list_active_sessions(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing active sessions."""
    await _create_session(db_session, user_name=f"active-{uuid.uuid4().hex[:6]}")
    response = await client.get("/api/v1/sessions/active", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    for item in data["items"]:
        assert item["is_active"] is True


# ---------------------------------------------------------------------------
# Session create / end tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_create_session(client: AsyncClient, auth_headers: dict):
    """Test creating a new session."""
    payload = {
        "user_name": f"new-user-{uuid.uuid4().hex[:6]}",
        "session_type": "rdp",
        "source_ip": "10.0.0.5",
        "source_hostname": "RDP-CLIENT-01",
    }
    response = await client.post(
        "/api/v1/sessions", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_name"] == payload["user_name"]
    assert data["session_type"] == "rdp"
    assert data["is_active"] is True
    assert data["source_ip"] == "10.0.0.5"


@pytest.mark.asyncio
async def test_end_session(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test ending an active session."""
    session = await _create_session(
        db_session, user_name=f"end-user-{uuid.uuid4().hex[:6]}"
    )
    response = await client.patch(
        f"/api/v1/sessions/{session.id}/end",
        json={},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["ended_at"] is not None
    assert data["duration_minutes"] is not None


@pytest.mark.asyncio
async def test_end_session_not_found(client: AsyncClient, auth_headers: dict):
    """Test ending a non-existent session returns 404."""
    response = await client.patch(
        "/api/v1/sessions/00000000-0000-0000-0000-000000000000/end",
        json={},
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Analytics tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_session_analytics(client: AsyncClient, auth_headers: dict):
    """Test session analytics endpoint."""
    response = await client.get(
        "/api/v1/sessions/analytics", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_sessions" in data
    assert "active_sessions" in data
    assert "by_type" in data
    assert "by_user" in data
    assert "peak_hours" in data


# ---------------------------------------------------------------------------
# Activity tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_activities(client: AsyncClient, auth_headers: dict):
    """Test listing activities (empty initially)."""
    response = await client.get(
        "/api/v1/sessions/activities", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_activity(client: AsyncClient, auth_headers: dict):
    """Test recording a new activity."""
    payload = {
        "user_name": f"act-user-{uuid.uuid4().hex[:6]}",
        "activity_type": "web_access",
        "detail": {"url": "https://example.com", "browser": "Chrome"},
    }
    response = await client.post(
        "/api/v1/sessions/activities", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_name"] == payload["user_name"]
    assert data["activity_type"] == "web_access"
    assert data["detail"]["url"] == "https://example.com"


@pytest.mark.asyncio
async def test_list_activities_filter_by_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering activities by type."""
    await _create_activity(
        db_session,
        user_name=f"print-user-{uuid.uuid4().hex[:6]}",
        activity_type=ActivityType.print,
        detail={"printer": "PRINTER-01", "document": "test.pdf"},
    )
    response = await client.get(
        "/api/v1/sessions/activities?type=print", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["activity_type"] == "print"


# ---------------------------------------------------------------------------
# User behavior profile tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_user_behavior_profile(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test user behavior profile endpoint."""
    user_name = f"profile-{uuid.uuid4().hex[:6]}"
    await _create_session(db_session, user_name=user_name)
    await _create_activity(db_session, user_name=user_name)

    response = await client.get(
        f"/api/v1/sessions/users/{user_name}/behavior",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_name"] == user_name
    assert data["total_sessions"] >= 1
    assert "session_types" in data
    assert "activity_types" in data
    assert "recent_activities" in data
    assert data["active_sessions"] >= 0


@pytest.mark.asyncio
async def test_user_behavior_profile_empty(
    client: AsyncClient, auth_headers: dict
):
    """Test behavior profile for a user with no data returns zeros."""
    response = await client.get(
        "/api/v1/sessions/users/nonexistent-user/behavior",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 0
    assert data["total_duration_minutes"] == 0
    assert data["recent_activities"] == []
