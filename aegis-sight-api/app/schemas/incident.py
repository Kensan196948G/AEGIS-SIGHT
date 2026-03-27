import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.incident import (
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    IndicatorType,
    ThreatLevel,
)


# ---------------------------------------------------------------------------
# Incident schemas
# ---------------------------------------------------------------------------
class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: IncidentSeverity
    category: IncidentCategory
    affected_devices: list[str] | None = None
    detected_at: datetime | None = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    category: IncidentCategory | None = None
    affected_devices: list[str] | None = None
    root_cause: str | None = None
    resolution: str | None = None
    lessons_learned: str | None = None


class TimelineEntry(BaseModel):
    event: str
    details: str | None = None


class IncidentAssign(BaseModel):
    assigned_to: uuid.UUID


class IncidentResolve(BaseModel):
    root_cause: str
    resolution: str
    lessons_learned: str | None = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    category: IncidentCategory
    affected_devices: list[str] | None
    assigned_to: uuid.UUID | None
    reported_by: uuid.UUID
    timeline: list[dict] | None
    root_cause: str | None
    resolution: str | None
    lessons_learned: str | None
    detected_at: datetime
    resolved_at: datetime | None
    created_at: datetime


class IncidentStats(BaseModel):
    total: int
    p1_critical: int
    p2_high: int
    p3_medium: int
    p4_low: int
    open_incidents: int
    resolved_incidents: int
    mttr_hours: float | None


# ---------------------------------------------------------------------------
# Threat indicator schemas
# ---------------------------------------------------------------------------
class ThreatIndicatorCreate(BaseModel):
    indicator_type: IndicatorType
    value: str
    threat_level: ThreatLevel
    source: str
    description: str
    related_incidents: list[str] | None = None


class ThreatIndicatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    indicator_type: IndicatorType
    value: str
    threat_level: ThreatLevel
    source: str
    description: str
    is_active: bool
    first_seen: datetime
    last_seen: datetime
    related_incidents: list[str] | None
