"""Unit tests for app/core/middleware.py — middleware class structure."""

import inspect

import pytest
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.middleware import RequestLoggingMiddleware, RequestTimingMiddleware


class TestRequestLoggingMiddleware:
    def test_is_class(self) -> None:
        assert inspect.isclass(RequestLoggingMiddleware)

    def test_inherits_base_http_middleware(self) -> None:
        assert issubclass(RequestLoggingMiddleware, BaseHTTPMiddleware)

    def test_has_dispatch_method(self) -> None:
        assert hasattr(RequestLoggingMiddleware, "dispatch")

    def test_dispatch_is_coroutine_function(self) -> None:
        assert inspect.iscoroutinefunction(RequestLoggingMiddleware.dispatch)

    def test_dispatch_accepts_request_param(self) -> None:
        sig = inspect.signature(RequestLoggingMiddleware.dispatch)
        assert "request" in sig.parameters

    def test_dispatch_accepts_call_next_param(self) -> None:
        sig = inspect.signature(RequestLoggingMiddleware.dispatch)
        assert "call_next" in sig.parameters


class TestRequestTimingMiddleware:
    def test_is_class(self) -> None:
        assert inspect.isclass(RequestTimingMiddleware)

    def test_inherits_base_http_middleware(self) -> None:
        assert issubclass(RequestTimingMiddleware, BaseHTTPMiddleware)

    def test_has_dispatch_method(self) -> None:
        assert hasattr(RequestTimingMiddleware, "dispatch")

    def test_dispatch_is_coroutine_function(self) -> None:
        assert inspect.iscoroutinefunction(RequestTimingMiddleware.dispatch)

    def test_dispatch_accepts_request_param(self) -> None:
        sig = inspect.signature(RequestTimingMiddleware.dispatch)
        assert "request" in sig.parameters

    def test_dispatch_accepts_call_next_param(self) -> None:
        sig = inspect.signature(RequestTimingMiddleware.dispatch)
        assert "call_next" in sig.parameters


class TestMiddlewaresAreDistinct:
    def test_classes_are_different(self) -> None:
        assert RequestLoggingMiddleware is not RequestTimingMiddleware

    def test_both_are_middleware_subclasses(self) -> None:
        assert issubclass(RequestLoggingMiddleware, BaseHTTPMiddleware)
        assert issubclass(RequestTimingMiddleware, BaseHTTPMiddleware)
