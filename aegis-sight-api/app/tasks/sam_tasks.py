"""SAM (Software Asset Management) background tasks."""

import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.license import SoftwareLicense
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create a standalone async session factory for Celery tasks."""
    engine = create_async_engine(settings.DATABASE_URL, pool_size=5, max_overflow=2)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _run_reconciliation() -> dict:
    """
    Core reconciliation logic: compare purchased vs installed counts
    for all licenses and flag violations.
    """
    session_factory = _get_async_session_factory()
    violations = []
    total_checked = 0

    async with session_factory() as session:
        result = await session.execute(select(SoftwareLicense))
        licenses = result.scalars().all()
        total_checked = len(licenses)

        for lic in licenses:
            total_used = lic.installed_count + lic.m365_assigned
            if total_used > lic.purchased_count:
                over = total_used - lic.purchased_count
                violations.append(
                    {
                        "license_id": str(lic.id),
                        "software_name": lic.software_name,
                        "purchased": lic.purchased_count,
                        "total_used": total_used,
                        "over_deployed": over,
                    }
                )

    return {
        "total_checked": total_checked,
        "violations_count": len(violations),
        "violations": violations,
    }


async def _run_license_expiry_check() -> dict:
    """
    Check for licenses expiring within the next 30/60/90 days
    and return categorized results.
    """
    session_factory = _get_async_session_factory()
    today = date.today()
    thresholds = {
        "expiring_30_days": today + timedelta(days=30),
        "expiring_60_days": today + timedelta(days=60),
        "expiring_90_days": today + timedelta(days=90),
    }

    results: dict[str, list[dict]] = {k: [] for k in thresholds}
    already_expired: list[dict] = []

    async with session_factory() as session:
        stmt = select(SoftwareLicense).where(
            SoftwareLicense.expiry_date.isnot(None)
        )
        result = await session.execute(stmt)
        licenses = result.scalars().all()

        for lic in licenses:
            if lic.expiry_date is None:
                continue

            entry = {
                "license_id": str(lic.id),
                "software_name": lic.software_name,
                "vendor": lic.vendor,
                "expiry_date": lic.expiry_date.isoformat(),
            }

            if lic.expiry_date < today:
                already_expired.append(entry)
            elif lic.expiry_date <= thresholds["expiring_30_days"]:
                results["expiring_30_days"].append(entry)
            elif lic.expiry_date <= thresholds["expiring_60_days"]:
                results["expiring_60_days"].append(entry)
            elif lic.expiry_date <= thresholds["expiring_90_days"]:
                results["expiring_90_days"].append(entry)

    return {
        "already_expired": already_expired,
        **{k: v for k, v in results.items()},
    }


@celery_app.task(
    name="app.tasks.sam_tasks.daily_reconciliation",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def daily_reconciliation(self) -> dict:
    """
    SAM daily reconciliation task, scheduled at 03:00 JST.
    Compares purchased license counts against installed + M365 assigned counts.
    """
    import asyncio

    logger.info("Starting SAM daily reconciliation")
    try:
        result = asyncio.run(_run_reconciliation())
        logger.info(
            "SAM reconciliation complete: %d checked, %d violations",
            result["total_checked"],
            result["violations_count"],
        )
        return result
    except Exception as exc:
        logger.error("SAM reconciliation failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.sam_tasks.check_license_expiry",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def check_license_expiry(self) -> dict:
    """
    Check for licenses nearing expiry (30/60/90 days) and already expired.
    """
    import asyncio

    logger.info("Starting license expiry check")
    try:
        result = asyncio.run(_run_license_expiry_check())
        logger.info(
            "License expiry check complete: %d already expired, "
            "%d expiring in 30 days",
            len(result["already_expired"]),
            len(result["expiring_30_days"]),
        )
        return result
    except Exception as exc:
        logger.error("License expiry check failed: %s", exc)
        raise self.retry(exc=exc)
