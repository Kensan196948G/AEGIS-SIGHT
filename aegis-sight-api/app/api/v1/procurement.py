import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.procurement import ProcurementRequest, ProcurementStatus
from app.models.user import User
from app.schemas.procurement import (
    ProcurementCreate,
    ProcurementResponse,
    ProcurementUpdate,
)
from app.services.procurement_service import ProcurementService

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.get(
    "",
    response_model=PaginatedResponse[ProcurementResponse],
    summary="List procurement requests",
    description="Retrieve a paginated list of procurement requests, ordered by creation date (newest first).",
)
async def list_procurement_requests(
    offset: int = Query(0, ge=0, alias="skip", description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    status_filter: str | None = Query(
        None, alias="status", description="Filter by procurement status"
    ),
    department: str | None = Query(
        None, description="Filter by department"
    ),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all procurement requests with pagination and optional filters."""
    base_query = select(ProcurementRequest)
    count_query = select(func.count(ProcurementRequest.id))

    if status_filter:
        base_query = base_query.where(ProcurementRequest.status == status_filter)
        count_query = count_query.where(ProcurementRequest.status == status_filter)
    if department:
        base_query = base_query.where(
            ProcurementRequest.department.ilike(f"%{department}%")
        )
        count_query = count_query.where(
            ProcurementRequest.department.ilike(f"%{department}%")
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset)
        .limit(limit)
        .order_by(ProcurementRequest.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/{request_id}",
    response_model=ProcurementResponse,
    summary="Get procurement request",
    description="Retrieve a specific procurement request by its UUID.",
    responses={404: {"description": "Procurement request not found"}},
)
async def get_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get a specific procurement request by ID."""
    service = ProcurementService(db)
    return await service._get_procurement(request_id)


@router.post(
    "",
    response_model=ProcurementResponse,
    status_code=201,
    summary="Create procurement request",
    description="Create a new procurement request in draft status. Total price is automatically calculated.",
)
async def create_procurement_request(
    data: ProcurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new procurement request."""
    service = ProcurementService(db)
    return await service.create_request(data, current_user)


@router.patch(
    "/{request_id}",
    response_model=ProcurementResponse,
    summary="Update procurement request",
    description="Partially update a procurement request. Only works on requests in draft status.",
    responses={
        404: {"description": "Procurement request not found"},
    },
)
async def update_procurement_request(
    request_id: uuid.UUID,
    data: ProcurementUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
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


@router.post(
    "/{request_id}/submit",
    response_model=ProcurementResponse,
    summary="Submit for approval",
    description="Submit a draft procurement request for manager approval.",
    responses={
        400: {"description": "Request is not in draft status"},
        404: {"description": "Procurement request not found"},
    },
)
async def submit_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Submit a draft procurement request for approval."""
    service = ProcurementService(db)
    return await service.submit(request_id)


@router.post(
    "/{request_id}/approve",
    response_model=ProcurementResponse,
    summary="Approve request",
    description="Approve a submitted procurement request. Records the approver and timestamp.",
    responses={
        400: {"description": "Request is not in submitted status"},
        404: {"description": "Procurement request not found"},
    },
)
async def approve_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve a submitted procurement request."""
    service = ProcurementService(db)
    return await service.approve(request_id, current_user)


@router.post(
    "/{request_id}/reject",
    response_model=ProcurementResponse,
    summary="Reject request",
    description="Reject a submitted procurement request.",
    responses={
        404: {"description": "Procurement request not found"},
    },
)
async def reject_procurement_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Reject a submitted procurement request."""
    service = ProcurementService(db)
    procurement = await service._get_procurement(request_id)
    procurement.status = ProcurementStatus.rejected
    await db.flush()
    await db.refresh(procurement)
    return procurement


@router.post(
    "/{request_id}/order",
    response_model=ProcurementResponse,
    summary="Mark as ordered",
    description="Mark an approved procurement request as ordered. Records the order timestamp.",
    responses={
        400: {"description": "Request is not in approved status"},
        404: {"description": "Procurement request not found"},
    },
)
async def mark_as_ordered(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Mark an approved request as ordered."""
    service = ProcurementService(db)
    return await service.mark_as_ordered(request_id)


@router.post(
    "/{request_id}/receive",
    response_model=ProcurementResponse,
    summary="Mark as received",
    description="Mark an ordered procurement request as received. Records the receipt timestamp.",
    responses={
        400: {"description": "Request is not in ordered status"},
        404: {"description": "Procurement request not found"},
    },
)
async def mark_as_received(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Mark an ordered request as received."""
    service = ProcurementService(db)
    return await service.mark_as_received(request_id)


@router.post(
    "/{request_id}/dispose",
    response_model=ProcurementResponse,
    summary="Dispose asset",
    description="Mark an active procurement item for disposal with optional disposal certificate.",
    responses={
        400: {"description": "Request is not in active or disposal_requested status"},
        404: {"description": "Procurement request not found"},
    },
)
async def dispose_procurement(
    request_id: uuid.UUID,
    disposal_cert: str | None = None,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Dispose of an active procurement item."""
    service = ProcurementService(db)
    return await service.dispose(request_id, disposal_cert)
