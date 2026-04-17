import uuid
from datetime import datetime, timezone, UTC

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.incident import (
    Incident,
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    ThreatIndicator,
)
from app.models.user import User
from app.schemas.incident import (
    IncidentAssign,
    IncidentCreate,
    IncidentResolve,
    IncidentResponse,
    IncidentStats,
    IncidentUpdate,
    ThreatIndicatorCreate,
    ThreatIndicatorResponse,
    TimelineEntry,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])


# ---------------------------------------------------------------------------
# Incident CRUD
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=PaginatedResponse[IncidentResponse],
    summary="List incidents",
    description="Retrieve a paginated list of incidents with optional filters.",
)
async def list_incidents(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    severity: IncidentSeverity | None = Query(None, description="Filter by severity"),
    status: IncidentStatus | None = Query(None, description="Filter by status"),
    category: IncidentCategory | None = Query(None, description="Filter by category"),
    assigned_to: uuid.UUID | None = Query(None, description="Filter by assignee"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all incidents with pagination and optional filters."""
    base_query = select(Incident)
    count_query = select(func.count(Incident.id))

    if severity is not None:
        base_query = base_query.where(Incident.severity == severity)
        count_query = count_query.where(Incident.severity == severity)

    if status is not None:
        base_query = base_query.where(Incident.status == status)
        count_query = count_query.where(Incident.status == status)

    if category is not None:
        base_query = base_query.where(Incident.category == category)
        count_query = count_query.where(Incident.category == category)

    if assigned_to is not None:
        base_query = base_query.where(Incident.assigned_to == assigned_to)
        count_query = count_query.where(Incident.assigned_to == assigned_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(Incident.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=201,
    summary="Create incident",
    description="Create a new incident.",
)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new incident."""
    now = datetime.now(UTC)
    incident = Incident(
        title=data.title,
        description=data.description,
        severity=data.severity,
        category=data.category,
        status=IncidentStatus.detected,
        affected_devices=data.affected_devices,
        reported_by=current_user.id,
        detected_at=data.detected_at or now,
        timeline=[
            {
                "timestamp": now.isoformat(),
                "event": "Incident created",
                "user": str(current_user.id),
            }
        ],
    )
    db.add(incident)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.get(
    "/stats",
    response_model=IncidentStats,
    summary="Incident statistics",
    description="Get aggregated incident statistics.",
)
async def incident_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get incident statistics including counts by severity and MTTR."""
    total_result = await db.execute(select(func.count(Incident.id)))
    total = total_result.scalar_one()

    p1_result = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.severity == IncidentSeverity.P1_critical
        )
    )
    p1 = p1_result.scalar_one()

    p2_result = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.severity == IncidentSeverity.P2_high
        )
    )
    p2 = p2_result.scalar_one()

    p3_result = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.severity == IncidentSeverity.P3_medium
        )
    )
    p3 = p3_result.scalar_one()

    p4_result = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.severity == IncidentSeverity.P4_low
        )
    )
    p4 = p4_result.scalar_one()

    open_result = await db.execute(
        select(func.count(Incident.id)).where(Incident.resolved_at.is_(None))
    )
    open_count = open_result.scalar_one()

    resolved_result = await db.execute(
        select(func.count(Incident.id)).where(Incident.resolved_at.is_not(None))
    )
    resolved_count = resolved_result.scalar_one()

    # Calculate MTTR (Mean Time To Resolve) in hours
    mttr_result = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Incident.resolved_at)
                - func.extract("epoch", Incident.detected_at)
            )
        ).where(Incident.resolved_at.is_not(None))
    )
    avg_seconds = mttr_result.scalar_one()
    mttr_hours = round(avg_seconds / 3600, 2) if avg_seconds else None

    return IncidentStats(
        total=total,
        p1_critical=p1,
        p2_high=p2,
        p3_medium=p3,
        p4_low=p4,
        open_incidents=open_count,
        resolved_incidents=resolved_count,
        mttr_hours=mttr_hours,
    )


@router.get(
    "/threats",
    response_model=PaginatedResponse[ThreatIndicatorResponse],
    summary="List threat indicators",
    description="Retrieve a paginated list of threat indicators.",
)
async def list_threats(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all threat indicators."""
    base_query = select(ThreatIndicator)
    count_query = select(func.count(ThreatIndicator.id))

    if is_active is not None:
        base_query = base_query.where(ThreatIndicator.is_active == is_active)
        count_query = count_query.where(ThreatIndicator.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(ThreatIndicator.last_seen.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/threats",
    response_model=ThreatIndicatorResponse,
    status_code=201,
    summary="Create threat indicator",
    description="Register a new threat indicator.",
)
async def create_threat(
    data: ThreatIndicatorCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new threat indicator."""
    indicator = ThreatIndicator(
        indicator_type=data.indicator_type,
        value=data.value,
        threat_level=data.threat_level,
        source=data.source,
        description=data.description,
        related_incidents=data.related_incidents,
    )
    db.add(indicator)
    await db.flush()
    await db.refresh(indicator)
    return indicator


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Get incident",
    description="Retrieve a specific incident by its UUID.",
    responses={404: {"description": "Incident not found"}},
)
async def get_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific incident by ID."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        raise NotFoundError("Incident", str(incident_id))
    return incident


@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Update incident",
    description="Update incident fields and optionally add a timeline entry.",
)
async def update_incident(
    incident_id: uuid.UUID,
    data: IncidentUpdate,
    timeline_entry: TimelineEntry | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an incident's fields and/or add a timeline entry."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        raise NotFoundError("Incident", str(incident_id))

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incident, field, value)

    # Add timeline entry for status changes
    if data.status is not None:
        now = datetime.now(UTC)
        entry = {
            "timestamp": now.isoformat(),
            "event": f"Status changed to {data.status.value}",
            "user": str(current_user.id),
        }
        if timeline_entry and timeline_entry.details:
            entry["details"] = timeline_entry.details
        current_timeline = incident.timeline or []
        incident.timeline = current_timeline + [entry]

    await db.flush()
    await db.refresh(incident)
    return incident


@router.patch(
    "/{incident_id}/assign",
    response_model=IncidentResponse,
    summary="Assign incident",
    description="Assign an incident to a user.",
    responses={404: {"description": "Incident not found"}},
)
async def assign_incident(
    incident_id: uuid.UUID,
    data: IncidentAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Assign an incident to a specific user."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        raise NotFoundError("Incident", str(incident_id))

    incident.assigned_to = data.assigned_to

    # Add timeline entry
    now = datetime.now(UTC)
    current_timeline = incident.timeline or []
    incident.timeline = current_timeline + [
        {
            "timestamp": now.isoformat(),
            "event": f"Assigned to {data.assigned_to}",
            "user": str(current_user.id),
        }
    ]

    await db.flush()
    await db.refresh(incident)
    return incident


@router.patch(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
    summary="Resolve incident",
    description="Mark an incident as resolved with root cause and resolution.",
    responses={
        400: {"description": "Incident already resolved"},
        404: {"description": "Incident not found"},
    },
)
async def resolve_incident(
    incident_id: uuid.UUID,
    data: IncidentResolve,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Resolve an incident with root cause and resolution details."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        raise NotFoundError("Incident", str(incident_id))
    if incident.resolved_at is not None:
        raise BadRequestError("Incident is already resolved")

    now = datetime.now(UTC)
    incident.status = IncidentStatus.resolved
    incident.root_cause = data.root_cause
    incident.resolution = data.resolution
    incident.lessons_learned = data.lessons_learned
    incident.resolved_at = now

    # Add timeline entry
    current_timeline = incident.timeline or []
    incident.timeline = current_timeline + [
        {
            "timestamp": now.isoformat(),
            "event": "Incident resolved",
            "user": str(current_user.id),
            "details": f"Root cause: {data.root_cause}",
        }
    ]

    await db.flush()
    await db.refresh(incident)
    return incident
