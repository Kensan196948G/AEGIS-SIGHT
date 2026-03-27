import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
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


@router.get("/licenses", response_model=list[LicenseResponse])
async def list_licenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all software licenses with pagination."""
    result = await db.execute(
        select(SoftwareLicense)
        .offset(skip)
        .limit(limit)
        .order_by(SoftwareLicense.software_name)
    )
    return result.scalars().all()


@router.get("/licenses/{license_id}", response_model=LicenseResponse)
async def get_license(
    license_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get a specific software license by ID."""
    result = await db.execute(
        select(SoftwareLicense).where(SoftwareLicense.id == license_id)
    )
    license_obj = result.scalar_one_or_none()
    if license_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )
    return license_obj


@router.post("/licenses", response_model=LicenseResponse, status_code=201)
async def create_license(
    data: LicenseCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Create a new software license record."""
    license_obj = SoftwareLicense(**data.model_dump())
    db.add(license_obj)
    await db.flush()
    await db.refresh(license_obj)
    return license_obj


@router.patch("/licenses/{license_id}", response_model=LicenseResponse)
async def update_license(
    license_id: uuid.UUID,
    data: LicenseUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Update a software license record."""
    result = await db.execute(
        select(SoftwareLicense).where(SoftwareLicense.id == license_id)
    )
    license_obj = result.scalar_one_or_none()
    if license_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(license_obj, field, value)
    await db.flush()
    await db.refresh(license_obj)
    return license_obj


@router.get("/compliance", response_model=list[ComplianceCheckResponse])
async def get_compliance(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get current compliance status for all licenses."""
    service = SAMService(db)
    return await service.run_compliance_check()


@router.post("/compliance/check", response_model=list[ComplianceCheckResponse])
async def run_compliance_check(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Trigger a fresh compliance check across all licenses."""
    service = SAMService(db)
    return await service.run_compliance_check()
