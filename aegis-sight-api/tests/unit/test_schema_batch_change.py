"""Unit tests for batch and change_tracking Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.batch import (
    BatchImportResponse,
    BatchJobListResponse,
    BatchJobResponse,
    BatchJobStatus,
    BatchJobType,
)
from app.schemas.change_tracking import (
    ChangeSummaryResponse,
    ChangeTypeSummary,
    ConfigSnapshotCreate,
    DiffEntry,
    SnapshotTypeSummary,
    TimelineEntry,
)

# ---------------------------------------------------------------------------
# BatchJobStatus / BatchJobType
# ---------------------------------------------------------------------------


class TestBatchJobStatus:
    def test_pending_value(self) -> None:
        assert BatchJobStatus.pending == "pending"

    def test_all_statuses(self) -> None:
        assert len(BatchJobStatus) == 4

    def test_failed_value(self) -> None:
        assert BatchJobStatus.failed == "failed"


class TestBatchJobType:
    def test_import_devices_value(self) -> None:
        assert BatchJobType.import_devices == "import_devices"

    def test_all_types(self) -> None:
        assert len(BatchJobType) == 4


# ---------------------------------------------------------------------------
# BatchImportResponse
# ---------------------------------------------------------------------------


class TestBatchImportResponse:
    def test_defaults(self) -> None:
        r = BatchImportResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.import_devices,
            status=BatchJobStatus.pending,
        )
        assert r.total_rows == 0
        assert r.success_count == 0
        assert r.error_count == 0
        assert r.errors == []
        assert r.message == ""

    def test_with_errors(self) -> None:
        r = BatchImportResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.import_licenses,
            status=BatchJobStatus.failed,
            total_rows=100,
            success_count=80,
            error_count=20,
            errors=[{"row": 5, "message": "Invalid format"}],
        )
        assert r.error_count == 20
        assert len(r.errors) == 1

    def test_all_job_types(self) -> None:
        for jt in BatchJobType:
            r = BatchImportResponse(
                job_id=uuid.uuid4(),
                job_type=jt,
                status=BatchJobStatus.completed,
            )
            assert r.job_type == jt


# ---------------------------------------------------------------------------
# BatchJobResponse
# ---------------------------------------------------------------------------


class TestBatchJobResponse:
    def test_completed_at_optional(self) -> None:
        r = BatchJobResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.export_devices,
            status=BatchJobStatus.processing,
            total_rows=500,
            success_count=0,
            error_count=0,
            created_at=datetime(2026, 1, 1, tzinfo=UTC),
        )
        assert r.completed_at is None
        assert r.created_by is None

    def test_with_completed_at(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        r = BatchJobResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.export_licenses,
            status=BatchJobStatus.completed,
            total_rows=200,
            success_count=200,
            error_count=0,
            created_at=now,
            completed_at=now,
            created_by="admin@example.com",
        )
        assert r.completed_at == now
        assert r.created_by == "admin@example.com"


# ---------------------------------------------------------------------------
# BatchJobListResponse
# ---------------------------------------------------------------------------


class TestBatchJobListResponse:
    def test_empty_jobs(self) -> None:
        r = BatchJobListResponse(jobs=[], total=0)
        assert r.total == 0
        assert r.jobs == []


# ---------------------------------------------------------------------------
# ConfigSnapshotCreate
# ---------------------------------------------------------------------------


class TestConfigSnapshotCreate:
    def test_valid_snapshot_types(self) -> None:
        for st in ("hardware", "software", "security", "network"):
            s = ConfigSnapshotCreate(
                device_id=uuid.uuid4(),
                snapshot_type=st,
                data={"key": "value"},
            )
            assert s.snapshot_type == st

    def test_invalid_snapshot_type_raises(self) -> None:
        with pytest.raises(ValidationError):
            ConfigSnapshotCreate(
                device_id=uuid.uuid4(),
                snapshot_type="invalid",
                data={},
            )

    def test_with_nested_data(self) -> None:
        s = ConfigSnapshotCreate(
            device_id=uuid.uuid4(),
            snapshot_type="hardware",
            data={"cpu": "Intel i7", "ram_gb": 16},
        )
        assert s.data["cpu"] == "Intel i7"


# ---------------------------------------------------------------------------
# DiffEntry
# ---------------------------------------------------------------------------


class TestDiffEntry:
    def test_optional_values(self) -> None:
        d = DiffEntry(field_path="cpu.cores", change_type="modified")
        assert d.old_value is None
        assert d.new_value is None

    def test_with_values(self) -> None:
        d = DiffEntry(
            field_path="ram_gb",
            change_type="modified",
            old_value=8,
            new_value=16,
        )
        assert d.old_value == 8
        assert d.new_value == 16


# ---------------------------------------------------------------------------
# TimelineEntry
# ---------------------------------------------------------------------------


class TestTimelineEntry:
    def test_optional_fields(self) -> None:
        e = TimelineEntry(
            id=uuid.uuid4(),
            change_type="added",
            field_path="software.office",
            detected_at=datetime(2026, 1, 1, tzinfo=UTC),
        )
        assert e.snapshot_type is None
        assert e.old_value is None

    def test_with_values(self) -> None:
        e = TimelineEntry(
            id=uuid.uuid4(),
            change_type="modified",
            field_path="cpu",
            snapshot_type="hardware",
            old_value="i5",
            new_value="i7",
            detected_at=datetime(2026, 1, 1, tzinfo=UTC),
        )
        assert e.new_value == "i7"


# ---------------------------------------------------------------------------
# ChangeTypeSummary / SnapshotTypeSummary
# ---------------------------------------------------------------------------


class TestChangeTypeSummary:
    def test_defaults_zero(self) -> None:
        s = ChangeTypeSummary()
        assert s.added == 0
        assert s.modified == 0
        assert s.removed == 0

    def test_with_values(self) -> None:
        s = ChangeTypeSummary(added=5, modified=10, removed=2)
        assert s.added == 5


class TestSnapshotTypeSummary:
    def test_defaults_zero(self) -> None:
        s = SnapshotTypeSummary()
        assert s.hardware == 0
        assert s.software == 0

    def test_with_values(self) -> None:
        s = SnapshotTypeSummary(hardware=3, software=7, security=1, network=2)
        assert s.software == 7


# ---------------------------------------------------------------------------
# ChangeSummaryResponse
# ---------------------------------------------------------------------------


class TestChangeSummaryResponse:
    def test_construction(self) -> None:
        r = ChangeSummaryResponse(
            total_changes=10,
            by_change_type=ChangeTypeSummary(added=3, modified=5, removed=2),
            by_snapshot_type=SnapshotTypeSummary(hardware=4, software=6),
            daily=[],
        )
        assert r.total_changes == 10
        assert r.period_start is None
        assert r.period_end is None

    def test_with_period(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        r = ChangeSummaryResponse(
            total_changes=0,
            by_change_type=ChangeTypeSummary(),
            by_snapshot_type=SnapshotTypeSummary(),
            daily=[],
            period_start=now,
            period_end=now,
        )
        assert r.period_start == now
