"""
Database management API -- statistics, retention policies, and health checks.

All endpoints require the ``admin`` role.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.schemas.database import (
    ConnectionPoolStatus,
    DatabaseHealthResponse,
    DatabaseStatsResponse,
    ReplicationStatus,
    RetentionPolicyItem,
    RetentionPolicyResponse,
    RetentionRunRequest,
    RetentionRunResponse,
    TableStats,
)
from app.services.retention_service import RetentionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/database", tags=["database"])


# ---------------------------------------------------------------------------
# GET /database/stats
# ---------------------------------------------------------------------------
@router.get(
    "/stats",
    response_model=DatabaseStatsResponse,
    summary="Database statistics",
    description=(
        "Per-table row counts, sizes, and oldest record timestamps. "
        "Requires admin role."
    ),
)
async def get_database_stats(
    _current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> DatabaseStatsResponse:
    svc = RetentionService(db)
    raw = await svc.get_retention_stats()
    tables = [TableStats(**t) for t in raw["tables"]]
    return DatabaseStatsResponse(tables=tables)


# ---------------------------------------------------------------------------
# GET /database/retention
# ---------------------------------------------------------------------------
@router.get(
    "/retention",
    response_model=RetentionPolicyResponse,
    summary="Retention policy settings",
    description="Returns the current data retention policy configuration.",
)
async def get_retention_policies(
    _current_user: User = Depends(require_role(UserRole.admin)),
) -> RetentionPolicyResponse:
    policies = [
        RetentionPolicyItem(
            target="logon_events / usb_events / file_events",
            retention_days=1095,
            description="Log events are deleted after 3 years (1095 days).",
        ),
        RetentionPolicyItem(
            target="hardware_snapshots",
            retention_days=365,
            description="Hardware snapshots are deleted after 1 year (365 days).",
        ),
        RetentionPolicyItem(
            target="audit_logs",
            retention_days=1095,
            description=(
                "Audit logs are archived (moved to audit_logs_archive) "
                "after 3 years. They are never hard-deleted."
            ),
        ),
    ]
    return RetentionPolicyResponse(policies=policies)


# ---------------------------------------------------------------------------
# POST /database/retention/run
# ---------------------------------------------------------------------------
@router.post(
    "/retention/run",
    response_model=RetentionRunResponse,
    summary="Run manual retention cleanup",
    description=(
        "Trigger an on-demand data retention cleanup. "
        "Select which operations to run and override retention periods. "
        "Requires admin role."
    ),
)
async def run_retention_cleanup(
    body: RetentionRunRequest,
    _current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> RetentionRunResponse:
    svc = RetentionService(db)
    result = RetentionRunResponse()

    if body.cleanup_logs:
        result.logs = await svc.cleanup_old_logs(
            retention_days=body.log_retention_days,
        )
    if body.cleanup_snapshots:
        result.snapshots = await svc.cleanup_old_snapshots(
            retention_days=body.snapshot_retention_days,
        )
    if body.archive_audit:
        result.audit = await svc.archive_audit_logs(
            older_than_days=body.audit_older_than_days,
        )

    return result


# ---------------------------------------------------------------------------
# GET /database/health
# ---------------------------------------------------------------------------
@router.get(
    "/health",
    response_model=DatabaseHealthResponse,
    summary="Database health",
    description=(
        "Connection pool state, replication lag, server version, and uptime. "
        "Requires admin role."
    ),
)
async def get_database_health(
    _current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> DatabaseHealthResponse:
    # Connection pool metrics (sync pool exposed by the async engine)
    pool = engine.pool
    pool_status = ConnectionPoolStatus(
        pool_size=pool.size(),
        checked_in=pool.checkedin(),
        checked_out=pool.checkedout(),
        overflow=pool.overflow(),
        max_overflow=pool._max_overflow,
    )

    # Server version
    ver_result = await db.execute(text("SHOW server_version"))
    server_version = ver_result.scalar_one_or_none()

    # Uptime
    uptime_result = await db.execute(
        text("SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))")
    )
    uptime_seconds = uptime_result.scalar_one_or_none()

    # Replication lag (returns NULL on a primary)
    try:
        lag_result = await db.execute(
            text(
                "SELECT CASE WHEN pg_is_in_recovery() "
                "THEN EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) "
                "ELSE NULL END"
            )
        )
        lag = lag_result.scalar_one_or_none()
        replication = ReplicationStatus(
            is_replica=lag is not None,
            replay_lag_seconds=float(lag) if lag is not None else None,
        )
    except Exception:
        replication = ReplicationStatus(is_replica=False)

    status = "ok"
    if pool.checkedout() >= pool.size():
        status = "degraded"

    return DatabaseHealthResponse(
        status=status,
        connection_pool=pool_status,
        replication=replication,
        server_version=server_version,
        uptime_seconds=float(uptime_seconds) if uptime_seconds else None,
    )
