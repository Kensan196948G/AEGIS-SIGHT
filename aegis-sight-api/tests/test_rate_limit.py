"""Tests for the sliding-window rate limiter."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.core.rate_limit import (
    RATE_AUTH,
    RATE_DEFAULT,
    RATE_TELEMETRY,
    WINDOW_DEFAULT,
    RateLimiter,
    auth_rate_limit,
    default_rate_limit,
    telemetry_rate_limit,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_request(path: str = "/api/v1/items", client_ip: str = "127.0.0.1"):
    """Build a minimal mock Request object."""
    request = MagicMock()
    request.client.host = client_ip
    request.url.path = path
    return request


def _make_mock_redis(current_count: int = 0):
    """Return a mock Redis client with pipeline support."""
    mock = AsyncMock()
    pipe = AsyncMock()
    pipe.zremrangebyscore = MagicMock(return_value=pipe)
    pipe.zcard = MagicMock(return_value=pipe)
    pipe.zadd = MagicMock(return_value=pipe)
    pipe.expire = MagicMock(return_value=pipe)
    pipe.execute = AsyncMock(return_value=[0, current_count, True, True])
    mock.pipeline = MagicMock(return_value=pipe)
    return mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
class TestRateLimiter:
    @pytest.mark.asyncio
    async def test_allows_request_under_limit(self):
        limiter = RateLimiter(max_requests=100, window_seconds=60)
        mock_redis = _make_mock_redis(current_count=5)

        with patch("app.core.rate_limit._get_redis", return_value=mock_redis):
            # Should not raise
            await limiter(_make_request())

    @pytest.mark.asyncio
    async def test_blocks_request_over_limit(self):
        limiter = RateLimiter(max_requests=10, window_seconds=60)
        mock_redis = _make_mock_redis(current_count=10)

        with patch("app.core.rate_limit._get_redis", return_value=mock_redis):
            with pytest.raises(HTTPException) as exc_info:
                await limiter(_make_request())

            assert exc_info.value.status_code == 429
            assert "Rate limit exceeded" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_retry_after_header(self):
        limiter = RateLimiter(max_requests=10, window_seconds=60)
        mock_redis = _make_mock_redis(current_count=10)

        with patch("app.core.rate_limit._get_redis", return_value=mock_redis):
            with pytest.raises(HTTPException) as exc_info:
                await limiter(_make_request())

            assert "Retry-After" in exc_info.value.headers

    @pytest.mark.asyncio
    async def test_fails_open_on_redis_error(self):
        """When Redis is unavailable, requests should pass through."""
        limiter = RateLimiter(max_requests=10, window_seconds=60)

        with patch(
            "app.core.rate_limit._get_redis",
            side_effect=ConnectionError("Redis down"),
        ):
            # Should not raise
            await limiter(_make_request())

    @pytest.mark.asyncio
    async def test_different_ips_tracked_separately(self):
        """Verify that the key includes client IP."""
        limiter = RateLimiter(max_requests=10, window_seconds=60, key_prefix="rl")
        mock_redis = _make_mock_redis(current_count=0)

        with patch("app.core.rate_limit._get_redis", return_value=mock_redis):
            await limiter(_make_request(client_ip="1.1.1.1"))
            await limiter(_make_request(client_ip="2.2.2.2"))

        # Pipeline was called twice (once per IP)
        assert mock_redis.pipeline.call_count == 2


# ---------------------------------------------------------------------------
# Preset instances
# ---------------------------------------------------------------------------
class TestPresets:
    def test_default_rate_limit(self):
        assert default_rate_limit.max_requests == RATE_DEFAULT
        assert default_rate_limit.window_seconds == WINDOW_DEFAULT

    def test_telemetry_rate_limit(self):
        assert telemetry_rate_limit.max_requests == RATE_TELEMETRY

    def test_auth_rate_limit(self):
        assert auth_rate_limit.max_requests == RATE_AUTH


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
class TestConstants:
    def test_rate_default(self):
        assert RATE_DEFAULT == 100

    def test_rate_telemetry(self):
        assert RATE_TELEMETRY == 1000

    def test_rate_auth(self):
        assert RATE_AUTH == 10

    def test_window_default(self):
        assert WINDOW_DEFAULT == 60
