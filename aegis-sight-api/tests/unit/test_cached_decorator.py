"""Unit tests for the cached() decorator in app/services/cache_service.py."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from app.services.cache_service import cached

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_cache(get_value=None, set_value=True, invalidate_value=0):
    """Return a MagicMock CacheService with controllable returns."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=get_value)
    mock.set = AsyncMock(return_value=set_value)
    mock.invalidate_pattern = AsyncMock(return_value=invalidate_value)
    return mock


# ---------------------------------------------------------------------------
# Cache miss — function executed and result stored
# ---------------------------------------------------------------------------


class TestCacheMiss:
    def test_function_called_on_miss(self) -> None:
        call_count = [0]
        mock_cache = _mock_cache(get_value=None)

        @cached(ttl=60, key_prefix="test_miss")
        async def my_func(x: int) -> int:
            call_count[0] += 1
            return x * 2

        with patch("app.services.cache_service._cache", mock_cache):
            result = asyncio.run(my_func(5))
        assert call_count[0] == 1
        assert result == 10

    def test_result_stored_in_cache_on_miss(self) -> None:
        mock_cache = _mock_cache(get_value=None)

        @cached(ttl=120, key_prefix="test_store")
        async def my_func() -> str:
            return "fresh_result"

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func())
        mock_cache.set.assert_awaited_once()

    def test_set_called_with_correct_ttl(self) -> None:
        mock_cache = _mock_cache(get_value=None)

        @cached(ttl=90, key_prefix="ttl_test")
        async def my_func() -> int:
            return 42

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func())
        _, kwargs = mock_cache.set.await_args
        assert kwargs.get("ttl") == 90 or mock_cache.set.call_args[1].get("ttl") == 90 or mock_cache.set.call_args[0][2] == 90

    def test_returns_function_result_on_miss(self) -> None:
        mock_cache = _mock_cache(get_value=None)

        @cached(ttl=60, key_prefix="return_test")
        async def my_func(a: int, b: int) -> int:
            return a + b

        with patch("app.services.cache_service._cache", mock_cache):
            result = asyncio.run(my_func(3, 4))
        assert result == 7


# ---------------------------------------------------------------------------
# Cache hit — function not executed
# ---------------------------------------------------------------------------


class TestCacheHit:
    def test_function_not_called_on_hit(self) -> None:
        call_count = [0]
        mock_cache = _mock_cache(get_value={"cached": True})

        @cached(ttl=60, key_prefix="test_hit")
        async def my_func() -> dict:
            call_count[0] += 1
            return {"fresh": True}

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func())
        assert call_count[0] == 0

    def test_cached_value_returned_on_hit(self) -> None:
        cached_data = [1, 2, 3]
        mock_cache = _mock_cache(get_value=cached_data)

        @cached(ttl=60, key_prefix="test_hit_value")
        async def my_func() -> list:
            return []

        with patch("app.services.cache_service._cache", mock_cache):
            result = asyncio.run(my_func())
        assert result == cached_data

    def test_set_not_called_on_hit(self) -> None:
        mock_cache = _mock_cache(get_value="cached")

        @cached(ttl=60, key_prefix="test_no_set")
        async def my_func() -> str:
            return "fresh"

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func())
        mock_cache.set.assert_not_awaited()

    def test_falsy_string_not_treated_as_miss(self) -> None:
        # Non-None falsy values (empty string) must be treated as a hit
        mock_cache = _mock_cache(get_value="")

        @cached(ttl=60, key_prefix="falsy_test")
        async def my_func() -> str:
            return "should_not_run"

        with patch("app.services.cache_service._cache", mock_cache):
            result = asyncio.run(my_func())
        assert result == ""


# ---------------------------------------------------------------------------
# Graceful degradation — Redis unavailable
# ---------------------------------------------------------------------------


class TestGracefulDegradation:
    def test_function_runs_when_get_raises(self) -> None:
        mock_cache = AsyncMock()
        mock_cache.get = AsyncMock(side_effect=Exception("Redis down"))
        mock_cache.set = AsyncMock(return_value=False)

        @cached(ttl=60, key_prefix="degraded")
        async def my_func() -> str:
            return "fallback"

        with patch("app.services.cache_service._cache", mock_cache):
            result = asyncio.run(my_func())
        assert result == "fallback"

    def test_function_runs_when_set_raises(self) -> None:
        mock_cache = AsyncMock()
        mock_cache.get = AsyncMock(return_value=None)
        mock_cache.set = AsyncMock(side_effect=Exception("Redis write failed"))

        @cached(ttl=60, key_prefix="set_fail")
        async def my_func() -> int:
            return 99

        with patch("app.services.cache_service._cache", mock_cache):
            result = asyncio.run(my_func())
        assert result == 99


# ---------------------------------------------------------------------------
# key_prefix behavior
# ---------------------------------------------------------------------------


class TestKeyPrefix:
    def test_custom_prefix_used_in_cache_key(self) -> None:
        mock_cache = _mock_cache(get_value=None)

        @cached(ttl=60, key_prefix="my_custom_prefix")
        async def my_func() -> int:
            return 1

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func())
        key = mock_cache.get.call_args[0][0]
        assert key.startswith("my_custom_prefix:")

    def test_default_prefix_uses_qualname(self) -> None:
        mock_cache = _mock_cache(get_value=None)

        @cached(ttl=60)
        async def my_func_no_prefix() -> int:
            return 1

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func_no_prefix())
        key = mock_cache.get.call_args[0][0]
        assert "my_func_no_prefix" in key

    def test_different_args_different_keys(self) -> None:
        keys_seen = []
        mock_cache = _mock_cache(get_value=None)
        orig_get = mock_cache.get

        async def _tracking_get(key):
            keys_seen.append(key)
            return None

        mock_cache.get = _tracking_get

        @cached(ttl=60, key_prefix="arg_test")
        async def my_func(x: int) -> int:
            return x

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func(1))
            asyncio.run(my_func(2))
        assert len(keys_seen) == 2
        assert keys_seen[0] != keys_seen[1]


# ---------------------------------------------------------------------------
# invalidate helper
# ---------------------------------------------------------------------------


class TestInvalidateHelper:
    def test_wrapper_has_invalidate_attribute(self) -> None:
        @cached(ttl=60, key_prefix="inv_test")
        async def my_func() -> int:
            return 1

        assert hasattr(my_func, "invalidate")
        assert callable(my_func.invalidate)

    def test_invalidate_calls_invalidate_pattern(self) -> None:
        mock_cache = _mock_cache()

        @cached(ttl=60, key_prefix="inv_prefix")
        async def my_func() -> int:
            return 1

        with patch("app.services.cache_service._cache", mock_cache):
            asyncio.run(my_func.invalidate())
        mock_cache.invalidate_pattern.assert_awaited_once()
        pattern = mock_cache.invalidate_pattern.call_args[0][0]
        assert "inv_prefix" in pattern
        assert pattern.endswith(":*")

    def test_functools_wraps_preserves_name(self) -> None:
        @cached(ttl=60, key_prefix="wrap_test")
        async def my_named_func() -> int:
            return 1

        assert my_named_func.__name__ == "my_named_func"
