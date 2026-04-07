import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.asset_lifecycle import (
    DisposalMethod,
    DisposalStatus,
    LifecycleEventType,
)

# ---------------------------------------------------------------------------
# Lifecycle Events
# ---------------------------------------------------------------------------


class LifecycleEventCreate(BaseModel):
    event_type: LifecycleEventType
    detail: dict | None = None


class LifecycleEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID
    event_type: LifecycleEventType
    performed_by: uuid.UUID | None = None
    detail: dict | None = None
    occurred_at: datetime


# ---------------------------------------------------------------------------
# Disposal Requests
# ---------------------------------------------------------------------------


class DisposalRequestCreate(BaseModel):
    device_id: uuid.UUID
    reason: str
    method: DisposalMethod


class DisposalCompletePayload(BaseModel):
    certificate_number: str
    certificate_path: str | None = None
    disposal_date: date | None = None


class DisposalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID
    reason: str
    method: DisposalMethod
    requested_by: uuid.UUID | None = None
    approved_by: uuid.UUID | None = None
    status: DisposalStatus
    certificate_path: str | None = None
    certificate_number: str | None = None
    disposal_date: date | None = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Summary / Statistics
# ---------------------------------------------------------------------------


class LifecycleSummary(BaseModel):
    procured: int = 0
    deployed: int = 0
    maintenance: int = 0
    disposed: int = 0
    disposal_pending: int = 0
    disposal_approved: int = 0
    total_events: int = 0
