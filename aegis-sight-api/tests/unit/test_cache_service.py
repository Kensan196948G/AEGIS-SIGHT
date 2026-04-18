"""Unit tests for app/services/cache_service.py — pure function and constants."""

from __future__ import annotations

from datetime import datetime

from app.services.cache_service import (
    TTL_DASHBOARD_STATS,
    TTL_DEVICE_LIST,
    TTL_LICENSE_LIST,
    _build_cache_key,
)

# ---------------------------------------------------------------------------
# TTL constants
# ---------------------------------------------------------------------------


class TestTtlConstants:
    def test_dashboard_stats_is_positive(self) -> None:
        assert TTL_DASHBOARD_STATS > 0

    def test_license_list_is_positive(self) -> None:
        assert TTL_LICENSE_LIST > 0

    def test_device_list_is_positive(self) -> None:
        assert TTL_DEVICE_LIST > 0

    def test_dashboard_stats_value(self) -> None:
        assert TTL_DASHBOARD_STATS == 60

    def test_license_list_value(self) -> None:
        assert TTL_LICENSE_LIST == 300

    def test_device_list_value(self) -> None:
        assert TTL_DEVICE_LIST == 120

    def test_license_list_longer_than_dashboard(self) -> None:
        assert TTL_LICENSE_LIST > TTL_DASHBOARD_STATS


# ---------------------------------------------------------------------------
# _build_cache_key — determinism
# ---------------------------------------------------------------------------


class TestBuildCacheKeyDeterminism:
    def test_same_args_returns_same_key(self) -> None:
        k1 = _build_cache_key("pfx", (1, "a"), {"x": 2})
        k2 = _build_cache_key("pfx", (1, "a"), {"x": 2})
        assert k1 == k2

    def test_returns_string(self) -> None:
        key = _build_cache_key("prefix", (), {})
        assert isinstance(key, str)

    def test_key_starts_with_prefix(self) -> None:
        key = _build_cache_key("myprefix", (), {})
        assert key.startswith("myprefix:")

    def test_key_format_is_prefix_colon_hex(self) -> None:
        key = _build_cache_key("p", (), {})
        prefix, digest = key.split(":", 1)
        assert prefix == "p"
        assert len(digest) == 32
        assert all(c in "0123456789abcdef" for c in digest)


# ---------------------------------------------------------------------------
# _build_cache_key — prefix differentiation
# ---------------------------------------------------------------------------


class TestBuildCacheKeyPrefixDiff:
    def test_different_prefix_yields_different_key(self) -> None:
        k1 = _build_cache_key("alpha", (1,), {})
        k2 = _build_cache_key("beta", (1,), {})
        assert k1 != k2

    def test_empty_prefix_is_valid(self) -> None:
        key = _build_cache_key("", (), {})
        assert key.startswith(":")


# ---------------------------------------------------------------------------
# _build_cache_key — args differentiation
# ---------------------------------------------------------------------------


class TestBuildCacheKeyArgsDiff:
    def test_different_args_yield_different_keys(self) -> None:
        k1 = _build_cache_key("p", (1, 2), {})
        k2 = _build_cache_key("p", (1, 3), {})
        assert k1 != k2

    def test_empty_vs_nonempty_args_differ(self) -> None:
        k1 = _build_cache_key("p", (), {})
        k2 = _build_cache_key("p", (1,), {})
        assert k1 != k2

    def test_arg_order_matters(self) -> None:
        k1 = _build_cache_key("p", (1, 2), {})
        k2 = _build_cache_key("p", (2, 1), {})
        assert k1 != k2

    def test_string_vs_int_arg_differs(self) -> None:
        k1 = _build_cache_key("p", (1,), {})
        k2 = _build_cache_key("p", ("1",), {})
        assert k1 != k2


# ---------------------------------------------------------------------------
# _build_cache_key — kwargs differentiation
# ---------------------------------------------------------------------------


class TestBuildCacheKeyKwargsDiff:
    def test_different_kwargs_yield_different_keys(self) -> None:
        k1 = _build_cache_key("p", (), {"x": 1})
        k2 = _build_cache_key("p", (), {"x": 2})
        assert k1 != k2

    def test_kwargs_key_order_independent(self) -> None:
        # sort_keys=True guarantees order-independence
        k1 = _build_cache_key("p", (), {"a": 1, "b": 2})
        k2 = _build_cache_key("p", (), {"b": 2, "a": 1})
        assert k1 == k2

    def test_empty_kwargs_differ_from_nonempty(self) -> None:
        k1 = _build_cache_key("p", (), {})
        k2 = _build_cache_key("p", (), {"x": 1})
        assert k1 != k2

    def test_args_and_kwargs_combined(self) -> None:
        k1 = _build_cache_key("p", (1, 2), {"x": 3})
        k2 = _build_cache_key("p", (1, 2), {"x": 3})
        assert k1 == k2


# ---------------------------------------------------------------------------
# _build_cache_key — non-JSON-serializable types (default=str)
# ---------------------------------------------------------------------------


class TestBuildCacheKeyNonSerializable:
    def test_datetime_arg_does_not_raise(self) -> None:
        dt = datetime(2024, 1, 1, 12, 0, 0)
        key = _build_cache_key("dt", (dt,), {})
        assert isinstance(key, str)

    def test_datetime_kwarg_does_not_raise(self) -> None:
        dt = datetime(2024, 6, 15)
        key = _build_cache_key("dt", (), {"ts": dt})
        assert isinstance(key, str)

    def test_different_datetimes_yield_different_keys(self) -> None:
        dt1 = datetime(2024, 1, 1)
        dt2 = datetime(2024, 1, 2)
        k1 = _build_cache_key("dt", (dt1,), {})
        k2 = _build_cache_key("dt", (dt2,), {})
        assert k1 != k2
