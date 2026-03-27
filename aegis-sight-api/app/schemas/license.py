import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.license import LicenseType


class LicenseCreate(BaseModel):
    software_name: str
    vendor: str
    license_type: LicenseType
    license_key: str | None = None
    purchased_count: int = 0
    installed_count: int = 0
    m365_assigned: int = 0
    cost_per_unit: Decimal | None = None
    currency: str = "JPY"
    purchase_date: date | None = None
    expiry_date: date | None = None
    vendor_contract_id: str | None = None
    notes: str | None = None


class LicenseUpdate(BaseModel):
    software_name: str | None = None
    vendor: str | None = None
    license_type: LicenseType | None = None
    license_key: str | None = None
    purchased_count: int | None = None
    installed_count: int | None = None
    m365_assigned: int | None = None
    cost_per_unit: Decimal | None = None
    currency: str | None = None
    purchase_date: date | None = None
    expiry_date: date | None = None
    vendor_contract_id: str | None = None
    notes: str | None = None


class LicenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    software_name: str
    vendor: str
    license_type: LicenseType
    license_key: str | None = None
    purchased_count: int
    installed_count: int
    m365_assigned: int
    cost_per_unit: Decimal | None = None
    currency: str
    purchase_date: date | None = None
    expiry_date: date | None = None
    vendor_contract_id: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class ComplianceCheckResponse(BaseModel):
    license_id: uuid.UUID
    software_name: str
    purchased_count: int
    installed_count: int
    m365_assigned: int
    total_used: int
    is_compliant: bool
    over_deployed: int
