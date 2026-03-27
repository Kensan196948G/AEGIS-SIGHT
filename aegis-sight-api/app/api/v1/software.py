"""Software inventory API endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.software_inventory import SoftwareInventory
from app.models.user import User
from app.schemas.software_inventory import (
    SoftwareAggregation,
    SoftwareInventoryResponse,
)

router = APIRouter(prefix="/software", tags=["software"])


@router.get(
    "",
    response_model=PaginatedResponse[SoftwareAggregation],
    summary="List software (aggregated)",
    description=(
        "Retrieve a paginated, aggregated list of software names with their "
        "installation count across all devices."
    ),
)
async def list_software(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    search: str | None = Query(None, description="Search by software name"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List software aggregated by name with install counts."""
    base_query = (
        select(
            SoftwareInventory.software_name,
            func.min(SoftwareInventory.publisher).label("publisher"),
            func.count(func.distinct(SoftwareInventory.device_id)).label("installed_count"),
        )
        .group_by(SoftwareInventory.software_name)
    )
    count_query = select(
        func.count(func.distinct(SoftwareInventory.software_name))
    )

    if search:
        base_query = base_query.where(
            SoftwareInventory.software_name.ilike(f"%{search}%")
        )
        count_query = count_query.where(
            SoftwareInventory.software_name.ilike(f"%{search}%")
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.order_by(SoftwareInventory.software_name)
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()
    items = [
        SoftwareAggregation(
            software_name=row.software_name,
            publisher=row.publisher,
            installed_count=row.installed_count,
        )
        for row in rows
    ]

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/devices/{device_id}",
    response_model=PaginatedResponse[SoftwareInventoryResponse],
    summary="Software installed on a device",
    description="Retrieve software inventory for a specific device.",
)
async def list_device_software(
    device_id: uuid.UUID,
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List installed software for a given device."""
    base_query = select(SoftwareInventory).where(
        SoftwareInventory.device_id == device_id
    )
    count_query = select(func.count(SoftwareInventory.id)).where(
        SoftwareInventory.device_id == device_id
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.order_by(SoftwareInventory.software_name)
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)
