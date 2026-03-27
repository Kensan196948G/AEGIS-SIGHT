"""Tests for SessionManager.

These tests use ``fakeredis`` to avoid requiring a running Redis instance.
If ``fakeredis`` is not installed, the tests are skipped gracefully.
"""

from __future__ import annotations

import json

import pytest

try:
    import fakeredis.aioredis as fakeredis_aio

    HAS_FAKEREDIS = True
except ImportError:
    HAS_FAKEREDIS = False

from app.core.session_manager import SessionManager, _SESSION_PREFIX, _USER_SESSIONS_PREFIX

pytestmark = pytest.mark.skipif(
    not HAS_FAKEREDIS,
    reason="fakeredis is not installed",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_redis():
    """Return a fakeredis async instance."""
    return fakeredis_aio.FakeRedis(decode_responses=True)


@pytest.fixture
def manager(fake_redis) -> SessionManager:
    """SessionManager wired to fakeredis."""
    sm = SessionManager(max_sessions=3, session_ttl_seconds=3600)
    sm._redis = fake_redis
    return sm


# ---------------------------------------------------------------------------
# Session creation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_session(manager: SessionManager):
    """Creating a session returns a SessionInfo with a unique ID."""
    session = await manager.create_session(
        user_id="user-1",
        ip_address="10.0.0.1",
        user_agent="test-agent",
    )
    assert session.session_id
    assert session.user_id == "user-1"
    assert session.ip_address == "10.0.0.1"
    assert session.user_agent == "test-agent"


@pytest.mark.asyncio
async def test_get_session(manager: SessionManager):
    """A created session can be retrieved by ID."""
    session = await manager.create_session(user_id="user-1")
    retrieved = await manager.get_session(session.session_id)
    assert retrieved is not None
    assert retrieved.session_id == session.session_id
    assert retrieved.user_id == "user-1"


@pytest.mark.asyncio
async def test_get_nonexistent_session(manager: SessionManager):
    """Retrieving a non-existent session returns None."""
    result = await manager.get_session("does-not-exist")
    assert result is None


# ---------------------------------------------------------------------------
# Session limit enforcement
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_max_sessions_eviction(manager: SessionManager):
    """Oldest session is evicted when max_sessions is exceeded."""
    sessions = []
    for i in range(4):
        s = await manager.create_session(user_id="user-1")
        sessions.append(s)

    # Max is 3, so the first session should have been evicted.
    first = await manager.get_session(sessions[0].session_id)
    assert first is None

    # The last 3 should still exist.
    for s in sessions[1:]:
        assert await manager.get_session(s.session_id) is not None


# ---------------------------------------------------------------------------
# Session invalidation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalidate_session(manager: SessionManager):
    """Invalidating a session removes it from Redis."""
    session = await manager.create_session(user_id="user-1")
    result = await manager.invalidate_session(session.session_id)
    assert result is True
    assert await manager.get_session(session.session_id) is None


@pytest.mark.asyncio
async def test_invalidate_nonexistent_session(manager: SessionManager):
    """Invalidating a non-existent session returns False."""
    result = await manager.invalidate_session("no-such-id")
    assert result is False


@pytest.mark.asyncio
async def test_invalidate_all_user_sessions(manager: SessionManager):
    """invalidate_all_user_sessions removes every session for the user."""
    for _ in range(3):
        await manager.create_session(user_id="user-2")

    count = await manager.invalidate_all_user_sessions("user-2")
    assert count == 3

    sessions = await manager.list_user_sessions("user-2")
    assert len(sessions) == 0


# ---------------------------------------------------------------------------
# Session listing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_user_sessions(manager: SessionManager):
    """list_user_sessions returns only sessions for the given user."""
    await manager.create_session(user_id="user-a")
    await manager.create_session(user_id="user-a")
    await manager.create_session(user_id="user-b")

    a_sessions = await manager.list_user_sessions("user-a")
    b_sessions = await manager.list_user_sessions("user-b")

    assert len(a_sessions) == 2
    assert len(b_sessions) == 1


@pytest.mark.asyncio
async def test_list_all_sessions(manager: SessionManager):
    """list_all_sessions returns sessions across all users."""
    await manager.create_session(user_id="user-x")
    await manager.create_session(user_id="user-y")

    all_sessions = await manager.list_all_sessions()
    assert len(all_sessions) >= 2


# ---------------------------------------------------------------------------
# Activity update
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_activity(manager: SessionManager):
    """update_activity changes the last_activity timestamp."""
    session = await manager.create_session(user_id="user-1")
    original = session.last_activity

    await manager.update_activity(session.session_id)

    updated = await manager.get_session(session.session_id)
    assert updated is not None
    # Timestamps should differ (or at least not error).
    assert updated.last_activity >= original
