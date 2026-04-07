"""
Celery tasks for automated data retention management.

Schedules:
  - daily_retention_cleanup   -- every day at 02:00 JST
  - weekly_archive            -- every Sunday at 03:00 JST
  - monthly_stats_report      -- 1st of each month at 06:00 JST
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.services.retention_service import RetentionService
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create a standalone async session factory for Celery tasks."""
    engine = create_async_engine(settings.DATABASE_URL, pool_size=5, max_overflow=2)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Core async helpers
# ---------------------------------------------------------------------------

async def _run_daily_cleanup() -> dict:
    """Execute daily retention cleanup for logs and snapshots."""
    session_factory = _get_async_session_factory()
    async with session_factory() as session:
        svc = RetentionService(session)
        logs_result = await svc.cleanup_old_logs(retention_days=1095)
        snapshots_result = await svc.cleanup_old_snapshots(retention_days=365)
        await session.commit()

    return {
        "logs": logs_result,
        "snapshots": snapshots_result,
    }


async def _run_weekly_archive() -> dict:
    """Execute weekly audit log archival."""
    session_factory = _get_async_session_factory()
    async with session_factory() as session:
        svc = RetentionService(session)
        result = await svc.archive_audit_logs(older_than_days=1095)
        await session.commit()

    return result


async def _run_monthly_stats() -> dict:
    """Collect monthly data retention statistics."""
    session_factory = _get_async_session_factory()
    async with session_factory() as session:
        svc = RetentionService(session)
        result = await svc.get_retention_stats()

    return result


# ---------------------------------------------------------------------------
# Celery task definitions
# ---------------------------------------------------------------------------

@celery_app.task(
    name="app.tasks.retention_tasks.daily_retention_cleanup",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def daily_retention_cleanup(self) -> dict:
    """Run daily at 02:00 JST -- clean up expired logs and snapshots."""
    logger.info("Starting daily retention cleanup")
    try:
        result = asyncio.run(_run_daily_cleanup())
        logger.info("Daily retention cleanup completed: %s", result)
        return result
    except Exception as exc:
        logger.error("Daily retention cleanup failed: %s", exc)
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="app.tasks.retention_tasks.weekly_archive",
    bind=True,
    max_retries=3,
    default_retry_delay=600,
)
def weekly_archive(self) -> dict:
    """Run every Sunday at 03:00 JST -- archive old audit logs."""
    logger.info("Starting weekly audit log archive")
    try:
        result = asyncio.run(_run_weekly_archive())
        logger.info("Weekly archive completed: %s", result)
        return result
    except Exception as exc:
        logger.error("Weekly archive failed: %s", exc)
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="app.tasks.retention_tasks.monthly_stats_report",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def monthly_stats_report(self) -> dict:
    """Run on 1st of each month -- generate retention statistics report."""
    logger.info("Starting monthly retention stats report")
    try:
        result = asyncio.run(_run_monthly_stats())
        logger.info("Monthly stats report: %s", result)
        return result
    except Exception as exc:
        logger.error("Monthly stats report failed: %s", exc)
        raise self.retry(exc=exc) from exc
