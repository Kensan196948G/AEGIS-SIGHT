import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    parent_id: uuid.UUID | None = None
    manager_name: str | None = None
    budget_yearly: Decimal | None = None
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    code: str | None = Field(None, min_length=1, max_length=50)
    parent_id: uuid.UUID | None = None
    manager_name: str | None = None
    budget_yearly: Decimal | None = None
    description: str | None = None


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    parent_id: uuid.UUID | None = None
    manager_name: str | None = None
    budget_yearly: Decimal | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class DepartmentTreeResponse(DepartmentResponse):
    """Department with nested children for tree display."""
    children: list["DepartmentTreeResponse"] = []
    device_count: int = 0


class DepartmentCostResponse(BaseModel):
    department_id: uuid.UUID
    department_name: str
    department_code: str
    budget_yearly: Decimal | None = None
    device_count: int = 0
    license_cost_total: Decimal = Decimal("0")
    procurement_cost_total: Decimal = Decimal("0")
    total_cost: Decimal = Decimal("0")
