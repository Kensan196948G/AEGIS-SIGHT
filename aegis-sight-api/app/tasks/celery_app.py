"""Celery application configuration with Redis broker."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "aegis_sight",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.sam_tasks",
        "app.tasks.procurement_tasks",
        "app.tasks.retention_tasks",
    ],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone (JST = Asia/Tokyo)
    timezone="Asia/Tokyo",
    enable_utc=True,
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Result backend
    result_expires=86400,  # 24 hours
    # Beat schedule
    beat_schedule={
        "sam-daily-reconciliation": {
            "task": "app.tasks.sam_tasks.daily_reconciliation",
            "schedule": crontab(hour=3, minute=0),  # 03:00 JST
            "options": {"queue": "sam"},
        },
        "sam-license-expiry-check": {
            "task": "app.tasks.sam_tasks.check_license_expiry",
            "schedule": crontab(hour=8, minute=0),  # 08:00 JST
            "options": {"queue": "sam"},
        },
        "procurement-status-notification": {
            "task": "app.tasks.procurement_tasks.notify_pending_approvals",
            "schedule": crontab(hour=9, minute=0, day_of_week="1-5"),  # Weekday 09:00
            "options": {"queue": "procurement"},
        },
        "retention-daily-cleanup": {
            "task": "app.tasks.retention_tasks.daily_retention_cleanup",
            "schedule": crontab(hour=2, minute=0),  # 02:00 JST
            "options": {"queue": "retention"},
        },
        "retention-weekly-archive": {
            "task": "app.tasks.retention_tasks.weekly_archive",
            "schedule": crontab(hour=3, minute=0, day_of_week=0),  # Sunday 03:00 JST
            "options": {"queue": "retention"},
        },
        "retention-monthly-stats": {
            "task": "app.tasks.retention_tasks.monthly_stats_report",
            "schedule": crontab(hour=6, minute=0, day_of_month=1),  # 1st of month 06:00 JST
            "options": {"queue": "retention"},
        },
    },
    # Task routes
    task_routes={
        "app.tasks.sam_tasks.*": {"queue": "sam"},
        "app.tasks.procurement_tasks.*": {"queue": "procurement"},
        "app.tasks.retention_tasks.*": {"queue": "retention"},
    },
)
