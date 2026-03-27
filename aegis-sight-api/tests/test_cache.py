"""Tests for the Redis cache service."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.cache_service import (
    CacheService,
    TTL_DASHBOARD_STATS,
    TTL_DEVICE_LIST,
    TTL_LICENSE_LIST,
    _build_cache_key,
    cached,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_mock_redis() -> AsyncMock:
    """Return a mock Redis client with common methods."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock()
    mock.delete = AsyncMock()
    mock.scan_iter = MagicMock()  # sync method that returns async iter

    async def _scan_iter(match=None, count=None):
        for key in []:
            yield key

    mock.scan_iter = _scan_iter
    return mock


# ---------------------------------------------------------------------------
# CacheService.get / set / delete
# ---------------------------------------------------------------------------
class TestCacheService:
    """Unit tests for CacheService core operations."""

    @pytest.mark.asyncio
    async def test_get_returns_none_on_miss(self):
        mock_redis = _make_mock_redis()
        mock_redis.get = AsyncMock(return_value=None)

        svc = CacheService()
        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            result = await svc.get("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_returns_deserialized_value(self):
        mock_redis = _make_mock_redis()
        mock_redis.get = AsyncMock(return_value=json.dumps({"count": 42}))

        svc = CacheService()
        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            result = await svc.get("stats:dashboard")

        assert result == {"count": 42}

    @pytest.mark.asyncio
    async def test_set_stores_serialized_value(self):
        mock_redis = _make_mock_redis()
        mock_redis.set = AsyncMock()

        svc = CacheService()
        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            ok = await svc.set("key", {"a": 1}, ttl=60)

        assert ok is True
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == "key"
        assert json.loads(call_args[0][1]) == {"a": 1}
        assert call_args[1]["ex"] == 60

    @pytest.mark.asyncio
    async def test_delete_removes_key(self):
        mock_redis = _make_mock_redis()

        svc = CacheService()
        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            ok = await svc.delete("key")

        assert ok is True
        mock_redis.delete.assert_called_once_with("key")

    @pytest.mark.asyncio
    async def test_invalidate_pattern_deletes_matching_keys(self):
        mock_redis = _make_mock_redis()

        keys_to_yield = ["licenses:abc", "licenses:def"]

        async def _scan_iter(match=None, count=None):
            for k in keys_to_yield:
                yield k

        mock_redis.scan_iter = _scan_iter
        mock_redis.delete = AsyncMock()

        svc = CacheService()
        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            deleted = await svc.invalidate_pattern("licenses:*")

        assert deleted == 2

    @pytest.mark.asyncio
    async def test_get_graceful_on_redis_error(self):
        """Cache operations should fail silently, returning None."""
        svc = CacheService()
        with patch.object(
            CacheService, "get_redis", side_effect=ConnectionError("down")
        ):
            result = await svc.get("key")

        assert result is None

    @pytest.mark.asyncio
    async def test_set_graceful_on_redis_error(self):
        svc = CacheService()
        with patch.object(
            CacheService, "get_redis", side_effect=ConnectionError("down")
        ):
            ok = await svc.set("key", "val")

        assert ok is False


# ---------------------------------------------------------------------------
# @cached decorator
# ---------------------------------------------------------------------------
class TestCachedDecorator:
    @pytest.mark.asyncio
    async def test_caches_result_on_miss(self):
        mock_redis = _make_mock_redis()
        # First call: miss; second call: should not happen (we set on miss)
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()

        call_count = 0

        @cached(ttl=120, key_prefix="test_fn")
        async def my_func(x: int) -> dict:
            nonlocal call_count
            call_count += 1
            return {"result": x * 2}

        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            result = await my_func(5)

        assert result == {"result": 10}
        assert call_count == 1
        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_cached_on_hit(self):
        mock_redis = _make_mock_redis()
        mock_redis.get = AsyncMock(return_value=json.dumps({"cached": True}))

        call_count = 0

        @cached(ttl=120, key_prefix="test_hit")
        async def my_func() -> dict:
            nonlocal call_count
            call_count += 1
            return {"cached": False}

        with patch.object(CacheService, "get_redis", return_value=mock_redis):
            result = await my_func()

        assert result == {"cached": True}
        assert call_count == 0  # original function never called


# ---------------------------------------------------------------------------
# Key builder
# ---------------------------------------------------------------------------
class TestBuildCacheKey:
    def test_deterministic(self):
        key1 = _build_cache_key("p", (1,), {"a": "b"})
        key2 = _build_cache_key("p", (1,), {"a": "b"})
        assert key1 == key2

    def test_different_args_produce_different_keys(self):
        key1 = _build_cache_key("p", (1,), {})
        key2 = _build_cache_key("p", (2,), {})
        assert key1 != key2

    def test_prefix_included(self):
        key = _build_cache_key("dashboard", (), {})
        assert key.startswith("dashboard:")


# ---------------------------------------------------------------------------
# TTL presets
# ---------------------------------------------------------------------------
class TestTTLPresets:
    def test_dashboard_stats(self):
        assert TTL_DASHBOARD_STATS == 60

    def test_license_list(self):
        assert TTL_LICENSE_LIST == 300

    def test_device_list(self):
        assert TTL_DEVICE_LIST == 120
