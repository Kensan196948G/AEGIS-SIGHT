"""User session and activity tracking API endpoints."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.user import User
from app.models.user_session import (
    ActivityType,
    SessionType,
    UserActivity,
    UserSession,
)
from app.schemas.user_session import (
    ActivityCreate,
    ActivityResponse,
    SessionAnalytics,
    SessionCreate,
    SessionEnd,
    SessionResponse,
    UserBehaviorProfile,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ---------------------------------------------------------------------------
# Sessions CRUD
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=PaginatedResponse[SessionResponse],
    summary="List sessions",
    description="Retrieve a paginated list of user sessions with optional filters.",
)
async def list_sessions(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_name: str | None = Query(None, alias="user"),
    device_id: uuid.UUID | None = Query(None, alias="device"),
    session_type: SessionType | None = Query(None, alias="type"),
    is_active: bool | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List sessions with filtering."""
    base_query = select(UserSession)
    count_query = select(func.count(UserSession.id))

    if user_name is not None:
        base_query = base_query.where(UserSession.user_name == user_name)
        count_query = count_query.where(UserSession.user_name == user_name)

    if device_id is not None:
        base_query = base_query.where(UserSession.device_id == device_id)
        count_query = count_query.where(UserSession.device_id == device_id)

    if session_type is not None:
        base_query = base_query.where(UserSession.session_type == session_type)
        count_query = count_query.where(UserSession.session_type == session_type)

    if is_active is not None:
        base_query = base_query.where(UserSession.is_active == is_active)
        count_query = count_query.where(UserSession.is_active == is_active)

    if date_from is not None:
        base_query = base_query.where(UserSession.started_at >= date_from)
        count_query = count_query.where(UserSession.started_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(UserSession.started_at <= date_to)
        count_query = count_query.where(UserSession.started_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(UserSession.started_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/active",
    response_model=PaginatedResponse[SessionResponse],
    summary="Active sessions",
    description="List currently active sessions.",
)
async def list_active_sessions(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List active sessions."""
    base_query = select(UserSession).where(UserSession.is_active.is_(True))
    count_query = select(func.count(UserSession.id)).where(
        UserSession.is_active.is_(True)
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(UserSession.started_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "",
    response_model=SessionResponse,
    status_code=201,
    summary="Start session",
    description="Record a new session start.",
)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Record a new session."""
    session = UserSession(**data.model_dump())
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.patch(
    "/{session_id}/end",
    response_model=SessionResponse,
    summary="End session",
    description="Mark a session as ended and compute duration.",
    responses={404: {"description": "Session not found"}},
)
async def end_session(
    session_id: uuid.UUID,
    data: SessionEnd,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """End an active session."""
    result = await db.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise NotFoundError("UserSession", str(session_id))

    now = data.ended_at or datetime.now(UTC)
    session.ended_at = now
    session.is_active = False

    # Compute duration in minutes
    delta = now - session.started_at
    session.duration_minutes = int(delta.total_seconds() / 60)

    await db.flush()
    await db.refresh(session)
    return session


# ---------------------------------------------------------------------------
# Session analytics
# ---------------------------------------------------------------------------
@router.get(
    "/analytics",
    response_model=SessionAnalytics,
    summary="Session analytics",
    description="Aggregated session statistics: user usage time, peak hours, type distribution.",
)
async def session_analytics(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get session analytics."""
    # Total sessions
    total_result = await db.execute(select(func.count(UserSession.id)))
    total_sessions = total_result.scalar_one()

    # Active sessions
    active_result = await db.execute(
        select(func.count(UserSession.id)).where(UserSession.is_active.is_(True))
    )
    active_sessions = active_result.scalar_one()

    # By type
    by_type: dict[str, int] = {}
    for st in SessionType:
        st_result = await db.execute(
            select(func.count(UserSession.id)).where(
                UserSession.session_type == st
            )
        )
        by_type[st.value] = st_result.scalar_one()

    # By user (top 20 by total duration)
    user_query = (
        select(
            UserSession.user_name,
            func.count(UserSession.id).label("session_count"),
            func.coalesce(func.sum(UserSession.duration_minutes), 0).label(
                "total_minutes"
            ),
        )
        .group_by(UserSession.user_name)
        .order_by(func.count(UserSession.id).desc())
        .limit(20)
    )
    user_result = await db.execute(user_query)
    by_user = [
        {
            "user_name": row.user_name,
            "session_count": row.session_count,
            "total_minutes": int(row.total_minutes),
        }
        for row in user_result.all()
    ]

    # Peak hours (sessions started per hour of day)
    hour_query = (
        select(
            extract("hour", UserSession.started_at).label("hour"),
            func.count(UserSession.id).label("count"),
        )
        .group_by(extract("hour", UserSession.started_at))
        .order_by(extract("hour", UserSession.started_at))
    )
    hour_result = await db.execute(hour_query)
    peak_hours = [
        {"hour": int(row.hour), "count": row.count} for row in hour_result.all()
    ]

    return SessionAnalytics(
        total_sessions=total_sessions,
        active_sessions=active_sessions,
        by_type=by_type,
        by_user=by_user,
        peak_hours=peak_hours,
    )


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------
@router.get(
    "/activities",
    response_model=PaginatedResponse[ActivityResponse],
    summary="List activities",
    description="Retrieve a paginated list of user activities.",
)
async def list_activities(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_name: str | None = Query(None, alias="user"),
    device_id: uuid.UUID | None = Query(None, alias="device"),
    activity_type: ActivityType | None = Query(None, alias="type"),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List user activities with filtering."""
    base_query = select(UserActivity)
    count_query = select(func.count(UserActivity.id))

    if user_name is not None:
        base_query = base_query.where(UserActivity.user_name == user_name)
        count_query = count_query.where(UserActivity.user_name == user_name)

    if device_id is not None:
        base_query = base_query.where(UserActivity.device_id == device_id)
        count_query = count_query.where(UserActivity.device_id == device_id)

    if activity_type is not None:
        base_query = base_query.where(UserActivity.activity_type == activity_type)
        count_query = count_query.where(UserActivity.activity_type == activity_type)

    if date_from is not None:
        base_query = base_query.where(UserActivity.occurred_at >= date_from)
        count_query = count_query.where(UserActivity.occurred_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(UserActivity.occurred_at <= date_to)
        count_query = count_query.where(UserActivity.occurred_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(
            UserActivity.occurred_at.desc()
        )
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/activities",
    response_model=ActivityResponse,
    status_code=201,
    summary="Record activity",
    description="Record a new user activity event.",
)
async def create_activity(
    data: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Record a new user activity."""
    activity = UserActivity(**data.model_dump())
    db.add(activity)
    await db.flush()
    await db.refresh(activity)
    return activity


# ---------------------------------------------------------------------------
# User behavior profile
# ---------------------------------------------------------------------------
@router.get(
    "/users/{user_name}/behavior",
    response_model=UserBehaviorProfile,
    summary="User behavior profile",
    description="Aggregated behavior profile for a specific user.",
)
async def user_behavior_profile(
    user_name: str,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get user behavior profile."""
    # Session stats
    total_result = await db.execute(
        select(func.count(UserSession.id)).where(
            UserSession.user_name == user_name
        )
    )
    total_sessions = total_result.scalar_one()

    duration_result = await db.execute(
        select(func.coalesce(func.sum(UserSession.duration_minutes), 0)).where(
            UserSession.user_name == user_name
        )
    )
    total_duration = int(duration_result.scalar_one())

    avg_duration_result = await db.execute(
        select(func.coalesce(func.avg(UserSession.duration_minutes), 0)).where(
            UserSession.user_name == user_name
        )
    )
    avg_duration = float(avg_duration_result.scalar_one())

    # Active sessions count
    active_result = await db.execute(
        select(func.count(UserSession.id)).where(
            UserSession.user_name == user_name,
            UserSession.is_active.is_(True),
        )
    )
    active_sessions = active_result.scalar_one()

    # Session types distribution
    session_types: dict[str, int] = {}
    for st in SessionType:
        st_result = await db.execute(
            select(func.count(UserSession.id)).where(
                UserSession.user_name == user_name,
                UserSession.session_type == st,
            )
        )
        session_types[st.value] = st_result.scalar_one()

    # Activity types distribution
    activity_types: dict[str, int] = {}
    for at in ActivityType:
        at_result = await db.execute(
            select(func.count(UserActivity.id)).where(
                UserActivity.user_name == user_name,
                UserActivity.activity_type == at,
            )
        )
        activity_types[at.value] = at_result.scalar_one()

    # Recent activities (last 20)
    recent_result = await db.execute(
        select(UserActivity)
        .where(UserActivity.user_name == user_name)
        .order_by(UserActivity.occurred_at.desc())
        .limit(20)
    )
    recent_activities = recent_result.scalars().all()

    return UserBehaviorProfile(
        user_name=user_name,
        total_sessions=total_sessions,
        total_duration_minutes=total_duration,
        avg_duration_minutes=round(avg_duration, 1),
        session_types=session_types,
        activity_types=activity_types,
        recent_activities=[
            ActivityResponse.model_validate(a) for a in recent_activities
        ],
        active_sessions=active_sessions,
    )
