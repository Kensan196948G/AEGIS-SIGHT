import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceResponse, DeviceUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get(
    "",
    response_model=PaginatedResponse[DeviceResponse],
    summary="List device assets",
    description="Retrieve a paginated list of all device assets, ordered by creation date (newest first).",
)
async def list_assets(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    status_filter: str | None = Query(
        None, alias="status", description="Filter by device status"
    ),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all device assets with pagination and optional status filter."""
    base_query = select(Device)
    count_query = select(func.count(Device.id))

    if status_filter:
        base_query = base_query.where(Device.status == status_filter)
        count_query = count_query.where(Device.status == status_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(Device.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/count",
    summary="Count device assets",
    description="Get the total number of device assets in the inventory.",
)
async def count_assets(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get total count of device assets."""
    result = await db.execute(select(func.count(Device.id)))
    return {"count": result.scalar_one()}


@router.get(
    "/{asset_id}",
    response_model=DeviceResponse,
    summary="Get device asset",
    description="Retrieve a specific device asset by its UUID.",
    responses={404: {"description": "Asset not found"}},
)
async def get_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific device asset by ID."""
    result = await db.execute(select(Device).where(Device.id == asset_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise NotFoundError("Asset", str(asset_id))
    return device


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=201,
    summary="Create device asset",
    description="Register a new device in the asset inventory. Hostname must be unique.",
    responses={409: {"description": "Device with this hostname already exists"}},
)
async def create_asset(
    data: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new device asset."""
    result = await db.execute(
        select(Device).where(Device.hostname == data.hostname)
    )
    if result.scalar_one_or_none() is not None:
        raise ConflictError(f"Device with hostname '{data.hostname}' already exists")
    device = Device(**data.model_dump())
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


@router.patch(
    "/{asset_id}",
    response_model=DeviceResponse,
    summary="Update device asset",
    description="Partially update a device asset. Only provided fields will be changed.",
    responses={404: {"description": "Asset not found"}},
)
async def update_asset(
    asset_id: uuid.UUID,
    data: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update a device asset."""
    result = await db.execute(select(Device).where(Device.id == asset_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise NotFoundError("Asset", str(asset_id))
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.flush()
    await db.refresh(device)
    return device
