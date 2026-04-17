"""Unit tests for app/core/compression.py — setup_compression function."""

from unittest.mock import MagicMock, call, patch

from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware

from app.core.compression import setup_compression


class TestSetupCompressionDefaults:
    def test_returns_none(self) -> None:
        app = MagicMock(spec=FastAPI)
        result = setup_compression(app)
        assert result is None

    def test_calls_add_middleware(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app)
        app.add_middleware.assert_called_once()

    def test_adds_gzip_middleware(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app)
        args, kwargs = app.add_middleware.call_args
        assert args[0] is GZipMiddleware

    def test_default_minimum_size_is_1000(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app)
        _, kwargs = app.add_middleware.call_args
        assert kwargs.get("minimum_size") == 1000

    def test_accepts_fastapi_app(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app)
        app.add_middleware.assert_called_once_with(GZipMiddleware, minimum_size=1000)


class TestSetupCompressionCustom:
    def test_custom_minimum_size(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app, minimum_size=500)
        _, kwargs = app.add_middleware.call_args
        assert kwargs["minimum_size"] == 500

    def test_large_minimum_size(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app, minimum_size=10000)
        _, kwargs = app.add_middleware.call_args
        assert kwargs["minimum_size"] == 10000

    def test_minimum_size_zero(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app, minimum_size=0)
        _, kwargs = app.add_middleware.call_args
        assert kwargs["minimum_size"] == 0

    def test_add_middleware_called_exactly_once(self) -> None:
        app = MagicMock(spec=FastAPI)
        setup_compression(app, minimum_size=2048)
        assert app.add_middleware.call_count == 1
