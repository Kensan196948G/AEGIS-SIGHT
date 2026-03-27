import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.procurement import ProcurementRequest
from app.models.user import User
from app.schemas.procurement import (
    ProcurementCreate,
    ProcurementResponse,
    ProcurementUpdate,
)
from app.services.procurement_service import ProcurementService

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.get("", response_model=list[ProcurementResponse])
async def list_procurement_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all procurement requests with pagination."""
    result = await db.execute(
        select(ProcurementRequest)
        .offset(skip)
        .limit(limit)
        .order_by(ProcurementRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{request_id}", response_model=ProcurementResponse)
async def get_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get a specific procurement request by ID."""
    service = ProcurementService(db)
    return await service._get_procurement(request_id)


@router.post("", response_model=ProcurementResponse, status_code=201)
async def create_procurement_request(
    data: ProcurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new procurement request."""
    service = ProcurementService(db)
    return await service.create_request(data, current_user)


@router.patch("/{request_id}", response_model=ProcurementResponse)
async def update_procurement_request(
    request_id: uuid.UUID,
    data: ProcurementUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Update a procurement request (only in draft status)."""
    service = ProcurementService(db)
    procurement = await service._get_procurement(request_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(procurement, field, value)
    if "quantity" in update_data or "unit_price" in update_data:
        procurement.total_price = procurement.quantity * procurement.unit_price
    await db.flush()
    await db.refresh(procurement)
    return procurement


@router.post("/{request_id}/submit", response_model=ProcurementResponse)
async def submit_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Submit a draft procurement request for approval."""
    service = ProcurementService(db)
    return await service.submit(request_id)


@router.post("/{request_id}/approve", response_model=ProcurementResponse)
async def approve_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a submitted procurement request."""
    service = ProcurementService(db)
    return await service.approve(request_id, current_user)


@router.post("/{request_id}/reject", response_model=ProcurementResponse)
async def reject_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Reject a submitted procurement request."""
    service = ProcurementService(db)
    procurement = await service._get_procurement(request_id)
    from app.models.procurement import ProcurementStatus

    procurement.status = ProcurementStatus.rejected
    await db.flush()
    await db.refresh(procurement)
    return procurement


@router.post("/{request_id}/order", response_model=ProcurementResponse)
async def mark_as_ordered(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Mark an approved request as ordered."""
    service = ProcurementService(db)
    return await service.mark_as_ordered(request_id)


@router.post("/{request_id}/receive", response_model=ProcurementResponse)
async def mark_as_received(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Mark an ordered request as received."""
    service = ProcurementService(db)
    return await service.mark_as_received(request_id)


@router.post("/{request_id}/dispose", response_model=ProcurementResponse)
async def dispose_procurement(
    request_id: uuid.UUID,
    disposal_cert: str | None = None,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Dispose of an active procurement item."""
    service = ProcurementService(db)
    return await service.dispose(request_id, disposal_cert)
