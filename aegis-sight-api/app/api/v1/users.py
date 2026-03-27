import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserSettings, UserSettingsUpdate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=PaginatedResponse[UserResponse],
    summary="List users",
    description="Retrieve a paginated list of all users. Admin only.",
)
async def list_users(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    role: UserRole | None = Query(None, description="Filter by role"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin)),
):
    """List all users (admin only)."""
    base_query = select(User)
    count_query = select(func.count(User.id))

    if role is not None:
        base_query = base_query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    if is_active is not None:
        base_query = base_query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(User.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/me/settings",
    response_model=UserSettings,
    summary="Get personal settings",
    description="Retrieve the current user's personal settings.",
)
async def get_my_settings(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's settings."""
    return UserSettings(
        email_notifications=True,
        alert_severity_filter="all",
        language="ja",
        theme="system",
    )


@router.patch(
    "/me/settings",
    response_model=UserSettings,
    summary="Update personal settings",
    description="Update the current user's personal settings.",
)
async def update_my_settings(
    data: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update current user's settings."""
    # In a full implementation this would persist to a user_settings table.
    # For now, return the updated values merged with defaults.
    defaults = {
        "email_notifications": True,
        "alert_severity_filter": "all",
        "language": "ja",
        "theme": "system",
    }
    updates = data.model_dump(exclude_unset=True)
    merged = {**defaults, **updates}
    return UserSettings(**merged)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user",
    description="Retrieve a specific user by their UUID.",
    responses={404: {"description": "User not found"}},
)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User", str(user_id))
    return user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user",
    description="Update a user's profile (role, name, active status). Admin only.",
    responses={404: {"description": "User not found"}},
)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Update a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User", str(user_id))

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    response_model=UserResponse,
    summary="Deactivate user",
    description="Deactivate (soft-delete) a user account. Admin only.",
    responses={
        403: {"description": "Cannot deactivate yourself"},
        404: {"description": "User not found"},
    },
)
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Deactivate a user (admin only)."""
    if current_user.id == user_id:
        raise ForbiddenError(detail="Cannot deactivate your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User", str(user_id))

    user.is_active = False
    await db.flush()
    await db.refresh(user)
    return user
