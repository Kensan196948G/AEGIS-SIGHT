import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.device_group import DeviceGroup, DeviceGroupMembership
from app.models.user import User
from app.schemas.device_group import (
    DeviceGroupCreate,
    DeviceGroupDetailResponse,
    DeviceGroupResponse,
    DeviceGroupUpdate,
    MemberAddRequest,
    DeviceGroupMembershipResponse,
)

router = APIRouter(prefix="/device-groups", tags=["device-groups"])


@router.get(
    "",
    response_model=PaginatedResponse[DeviceGroupResponse],
    summary="List device groups",
    description="Retrieve a paginated list of device groups.",
)
async def list_device_groups(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all device groups with pagination."""
    count_query = select(func.count(DeviceGroup.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        select(DeviceGroup).offset(offset).limit(limit).order_by(DeviceGroup.name)
    )
    groups = result.scalars().all()

    items = []
    for group in groups:
        member_count_result = await db.execute(
            select(func.count(DeviceGroupMembership.id)).where(
                DeviceGroupMembership.group_id == group.id
            )
        )
        member_count = member_count_result.scalar_one()
        items.append(
            {
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "criteria": group.criteria,
                "is_dynamic": group.is_dynamic,
                "created_by": group.created_by,
                "created_at": group.created_at,
                "updated_at": group.updated_at,
                "member_count": member_count,
            }
        )

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "",
    response_model=DeviceGroupResponse,
    status_code=201,
    summary="Create device group",
    description="Create a new device group.",
)
async def create_device_group(
    data: DeviceGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new device group."""
    existing = await db.execute(
        select(DeviceGroup).where(DeviceGroup.name == data.name)
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(f"Device group with name '{data.name}' already exists")

    group = DeviceGroup(**data.model_dump(), created_by=current_user.id)
    db.add(group)
    await db.flush()
    await db.refresh(group)
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "criteria": group.criteria,
        "is_dynamic": group.is_dynamic,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "member_count": 0,
    }


@router.get(
    "/{group_id}",
    response_model=DeviceGroupDetailResponse,
    summary="Get device group detail",
    description="Retrieve a device group with its members.",
    responses={404: {"description": "Group not found"}},
)
async def get_device_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get device group detail including members."""
    result = await db.execute(
        select(DeviceGroup).where(DeviceGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise NotFoundError("DeviceGroup", str(group_id))

    members_result = await db.execute(
        select(DeviceGroupMembership).where(
            DeviceGroupMembership.group_id == group_id
        )
    )
    members = members_result.scalars().all()

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "criteria": group.criteria,
        "is_dynamic": group.is_dynamic,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "member_count": len(members),
        "members": members,
    }


@router.patch(
    "/{group_id}",
    response_model=DeviceGroupResponse,
    summary="Update device group",
    description="Update a device group's properties.",
    responses={404: {"description": "Group not found"}},
)
async def update_device_group(
    group_id: uuid.UUID,
    data: DeviceGroupUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update a device group."""
    result = await db.execute(
        select(DeviceGroup).where(DeviceGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise NotFoundError("DeviceGroup", str(group_id))

    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != group.name:
        existing = await db.execute(
            select(DeviceGroup).where(DeviceGroup.name == update_data["name"])
        )
        if existing.scalar_one_or_none() is not None:
            raise ConflictError(
                f"Device group with name '{update_data['name']}' already exists"
            )

    for field, value in update_data.items():
        setattr(group, field, value)

    await db.flush()
    await db.refresh(group)

    member_count_result = await db.execute(
        select(func.count(DeviceGroupMembership.id)).where(
            DeviceGroupMembership.group_id == group.id
        )
    )
    member_count = member_count_result.scalar_one()

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "criteria": group.criteria,
        "is_dynamic": group.is_dynamic,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "member_count": member_count,
    }


@router.delete(
    "/{group_id}",
    status_code=204,
    summary="Delete device group",
    description="Delete a device group and all its memberships.",
    responses={404: {"description": "Group not found"}},
)
async def delete_device_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Delete a device group by ID."""
    result = await db.execute(
        select(DeviceGroup).where(DeviceGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise NotFoundError("DeviceGroup", str(group_id))

    await db.delete(group)
    await db.flush()


@router.post(
    "/{group_id}/members",
    response_model=DeviceGroupMembershipResponse,
    status_code=201,
    summary="Add member to group",
    description="Add a device to a device group.",
    responses={404: {"description": "Group not found"}, 409: {"description": "Already a member"}},
)
async def add_member(
    group_id: uuid.UUID,
    data: MemberAddRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Add a device to a device group."""
    group_result = await db.execute(
        select(DeviceGroup).where(DeviceGroup.id == group_id)
    )
    if group_result.scalar_one_or_none() is None:
        raise NotFoundError("DeviceGroup", str(group_id))

    existing = await db.execute(
        select(DeviceGroupMembership).where(
            DeviceGroupMembership.group_id == group_id,
            DeviceGroupMembership.device_id == data.device_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("Device is already a member of this group")

    membership = DeviceGroupMembership(
        group_id=group_id, device_id=data.device_id
    )
    db.add(membership)
    await db.flush()
    await db.refresh(membership)
    return membership


@router.delete(
    "/{group_id}/members/{device_id}",
    status_code=204,
    summary="Remove member from group",
    description="Remove a device from a device group.",
    responses={404: {"description": "Membership not found"}},
)
async def remove_member(
    group_id: uuid.UUID,
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Remove a device from a device group."""
    result = await db.execute(
        select(DeviceGroupMembership).where(
            DeviceGroupMembership.group_id == group_id,
            DeviceGroupMembership.device_id == device_id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise NotFoundError("DeviceGroupMembership")

    await db.delete(membership)
    await db.flush()
