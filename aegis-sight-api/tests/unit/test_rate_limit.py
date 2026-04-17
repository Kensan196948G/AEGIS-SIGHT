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
# Module-level constants
# ---------------------------------------------------------------------------


class TestRateLimitConstants:
    def test_rate_default_is_int(self) -> None:
        assert isinstance(RATE_DEFAULT, int)

    def test_rate_telemetry_is_int(self) -> None:
        assert isinstance(RATE_TELEMETRY, int)

    def test_rate_auth_is_int(self) -> None:
        assert isinstance(RATE_AUTH, int)

    def test_window_default_is_int(self) -> None:
        assert isinstance(WINDOW_DEFAULT, int)

    def test_rate_default_value(self) -> None:
        assert RATE_DEFAULT == 100

    def test_rate_telemetry_value(self) -> None:
        assert RATE_TELEMETRY == 1000

    def test_rate_auth_value(self) -> None:
        assert RATE_AUTH == 10

    def test_window_default_value(self) -> None:
        assert WINDOW_DEFAULT == 60

    def test_rate_default_is_positive(self) -> None:
        assert RATE_DEFAULT > 0

    def test_rate_telemetry_greater_than_default(self) -> None:
        assert RATE_TELEMETRY > RATE_DEFAULT

    def test_rate_auth_less_than_default(self) -> None:
        assert RATE_AUTH < RATE_DEFAULT

    def test_window_default_is_positive(self) -> None:
        assert WINDOW_DEFAULT > 0


# ---------------------------------------------------------------------------
# RateLimiter __init__ defaults
# ---------------------------------------------------------------------------


class TestRateLimiterInit:
    def test_default_max_requests(self) -> None:
        limiter = RateLimiter()
        assert limiter.max_requests == RATE_DEFAULT

    def test_default_window_seconds(self) -> None:
        limiter = RateLimiter()
        assert limiter.window_seconds == WINDOW_DEFAULT

    def test_default_key_prefix(self) -> None:
        limiter = RateLimiter()
        assert limiter.key_prefix == "rl"

    def test_custom_max_requests(self) -> None:
        limiter = RateLimiter(max_requests=50)
        assert limiter.max_requests == 50

    def test_custom_window_seconds(self) -> None:
        limiter = RateLimiter(window_seconds=120)
        assert limiter.window_seconds == 120

    def test_custom_key_prefix(self) -> None:
        limiter = RateLimiter(key_prefix="auth")
        assert limiter.key_prefix == "auth"

    def test_all_custom_params(self) -> None:
        limiter = RateLimiter(max_requests=5, window_seconds=30, key_prefix="login")
        assert limiter.max_requests == 5
        assert limiter.window_seconds == 30
        assert limiter.key_prefix == "login"


# ---------------------------------------------------------------------------
# Convenience instances
# ---------------------------------------------------------------------------


class TestConvenienceInstances:
    def test_default_rate_limit_is_rate_limiter(self) -> None:
        assert isinstance(default_rate_limit, RateLimiter)

    def test_telemetry_rate_limit_is_rate_limiter(self) -> None:
        assert isinstance(telemetry_rate_limit, RateLimiter)

    def test_auth_rate_limit_is_rate_limiter(self) -> None:
        assert isinstance(auth_rate_limit, RateLimiter)

    def test_default_instance_max_requests(self) -> None:
        assert default_rate_limit.max_requests == RATE_DEFAULT

    def test_default_instance_window(self) -> None:
        assert default_rate_limit.window_seconds == WINDOW_DEFAULT

    def test_telemetry_instance_max_requests(self) -> None:
        assert telemetry_rate_limit.max_requests == RATE_TELEMETRY

    def test_telemetry_instance_window(self) -> None:
        assert telemetry_rate_limit.window_seconds == WINDOW_DEFAULT

    def test_auth_instance_max_requests(self) -> None:
        assert auth_rate_limit.max_requests == RATE_AUTH

    def test_auth_instance_window(self) -> None:
        assert auth_rate_limit.window_seconds == WINDOW_DEFAULT
