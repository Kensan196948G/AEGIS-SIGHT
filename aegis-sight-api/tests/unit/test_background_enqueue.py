"""Unit tests for BackgroundTaskManager enqueue methods — no DB, no network."""

from __future__ import annotations

import asyncio
import logging
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import BackgroundTasks

from app.core.background import BackgroundTaskManager
from app.models.audit_log import AuditAction


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mgr() -> BackgroundTaskManager:
    return BackgroundTaskManager(BackgroundTasks())


def _mock_mgr() -> tuple[BackgroundTaskManager, MagicMock]:
    mock_bg = MagicMock(spec=BackgroundTasks)
    return BackgroundTaskManager(mock_bg), mock_bg


# ---------------------------------------------------------------------------
# enqueue_audit_log
# ---------------------------------------------------------------------------


class TestEnqueueAuditLog:
    def test_calls_add_task(self) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        mgr.enqueue_audit_log(
            db=db,
            action=AuditAction.create,
            resource_type="device",
        )
        mock_bg.add_task.assert_called_once()

    def test_task_is_callable(self) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        mgr.enqueue_audit_log(db=db, action=AuditAction.create, resource_type="device")
        task_func = mock_bg.add_task.call_args[0][0]
        assert callable(task_func)

    def test_enqueue_twice_calls_add_task_twice(self) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        mgr.enqueue_audit_log(db=db, action=AuditAction.create, resource_type="device")
        mgr.enqueue_audit_log(db=db, action=AuditAction.delete, resource_type="user")
        assert mock_bg.add_task.call_count == 2

    def test_optional_params_accepted(self) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        mgr.enqueue_audit_log(
            db=db,
            action=AuditAction.update,
            resource_type="device",
            resource_id="abc-123",
            user_id=uuid.uuid4(),
            detail={"key": "value"},
            ip_address="192.168.0.1",
            user_agent="Mozilla/5.0",
        )
        mock_bg.add_task.assert_called_once()

    def test_closure_calls_audit_service_on_run(self) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        mgr.enqueue_audit_log(
            db=db,
            action=AuditAction.create,
            resource_type="device",
            resource_id="dev-001",
        )
        inner = mock_bg.add_task.call_args[0][0]

        mock_svc = AsyncMock()
        with patch("app.services.audit_service.AuditService", return_value=mock_svc):
            asyncio.run(inner())
        db.commit.assert_awaited_once()

    def test_closure_logs_on_exception(self, caplog: pytest.LogCaptureFixture) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        db.commit.side_effect = RuntimeError("db error")
        mgr.enqueue_audit_log(db=db, action=AuditAction.create, resource_type="device")
        inner = mock_bg.add_task.call_args[0][0]

        mock_svc = AsyncMock()
        with caplog.at_level(logging.ERROR, logger="app.core.background"):
            with patch("app.services.audit_service.AuditService", return_value=mock_svc):
                asyncio.run(inner())
        assert len(caplog.records) > 0

    def test_closure_does_not_raise_on_exception(self) -> None:
        mgr, mock_bg = _mock_mgr()
        db = AsyncMock()
        db.commit.side_effect = RuntimeError("crash")
        mgr.enqueue_audit_log(db=db, action=AuditAction.create, resource_type="device")
        inner = mock_bg.add_task.call_args[0][0]

        mock_svc = AsyncMock()
        with patch("app.services.audit_service.AuditService", return_value=mock_svc):
            asyncio.run(inner())  # must not raise


# ---------------------------------------------------------------------------
# enqueue_notification
# ---------------------------------------------------------------------------


class TestEnqueueNotification:
    def test_calls_add_task(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock()
        mgr.enqueue_notification(coro_func, alert={"severity": "high"})
        mock_bg.add_task.assert_called_once()

    def test_closure_calls_func_with_kwargs(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock()
        mgr.enqueue_notification(coro_func, alert={"severity": "high"})
        inner = mock_bg.add_task.call_args[0][0]
        asyncio.run(inner())
        coro_func.assert_awaited_once_with(alert={"severity": "high"})

    def test_closure_does_not_raise_on_exception(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock(side_effect=Exception("fail"))
        mgr.enqueue_notification(coro_func)
        inner = mock_bg.add_task.call_args[0][0]
        asyncio.run(inner())  # must not raise

    def test_closure_logs_exception(self, caplog: pytest.LogCaptureFixture) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock(side_effect=RuntimeError("boom"))
        coro_func.__name__ = "send_alert"
        mgr.enqueue_notification(coro_func)
        inner = mock_bg.add_task.call_args[0][0]

        with caplog.at_level(logging.ERROR, logger="app.core.background"):
            asyncio.run(inner())
        assert len(caplog.records) > 0

    def test_multiple_notifications_independent(self) -> None:
        mgr, mock_bg = _mock_mgr()
        func_a = AsyncMock()
        func_b = AsyncMock()
        mgr.enqueue_notification(func_a, msg="a")
        mgr.enqueue_notification(func_b, msg="b")
        assert mock_bg.add_task.call_count == 2

    def test_no_kwargs_accepted(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock()
        mgr.enqueue_notification(coro_func)
        inner = mock_bg.add_task.call_args[0][0]
        asyncio.run(inner())
        coro_func.assert_awaited_once_with()


# ---------------------------------------------------------------------------
# enqueue (generic)
# ---------------------------------------------------------------------------


class TestEnqueue:
    def test_calls_add_task(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock()
        mgr.enqueue(coro_func, "arg1", key="val")
        mock_bg.add_task.assert_called_once()

    def test_closure_calls_func_with_args_and_kwargs(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock()
        mgr.enqueue(coro_func, "a", "b", x=1)
        inner = mock_bg.add_task.call_args[0][0]
        asyncio.run(inner())
        coro_func.assert_awaited_once_with("a", "b", x=1)

    def test_closure_does_not_raise_on_exception(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock(side_effect=ValueError("bad"))
        mgr.enqueue(coro_func)
        inner = mock_bg.add_task.call_args[0][0]
        asyncio.run(inner())  # must not raise

    def test_closure_logs_on_exception(self, caplog: pytest.LogCaptureFixture) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock(side_effect=RuntimeError("run failed"))
        coro_func.__name__ = "my_task"
        mgr.enqueue(coro_func)
        inner = mock_bg.add_task.call_args[0][0]

        with caplog.at_level(logging.ERROR, logger="app.core.background"):
            asyncio.run(inner())
        assert len(caplog.records) > 0

    def test_no_args_accepted(self) -> None:
        mgr, mock_bg = _mock_mgr()
        coro_func = AsyncMock()
        mgr.enqueue(coro_func)
        inner = mock_bg.add_task.call_args[0][0]
        asyncio.run(inner())
        coro_func.assert_awaited_once_with()

    def test_enqueue_and_notification_independent(self) -> None:
        mgr, mock_bg = _mock_mgr()
        func_a = AsyncMock()
        func_b = AsyncMock()
        mgr.enqueue(func_a)
        mgr.enqueue_notification(func_b)
        assert mock_bg.add_task.call_count == 2
