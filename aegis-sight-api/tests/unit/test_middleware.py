"""Unit tests for app/core/middleware.py — RequestLoggingMiddleware and RequestTimingMiddleware."""

from unittest.mock import MagicMock

from starlette.middleware.base import BaseHTTPMiddleware

from app.core.middleware import RequestLoggingMiddleware, RequestTimingMiddleware


class TestRequestLoggingMiddlewareInit:
    def _make_middleware(self) -> RequestLoggingMiddleware:
        return RequestLoggingMiddleware(app=MagicMock())

    def test_is_base_http_middleware_subclass(self) -> None:
        assert issubclass(RequestLoggingMiddleware, BaseHTTPMiddleware)

    def test_instantiation_succeeds(self) -> None:
        mw = self._make_middleware()
        assert isinstance(mw, RequestLoggingMiddleware)

    def test_has_dispatch_method(self) -> None:
        mw = self._make_middleware()
        assert callable(getattr(mw, "dispatch", None))

    def test_stores_app(self) -> None:
        mock_app = MagicMock()
        mw = RequestLoggingMiddleware(app=mock_app)
        assert mw.app is mock_app

    def test_two_instances_independent(self) -> None:
        mw1 = self._make_middleware()
        mw2 = self._make_middleware()
        assert mw1 is not mw2


class TestRequestTimingMiddlewareInit:
    def _make_middleware(self) -> RequestTimingMiddleware:
        return RequestTimingMiddleware(app=MagicMock())

    def test_is_base_http_middleware_subclass(self) -> None:
        assert issubclass(RequestTimingMiddleware, BaseHTTPMiddleware)

    def test_instantiation_succeeds(self) -> None:
        mw = self._make_middleware()
        assert isinstance(mw, RequestTimingMiddleware)

    def test_has_dispatch_method(self) -> None:
        mw = self._make_middleware()
        assert callable(getattr(mw, "dispatch", None))

    def test_stores_app(self) -> None:
        mock_app = MagicMock()
        mw = RequestTimingMiddleware(app=mock_app)
        assert mw.app is mock_app

    def test_two_instances_independent(self) -> None:
        mw1 = self._make_middleware()
        mw2 = self._make_middleware()
        assert mw1 is not mw2

    def test_response_header_name_constant(self) -> None:
        # The middleware adds X-Process-Time header — verify the name is not misspelled
        import inspect
        source = inspect.getsource(RequestTimingMiddleware)
        assert "X-Process-Time" in source


class TestMiddlewareDistinction:
    def test_logging_and_timing_are_different_classes(self) -> None:
        assert RequestLoggingMiddleware is not RequestTimingMiddleware

    def test_logging_class_name(self) -> None:
        assert RequestLoggingMiddleware.__name__ == "RequestLoggingMiddleware"

    def test_timing_class_name(self) -> None:
        assert RequestTimingMiddleware.__name__ == "RequestTimingMiddleware"
