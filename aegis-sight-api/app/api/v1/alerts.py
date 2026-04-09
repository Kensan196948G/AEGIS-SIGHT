import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.alert import Alert, AlertCategory, AlertSeverity
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertResponse, AlertStats

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=PaginatedResponse[AlertResponse],
    summary="List alerts",
    description="Retrieve a paginated list of alerts with optional filters.",
)
async def list_alerts(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    severity: AlertSeverity | None = Query(None, description="Filter by severity"),
    category: AlertCategory | None = Query(None, description="Filter by category"),
    is_acknowledged: bool | None = Query(None, description="Filter by acknowledgement status"),
    date_from: datetime | None = Query(None, description="Filter alerts created after this date"),
    date_to: datetime | None = Query(None, description="Filter alerts created before this date"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all alerts with pagination and optional filters."""
    base_query = select(Alert)
    count_query = select(func.count(Alert.id))

    if severity is not None:
        base_query = base_query.where(Alert.severity == severity)
        count_query = count_query.where(Alert.severity == severity)

    if category is not None:
        base_query = base_query.where(Alert.category == category)
        count_query = count_query.where(Alert.category == category)

    if is_acknowledged is not None:
        base_query = base_query.where(Alert.is_acknowledged == is_acknowledged)
        count_query = count_query.where(Alert.is_acknowledged == is_acknowledged)

    if date_from is not None:
        base_query = base_query.where(Alert.created_at >= date_from)
        count_query = count_query.where(Alert.created_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(Alert.created_at <= date_to)
        count_query = count_query.where(Alert.created_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(Alert.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/stats",
    response_model=AlertStats,
    summary="Alert statistics",
    description="Get aggregated alert statistics by severity and acknowledgement status.",
)
async def alert_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get alert statistics."""
    total_result = await db.execute(select(func.count(Alert.id)))
    total = total_result.scalar_one()

    critical_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.severity == AlertSeverity.critical)
    )
    critical = critical_result.scalar_one()

    warning_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.severity == AlertSeverity.warning)
    )
    warning = warning_result.scalar_one()

    info_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.severity == AlertSeverity.info)
    )
    info = info_result.scalar_one()

    unacknowledged_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.is_acknowledged.is_(False))
    )
    unacknowledged = unacknowledged_result.scalar_one()

    unresolved_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.resolved_at.is_(None))
    )
    unresolved = unresolved_result.scalar_one()

    return AlertStats(
        total=total,
        critical=critical,
        warning=warning,
        info=info,
        unacknowledged=unacknowledged,
        unresolved=unresolved,
    )


@router.get(
    "/{alert_id}",
    response_model=AlertResponse,
    summary="Get alert",
    description="Retrieve a specific alert by its UUID.",
    responses={404: {"description": "Alert not found"}},
)
async def get_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific alert by ID."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        raise NotFoundError("Alert", str(alert_id))
    return alert


@router.post(
    "",
    response_model=AlertResponse,
    status_code=201,
    summary="Create alert",
    description="Create a new alert.",
)
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new alert."""
    alert = Alert(**data.model_dump())
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


@router.patch(
    "/{alert_id}/acknowledge",
    response_model=AlertResponse,
    summary="Acknowledge alert",
    description="Mark an alert as acknowledged by the current user.",
    responses={
        400: {"description": "Alert already acknowledged"},
        404: {"description": "Alert not found"},
    },
)
async def acknowledge_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Acknowledge an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        raise NotFoundError("Alert", str(alert_id))
    if alert.is_acknowledged:
        raise BadRequestError("Alert is already acknowledged")

    alert.is_acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(alert)
    return alert


@router.patch(
    "/{alert_id}/resolve",
    response_model=AlertResponse,
    summary="Resolve alert",
    description="Mark an alert as resolved.",
    responses={
        400: {"description": "Alert already resolved"},
        404: {"description": "Alert not found"},
    },
)
async def resolve_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Resolve an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        raise NotFoundError("Alert", str(alert_id))
    if alert.resolved_at is not None:
        raise BadRequestError("Alert is already resolved")

    alert.resolved_at = datetime.now(timezone.utc)
    # Auto-acknowledge if not already
    if not alert.is_acknowledged:
        alert.is_acknowledged = True
        alert.acknowledged_by = current_user.id
        alert.acknowledged_at = alert.resolved_at
    await db.flush()
    await db.refresh(alert)
    return alert
