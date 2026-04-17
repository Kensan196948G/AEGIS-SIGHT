"""Unit tests for app/core/session_manager.py — SessionInfo and SessionManager init."""

from __future__ import annotations

import json

import pytest

from app.core.session_manager import (
    SessionInfo,
    SessionManager,
    _SESSION_PREFIX,
    _USER_SESSIONS_PREFIX,
)


# ---------------------------------------------------------------------------
# Redis key prefix constants
# ---------------------------------------------------------------------------


class TestKeyPrefixConstants:
    def test_session_prefix_is_string(self) -> None:
        assert isinstance(_SESSION_PREFIX, str)

    def test_user_sessions_prefix_is_string(self) -> None:
        assert isinstance(_USER_SESSIONS_PREFIX, str)

    def test_session_prefix_value(self) -> None:
        assert _SESSION_PREFIX == "aegis:session:"

    def test_user_sessions_prefix_value(self) -> None:
        assert _USER_SESSIONS_PREFIX == "aegis:user_sessions:"

    def test_prefixes_are_distinct(self) -> None:
        assert _SESSION_PREFIX != _USER_SESSIONS_PREFIX

    def test_session_prefix_ends_with_colon(self) -> None:
        assert _SESSION_PREFIX.endswith(":")

    def test_user_sessions_prefix_ends_with_colon(self) -> None:
        assert _USER_SESSIONS_PREFIX.endswith(":")


# ---------------------------------------------------------------------------
# SessionInfo.to_dict — field presence
# ---------------------------------------------------------------------------


class TestSessionInfoToDictFields:
    def _make_info(self, **overrides) -> SessionInfo:
        defaults = {
            "session_id": "sid-001",
            "user_id": "user-abc",
            "created_at": "2024-01-01T00:00:00+00:00",
            "last_activity": "2024-01-01T01:00:00+00:00",
            "ip_address": "192.168.0.1",
            "user_agent": "Mozilla/5.0",
        }
        return SessionInfo(**{**defaults, **overrides})

    def test_to_dict_has_session_id(self) -> None:
        d = self._make_info().to_dict()
        assert "session_id" in d

    def test_to_dict_has_user_id(self) -> None:
        d = self._make_info().to_dict()
        assert "user_id" in d

    def test_to_dict_has_created_at(self) -> None:
        d = self._make_info().to_dict()
        assert "created_at" in d

    def test_to_dict_has_last_activity(self) -> None:
        d = self._make_info().to_dict()
        assert "last_activity" in d

    def test_to_dict_has_ip_address(self) -> None:
        d = self._make_info().to_dict()
        assert "ip_address" in d

    def test_to_dict_has_user_agent(self) -> None:
        d = self._make_info().to_dict()
        assert "user_agent" in d

    def test_to_dict_has_exactly_six_keys(self) -> None:
        d = self._make_info().to_dict()
        assert len(d) == 6


# ---------------------------------------------------------------------------
# SessionInfo.to_dict — value correctness
# ---------------------------------------------------------------------------


class TestSessionInfoToDictValues:
    def test_session_id_value(self) -> None:
        info = SessionInfo(
            session_id="test-sid",
            user_id="u1",
            created_at="t1",
            last_activity="t2",
            ip_address="10.0.0.1",
            user_agent="agent",
        )
        assert info.to_dict()["session_id"] == "test-sid"

    def test_user_id_value(self) -> None:
        info = SessionInfo(
            session_id="s",
            user_id="user-xyz",
            created_at="t1",
            last_activity="t2",
            ip_address="ip",
            user_agent="ua",
        )
        assert info.to_dict()["user_id"] == "user-xyz"

    def test_ip_address_value(self) -> None:
        info = SessionInfo(
            session_id="s",
            user_id="u",
            created_at="t1",
            last_activity="t2",
            ip_address="203.0.113.0",
            user_agent="ua",
        )
        assert info.to_dict()["ip_address"] == "203.0.113.0"

    def test_empty_ip_address(self) -> None:
        info = SessionInfo(
            session_id="s",
            user_id="u",
            created_at="t1",
            last_activity="t2",
            ip_address="",
            user_agent="",
        )
        assert info.to_dict()["ip_address"] == ""

    def test_to_dict_is_json_serializable(self) -> None:
        info = SessionInfo(
            session_id="sid",
            user_id="uid",
            created_at="2024-01-01T00:00:00+00:00",
            last_activity="2024-01-01T01:00:00+00:00",
            ip_address="127.0.0.1",
            user_agent="pytest",
        )
        serialized = json.dumps(info.to_dict())
        assert isinstance(serialized, str)

    def test_to_dict_round_trips(self) -> None:
        info = SessionInfo(
            session_id="sid",
            user_id="uid",
            created_at="2024-06-01T10:00:00+00:00",
            last_activity="2024-06-01T11:00:00+00:00",
            ip_address="::1",
            user_agent="curl/8.0",
        )
        d = info.to_dict()
        assert d["session_id"] == info.session_id
        assert d["user_id"] == info.user_id
        assert d["created_at"] == info.created_at
        assert d["last_activity"] == info.last_activity
        assert d["ip_address"] == info.ip_address
        assert d["user_agent"] == info.user_agent


# ---------------------------------------------------------------------------
# SessionManager.__init__ — default parameters
# ---------------------------------------------------------------------------


class TestSessionManagerDefaults:
    def test_default_max_sessions(self) -> None:
        sm = SessionManager(redis_url="redis://localhost/0")
        assert sm.max_sessions == 5

    def test_default_session_ttl(self) -> None:
        sm = SessionManager(redis_url="redis://localhost/0")
        assert sm.session_ttl == 86400

    def test_redis_not_connected_on_init(self) -> None:
        sm = SessionManager(redis_url="redis://localhost/0")
        assert sm._redis is None


# ---------------------------------------------------------------------------
# SessionManager.__init__ — custom parameters
# ---------------------------------------------------------------------------


class TestSessionManagerCustom:
    def test_custom_max_sessions(self) -> None:
        sm = SessionManager(redis_url="redis://localhost/0", max_sessions=3)
        assert sm.max_sessions == 3

    def test_custom_session_ttl(self) -> None:
        sm = SessionManager(redis_url="redis://localhost/0", session_ttl_seconds=3600)
        assert sm.session_ttl == 3600

    def test_custom_redis_url_stored(self) -> None:
        sm = SessionManager(redis_url="redis://custom-host:6380/1")
        assert sm.redis_url == "redis://custom-host:6380/1"

    def test_max_sessions_one(self) -> None:
        sm = SessionManager(redis_url="redis://localhost/0", max_sessions=1)
        assert sm.max_sessions == 1
