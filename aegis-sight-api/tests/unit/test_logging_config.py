"""Unit tests for app/core/logging_config.py — JSONFormatter and StructuredLogger."""

from __future__ import annotations

import json
import logging

import pytest

from app.core.logging_config import (
    JSONFormatter,
    StructuredLogger,
    _endpoint_ctx,
    _request_id_ctx,
    _user_id_ctx,
    get_endpoint,
    get_request_id,
    get_user_id,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_record(
    msg: str = "test message",
    level: int = logging.INFO,
    name: str = "test.logger",
    exc_info: tuple = (None, None, None),
) -> logging.LogRecord:
    record = logging.LogRecord(
        name=name,
        level=level,
        pathname="",
        lineno=0,
        msg=msg,
        args=(),
        exc_info=exc_info,
    )
    return record


# ---------------------------------------------------------------------------
# Context variable helpers
# ---------------------------------------------------------------------------


class TestContextVarHelpers:
    def test_request_id_default_none(self) -> None:
        token = _request_id_ctx.set(None)
        try:
            assert get_request_id() is None
        finally:
            _request_id_ctx.reset(token)

    def test_user_id_default_none(self) -> None:
        token = _user_id_ctx.set(None)
        try:
            assert get_user_id() is None
        finally:
            _user_id_ctx.reset(token)

    def test_endpoint_default_none(self) -> None:
        token = _endpoint_ctx.set(None)
        try:
            assert get_endpoint() is None
        finally:
            _endpoint_ctx.reset(token)

    def test_request_id_returns_set_value(self) -> None:
        token = _request_id_ctx.set("req-abc-123")
        try:
            assert get_request_id() == "req-abc-123"
        finally:
            _request_id_ctx.reset(token)

    def test_user_id_returns_set_value(self) -> None:
        token = _user_id_ctx.set("user-xyz")
        try:
            assert get_user_id() == "user-xyz"
        finally:
            _user_id_ctx.reset(token)

    def test_endpoint_returns_set_value(self) -> None:
        token = _endpoint_ctx.set("GET /api/devices")
        try:
            assert get_endpoint() == "GET /api/devices"
        finally:
            _endpoint_ctx.reset(token)


# ---------------------------------------------------------------------------
# JSONFormatter
# ---------------------------------------------------------------------------


class TestJSONFormatterStructure:
    def setup_method(self) -> None:
        self.formatter = JSONFormatter()
        # Clear context vars for isolation
        self._t_rid = _request_id_ctx.set(None)
        self._t_uid = _user_id_ctx.set(None)
        self._t_ep = _endpoint_ctx.set(None)

    def teardown_method(self) -> None:
        _request_id_ctx.reset(self._t_rid)
        _user_id_ctx.reset(self._t_uid)
        _endpoint_ctx.reset(self._t_ep)

    def _format_record(self, **kwargs) -> dict:
        record = _make_record(**kwargs)
        output = self.formatter.format(record)
        return json.loads(output)

    def test_output_is_valid_json(self) -> None:
        record = _make_record()
        output = self.formatter.format(record)
        data = json.loads(output)
        assert isinstance(data, dict)

    def test_timestamp_key_present(self) -> None:
        data = self._format_record()
        assert "timestamp" in data

    def test_level_key_present(self) -> None:
        data = self._format_record(level=logging.WARNING)
        assert data["level"] == "WARNING"

    def test_logger_name_present(self) -> None:
        data = self._format_record(name="my.module")
        assert data["logger"] == "my.module"

    def test_message_present(self) -> None:
        data = self._format_record(msg="hello world")
        assert data["message"] == "hello world"

    def test_request_id_none_when_no_context(self) -> None:
        data = self._format_record()
        assert data["request_id"] is None

    def test_user_id_none_when_no_context(self) -> None:
        data = self._format_record()
        assert data["user_id"] is None

    def test_endpoint_none_when_no_context(self) -> None:
        data = self._format_record()
        assert data["endpoint"] is None

    def test_request_id_from_context(self) -> None:
        _request_id_ctx.reset(self._t_rid)
        self._t_rid = _request_id_ctx.set("req-42")
        data = self._format_record()
        assert data["request_id"] == "req-42"

    def test_user_id_from_context(self) -> None:
        _user_id_ctx.reset(self._t_uid)
        self._t_uid = _user_id_ctx.set("user-99")
        data = self._format_record()
        assert data["user_id"] == "user-99"

    def test_endpoint_from_context(self) -> None:
        _endpoint_ctx.reset(self._t_ep)
        self._t_ep = _endpoint_ctx.set("POST /auth/login")
        data = self._format_record()
        assert data["endpoint"] == "POST /auth/login"


class TestJSONFormatterExtraFields:
    def setup_method(self) -> None:
        self.formatter = JSONFormatter()
        self._t_rid = _request_id_ctx.set(None)
        self._t_uid = _user_id_ctx.set(None)
        self._t_ep = _endpoint_ctx.set(None)

    def teardown_method(self) -> None:
        _request_id_ctx.reset(self._t_rid)
        _user_id_ctx.reset(self._t_uid)
        _endpoint_ctx.reset(self._t_ep)

    def test_extra_fields_merged(self) -> None:
        record = _make_record()
        record._extra_fields = {"device_id": "dev-001", "action": "create"}  # type: ignore[attr-defined]
        data = json.loads(self.formatter.format(record))
        assert data["device_id"] == "dev-001"
        assert data["action"] == "create"

    def test_no_extra_fields_attribute_ok(self) -> None:
        record = _make_record()
        # Ensure no _extra_fields attribute
        if hasattr(record, "_extra_fields"):
            del record._extra_fields
        output = self.formatter.format(record)
        assert json.loads(output)

    def test_exception_info_included(self) -> None:
        try:
            raise ValueError("boom")
        except ValueError:
            import sys
            exc_info = sys.exc_info()
        record = _make_record(exc_info=exc_info)
        data = json.loads(self.formatter.format(record))
        assert "exception" in data
        assert "ValueError" in data["exception"]

    def test_no_exception_key_when_no_exc(self) -> None:
        record = _make_record()
        data = json.loads(self.formatter.format(record))
        assert "exception" not in data


# ---------------------------------------------------------------------------
# StructuredLogger
# ---------------------------------------------------------------------------


class TestStructuredLoggerLevels:
    def setup_method(self) -> None:
        self.stdlib_logger = logging.getLogger("test.structured.unit")
        self.stdlib_logger.setLevel(logging.DEBUG)
        self.stdlib_logger.propagate = False  # isolate from pytest log capture
        self.records: list[logging.LogRecord] = []

        class CapturingHandler(logging.Handler):
            def __init__(self, records: list) -> None:
                super().__init__()
                self._records = records

            def emit(self, record: logging.LogRecord) -> None:
                self._records.append(record)

        self.cap = CapturingHandler(self.records)
        self.stdlib_logger.addHandler(self.cap)
        self.logger = StructuredLogger(self.stdlib_logger)

    def teardown_method(self) -> None:
        self.stdlib_logger.removeHandler(self.cap)
        self.stdlib_logger.propagate = True

    def test_info_emits_record(self) -> None:
        self.logger.info("info msg")
        assert len(self.records) == 1
        assert self.records[0].getMessage() == "info msg"

    def test_debug_emits_record(self) -> None:
        self.logger.debug("debug msg")
        assert any(r.levelno == logging.DEBUG for r in self.records)

    def test_warning_emits_record(self) -> None:
        self.logger.warning("warn msg")
        assert any(r.levelno == logging.WARNING for r in self.records)

    def test_error_emits_record(self) -> None:
        self.logger.error("err msg")
        assert any(r.levelno == logging.ERROR for r in self.records)

    def test_exception_sets_exc_info(self) -> None:
        try:
            raise RuntimeError("oops")
        except RuntimeError:
            self.logger.exception("caught it")
        assert len(self.records) == 1
        # exc_info is passed as True (bool) — StructuredLogger stores it as-is
        assert self.records[0].exc_info

    def test_extra_kwargs_stored_as_extra_fields(self) -> None:
        self.logger.info("msg", device_id="d-1", action="login")
        assert len(self.records) == 1
        assert hasattr(self.records[0], "_extra_fields")
        assert self.records[0]._extra_fields["device_id"] == "d-1"  # type: ignore[attr-defined]
        assert self.records[0]._extra_fields["action"] == "login"  # type: ignore[attr-defined]

    def test_debug_not_emitted_when_level_info(self) -> None:
        self.stdlib_logger.setLevel(logging.INFO)
        self.logger.debug("should not appear")
        assert len(self.records) == 0


# ---------------------------------------------------------------------------
# SessionInfo.to_dict (pure dataclass method)
# ---------------------------------------------------------------------------


class TestSessionInfoToDict:
    def test_to_dict_all_keys_present(self) -> None:
        from app.core.session_manager import SessionInfo

        s = SessionInfo(
            session_id="sid-1",
            user_id="uid-1",
            created_at="2026-01-01T00:00:00+00:00",
            last_activity="2026-01-01T01:00:00+00:00",
            ip_address="10.0.0.1",
            user_agent="Mozilla/5.0",
        )
        d = s.to_dict()
        assert d["session_id"] == "sid-1"
        assert d["user_id"] == "uid-1"
        assert d["created_at"] == "2026-01-01T00:00:00+00:00"
        assert d["last_activity"] == "2026-01-01T01:00:00+00:00"
        assert d["ip_address"] == "10.0.0.1"
        assert d["user_agent"] == "Mozilla/5.0"

    def test_to_dict_returns_dict_type(self) -> None:
        from app.core.session_manager import SessionInfo

        s = SessionInfo(
            session_id="s", user_id="u", created_at="t", last_activity="t",
            ip_address="", user_agent="",
        )
        assert isinstance(s.to_dict(), dict)

    def test_to_dict_has_six_keys(self) -> None:
        from app.core.session_manager import SessionInfo

        s = SessionInfo(
            session_id="s", user_id="u", created_at="t", last_activity="t",
            ip_address="", user_agent="",
        )
        assert len(s.to_dict()) == 6
