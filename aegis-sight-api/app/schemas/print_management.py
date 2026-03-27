"""Print management Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.print_management import PrintJobStatus


# ---------------------------------------------------------------------------
# Printer schemas
# ---------------------------------------------------------------------------
class PrinterCreate(BaseModel):
    name: str = Field(..., max_length=255)
    location: str = Field(..., max_length=500)
    ip_address: str | None = Field(None, max_length=45)
    model: str = Field(..., max_length=255)
    is_network: bool = True
    is_active: bool = True
    department: str | None = Field(None, max_length=255)


class PrinterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    location: str
    ip_address: str | None
    model: str
    is_network: bool
    is_active: bool
    department: str | None
    created_at: datetime


# ---------------------------------------------------------------------------
# PrintJob schemas
# ---------------------------------------------------------------------------
class PrintJobCreate(BaseModel):
    printer_id: uuid.UUID
    device_id: uuid.UUID | None = None
    user_name: str = Field(..., max_length=255)
    document_name: str = Field(..., max_length=500)
    pages: int = Field(..., ge=1)
    copies: int = Field(1, ge=1)
    color: bool = False
    duplex: bool = False
    paper_size: str = Field("A4", max_length=20)
    status: PrintJobStatus


class PrintJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    printer_id: uuid.UUID
    device_id: uuid.UUID | None
    user_name: str
    document_name: str
    pages: int
    copies: int
    color: bool
    duplex: bool
    paper_size: str
    status: PrintJobStatus
    printed_at: datetime


# ---------------------------------------------------------------------------
# PrintPolicy schemas
# ---------------------------------------------------------------------------
class PrintPolicyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    max_pages_per_day: int | None = Field(None, ge=1)
    max_pages_per_month: int | None = Field(None, ge=1)
    allow_color: bool = True
    allow_duplex_only: bool = False
    target_departments: list[str] | None = None
    is_enabled: bool = True


class PrintPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    max_pages_per_day: int | None
    max_pages_per_month: int | None
    allow_color: bool
    allow_duplex_only: bool
    target_departments: list[str] | None
    is_enabled: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Print Stats schemas
# ---------------------------------------------------------------------------
class PrintStatsUserEntry(BaseModel):
    user_name: str
    total_pages: int
    total_jobs: int
    color_pages: int


class PrintStatsPrinterEntry(BaseModel):
    printer_id: uuid.UUID
    printer_name: str
    total_pages: int
    total_jobs: int


class PrintStatsDepartmentEntry(BaseModel):
    department: str
    total_pages: int
    total_jobs: int


class PrintStatsMonthlyEntry(BaseModel):
    month: str
    total_pages: int
    total_jobs: int
    color_pages: int


class PrintStatsResponse(BaseModel):
    total_pages: int
    total_jobs: int
    color_ratio: float
    by_user: list[PrintStatsUserEntry]
    by_printer: list[PrintStatsPrinterEntry]
    by_department: list[PrintStatsDepartmentEntry]
    monthly_trend: list[PrintStatsMonthlyEntry]


# ---------------------------------------------------------------------------
# Print Policy Evaluate schemas
# ---------------------------------------------------------------------------
class PrintEvaluateRequest(BaseModel):
    user_name: str = Field(..., max_length=255)
    pages: int = Field(..., ge=1)
    copies: int = Field(1, ge=1)
    color: bool = False
    duplex: bool = False
    department: str | None = None


class PrintPolicyViolation(BaseModel):
    policy_id: uuid.UUID
    policy_name: str
    reason: str


class PrintEvaluateResponse(BaseModel):
    allowed: bool
    violations: list[PrintPolicyViolation]
