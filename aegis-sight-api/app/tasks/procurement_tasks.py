"""Procurement background tasks."""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.procurement import ProcurementRequest, ProcurementStatus
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create a standalone async session factory for Celery tasks."""
    engine = create_async_engine(settings.DATABASE_URL, pool_size=5, max_overflow=2)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _collect_pending_approvals() -> dict:
    """Gather all procurement requests pending approval and group by department."""
    session_factory = _get_async_session_factory()

    async with session_factory() as session:
        # Count by status
        stmt = (
            select(
                ProcurementRequest.status,
                func.count(ProcurementRequest.id),
            )
            .where(
                ProcurementRequest.status.in_(
                    [
                        ProcurementStatus.submitted,
                        ProcurementStatus.approved,
                        ProcurementStatus.ordered,
                    ]
                )
            )
            .group_by(ProcurementRequest.status)
        )
        result = await session.execute(stmt)
        status_counts = {row[0].value: row[1] for row in result.all()}

        # Submitted requests awaiting approval, grouped by department
        dept_stmt = (
            select(
                ProcurementRequest.department,
                func.count(ProcurementRequest.id),
            )
            .where(ProcurementRequest.status == ProcurementStatus.submitted)
            .group_by(ProcurementRequest.department)
        )
        dept_result = await session.execute(dept_stmt)
        by_department = {row[0]: row[1] for row in dept_result.all()}

    return {
        "status_counts": status_counts,
        "awaiting_approval_by_department": by_department,
        "total_pending": sum(status_counts.values()),
    }


async def _collect_status_summary() -> dict:
    """Collect a full status summary for all procurement requests."""
    session_factory = _get_async_session_factory()

    async with session_factory() as session:
        stmt = (
            select(
                ProcurementRequest.status,
                func.count(ProcurementRequest.id),
            )
            .group_by(ProcurementRequest.status)
        )
        result = await session.execute(stmt)
        status_counts = {row[0].value: row[1] for row in result.all()}

    return {"status_summary": status_counts}


async def _send_procurement_notifications(data: dict) -> None:
    """Send email and/or webhook notifications for pending procurement approvals."""
    from app.services.notification_service import NotificationService

    total = data["total_pending"]
    by_dept = data.get("awaiting_approval_by_department", {})

    dept_lines = "\n".join(f"  {dept}: {cnt}件" for dept, cnt in by_dept.items()) or "  （データなし）"
    body = (
        f"【調達承認待ち通知】\n\n"
        f"承認待ち件数: {total} 件\n\n"
        f"部署別内訳:\n{dept_lines}\n\n"
        f"管理画面にログインして対応をお願いします。"
    )

    email = getattr(settings, "ADMIN_NOTIFICATION_EMAIL", None)
    if email:
        await NotificationService.send_email(email, f"調達承認待ち通知: {total}件", body)

    webhook_url = getattr(settings, "ALERT_WEBHOOK_URL", None)
    if webhook_url:
        await NotificationService.send_webhook(
            webhook_url,
            {
                "type": "procurement_pending",
                "total_pending": total,
                "awaiting_approval_by_department": by_dept,
            },
        )


@celery_app.task(
    name="app.tasks.procurement_tasks.notify_pending_approvals",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def notify_pending_approvals(self) -> dict:
    """
    Notify stakeholders about pending procurement approvals.
    Runs on weekdays at 09:00 JST.

    Sends email (ADMIN_NOTIFICATION_EMAIL) and/or webhook (ALERT_WEBHOOK_URL)
    when there are pending requests.  Both channels are optional — missing
    config is silently skipped so the task never fails due to notification issues.
    """
    import asyncio

    logger.info("Starting procurement pending approval notification")
    try:
        result = asyncio.run(_collect_pending_approvals())
        total = result["total_pending"]
        logger.info("Procurement notification: %d total pending requests", total)

        if total > 0:
            asyncio.run(_send_procurement_notifications(result))

        return result
    except Exception as exc:
        logger.error("Procurement notification failed: %s", exc)
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="app.tasks.procurement_tasks.generate_status_report",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def generate_status_report(self) -> dict:
    """
    Generate a full procurement status report.
    Can be called on-demand or scheduled.
    """
    import asyncio

    logger.info("Generating procurement status report")
    try:
        result = asyncio.run(_collect_status_summary())
        logger.info("Procurement status report generated")
        return result
    except Exception as exc:
        logger.error("Procurement status report generation failed: %s", exc)
        raise self.retry(exc=exc) from exc
