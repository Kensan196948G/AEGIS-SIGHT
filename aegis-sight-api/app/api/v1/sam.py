import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.license import SoftwareLicense
from app.models.user import User
from app.schemas.license import (
    ComplianceCheckResponse,
    LicenseCreate,
    LicenseResponse,
    LicenseUpdate,
)
from app.services.sam_service import SAMService

router = APIRouter(prefix="/sam", tags=["sam"])


@router.get(
    "/licenses",
    response_model=PaginatedResponse[LicenseResponse],
    summary="List software licenses",
    description="Retrieve a paginated list of all software licenses, ordered alphabetically by name.",
)
async def list_licenses(
    offset: int = Query(0, ge=0, alias="skip", description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    vendor: str | None = Query(None, description="Filter by vendor name"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all software licenses with pagination."""
    base_query = select(SoftwareLicense)
    count_query = select(func.count(SoftwareLicense.id))

    if vendor:
        base_query = base_query.where(SoftwareLicense.vendor.ilike(f"%{vendor}%"))
        count_query = count_query.where(SoftwareLicense.vendor.ilike(f"%{vendor}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(SoftwareLicense.software_name)
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/licenses/{license_id}",
    response_model=LicenseResponse,
    summary="Get software license",
    description="Retrieve a specific software license record by its UUID.",
    responses={404: {"description": "License not found"}},
)
async def get_license(
    license_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific software license by ID."""
    result = await db.execute(
        select(SoftwareLicense).where(SoftwareLicense.id == license_id)
    )
    license_obj = result.scalar_one_or_none()
    if license_obj is None:
        raise NotFoundError("License", str(license_id))
    return license_obj


@router.post(
    "/licenses",
    response_model=LicenseResponse,
    status_code=201,
    summary="Create software license",
    description="Register a new software license record in the SAM database.",
)
async def create_license(
    data: LicenseCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new software license record."""
    license_obj = SoftwareLicense(**data.model_dump())
    db.add(license_obj)
    await db.flush()
    await db.refresh(license_obj)
    return license_obj


@router.patch(
    "/licenses/{license_id}",
    response_model=LicenseResponse,
    summary="Update software license",
    description="Partially update a software license record. Only provided fields will be changed.",
    responses={404: {"description": "License not found"}},
)
async def update_license(
    license_id: uuid.UUID,
    data: LicenseUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update a software license record."""
    result = await db.execute(
        select(SoftwareLicense).where(SoftwareLicense.id == license_id)
    )
    license_obj = result.scalar_one_or_none()
    if license_obj is None:
        raise NotFoundError("License", str(license_id))
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(license_obj, field, value)
    await db.flush()
    await db.refresh(license_obj)
    return license_obj


@router.get(
    "/compliance",
    response_model=list[ComplianceCheckResponse],
    summary="Get compliance status",
    description=(
        "Get current compliance status for all software licenses. "
        "Compares purchased counts against installed + M365 assigned counts."
    ),
)
async def get_compliance(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get current compliance status for all licenses."""
    service = SAMService(db)
    return await service.run_compliance_check()


@router.post(
    "/compliance/check",
    response_model=list[ComplianceCheckResponse],
    summary="Run compliance check",
    description=(
        "Trigger a fresh compliance check across all licenses. "
        "Returns a list of compliance results showing over-deployment status."
    ),
)
async def run_compliance_check(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Trigger a fresh compliance check across all licenses."""
    service = SAMService(db)
    return await service.run_compliance_check()
