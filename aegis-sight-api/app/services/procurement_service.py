import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.procurement import ProcurementRequest, ProcurementStatus
from app.models.user import User
from app.schemas.procurement import ProcurementCreate


class ProcurementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _generate_request_number(self) -> str:
        """Generate a unique request number like PRQ-2026-00001."""
        year = datetime.now(timezone.utc).year
        result = await self.db.execute(
            select(func.count(ProcurementRequest.id)).where(
                ProcurementRequest.request_number.like(f"PRQ-{year}-%")
            )
        )
        count = result.scalar_one() + 1
        return f"PRQ-{year}-{count:05d}"

    async def create_request(
        self, data: ProcurementCreate, requester: User
    ) -> ProcurementRequest:
        """Create a new procurement request in draft status."""
        request_number = await self._generate_request_number()
        total_price = data.quantity * data.unit_price

        procurement = ProcurementRequest(
            request_number=request_number,
            item_name=data.item_name,
            category=data.category,
            quantity=data.quantity,
            unit_price=data.unit_price,
            total_price=total_price,
            requester_id=requester.id,
            department=data.department,
            purpose=data.purpose,
            status=ProcurementStatus.draft,
        )
        self.db.add(procurement)
        await self.db.flush()
        await self.db.refresh(procurement)
        return procurement

    async def submit(self, procurement_id: uuid.UUID) -> ProcurementRequest:
        """Submit a draft procurement request for approval."""
        procurement = await self._get_procurement(procurement_id)
        if procurement.status != ProcurementStatus.draft:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit request in '{procurement.status.value}' status.",
            )
        procurement.status = ProcurementStatus.submitted
        await self.db.flush()
        await self.db.refresh(procurement)
        return procurement

    async def approve(
        self, procurement_id: uuid.UUID, approver: User
    ) -> ProcurementRequest:
        """Approve a submitted procurement request."""
        procurement = await self._get_procurement(procurement_id)
        if procurement.status != ProcurementStatus.submitted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve request in '{procurement.status.value}' status.",
            )
        procurement.status = ProcurementStatus.approved
        procurement.approver_id = approver.id
        procurement.approved_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(procurement)
        return procurement

    async def mark_as_ordered(
        self, procurement_id: uuid.UUID
    ) -> ProcurementRequest:
        """Mark an approved request as ordered."""
        procurement = await self._get_procurement(procurement_id)
        if procurement.status != ProcurementStatus.approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark as ordered in '{procurement.status.value}' status.",
            )
        procurement.status = ProcurementStatus.ordered
        procurement.ordered_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(procurement)
        return procurement

    async def mark_as_received(
        self, procurement_id: uuid.UUID
    ) -> ProcurementRequest:
        """Mark an ordered request as received."""
        procurement = await self._get_procurement(procurement_id)
        if procurement.status != ProcurementStatus.ordered:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark as received in '{procurement.status.value}' status.",
            )
        procurement.status = ProcurementStatus.received
        procurement.received_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(procurement)
        return procurement

    async def dispose(
        self, procurement_id: uuid.UUID, disposal_cert: str | None = None
    ) -> ProcurementRequest:
        """Mark an active request for disposal."""
        procurement = await self._get_procurement(procurement_id)
        if procurement.status not in (
            ProcurementStatus.active,
            ProcurementStatus.disposal_requested,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot dispose request in '{procurement.status.value}' status.",
            )
        procurement.status = ProcurementStatus.disposed
        procurement.disposal_at = datetime.now(timezone.utc)
        procurement.disposal_cert = disposal_cert
        await self.db.flush()
        await self.db.refresh(procurement)
        return procurement

    async def _get_procurement(
        self, procurement_id: uuid.UUID
    ) -> ProcurementRequest:
        result = await self.db.execute(
            select(ProcurementRequest).where(
                ProcurementRequest.id == procurement_id
            )
        )
        procurement = result.scalar_one_or_none()
        if procurement is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Procurement request not found.",
            )
        return procurement
