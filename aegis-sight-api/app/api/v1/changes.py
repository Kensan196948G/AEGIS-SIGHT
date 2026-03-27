"""
Device configuration change tracking API.

Endpoints for browsing change history, viewing snapshots, computing diffs,
and registering new configuration snapshots (with automatic change detection).
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, cast, func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.change_tracking import (
    ChangeType,
    ConfigChange,
    ConfigSnapshot,
    SnapshotType,
)
from app.models.user import User
from app.schemas.change_tracking import (
    ChangeSummaryResponse,
    ChangeTypeSummary,
    ConfigChangeResponse,
    ConfigSnapshotCreate,
    ConfigSnapshotResponse,
    DailySummary,
    DiffEntry,
    SnapshotDiffResponse,
    SnapshotTypeSummary,
    ConfigSnapshotBrief,
    TimelineEntry,
)
from app.services.change_detector import ChangeDetector

router = APIRouter(prefix="/changes", tags=["changes"])


# ---------------------------------------------------------------------------
# GET /changes -- change history list
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=PaginatedResponse[ConfigChangeResponse],
    summary="List configuration changes",
    description=(
        "Retrieve a paginated list of configuration changes with optional "
        "filters for device, change type, snapshot type, and date range."
    ),
)
async def list_changes(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    device_id: uuid.UUID | None = Query(None),
    change_type: ChangeType | None = Query(None),
    snapshot_type: SnapshotType | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return paginated change records with filters."""
    base_q = select(ConfigChange)
    count_q = select(func.count(ConfigChange.id))

    # Optional join to snapshot for snapshot_type filter
    if snapshot_type is not None:
        base_q = base_q.join(
            ConfigSnapshot, ConfigChange.snapshot_after_id == ConfigSnapshot.id
        ).where(ConfigSnapshot.snapshot_type == snapshot_type)
        count_q = count_q.join(
            ConfigSnapshot, ConfigChange.snapshot_after_id == ConfigSnapshot.id
        ).where(ConfigSnapshot.snapshot_type == snapshot_type)

    if device_id is not None:
        base_q = base_q.where(ConfigChange.device_id == device_id)
        count_q = count_q.where(ConfigChange.device_id == device_id)

    if change_type is not None:
        base_q = base_q.where(ConfigChange.change_type == change_type)
        count_q = count_q.where(ConfigChange.change_type == change_type)

    if date_from is not None:
        base_q = base_q.where(ConfigChange.detected_at >= date_from)
        count_q = count_q.where(ConfigChange.detected_at >= date_from)

    if date_to is not None:
        base_q = base_q.where(ConfigChange.detected_at <= date_to)
        count_q = count_q.where(ConfigChange.detected_at <= date_to)

    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(
        base_q.order_by(ConfigChange.detected_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


# ---------------------------------------------------------------------------
# GET /changes/summary -- aggregated statistics
# ---------------------------------------------------------------------------

@router.get(
    "/summary",
    response_model=ChangeSummaryResponse,
    summary="Change statistics summary",
    description="Aggregated change counts by type, snapshot type, and per day.",
)
async def change_summary(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return aggregated change statistics."""
    base_filter = []
    if date_from:
        base_filter.append(ConfigChange.detected_at >= date_from)
    if date_to:
        base_filter.append(ConfigChange.detected_at <= date_to)

    # Total
    total_q = select(func.count(ConfigChange.id)).where(*base_filter)
    total = (await db.execute(total_q)).scalar_one()

    # By change type
    ct_q = (
        select(ConfigChange.change_type, func.count(ConfigChange.id))
        .where(*base_filter)
        .group_by(ConfigChange.change_type)
    )
    ct_rows = (await db.execute(ct_q)).all()
    ct_map = {row[0].value: row[1] for row in ct_rows}

    # By snapshot type (join)
    st_q = (
        select(ConfigSnapshot.snapshot_type, func.count(ConfigChange.id))
        .join(ConfigSnapshot, ConfigChange.snapshot_after_id == ConfigSnapshot.id)
        .where(*base_filter)
        .group_by(ConfigSnapshot.snapshot_type)
    )
    st_rows = (await db.execute(st_q)).all()
    st_map = {row[0].value: row[1] for row in st_rows}

    # Daily breakdown
    day_col = cast(ConfigChange.detected_at, Date)
    daily_q = (
        select(day_col.label("day"), func.count(ConfigChange.id))
        .where(*base_filter)
        .group_by("day")
        .order_by("day")
    )
    daily_rows = (await db.execute(daily_q)).all()

    return ChangeSummaryResponse(
        total_changes=total,
        by_change_type=ChangeTypeSummary(
            added=ct_map.get("added", 0),
            modified=ct_map.get("modified", 0),
            removed=ct_map.get("removed", 0),
        ),
        by_snapshot_type=SnapshotTypeSummary(
            hardware=st_map.get("hardware", 0),
            software=st_map.get("software", 0),
            security=st_map.get("security", 0),
            network=st_map.get("network", 0),
        ),
        daily=[DailySummary(date=str(row[0]), count=row[1]) for row in daily_rows],
        period_start=date_from,
        period_end=date_to,
    )


# ---------------------------------------------------------------------------
# GET /changes/devices/{id}/timeline -- per-device timeline
# ---------------------------------------------------------------------------

@router.get(
    "/devices/{device_id}/timeline",
    response_model=list[TimelineEntry],
    summary="Device change timeline",
    description="Return chronologically ordered changes for a single device.",
)
async def device_timeline(
    device_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Timeline of changes for a specific device."""
    q = (
        select(
            ConfigChange,
            ConfigSnapshot.snapshot_type,
        )
        .join(ConfigSnapshot, ConfigChange.snapshot_after_id == ConfigSnapshot.id)
        .where(ConfigChange.device_id == device_id)
        .order_by(ConfigChange.detected_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(q)).all()

    return [
        TimelineEntry(
            id=change.id,
            change_type=change.change_type.value,
            field_path=change.field_path,
            snapshot_type=snap_type.value if snap_type else None,
            old_value=change.old_value,
            new_value=change.new_value,
            detected_at=change.detected_at,
        )
        for change, snap_type in rows
    ]


# ---------------------------------------------------------------------------
# GET /changes/snapshots/{id} -- snapshot detail
# ---------------------------------------------------------------------------

@router.get(
    "/snapshots/{snapshot_id}",
    response_model=ConfigSnapshotResponse,
    summary="Snapshot detail",
    description="Retrieve full data of a single configuration snapshot.",
)
async def get_snapshot(
    snapshot_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return a single snapshot by ID."""
    result = await db.execute(
        select(ConfigSnapshot).where(ConfigSnapshot.id == snapshot_id)
    )
    snapshot = result.scalar_one_or_none()
    if snapshot is None:
        raise NotFoundError("ConfigSnapshot", str(snapshot_id))
    return snapshot


# ---------------------------------------------------------------------------
# GET /changes/diff/{snapshot_id_1}/{snapshot_id_2} -- snapshot diff
# ---------------------------------------------------------------------------

@router.get(
    "/diff/{snapshot_id_1}/{snapshot_id_2}",
    response_model=SnapshotDiffResponse,
    summary="Diff two snapshots",
    description="Compute the field-level differences between two configuration snapshots.",
)
async def diff_snapshots(
    snapshot_id_1: uuid.UUID,
    snapshot_id_2: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Compute and return differences between two snapshots."""
    result1 = await db.execute(
        select(ConfigSnapshot).where(ConfigSnapshot.id == snapshot_id_1)
    )
    snap1 = result1.scalar_one_or_none()
    if snap1 is None:
        raise NotFoundError("ConfigSnapshot", str(snapshot_id_1))

    result2 = await db.execute(
        select(ConfigSnapshot).where(ConfigSnapshot.id == snapshot_id_2)
    )
    snap2 = result2.scalar_one_or_none()
    if snap2 is None:
        raise NotFoundError("ConfigSnapshot", str(snapshot_id_2))

    diffs = ChangeDetector._recursive_diff(snap1.data, snap2.data, prefix="")

    entries = [
        DiffEntry(
            field_path=path,
            change_type=ct.value,
            old_value=old_val,
            new_value=new_val,
        )
        for path, ct, old_val, new_val in diffs
    ]

    return SnapshotDiffResponse(
        snapshot_1=ConfigSnapshotBrief(
            id=snap1.id,
            snapshot_type=snap1.snapshot_type.value,
            checksum=snap1.checksum,
            captured_at=snap1.captured_at,
        ),
        snapshot_2=ConfigSnapshotBrief(
            id=snap2.id,
            snapshot_type=snap2.snapshot_type.value,
            checksum=snap2.checksum,
            captured_at=snap2.captured_at,
        ),
        differences=entries,
        total_changes=len(entries),
    )


# ---------------------------------------------------------------------------
# POST /changes/snapshots -- register a new snapshot (with change detection)
# ---------------------------------------------------------------------------

@router.post(
    "/snapshots",
    response_model=ConfigSnapshotResponse,
    status_code=201,
    summary="Register configuration snapshot",
    description=(
        "Store a new configuration snapshot and automatically detect changes "
        "against the previous snapshot for the same device and type."
    ),
)
async def create_snapshot(
    body: ConfigSnapshotCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Register a new configuration snapshot with automatic change detection."""
    detector = ChangeDetector(db)
    snapshot_type = SnapshotType(body.snapshot_type)

    snapshot, changes = await detector.detect_changes(
        device_id=str(body.device_id),
        new_data=body.data,
        snapshot_type=snapshot_type,
    )

    return snapshot
