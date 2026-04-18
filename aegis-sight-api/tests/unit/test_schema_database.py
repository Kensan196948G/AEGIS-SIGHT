"""Unit tests for database management Pydantic schemas."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

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


# ---------------------------------------------------------------------------
# TableStats
# ---------------------------------------------------------------------------


class TestTableStats:
    def test_basic_construction(self) -> None:
        s = TableStats(table="devices", row_count=1000, size="5 MB")
        assert s.table == "devices"
        assert s.oldest_record is None

    def test_with_oldest_record(self) -> None:
        ts = datetime.now(timezone.utc)
        s = TableStats(table="audit_logs", row_count=500000, size="200 MB", oldest_record=ts)
        assert s.oldest_record == ts


# ---------------------------------------------------------------------------
# DatabaseStatsResponse
# ---------------------------------------------------------------------------


class TestDatabaseStatsResponse:
    def test_empty_tables(self) -> None:
        r = DatabaseStatsResponse(tables=[])
        assert r.tables == []

    def test_with_multiple_tables(self) -> None:
        tables = [
            TableStats(table="devices", row_count=100, size="1 MB"),
            TableStats(table="licenses", row_count=50, size="512 KB"),
        ]
        r = DatabaseStatsResponse(tables=tables)
        assert len(r.tables) == 2
        assert r.tables[0].table == "devices"


# ---------------------------------------------------------------------------
# RetentionPolicyItem
# ---------------------------------------------------------------------------


class TestRetentionPolicyItem:
    def test_construction(self) -> None:
        item = RetentionPolicyItem(
            target="log_events",
            retention_days=1095,
            description="Keep 3 years of log events",
        )
        assert item.target == "log_events"
        assert item.retention_days == 1095

    def test_short_retention(self) -> None:
        item = RetentionPolicyItem(target="temp", retention_days=7, description="Weekly cleanup")
        assert item.retention_days == 7

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            RetentionPolicyItem(target="t")  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# RetentionPolicyResponse
# ---------------------------------------------------------------------------


class TestRetentionPolicyResponse:
    def test_empty_policies(self) -> None:
        r = RetentionPolicyResponse(policies=[])
        assert r.policies == []

    def test_with_policies(self) -> None:
        policies = [
            RetentionPolicyItem(target="logs", retention_days=365, description="Keep 1 year"),
            RetentionPolicyItem(target="snapshots", retention_days=90, description="Keep 90 days"),
        ]
        r = RetentionPolicyResponse(policies=policies)
        assert len(r.policies) == 2


# ---------------------------------------------------------------------------
# RetentionRunRequest
# ---------------------------------------------------------------------------


class TestRetentionRunRequest:
    def test_defaults(self) -> None:
        r = RetentionRunRequest()
        assert r.cleanup_logs is True
        assert r.cleanup_snapshots is True
        assert r.archive_audit is False
        assert r.log_retention_days == 1095
        assert r.snapshot_retention_days == 365
        assert r.audit_older_than_days == 1095

    def test_log_retention_days_ge_1(self) -> None:
        r = RetentionRunRequest(log_retention_days=1)
        assert r.log_retention_days == 1

    def test_log_retention_days_zero_raises(self) -> None:
        with pytest.raises(ValidationError):
            RetentionRunRequest(log_retention_days=0)

    def test_snapshot_retention_days_zero_raises(self) -> None:
        with pytest.raises(ValidationError):
            RetentionRunRequest(snapshot_retention_days=0)

    def test_audit_older_than_days_zero_raises(self) -> None:
        with pytest.raises(ValidationError):
            RetentionRunRequest(audit_older_than_days=0)

    def test_negative_days_raises(self) -> None:
        with pytest.raises(ValidationError):
            RetentionRunRequest(log_retention_days=-1)

    def test_custom_values(self) -> None:
        r = RetentionRunRequest(
            cleanup_logs=False,
            archive_audit=True,
            log_retention_days=730,
            snapshot_retention_days=180,
        )
        assert r.cleanup_logs is False
        assert r.archive_audit is True
        assert r.log_retention_days == 730


# ---------------------------------------------------------------------------
# RetentionRunResponse
# ---------------------------------------------------------------------------


class TestRetentionRunResponse:
    def test_all_optional(self) -> None:
        r = RetentionRunResponse()
        assert r.logs is None
        assert r.snapshots is None
        assert r.audit is None

    def test_with_results(self) -> None:
        r = RetentionRunResponse(
            logs={"deleted": 1000},
            snapshots={"deleted": 50},
        )
        assert r.logs["deleted"] == 1000
        assert r.audit is None


# ---------------------------------------------------------------------------
# ConnectionPoolStatus
# ---------------------------------------------------------------------------


class TestConnectionPoolStatus:
    def test_construction(self) -> None:
        s = ConnectionPoolStatus(
            pool_size=10,
            checked_in=8,
            checked_out=2,
            overflow=0,
            max_overflow=5,
        )
        assert s.pool_size == 10
        assert s.checked_out == 2

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            ConnectionPoolStatus(pool_size=10)  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# ReplicationStatus
# ---------------------------------------------------------------------------


class TestReplicationStatus:
    def test_primary_node(self) -> None:
        r = ReplicationStatus(is_replica=False)
        assert r.is_replica is False
        assert r.replay_lag_seconds is None

    def test_replica_with_lag(self) -> None:
        r = ReplicationStatus(is_replica=True, replay_lag_seconds=0.5)
        assert r.is_replica is True
        assert r.replay_lag_seconds == 0.5


# ---------------------------------------------------------------------------
# DatabaseHealthResponse
# ---------------------------------------------------------------------------


class TestDatabaseHealthResponse:
    def test_minimal_construction(self) -> None:
        pool = ConnectionPoolStatus(
            pool_size=5, checked_in=4, checked_out=1, overflow=0, max_overflow=10
        )
        r = DatabaseHealthResponse(status="ok", connection_pool=pool)
        assert r.status == "ok"
        assert r.replication is None
        assert r.server_version is None
        assert r.uptime_seconds is None

    def test_full_construction(self) -> None:
        pool = ConnectionPoolStatus(
            pool_size=20, checked_in=15, checked_out=5, overflow=2, max_overflow=10
        )
        replication = ReplicationStatus(is_replica=True, replay_lag_seconds=0.12)
        r = DatabaseHealthResponse(
            status="degraded",
            connection_pool=pool,
            replication=replication,
            server_version="PostgreSQL 16.2",
            uptime_seconds=86400.0,
        )
        assert r.status == "degraded"
        assert r.replication.is_replica is True
        assert r.uptime_seconds == 86400.0

    def test_missing_connection_pool_raises(self) -> None:
        with pytest.raises(ValidationError):
            DatabaseHealthResponse(status="ok")  # type: ignore[call-arg]
