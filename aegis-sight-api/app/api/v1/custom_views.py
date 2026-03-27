import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.custom_view import CustomView
from app.models.user import User
from app.schemas.custom_view import (
    CustomViewCreate,
    CustomViewResponse,
    CustomViewUpdate,
    ShareToggleRequest,
)

router = APIRouter(prefix="/views", tags=["views"])


@router.get(
    "",
    response_model=PaginatedResponse[CustomViewResponse],
    summary="List custom views",
    description="Retrieve custom views owned by the current user or shared.",
)
async def list_views(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    entity_type: str | None = Query(None, description="Filter by entity type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List views: own views + shared views."""
    base_filter = or_(
        CustomView.owner_id == current_user.id,
        CustomView.is_shared.is_(True),
    )
    base_query = select(CustomView).where(base_filter)
    count_query = select(func.count(CustomView.id)).where(base_filter)

    if entity_type is not None:
        base_query = base_query.where(CustomView.entity_type == entity_type)
        count_query = count_query.where(CustomView.entity_type == entity_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(CustomView.name)
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "",
    response_model=CustomViewResponse,
    status_code=201,
    summary="Create custom view",
    description="Create a new custom view.",
)
async def create_view(
    data: CustomViewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new custom view."""
    view = CustomView(**data.model_dump(), owner_id=current_user.id)
    db.add(view)
    await db.flush()
    await db.refresh(view)
    return view


@router.patch(
    "/{view_id}",
    response_model=CustomViewResponse,
    summary="Update custom view",
    description="Update a custom view (owner only).",
    responses={
        403: {"description": "Not the owner"},
        404: {"description": "View not found"},
    },
)
async def update_view(
    view_id: uuid.UUID,
    data: CustomViewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a custom view."""
    result = await db.execute(
        select(CustomView).where(CustomView.id == view_id)
    )
    view = result.scalar_one_or_none()
    if view is None:
        raise NotFoundError("CustomView", str(view_id))
    if view.owner_id != current_user.id:
        raise ForbiddenError("You can only update your own views")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(view, field, value)

    await db.flush()
    await db.refresh(view)
    return view


@router.delete(
    "/{view_id}",
    status_code=204,
    summary="Delete custom view",
    description="Delete a custom view (owner only).",
    responses={
        403: {"description": "Not the owner"},
        404: {"description": "View not found"},
    },
)
async def delete_view(
    view_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a custom view."""
    result = await db.execute(
        select(CustomView).where(CustomView.id == view_id)
    )
    view = result.scalar_one_or_none()
    if view is None:
        raise NotFoundError("CustomView", str(view_id))
    if view.owner_id != current_user.id:
        raise ForbiddenError("You can only delete your own views")

    await db.delete(view)
    await db.flush()


@router.post(
    "/{view_id}/share",
    response_model=CustomViewResponse,
    summary="Toggle view sharing",
    description="Toggle the shared status of a custom view (owner only).",
    responses={
        403: {"description": "Not the owner"},
        404: {"description": "View not found"},
    },
)
async def toggle_share(
    view_id: uuid.UUID,
    data: ShareToggleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Toggle the shared status of a custom view."""
    result = await db.execute(
        select(CustomView).where(CustomView.id == view_id)
    )
    view = result.scalar_one_or_none()
    if view is None:
        raise NotFoundError("CustomView", str(view_id))
    if view.owner_id != current_user.id:
        raise ForbiddenError("You can only share your own views")

    view.is_shared = data.is_shared
    await db.flush()
    await db.refresh(view)
    return view
