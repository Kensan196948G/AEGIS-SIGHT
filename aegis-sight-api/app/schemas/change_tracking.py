"""Pydantic schemas for device configuration change tracking."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Snapshot schemas
# ---------------------------------------------------------------------------

class ConfigSnapshotCreate(BaseModel):
    """Request body for creating a new configuration snapshot."""

    device_id: UUID
    snapshot_type: str = Field(..., pattern=r"^(hardware|software|security|network)$")
    data: dict[str, Any]


class ConfigSnapshotResponse(BaseModel):
    """Response for a single configuration snapshot."""

    id: UUID
    device_id: UUID
    snapshot_type: str
    data: dict[str, Any]
    checksum: str
    captured_at: datetime

    model_config = {"from_attributes": True}


class ConfigSnapshotBrief(BaseModel):
    """Brief snapshot info used in timeline and change responses."""

    id: UUID
    snapshot_type: str
    checksum: str
    captured_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Change schemas
# ---------------------------------------------------------------------------

class ConfigChangeResponse(BaseModel):
    """Response for a single configuration change record."""

    id: UUID
    device_id: UUID
    snapshot_before_id: UUID | None
    snapshot_after_id: UUID
    change_type: str
    field_path: str
    old_value: Any | None
    new_value: Any | None
    detected_at: datetime

    model_config = {"from_attributes": True}


class ConfigChangeDetail(ConfigChangeResponse):
    """Change record with expanded snapshot info."""

    snapshot_before: ConfigSnapshotBrief | None = None
    snapshot_after: ConfigSnapshotBrief | None = None


# ---------------------------------------------------------------------------
# Diff schemas
# ---------------------------------------------------------------------------

class DiffEntry(BaseModel):
    """A single field-level difference between two snapshots."""

    field_path: str
    change_type: str
    old_value: Any | None = None
    new_value: Any | None = None


class SnapshotDiffResponse(BaseModel):
    """Full diff between two snapshots."""

    snapshot_1: ConfigSnapshotBrief
    snapshot_2: ConfigSnapshotBrief
    differences: list[DiffEntry]
    total_changes: int


# ---------------------------------------------------------------------------
# Timeline schemas
# ---------------------------------------------------------------------------

class TimelineEntry(BaseModel):
    """A single entry in a device's change timeline."""

    id: UUID
    change_type: str
    field_path: str
    snapshot_type: str | None = None
    old_value: Any | None = None
    new_value: Any | None = None
    detected_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Summary schemas
# ---------------------------------------------------------------------------

class ChangeTypeSummary(BaseModel):
    """Count by change type."""

    added: int = 0
    modified: int = 0
    removed: int = 0


class SnapshotTypeSummary(BaseModel):
    """Count by snapshot type."""

    hardware: int = 0
    software: int = 0
    security: int = 0
    network: int = 0


class DailySummary(BaseModel):
    """Per-day change count."""

    date: str
    count: int


class ChangeSummaryResponse(BaseModel):
    """Aggregated change summary statistics."""

    total_changes: int
    by_change_type: ChangeTypeSummary
    by_snapshot_type: SnapshotTypeSummary
    daily: list[DailySummary]
    period_start: datetime | None = None
    period_end: datetime | None = None
