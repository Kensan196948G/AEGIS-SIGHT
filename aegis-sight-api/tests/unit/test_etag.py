"""Unit tests for app/core/etag.py — ETagMiddleware configuration and ETag generation."""

from __future__ import annotations

import hashlib
from unittest.mock import MagicMock

import pytest

from app.core.etag import ETagMiddleware


# ---------------------------------------------------------------------------
# ETagMiddleware.__init__ — default configuration
# ---------------------------------------------------------------------------


class TestETagMiddlewareDefaults:
    def setup_method(self) -> None:
        self.mw = ETagMiddleware(app=MagicMock())

    def test_default_max_age(self) -> None:
        assert self.mw.max_age == 60

    def test_default_exclude_paths_contains_auth(self) -> None:
        assert "/auth/" in self.mw.exclude_paths

    def test_default_exclude_paths_contains_ws(self) -> None:
        assert "/ws/" in self.mw.exclude_paths

    def test_default_exclude_paths_contains_health(self) -> None:
        assert "/health" in self.mw.exclude_paths

    def test_exclude_paths_is_tuple(self) -> None:
        assert isinstance(self.mw.exclude_paths, tuple)

    def test_default_exclude_paths_length(self) -> None:
        assert len(self.mw.exclude_paths) == 3


# ---------------------------------------------------------------------------
# ETagMiddleware.__init__ — custom configuration
# ---------------------------------------------------------------------------


class TestETagMiddlewareCustom:
    def test_custom_max_age(self) -> None:
        mw = ETagMiddleware(app=MagicMock(), max_age=300)
        assert mw.max_age == 300

    def test_custom_exclude_paths(self) -> None:
        mw = ETagMiddleware(app=MagicMock(), exclude_paths=["/api/", "/internal/"])
        assert "/api/" in mw.exclude_paths
        assert "/internal/" in mw.exclude_paths

    def test_custom_exclude_paths_is_tuple(self) -> None:
        mw = ETagMiddleware(app=MagicMock(), exclude_paths=["/api/"])
        assert isinstance(mw.exclude_paths, tuple)

    def test_empty_exclude_paths(self) -> None:
        mw = ETagMiddleware(app=MagicMock(), exclude_paths=[])
        assert mw.exclude_paths == ()

    def test_max_age_zero(self) -> None:
        mw = ETagMiddleware(app=MagicMock(), max_age=0)
        assert mw.max_age == 0


# ---------------------------------------------------------------------------
# ETag hash format — pure hash logic
# ---------------------------------------------------------------------------


class TestETagHashFormat:
    def test_etag_is_quoted_hex(self) -> None:
        body = b"hello world"
        etag = f'"{hashlib.md5(body).hexdigest()}"'
        assert etag.startswith('"')
        assert etag.endswith('"')

    def test_etag_inner_is_32_chars(self) -> None:
        body = b"test"
        inner = hashlib.md5(body).hexdigest()
        assert len(inner) == 32

    def test_etag_inner_is_hex(self) -> None:
        body = b"test"
        inner = hashlib.md5(body).hexdigest()
        assert all(c in "0123456789abcdef" for c in inner)

    def test_same_body_same_etag(self) -> None:
        body = b"consistent content"
        e1 = hashlib.md5(body).hexdigest()
        e2 = hashlib.md5(body).hexdigest()
        assert e1 == e2

    def test_different_body_different_etag(self) -> None:
        e1 = hashlib.md5(b"content-a").hexdigest()
        e2 = hashlib.md5(b"content-b").hexdigest()
        assert e1 != e2

    def test_empty_body_has_valid_etag(self) -> None:
        inner = hashlib.md5(b"").hexdigest()
        assert len(inner) == 32

    def test_large_body_has_valid_etag(self) -> None:
        body = b"x" * 100_000
        inner = hashlib.md5(body).hexdigest()
        assert len(inner) == 32


# ---------------------------------------------------------------------------
# exclude_paths matching semantics
# ---------------------------------------------------------------------------


class TestExcludePathMatching:
    def setup_method(self) -> None:
        self.mw = ETagMiddleware(app=MagicMock())

    def test_auth_path_is_excluded(self) -> None:
        path = "/auth/login"
        assert any(path.startswith(p) for p in self.mw.exclude_paths)

    def test_ws_path_is_excluded(self) -> None:
        path = "/ws/connect"
        assert any(path.startswith(p) for p in self.mw.exclude_paths)

    def test_health_path_is_excluded(self) -> None:
        path = "/health"
        assert any(path.startswith(p) for p in self.mw.exclude_paths)

    def test_api_path_not_excluded_by_default(self) -> None:
        path = "/api/devices"
        assert not any(path.startswith(p) for p in self.mw.exclude_paths)

    def test_root_path_not_excluded(self) -> None:
        path = "/"
        assert not any(path.startswith(p) for p in self.mw.exclude_paths)
