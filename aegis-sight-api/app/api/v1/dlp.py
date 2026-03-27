"""DLP (Data Loss Prevention) API endpoints."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.dlp import (
    DLPAction,
    DLPActionTaken,
    DLPEvent,
    DLPRule,
    DLPRuleType,
    DLPSeverity,
)
from app.models.user import User
from app.schemas.dlp import (
    DLPEvaluateRequest,
    DLPEvaluateResult,
    DLPEventResponse,
    DLPEventSummary,
    DLPRuleCreate,
    DLPRuleResponse,
    DLPRuleUpdate,
)
from app.services.dlp_service import DLPService

router = APIRouter(prefix="/dlp", tags=["dlp"])


# ---------------------------------------------------------------------------
# DLP Rules
# ---------------------------------------------------------------------------
@router.get(
    "/rules",
    response_model=PaginatedResponse[DLPRuleResponse],
    summary="List DLP rules",
    description="Retrieve a paginated list of DLP rules.",
)
async def list_dlp_rules(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    rule_type: DLPRuleType | None = Query(None),
    is_enabled: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all DLP rules with optional filters."""
    base_query = select(DLPRule)
    count_query = select(func.count(DLPRule.id))

    if rule_type is not None:
        base_query = base_query.where(DLPRule.rule_type == rule_type)
        count_query = count_query.where(DLPRule.rule_type == rule_type)

    if is_enabled is not None:
        base_query = base_query.where(DLPRule.is_enabled == is_enabled)
        count_query = count_query.where(DLPRule.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(DLPRule.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/rules",
    response_model=DLPRuleResponse,
    status_code=201,
    summary="Create DLP rule",
    description="Create a new DLP rule.",
)
async def create_dlp_rule(
    data: DLPRuleCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new DLP rule."""
    rule = DLPRule(**data.model_dump())
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


@router.patch(
    "/rules/{rule_id}",
    response_model=DLPRuleResponse,
    summary="Update DLP rule",
    description="Partially update an existing DLP rule.",
    responses={404: {"description": "DLP rule not found"}},
)
async def update_dlp_rule(
    rule_id: uuid.UUID,
    data: DLPRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update an existing DLP rule."""
    result = await db.execute(select(DLPRule).where(DLPRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundError("DLPRule", str(rule_id))

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    await db.flush()
    await db.refresh(rule)
    return rule


@router.delete(
    "/rules/{rule_id}",
    status_code=204,
    summary="Delete DLP rule",
    description="Delete a DLP rule by ID.",
    responses={404: {"description": "DLP rule not found"}},
)
async def delete_dlp_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Delete a DLP rule."""
    result = await db.execute(select(DLPRule).where(DLPRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundError("DLPRule", str(rule_id))

    await db.delete(rule)
    await db.flush()


# ---------------------------------------------------------------------------
# DLP Events
# ---------------------------------------------------------------------------
@router.get(
    "/events",
    response_model=PaginatedResponse[DLPEventResponse],
    summary="List DLP events",
    description="Retrieve a paginated list of DLP events with optional filters.",
)
async def list_dlp_events(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    rule_id: uuid.UUID | None = Query(None),
    device_id: uuid.UUID | None = Query(None),
    severity: DLPSeverity | None = Query(None, description="Filter by rule severity"),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List DLP events with filtering."""
    base_query = select(DLPEvent)
    count_query = select(func.count(DLPEvent.id))

    if rule_id is not None:
        base_query = base_query.where(DLPEvent.rule_id == rule_id)
        count_query = count_query.where(DLPEvent.rule_id == rule_id)

    if device_id is not None:
        base_query = base_query.where(DLPEvent.device_id == device_id)
        count_query = count_query.where(DLPEvent.device_id == device_id)

    if severity is not None:
        base_query = base_query.join(DLPRule).where(DLPRule.severity == severity)
        count_query = count_query.join(DLPRule).where(DLPRule.severity == severity)

    if date_from is not None:
        base_query = base_query.where(DLPEvent.detected_at >= date_from)
        count_query = count_query.where(DLPEvent.detected_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(DLPEvent.detected_at <= date_to)
        count_query = count_query.where(DLPEvent.detected_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(DLPEvent.detected_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/events/summary",
    response_model=DLPEventSummary,
    summary="DLP event summary",
    description="Get aggregated DLP event statistics.",
)
async def dlp_event_summary(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get DLP event statistics."""
    total_result = await db.execute(select(func.count(DLPEvent.id)))
    total = total_result.scalar_one()

    blocked_result = await db.execute(
        select(func.count(DLPEvent.id)).where(
            DLPEvent.action_taken == DLPActionTaken.blocked
        )
    )
    blocked = blocked_result.scalar_one()

    alerted_result = await db.execute(
        select(func.count(DLPEvent.id)).where(
            DLPEvent.action_taken == DLPActionTaken.alerted
        )
    )
    alerted = alerted_result.scalar_one()

    logged_result = await db.execute(
        select(func.count(DLPEvent.id)).where(
            DLPEvent.action_taken == DLPActionTaken.logged
        )
    )
    logged = logged_result.scalar_one()

    # By severity (join with rule)
    by_severity: dict[str, int] = {}
    for sev in DLPSeverity:
        sev_result = await db.execute(
            select(func.count(DLPEvent.id))
            .join(DLPRule)
            .where(DLPRule.severity == sev)
        )
        by_severity[sev.value] = sev_result.scalar_one()

    # By rule type (join with rule)
    by_rule_type: dict[str, int] = {}
    for rt in DLPRuleType:
        rt_result = await db.execute(
            select(func.count(DLPEvent.id))
            .join(DLPRule)
            .where(DLPRule.rule_type == rt)
        )
        by_rule_type[rt.value] = rt_result.scalar_one()

    return DLPEventSummary(
        total_events=total,
        blocked=blocked,
        alerted=alerted,
        logged=logged,
        by_severity=by_severity,
        by_rule_type=by_rule_type,
    )


# ---------------------------------------------------------------------------
# DLP Evaluate
# ---------------------------------------------------------------------------
@router.post(
    "/evaluate",
    response_model=DLPEvaluateResult,
    summary="Evaluate file operation",
    description="Evaluate a file operation against all enabled DLP rules. Called by agents.",
)
async def evaluate_file_operation(
    data: DLPEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Evaluate a file operation against DLP rules."""
    service = DLPService(db)
    matched_rules, created_events = await service.evaluate_file_operation(
        file_path=data.file_path,
        file_name=data.file_name,
        file_size=data.file_size,
        user_name=data.user_name,
        device_id=str(data.device_id) if data.device_id else None,
    )

    actions = list({rule.action for rule in matched_rules})

    return DLPEvaluateResult(
        matched=len(matched_rules) > 0,
        actions=actions,
        matched_rules=[DLPRuleResponse.model_validate(r) for r in matched_rules],
        events_created=len(created_events),
    )
