"""Unit tests for app/core/background.py — BackgroundTaskManager init."""

from unittest.mock import MagicMock

from fastapi import BackgroundTasks

from app.core.background import BackgroundTaskManager


class TestBackgroundTaskManagerInit:
    def _make_manager(self) -> BackgroundTaskManager:
        return BackgroundTaskManager(BackgroundTasks())

    def test_init_stores_background_tasks(self) -> None:
        bg = BackgroundTasks()
        mgr = BackgroundTaskManager(bg)
        assert mgr._bg is bg

    def test_init_accepts_background_tasks_instance(self) -> None:
        mgr = self._make_manager()
        assert isinstance(mgr, BackgroundTaskManager)

    def test_init_with_mock_background_tasks(self) -> None:
        mock_bg = MagicMock(spec=BackgroundTasks)
        mgr = BackgroundTaskManager(mock_bg)
        assert mgr._bg is mock_bg

    def test_multiple_managers_independent(self) -> None:
        bg1 = BackgroundTasks()
        bg2 = BackgroundTasks()
        mgr1 = BackgroundTaskManager(bg1)
        mgr2 = BackgroundTaskManager(bg2)
        assert mgr1._bg is not mgr2._bg

    def test_has_enqueue_audit_log_method(self) -> None:
        mgr = self._make_manager()
        assert callable(getattr(mgr, "enqueue_audit_log", None))

    def test_has_enqueue_notification_method(self) -> None:
        mgr = self._make_manager()
        assert callable(getattr(mgr, "enqueue_notification", None))

    def test_bg_attribute_type_after_init(self) -> None:
        bg = BackgroundTasks()
        mgr = BackgroundTaskManager(bg)
        assert isinstance(mgr._bg, BackgroundTasks)
