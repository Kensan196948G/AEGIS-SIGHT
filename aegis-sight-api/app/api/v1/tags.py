import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.tag import Tag, TagAssignment, TagCategory
from app.models.user import User
from app.schemas.tag import (
    TagAssignRequest,
    TagAssignResponse,
    TagCreate,
    TagEntityItem,
    TagResponse,
)

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get(
    "",
    response_model=PaginatedResponse[TagResponse],
    summary="List tags",
    description="Retrieve a paginated list of tags with optional category filter.",
)
async def list_tags(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    category: TagCategory | None = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all tags with pagination and optional category filter."""
    base_query = select(Tag)
    count_query = select(func.count(Tag.id))

    if category is not None:
        base_query = base_query.where(Tag.category == category)
        count_query = count_query.where(Tag.category == category)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(Tag.name)
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "",
    response_model=TagResponse,
    status_code=201,
    summary="Create tag",
    description="Create a new tag.",
)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new tag."""
    # Check for duplicate name
    existing = await db.execute(select(Tag).where(Tag.name == data.name))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(f"Tag with name '{data.name}' already exists")

    tag = Tag(**data.model_dump())
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return tag


@router.delete(
    "/{tag_id}",
    status_code=204,
    summary="Delete tag",
    description="Delete a tag and all its assignments.",
    responses={404: {"description": "Tag not found"}},
)
async def delete_tag(
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Delete a tag by ID."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundError("Tag", str(tag_id))

    await db.delete(tag)
    await db.flush()


@router.post(
    "/assign",
    response_model=TagAssignResponse,
    status_code=201,
    summary="Assign tag",
    description="Assign a tag to an entity (device, license, or procurement).",
)
async def assign_tag(
    data: TagAssignRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Assign a tag to an entity."""
    # Verify tag exists
    tag_result = await db.execute(select(Tag).where(Tag.id == data.tag_id))
    if tag_result.scalar_one_or_none() is None:
        raise NotFoundError("Tag", str(data.tag_id))

    # Check for duplicate assignment
    existing = await db.execute(
        select(TagAssignment).where(
            TagAssignment.tag_id == data.tag_id,
            TagAssignment.entity_type == data.entity_type,
            TagAssignment.entity_id == data.entity_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("Tag is already assigned to this entity")

    assignment = TagAssignment(**data.model_dump())
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


@router.delete(
    "/assign",
    status_code=204,
    summary="Unassign tag",
    description="Remove a tag assignment from an entity.",
)
async def unassign_tag(
    data: TagAssignRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Remove a tag assignment."""
    result = await db.execute(
        select(TagAssignment).where(
            TagAssignment.tag_id == data.tag_id,
            TagAssignment.entity_type == data.entity_type,
            TagAssignment.entity_id == data.entity_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise NotFoundError("TagAssignment")

    await db.delete(assignment)
    await db.flush()


@router.get(
    "/{tag_id}/entities",
    response_model=PaginatedResponse[TagEntityItem],
    summary="List tagged entities",
    description="List all entities assigned to a specific tag.",
    responses={404: {"description": "Tag not found"}},
)
async def list_tag_entities(
    tag_id: uuid.UUID,
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List entities assigned to a tag."""
    # Verify tag exists
    tag_result = await db.execute(select(Tag).where(Tag.id == tag_id))
    if tag_result.scalar_one_or_none() is None:
        raise NotFoundError("Tag", str(tag_id))

    count_result = await db.execute(
        select(func.count(TagAssignment.id)).where(TagAssignment.tag_id == tag_id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(TagAssignment)
        .where(TagAssignment.tag_id == tag_id)
        .offset(offset)
        .limit(limit)
        .order_by(TagAssignment.created_at.desc())
    )
    assignments = result.scalars().all()

    items = [
        {
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "assigned_at": a.created_at,
        }
        for a in assignments
    ]

    return create_paginated_response(items, total, offset, limit)
