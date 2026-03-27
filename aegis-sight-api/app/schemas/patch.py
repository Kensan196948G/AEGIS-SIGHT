import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.patch import PatchStatus, UpdateSeverity, VulnerabilitySeverity


# ---------------------------------------------------------------------------
# Windows Update schemas
# ---------------------------------------------------------------------------

class WindowsUpdateCreate(BaseModel):
    kb_number: str = Field(..., max_length=50, examples=["KB5034763"])
    title: str = Field(..., max_length=500)
    severity: UpdateSeverity
    release_date: datetime
    description: str | None = None


class WindowsUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kb_number: str
    title: str
    severity: UpdateSeverity
    release_date: datetime
    description: str | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Device Patch Status schemas
# ---------------------------------------------------------------------------

class DevicePatchStatusCreate(BaseModel):
    device_id: uuid.UUID
    update_id: uuid.UUID
    status: PatchStatus = PatchStatus.not_installed
    installed_at: datetime | None = None
    checked_at: datetime | None = None


class DevicePatchStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID
    update_id: uuid.UUID
    status: PatchStatus
    installed_at: datetime | None
    checked_at: datetime | None
    created_at: datetime


class DevicePatchDetailResponse(BaseModel):
    """Patch status with update info for device-centric views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID
    update_id: uuid.UUID
    status: PatchStatus
    installed_at: datetime | None
    checked_at: datetime | None
    kb_number: str | None = None
    update_title: str | None = None
    update_severity: UpdateSeverity | None = None


# ---------------------------------------------------------------------------
# Compliance summary
# ---------------------------------------------------------------------------

class PatchComplianceSummary(BaseModel):
    total_devices: int
    total_updates: int
    fully_patched_devices: int
    compliance_rate: float = Field(..., description="Percentage 0-100")
    critical_missing: int
    important_missing: int
    moderate_missing: int
    low_missing: int


# ---------------------------------------------------------------------------
# Missing patch
# ---------------------------------------------------------------------------

class MissingPatchEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    update_id: uuid.UUID
    kb_number: str
    title: str
    severity: UpdateSeverity
    release_date: datetime
    missing_device_count: int


# ---------------------------------------------------------------------------
# Vulnerability schemas
# ---------------------------------------------------------------------------

class VulnerabilityCreate(BaseModel):
    cve_id: str = Field(..., max_length=50, examples=["CVE-2024-21338"])
    title: str = Field(..., max_length=500)
    severity: VulnerabilitySeverity
    cvss_score: Decimal = Field(..., ge=0, le=10, decimal_places=1)
    affected_software: dict | None = None
    remediation: str | None = None
    published_at: datetime


class VulnerabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cve_id: str
    title: str
    severity: VulnerabilitySeverity
    cvss_score: Decimal
    affected_software: dict | None
    remediation: str | None
    published_at: datetime
    is_resolved: bool
    resolved_at: datetime | None
    created_at: datetime
