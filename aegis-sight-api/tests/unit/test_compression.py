"""Unit tests for app/core/compression.py — setup_compression function."""

import inspect

import pytest
from fastapi import FastAPI

from app.core.compression import setup_compression


class TestSetupCompressionSignature:
    def test_is_callable(self) -> None:
        assert callable(setup_compression)

    def test_accepts_app_param(self) -> None:
        sig = inspect.signature(setup_compression)
        assert "app" in sig.parameters

    def test_accepts_minimum_size_param(self) -> None:
        sig = inspect.signature(setup_compression)
        assert "minimum_size" in sig.parameters

    def test_minimum_size_default_is_1000(self) -> None:
        sig = inspect.signature(setup_compression)
        assert sig.parameters["minimum_size"].default == 1000

    def test_returns_none(self) -> None:
        app = FastAPI()
        result = setup_compression(app)
        assert result is None


class TestSetupCompressionBehavior:
    def test_adds_middleware_to_app(self) -> None:
        app = FastAPI()
        initial_middleware_count = len(app.user_middleware)
        setup_compression(app)
        assert len(app.user_middleware) > initial_middleware_count

    def test_custom_minimum_size(self) -> None:
        app = FastAPI()
        setup_compression(app, minimum_size=500)
        assert len(app.user_middleware) >= 1

    def test_called_twice_adds_two_middlewares(self) -> None:
        app = FastAPI()
        setup_compression(app, minimum_size=1000)
        count_after_first = len(app.user_middleware)
        setup_compression(app, minimum_size=2000)
        assert len(app.user_middleware) > count_after_first

    def test_different_apps_are_independent(self) -> None:
        app1 = FastAPI()
        app2 = FastAPI()
        setup_compression(app1)
        assert len(app2.user_middleware) == 0
