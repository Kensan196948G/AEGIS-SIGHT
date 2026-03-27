import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.procurement import ProcurementCategory, ProcurementStatus


class ProcurementCreate(BaseModel):
    item_name: str
    category: ProcurementCategory
    quantity: int = 1
    unit_price: Decimal = Decimal("0")
    department: str
    purpose: str


class ProcurementUpdate(BaseModel):
    item_name: str | None = None
    category: ProcurementCategory | None = None
    quantity: int | None = None
    unit_price: Decimal | None = None
    department: str | None = None
    purpose: str | None = None


class ProcurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    request_number: str
    item_name: str
    category: ProcurementCategory
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    requester_id: uuid.UUID
    department: str
    purpose: str
    status: ProcurementStatus
    approver_id: uuid.UUID | None = None
    approved_at: datetime | None = None
    ordered_at: datetime | None = None
    received_at: datetime | None = None
    asset_id: uuid.UUID | None = None
    disposal_at: datetime | None = None
    disposal_cert: str | None = None
    created_at: datetime
    updated_at: datetime
