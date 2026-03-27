"""Pydantic schemas for the database management API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# GET /database/stats
# ---------------------------------------------------------------------------

class TableStats(BaseModel):
    """Statistics for a single database table."""

    model_config = ConfigDict(from_attributes=True)

    table: str
    row_count: int
    size: str
    oldest_record: datetime | None = None


class DatabaseStatsResponse(BaseModel):
    """Response for GET /database/stats."""

    tables: list[TableStats]


# ---------------------------------------------------------------------------
# GET /database/retention
# ---------------------------------------------------------------------------

class RetentionPolicyItem(BaseModel):
    """A single retention policy entry."""

    target: str = Field(description="What this policy applies to")
    retention_days: int = Field(description="Number of days to retain data")
    description: str


class RetentionPolicyResponse(BaseModel):
    """Response for GET /database/retention."""

    policies: list[RetentionPolicyItem]


# ---------------------------------------------------------------------------
# POST /database/retention/run
# ---------------------------------------------------------------------------

class RetentionRunRequest(BaseModel):
    """Request body for POST /database/retention/run."""

    cleanup_logs: bool = Field(True, description="Run log event cleanup")
    cleanup_snapshots: bool = Field(True, description="Run hardware snapshot cleanup")
    archive_audit: bool = Field(False, description="Run audit log archival")
    log_retention_days: int = Field(1095, ge=1, description="Log retention period in days")
    snapshot_retention_days: int = Field(365, ge=1, description="Snapshot retention period in days")
    audit_older_than_days: int = Field(1095, ge=1, description="Audit archival threshold in days")


class RetentionRunResponse(BaseModel):
    """Response for POST /database/retention/run."""

    logs: dict | None = None
    snapshots: dict | None = None
    audit: dict | None = None


# ---------------------------------------------------------------------------
# GET /database/health
# ---------------------------------------------------------------------------

class ConnectionPoolStatus(BaseModel):
    """Database connection pool metrics."""

    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    max_overflow: int


class ReplicationStatus(BaseModel):
    """Replication lag information (if applicable)."""

    is_replica: bool
    replay_lag_seconds: float | None = None


class DatabaseHealthResponse(BaseModel):
    """Response for GET /database/health."""

    status: str = Field(description="ok or degraded")
    connection_pool: ConnectionPoolStatus
    replication: ReplicationStatus | None = None
    server_version: str | None = None
    uptime_seconds: float | None = None
