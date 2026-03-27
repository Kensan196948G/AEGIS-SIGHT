import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceResponse, DeviceUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[DeviceResponse])
async def list_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all device assets with pagination."""
    result = await db.execute(
        select(Device).offset(skip).limit(limit).order_by(Device.created_at.desc())
    )
    return result.scalars().all()


@router.get("/count")
async def count_assets(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get total count of device assets."""
    result = await db.execute(select(func.count(Device.id)))
    return {"count": result.scalar_one()}


@router.get("/{asset_id}", response_model=DeviceResponse)
async def get_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get a specific device asset by ID."""
    result = await db.execute(select(Device).where(Device.id == asset_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    return device


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_asset(
    data: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Create a new device asset."""
    # Check for duplicate hostname
    result = await db.execute(
        select(Device).where(Device.hostname == data.hostname)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device with hostname '{data.hostname}' already exists",
        )
    device = Device(**data.model_dump())
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


@router.patch("/{asset_id}", response_model=DeviceResponse)
async def update_asset(
    asset_id: uuid.UUID,
    data: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Update a device asset."""
    result = await db.execute(select(Device).where(Device.id == asset_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.flush()
    await db.refresh(device)
    return device
