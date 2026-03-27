"""
Structured logging configuration for AEGIS-SIGHT API.

Provides JSON-structured log output with automatic request context
(request_id, user_id, endpoint) for correlation and observability.

Usage::

    from app.core.logging_config import get_logger, RequestContextMiddleware

    logger = get_logger(__name__)
    logger.info("device created", device_id=str(device.id))

Add ``RequestContextMiddleware`` to the FastAPI app to auto-populate
request context fields (X-Request-ID, endpoint, user_id).
"""

from __future__ import annotations

import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# ---------------------------------------------------------------------------
# Context variables (populated per-request by middleware)
# ---------------------------------------------------------------------------
_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
_user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)
_endpoint_ctx: ContextVar[str | None] = ContextVar("endpoint", default=None)


def get_request_id() -> str | None:
    return _request_id_ctx.get()


def get_user_id() -> str | None:
    return _user_id_ctx.get()


def get_endpoint() -> str | None:
    return _endpoint_ctx.get()


# ---------------------------------------------------------------------------
# JSON Formatter
# ---------------------------------------------------------------------------
class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON with structured context."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": get_request_id(),
            "user_id": get_user_id(),
            "endpoint": get_endpoint(),
        }

        # Merge extra fields attached via StructuredLogger
        if hasattr(record, "_extra_fields"):
            log_entry.update(record._extra_fields)

        # Include exception info when present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Structured Logger wrapper
# ---------------------------------------------------------------------------
class StructuredLogger:
    """
    Thin wrapper around stdlib ``logging.Logger`` that accepts keyword
    arguments as structured context fields (similar to structlog).
    """

    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def _log(self, level: int, msg: str, kwargs: dict[str, Any]) -> None:
        extra_fields = {k: v for k, v in kwargs.items() if k != "exc_info"}
        exc_info = kwargs.get("exc_info", False)
        record = self._logger.makeRecord(
            name=self._logger.name,
            level=level,
            fn="",
            lno=0,
            msg=msg,
            args=(),
            exc_info=exc_info,  # type: ignore[arg-type]
        )
        record._extra_fields = extra_fields  # type: ignore[attr-defined]
        self._logger.handle(record)

    def debug(self, msg: str, **kwargs: Any) -> None:
        if self._logger.isEnabledFor(logging.DEBUG):
            self._log(logging.DEBUG, msg, kwargs)

    def info(self, msg: str, **kwargs: Any) -> None:
        if self._logger.isEnabledFor(logging.INFO):
            self._log(logging.INFO, msg, kwargs)

    def warning(self, msg: str, **kwargs: Any) -> None:
        if self._logger.isEnabledFor(logging.WARNING):
            self._log(logging.WARNING, msg, kwargs)

    def error(self, msg: str, **kwargs: Any) -> None:
        if self._logger.isEnabledFor(logging.ERROR):
            self._log(logging.ERROR, msg, kwargs)

    def exception(self, msg: str, **kwargs: Any) -> None:
        kwargs["exc_info"] = True
        self._log(logging.ERROR, msg, kwargs)


# ---------------------------------------------------------------------------
# Public factory
# ---------------------------------------------------------------------------
def get_logger(name: str) -> StructuredLogger:
    """Return a :class:`StructuredLogger` for *name*."""
    return StructuredLogger(logging.getLogger(name))


# ---------------------------------------------------------------------------
# Setup helpers
# ---------------------------------------------------------------------------
LOG_DIR = Path("logs")


def setup_logging(*, level: str = "INFO") -> None:
    """
    Configure the root logger with JSON output to both stdout and a file.

    Call once at application startup (e.g. in ``main.py``).
    """
    LOG_DIR.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers to avoid duplicates on reload
    root.handlers.clear()

    formatter = JSONFormatter()

    # stdout handler
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    root.addHandler(stdout_handler)

    # File handler
    file_handler = logging.FileHandler(
        LOG_DIR / "aegis-sight.log", encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)


# ---------------------------------------------------------------------------
# Request-context middleware
# ---------------------------------------------------------------------------
class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Populates per-request context variables used by the JSON formatter:

    - ``request_id`` -- from ``X-Request-ID`` header or auto-generated UUID4
    - ``endpoint`` -- the URL path
    - ``user_id`` -- extracted from ``request.state.user_id`` if set by auth
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        token_rid = _request_id_ctx.set(request_id)
        token_ep = _endpoint_ctx.set(f"{request.method} {request.url.path}")

        # user_id is set downstream by auth; default to None
        token_uid = _user_id_ctx.set(None)

        try:
            response = await call_next(request)
            # Propagate request_id back in response headers
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            _request_id_ctx.reset(token_rid)
            _endpoint_ctx.reset(token_ep)
            _user_id_ctx.reset(token_uid)


def set_user_id(user_id: str) -> None:
    """Call from auth dependency to record user in log context."""
    _user_id_ctx.set(user_id)
