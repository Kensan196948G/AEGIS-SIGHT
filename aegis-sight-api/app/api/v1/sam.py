import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.license import SoftwareLicense
from app.models.user import User
from app.schemas.license import (
    ComplianceCheckResponse,
    ExpiringLicenseResponse,
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
    "/licenses/expiring",
    response_model=list[ExpiringLicenseResponse],
    summary="Get expiring licenses",
    description=(
        "Retrieve licenses expiring within the specified number of days. "
        "Returns licenses sorted by expiry date ascending. "
        "Useful for proactive license renewal management (IAMS migration feature)."
    ),
)
async def get_expiring_licenses(
    days: int = Query(30, ge=1, le=365, description="Days threshold for expiry alert"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get licenses expiring within the specified number of days."""
    threshold_date = date.today() + timedelta(days=days)
    result = await db.execute(
        select(SoftwareLicense)
        .where(
            and_(
                SoftwareLicense.expiry_date.is_not(None),
                SoftwareLicense.expiry_date <= threshold_date,
                SoftwareLicense.expiry_date >= date.today(),
            )
        )
        .order_by(SoftwareLicense.expiry_date)
    )
    licenses = result.scalars().all()

    response = []
    today = date.today()
    for lic in licenses:
        days_until = (lic.expiry_date - today).days
        response.append(
            ExpiringLicenseResponse(
                id=lic.id,
                software_name=lic.software_name,
                vendor=lic.vendor,
                license_type=lic.license_type,
                expiry_date=lic.expiry_date,
                days_until_expiry=days_until,
                purchased_count=lic.purchased_count,
                cost_per_unit=lic.cost_per_unit,
                currency=lic.currency,
                vendor_contract_id=lic.vendor_contract_id,
            )
        )
    return response


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
