import shutil
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import func, select, text

from app.core.config import settings
from app.core.database import engine
from app.models.device import Device
from app.models.license import SoftwareLicense

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Simple health check",
    description="Returns the current health status of the API and its database connection.",
)
async def health_check():
    """Simple health check endpoint."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "version": settings.APP_VERSION,
        "database": db_status,
    }


@router.get(
    "/health/detail",
    summary="Detailed health check",
    description="Returns detailed health status including DB, Redis, Celery, and disk.",
)
async def health_detail():
    """Detailed health check with subsystem statuses."""
    checks = {}

    # Database check
    db_start = time.monotonic()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_latency_ms = round((time.monotonic() - db_start) * 1000, 2)
        checks["database"] = {
            "status": "healthy",
            "latency_ms": db_latency_ms,
        }
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # Redis check (3-second connect/read timeout to prevent CI hangs)
    try:
        import asyncio

        import redis.asyncio as aioredis

        r = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        redis_start = time.monotonic()
        pong = await asyncio.wait_for(r.ping(), timeout=5.0)
        redis_latency_ms = round((time.monotonic() - redis_start) * 1000, 2)
        await r.aclose()
        checks["redis"] = {
            "status": "healthy" if pong else "unhealthy",
            "latency_ms": redis_latency_ms,
        }
    except Exception as e:
        checks["redis"] = {
            "status": "unavailable",
            "error": str(e),
        }

    # Celery check (including Beat schedule)
    try:
        from celery import Celery

        celery_app = Celery(broker=settings.REDIS_URL)
        inspector = celery_app.control.inspect(timeout=2.0)
        active = inspector.active()
        scheduled = inspector.scheduled()
        beat_tasks = sum(len(v) for v in scheduled.values()) if scheduled else 0
        checks["celery"] = {
            "status": "healthy" if active is not None else "unavailable",
            "workers": len(active) if active else 0,
            "beat_scheduled_tasks": beat_tasks,
        }
    except Exception as e:
        checks["celery"] = {
            "status": "unavailable",
            "error": str(e),
        }

    # Last telemetry received (most recent device last_seen)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                select(func.max(Device.last_seen))
            )
            last_telemetry = result.scalar()
        checks["telemetry"] = {
            "status": "healthy" if last_telemetry else "no_data",
            "last_received": last_telemetry.isoformat() if last_telemetry else None,
        }
    except Exception as e:
        checks["telemetry"] = {
            "status": "unknown",
            "error": str(e),
        }

    # Unresponsive devices (last_seen > 1 hour ago)
    try:
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        async with engine.connect() as conn:
            result = await conn.execute(
                select(func.count())
                .select_from(Device)
                .where(Device.last_seen < one_hour_ago)
            )
            unresponsive_count = result.scalar() or 0
        checks["unresponsive_devices"] = {
            "status": "warning" if unresponsive_count > 0 else "healthy",
            "count": unresponsive_count,
        }
    except Exception as e:
        checks["unresponsive_devices"] = {
            "status": "unknown",
            "error": str(e),
        }

    # License expiry alerts (licenses expiring within 30 days)
    try:
        today = datetime.now(timezone.utc).date()
        alert_threshold = today + timedelta(days=30)
        async with engine.connect() as conn:
            result = await conn.execute(
                select(func.count())
                .select_from(SoftwareLicense)
                .where(
                    SoftwareLicense.expiry_date.isnot(None),
                    SoftwareLicense.expiry_date <= alert_threshold,
                )
            )
            expiring_count = result.scalar() or 0
        checks["license_expiry"] = {
            "status": "warning" if expiring_count > 0 else "healthy",
            "expiring_within_30d": expiring_count,
        }
    except Exception as e:
        checks["license_expiry"] = {
            "status": "unknown",
            "error": str(e),
        }

    # Disk check
    try:
        disk = shutil.disk_usage("/")
        disk_free_gb = round(disk.free / (1024**3), 2)
        disk_total_gb = round(disk.total / (1024**3), 2)
        disk_used_pct = round((disk.used / disk.total) * 100, 1)
        checks["disk"] = {
            "status": "healthy" if disk_used_pct < 90 else "warning",
            "free_gb": disk_free_gb,
            "total_gb": disk_total_gb,
            "used_percent": disk_used_pct,
        }
    except Exception as e:
        checks["disk"] = {
            "status": "unknown",
            "error": str(e),
        }

    # Overall status
    statuses = [c.get("status") for c in checks.values()]
    if all(s == "healthy" for s in statuses):
        overall = "healthy"
    elif any(s == "unhealthy" for s in statuses):
        overall = "unhealthy"
    else:
        overall = "degraded"

    return {
        "status": overall,
        "version": settings.APP_VERSION,
        "checks": checks,
    }


@router.get(
    "/health/ready",
    summary="Readiness probe",
    description="Kubernetes readiness probe -- returns 200 only if the API can serve traffic.",
)
async def health_ready():
    """Readiness probe for Kubernetes."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": "database unavailable"},
        )

    return {"status": "ready"}
