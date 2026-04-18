"""Unit tests for app/tasks/celery_app.py Celery configuration."""

from __future__ import annotations

from celery import Celery

from app.tasks.celery_app import celery_app


class TestCeleryAppInstance:
    def test_is_celery_instance(self) -> None:
        assert isinstance(celery_app, Celery)

    def test_app_name_is_aegis_sight(self) -> None:
        assert celery_app.main == "aegis_sight"

    def test_includes_sam_tasks(self) -> None:
        assert "app.tasks.sam_tasks" in celery_app.conf.include

    def test_includes_procurement_tasks(self) -> None:
        assert "app.tasks.procurement_tasks" in celery_app.conf.include

    def test_includes_retention_tasks(self) -> None:
        assert "app.tasks.retention_tasks" in celery_app.conf.include

    def test_includes_three_task_modules(self) -> None:
        assert len(celery_app.conf.include) == 3


class TestCelerySerializationConfig:
    def test_task_serializer_is_json(self) -> None:
        assert celery_app.conf.task_serializer == "json"

    def test_result_serializer_is_json(self) -> None:
        assert celery_app.conf.result_serializer == "json"

    def test_accept_content_includes_json(self) -> None:
        assert "json" in celery_app.conf.accept_content


class TestCeleryTimezoneConfig:
    def test_timezone_is_asia_tokyo(self) -> None:
        assert celery_app.conf.timezone == "Asia/Tokyo"

    def test_enable_utc_is_true(self) -> None:
        assert celery_app.conf.enable_utc is True


class TestCeleryTaskExecutionConfig:
    def test_task_acks_late_is_true(self) -> None:
        assert celery_app.conf.task_acks_late is True

    def test_task_reject_on_worker_lost_is_true(self) -> None:
        assert celery_app.conf.task_reject_on_worker_lost is True

    def test_worker_prefetch_multiplier_is_one(self) -> None:
        assert celery_app.conf.worker_prefetch_multiplier == 1

    def test_result_expires_is_24_hours(self) -> None:
        assert celery_app.conf.result_expires == 86400


class TestCeleryBeatSchedule:
    def test_beat_schedule_has_six_entries(self) -> None:
        assert len(celery_app.conf.beat_schedule) == 6

    def test_sam_daily_reconciliation_exists(self) -> None:
        assert "sam-daily-reconciliation" in celery_app.conf.beat_schedule

    def test_sam_license_expiry_check_exists(self) -> None:
        assert "sam-license-expiry-check" in celery_app.conf.beat_schedule

    def test_procurement_status_notification_exists(self) -> None:
        assert "procurement-status-notification" in celery_app.conf.beat_schedule

    def test_retention_daily_cleanup_exists(self) -> None:
        assert "retention-daily-cleanup" in celery_app.conf.beat_schedule

    def test_retention_weekly_archive_exists(self) -> None:
        assert "retention-weekly-archive" in celery_app.conf.beat_schedule

    def test_retention_monthly_stats_exists(self) -> None:
        assert "retention-monthly-stats" in celery_app.conf.beat_schedule

    def test_sam_daily_reconciliation_task_name(self) -> None:
        entry = celery_app.conf.beat_schedule["sam-daily-reconciliation"]
        assert entry["task"] == "app.tasks.sam_tasks.daily_reconciliation"

    def test_sam_daily_reconciliation_queue(self) -> None:
        entry = celery_app.conf.beat_schedule["sam-daily-reconciliation"]
        assert entry["options"]["queue"] == "sam"

    def test_procurement_notification_task_name(self) -> None:
        entry = celery_app.conf.beat_schedule["procurement-status-notification"]
        assert entry["task"] == "app.tasks.procurement_tasks.notify_pending_approvals"

    def test_procurement_notification_queue(self) -> None:
        entry = celery_app.conf.beat_schedule["procurement-status-notification"]
        assert entry["options"]["queue"] == "procurement"

    def test_retention_daily_cleanup_task_name(self) -> None:
        entry = celery_app.conf.beat_schedule["retention-daily-cleanup"]
        assert entry["task"] == "app.tasks.retention_tasks.daily_retention_cleanup"

    def test_retention_daily_cleanup_queue(self) -> None:
        entry = celery_app.conf.beat_schedule["retention-daily-cleanup"]
        assert entry["options"]["queue"] == "retention"

    def test_retention_weekly_archive_task_name(self) -> None:
        entry = celery_app.conf.beat_schedule["retention-weekly-archive"]
        assert entry["task"] == "app.tasks.retention_tasks.weekly_archive"

    def test_retention_monthly_stats_task_name(self) -> None:
        entry = celery_app.conf.beat_schedule["retention-monthly-stats"]
        assert entry["task"] == "app.tasks.retention_tasks.monthly_stats_report"

    def test_all_entries_have_task_key(self) -> None:
        for name, entry in celery_app.conf.beat_schedule.items():
            assert "task" in entry, f"beat_schedule entry '{name}' missing 'task' key"

    def test_all_entries_have_schedule_key(self) -> None:
        for name, entry in celery_app.conf.beat_schedule.items():
            assert "schedule" in entry, f"beat_schedule entry '{name}' missing 'schedule' key"


class TestCeleryTaskRoutes:
    def test_task_routes_has_three_patterns(self) -> None:
        assert len(celery_app.conf.task_routes) == 3

    def test_sam_tasks_route_to_sam_queue(self) -> None:
        routes = celery_app.conf.task_routes
        assert routes["app.tasks.sam_tasks.*"]["queue"] == "sam"

    def test_procurement_tasks_route_to_procurement_queue(self) -> None:
        routes = celery_app.conf.task_routes
        assert routes["app.tasks.procurement_tasks.*"]["queue"] == "procurement"

    def test_retention_tasks_route_to_retention_queue(self) -> None:
        routes = celery_app.conf.task_routes
        assert routes["app.tasks.retention_tasks.*"]["queue"] == "retention"
