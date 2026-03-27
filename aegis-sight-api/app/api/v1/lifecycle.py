"""Asset lifecycle tracking and disposal management endpoints."""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.asset_lifecycle import (
    AssetLifecycleEvent,
    DisposalRequest,
    DisposalStatus,
    LifecycleEventType,
)
from app.models.device import Device
from app.models.user import User
from app.schemas.asset_lifecycle import (
    DisposalCompletePayload,
    DisposalRequestCreate,
    DisposalRequestResponse,
    LifecycleEventCreate,
    LifecycleEventResponse,
    LifecycleSummary,
)

router = APIRouter(prefix="/lifecycle", tags=["lifecycle"])


# ---------------------------------------------------------------------------
# Device lifecycle history
# ---------------------------------------------------------------------------


@router.get(
    "/devices/{device_id}/history",
    response_model=PaginatedResponse[LifecycleEventResponse],
    summary="Get device lifecycle history",
    description="Retrieve the lifecycle event history for a specific device.",
)
async def get_device_history(
    device_id: uuid.UUID,
    offset: int = Query(0, ge=0, alias="skip", description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List lifecycle events for a device, newest first."""
    # Verify device exists
    device_result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    if not device_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")

    base_query = select(AssetLifecycleEvent).where(
        AssetLifecycleEvent.device_id == device_id
    )
    count_query = select(func.count(AssetLifecycleEvent.id)).where(
        AssetLifecycleEvent.device_id == device_id
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset)
        .limit(limit)
        .order_by(AssetLifecycleEvent.occurred_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


# ---------------------------------------------------------------------------
# Add lifecycle event
# ---------------------------------------------------------------------------


@router.post(
    "/devices/{device_id}/events",
    response_model=LifecycleEventResponse,
    status_code=201,
    summary="Add lifecycle event",
    description="Record a new lifecycle event for a device.",
)
async def add_lifecycle_event(
    device_id: uuid.UUID,
    data: LifecycleEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a lifecycle event to a device."""
    # Verify device exists
    device_result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    if not device_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")

    event = AssetLifecycleEvent(
        device_id=device_id,
        event_type=data.event_type,
        performed_by=current_user.id,
        detail=data.detail,
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


# ---------------------------------------------------------------------------
# Disposal request CRUD
# ---------------------------------------------------------------------------


@router.get(
    "/disposals",
    response_model=PaginatedResponse[DisposalRequestResponse],
    summary="List disposal requests",
    description="Retrieve a paginated list of disposal requests.",
)
async def list_disposal_requests(
    offset: int = Query(0, ge=0, alias="skip", description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    status_filter: str | None = Query(
        None, alias="status", description="Filter by disposal status"
    ),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all disposal requests with optional status filter."""
    base_query = select(DisposalRequest)
    count_query = select(func.count(DisposalRequest.id))

    if status_filter:
        base_query = base_query.where(DisposalRequest.status == status_filter)
        count_query = count_query.where(DisposalRequest.status == status_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset)
        .limit(limit)
        .order_by(DisposalRequest.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/disposals",
    response_model=DisposalRequestResponse,
    status_code=201,
    summary="Create disposal request",
    description="Submit a new disposal request for a device.",
)
async def create_disposal_request(
    data: DisposalRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new disposal request."""
    # Verify device exists
    device_result = await db.execute(
        select(Device).where(Device.id == data.device_id)
    )
    if not device_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")

    disposal = DisposalRequest(
        device_id=data.device_id,
        reason=data.reason,
        method=data.method,
        requested_by=current_user.id,
        status=DisposalStatus.pending,
    )
    db.add(disposal)
    await db.flush()
    await db.refresh(disposal)

    # Also record a lifecycle event
    event = AssetLifecycleEvent(
        device_id=data.device_id,
        event_type=LifecycleEventType.disposal_requested,
        performed_by=current_user.id,
        detail={"reason": data.reason, "method": data.method.value},
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()

    return disposal


# ---------------------------------------------------------------------------
# Disposal workflow transitions
# ---------------------------------------------------------------------------


@router.patch(
    "/disposals/{disposal_id}/approve",
    response_model=DisposalRequestResponse,
    summary="Approve disposal request",
    description="Approve a pending disposal request.",
    responses={
        400: {"description": "Disposal request is not in pending status"},
        404: {"description": "Disposal request not found"},
    },
)
async def approve_disposal(
    disposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve a pending disposal request."""
    disposal = await _get_disposal(db, disposal_id)

    if disposal.status != DisposalStatus.pending:
        raise HTTPException(
            status_code=400,
            detail="Only pending disposal requests can be approved",
        )

    disposal.status = DisposalStatus.approved
    disposal.approved_by = current_user.id
    await db.flush()
    await db.refresh(disposal)

    # Record lifecycle event
    event = AssetLifecycleEvent(
        device_id=disposal.device_id,
        event_type=LifecycleEventType.disposal_approved,
        performed_by=current_user.id,
        detail={"disposal_request_id": str(disposal.id)},
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()

    return disposal


@router.patch(
    "/disposals/{disposal_id}/reject",
    response_model=DisposalRequestResponse,
    summary="Reject disposal request",
    description="Reject a pending disposal request.",
    responses={
        400: {"description": "Disposal request is not in pending status"},
        404: {"description": "Disposal request not found"},
    },
)
async def reject_disposal(
    disposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Reject a pending disposal request."""
    disposal = await _get_disposal(db, disposal_id)

    if disposal.status != DisposalStatus.pending:
        raise HTTPException(
            status_code=400,
            detail="Only pending disposal requests can be rejected",
        )

    disposal.status = DisposalStatus.rejected
    await db.flush()
    await db.refresh(disposal)
    return disposal


@router.patch(
    "/disposals/{disposal_id}/complete",
    response_model=DisposalRequestResponse,
    summary="Complete disposal",
    description="Mark an approved disposal request as completed with certificate information.",
    responses={
        400: {"description": "Disposal request is not in approved status"},
        404: {"description": "Disposal request not found"},
    },
)
async def complete_disposal(
    disposal_id: uuid.UUID,
    data: DisposalCompletePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Complete an approved disposal with certificate details."""
    disposal = await _get_disposal(db, disposal_id)

    if disposal.status != DisposalStatus.approved:
        raise HTTPException(
            status_code=400,
            detail="Only approved disposal requests can be completed",
        )

    disposal.status = DisposalStatus.completed
    disposal.certificate_number = data.certificate_number
    disposal.certificate_path = data.certificate_path
    disposal.disposal_date = data.disposal_date or date.today()
    await db.flush()
    await db.refresh(disposal)

    # Record lifecycle event
    event = AssetLifecycleEvent(
        device_id=disposal.device_id,
        event_type=LifecycleEventType.disposed,
        performed_by=current_user.id,
        detail={
            "disposal_request_id": str(disposal.id),
            "certificate_number": data.certificate_number,
        },
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()

    return disposal


# ---------------------------------------------------------------------------
# Summary statistics
# ---------------------------------------------------------------------------


@router.get(
    "/summary",
    response_model=LifecycleSummary,
    summary="Lifecycle statistics",
    description="Aggregated lifecycle statistics across all devices.",
)
async def get_lifecycle_summary(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return aggregated lifecycle statistics."""
    # Count events by type
    event_counts_query = (
        select(
            AssetLifecycleEvent.event_type,
            func.count(AssetLifecycleEvent.id).label("cnt"),
        )
        .group_by(AssetLifecycleEvent.event_type)
    )
    event_result = await db.execute(event_counts_query)
    event_counts = {row.event_type: row.cnt for row in event_result}

    # Count total events
    total_result = await db.execute(
        select(func.count(AssetLifecycleEvent.id))
    )
    total_events = total_result.scalar_one()

    # Disposal request counts by status
    disposal_counts_query = (
        select(
            DisposalRequest.status,
            func.count(DisposalRequest.id).label("cnt"),
        )
        .group_by(DisposalRequest.status)
    )
    disposal_result = await db.execute(disposal_counts_query)
    disposal_counts = {row.status: row.cnt for row in disposal_result}

    return LifecycleSummary(
        procured=event_counts.get(LifecycleEventType.procured, 0),
        deployed=event_counts.get(LifecycleEventType.deployed, 0),
        maintenance=event_counts.get(LifecycleEventType.maintenance, 0),
        disposed=event_counts.get(LifecycleEventType.disposed, 0),
        disposal_pending=disposal_counts.get(DisposalStatus.pending, 0),
        disposal_approved=disposal_counts.get(DisposalStatus.approved, 0),
        total_events=total_events,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_disposal(db: AsyncSession, disposal_id: uuid.UUID) -> DisposalRequest:
    """Fetch a disposal request by ID or raise 404."""
    result = await db.execute(
        select(DisposalRequest).where(DisposalRequest.id == disposal_id)
    )
    disposal = result.scalar_one_or_none()
    if not disposal:
        raise HTTPException(status_code=404, detail="Disposal request not found")
    return disposal
