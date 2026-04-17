"""Unit tests for app/core/rate_limit.py — constants and RateLimiter init."""

import pytest

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
# Rate preset constants
# ---------------------------------------------------------------------------


class TestRateConstants:
    def test_rate_default_is_positive(self) -> None:
        assert RATE_DEFAULT > 0

    def test_rate_telemetry_is_positive(self) -> None:
        assert RATE_TELEMETRY > 0

    def test_rate_auth_is_positive(self) -> None:
        assert RATE_AUTH > 0

    def test_window_default_is_positive(self) -> None:
        assert WINDOW_DEFAULT > 0

    def test_rate_default_value(self) -> None:
        assert RATE_DEFAULT == 100

    def test_rate_telemetry_value(self) -> None:
        assert RATE_TELEMETRY == 1000

    def test_rate_auth_value(self) -> None:
        assert RATE_AUTH == 10

    def test_window_default_value(self) -> None:
        assert WINDOW_DEFAULT == 60

    def test_telemetry_exceeds_default(self) -> None:
        assert RATE_TELEMETRY > RATE_DEFAULT

    def test_auth_is_stricter_than_default(self) -> None:
        assert RATE_AUTH < RATE_DEFAULT

    def test_auth_is_stricter_than_telemetry(self) -> None:
        assert RATE_AUTH < RATE_TELEMETRY


# ---------------------------------------------------------------------------
# RateLimiter.__init__ — default parameters
# ---------------------------------------------------------------------------


class TestRateLimiterDefaults:
    def test_default_max_requests(self) -> None:
        rl = RateLimiter()
        assert rl.max_requests == RATE_DEFAULT

    def test_default_window_seconds(self) -> None:
        rl = RateLimiter()
        assert rl.window_seconds == WINDOW_DEFAULT

    def test_default_key_prefix(self) -> None:
        rl = RateLimiter()
        assert rl.key_prefix == "rl"


# ---------------------------------------------------------------------------
# RateLimiter.__init__ — custom parameters
# ---------------------------------------------------------------------------


class TestRateLimiterCustom:
    def test_custom_max_requests(self) -> None:
        rl = RateLimiter(max_requests=50)
        assert rl.max_requests == 50

    def test_custom_window_seconds(self) -> None:
        rl = RateLimiter(window_seconds=120)
        assert rl.window_seconds == 120

    def test_custom_key_prefix(self) -> None:
        rl = RateLimiter(key_prefix="api")
        assert rl.key_prefix == "api"

    def test_all_custom_params(self) -> None:
        rl = RateLimiter(max_requests=200, window_seconds=30, key_prefix="custom")
        assert rl.max_requests == 200
        assert rl.window_seconds == 30
        assert rl.key_prefix == "custom"

    def test_auth_preset_values(self) -> None:
        rl = RateLimiter(max_requests=RATE_AUTH, window_seconds=WINDOW_DEFAULT)
        assert rl.max_requests == RATE_AUTH

    def test_telemetry_preset_values(self) -> None:
        rl = RateLimiter(max_requests=RATE_TELEMETRY, window_seconds=WINDOW_DEFAULT)
        assert rl.max_requests == RATE_TELEMETRY


# ---------------------------------------------------------------------------
# Convenience instance — default_rate_limit
# ---------------------------------------------------------------------------


class TestDefaultRateLimitInstance:
    def test_is_rate_limiter(self) -> None:
        assert isinstance(default_rate_limit, RateLimiter)

    def test_max_requests(self) -> None:
        assert default_rate_limit.max_requests == RATE_DEFAULT

    def test_window_seconds(self) -> None:
        assert default_rate_limit.window_seconds == WINDOW_DEFAULT


# ---------------------------------------------------------------------------
# Convenience instance — telemetry_rate_limit
# ---------------------------------------------------------------------------


class TestTelemetryRateLimitInstance:
    def test_is_rate_limiter(self) -> None:
        assert isinstance(telemetry_rate_limit, RateLimiter)

    def test_max_requests(self) -> None:
        assert telemetry_rate_limit.max_requests == RATE_TELEMETRY

    def test_exceeds_default_limit(self) -> None:
        assert telemetry_rate_limit.max_requests > default_rate_limit.max_requests


# ---------------------------------------------------------------------------
# Convenience instance — auth_rate_limit
# ---------------------------------------------------------------------------


class TestAuthRateLimitInstance:
    def test_is_rate_limiter(self) -> None:
        assert isinstance(auth_rate_limit, RateLimiter)

    def test_max_requests(self) -> None:
        assert auth_rate_limit.max_requests == RATE_AUTH

    def test_stricter_than_default(self) -> None:
        assert auth_rate_limit.max_requests < default_rate_limit.max_requests

    def test_stricter_than_telemetry(self) -> None:
        assert auth_rate_limit.max_requests < telemetry_rate_limit.max_requests
