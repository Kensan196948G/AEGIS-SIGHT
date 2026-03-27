import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertCategory, AlertSeverity


class AlertCreate(BaseModel):
    device_id: uuid.UUID | None = None
    severity: AlertSeverity
    category: AlertCategory
    title: str
    message: str


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID | None
    severity: AlertSeverity
    category: AlertCategory
    title: str
    message: str
    is_acknowledged: bool
    acknowledged_by: uuid.UUID | None
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime


class AlertAcknowledge(BaseModel):
    """Response after acknowledging an alert."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_acknowledged: bool
    acknowledged_by: uuid.UUID | None
    acknowledged_at: datetime | None


class AlertStats(BaseModel):
    total: int
    critical: int
    warning: int
    info: int
    unacknowledged: int
    unresolved: int
