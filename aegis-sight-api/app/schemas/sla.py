import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.sla import MeasurementPeriod, SLAMetricType, ViolationSeverity


# ---------------------------------------------------------------------------
# SLA Definition schemas
# ---------------------------------------------------------------------------
class SLADefinitionCreate(BaseModel):
    name: str
    description: str | None = None
    metric_type: SLAMetricType
    target_value: Decimal
    unit: str
    measurement_period: MeasurementPeriod
    warning_threshold: Decimal
    is_active: bool = True


class SLADefinitionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    metric_type: SLAMetricType | None = None
    target_value: Decimal | None = None
    unit: str | None = None
    measurement_period: MeasurementPeriod | None = None
    warning_threshold: Decimal | None = None
    is_active: bool | None = None


class SLADefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    metric_type: SLAMetricType
    target_value: Decimal
    unit: str
    measurement_period: MeasurementPeriod
    warning_threshold: Decimal
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# SLA Measurement schemas
# ---------------------------------------------------------------------------
class SLAMeasurementCreate(BaseModel):
    sla_id: uuid.UUID
    measured_value: Decimal
    target_value: Decimal
    is_met: bool
    period_start: date
    period_end: date
    detail: dict | None = None


class SLAMeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sla_id: uuid.UUID
    measured_value: Decimal
    target_value: Decimal
    is_met: bool
    period_start: date
    period_end: date
    detail: dict | None
    measured_at: datetime


# ---------------------------------------------------------------------------
# SLA Violation schemas
# ---------------------------------------------------------------------------
class SLAViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sla_id: uuid.UUID
    measurement_id: uuid.UUID
    violation_detail: str
    severity: ViolationSeverity
    notified: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Dashboard & report schemas
# ---------------------------------------------------------------------------
class SLADashboardItem(BaseModel):
    sla_id: uuid.UUID
    name: str
    metric_type: SLAMetricType
    target_value: Decimal
    current_value: Decimal | None
    achievement_rate: float | None
    is_met: bool | None
    measurement_period: MeasurementPeriod
    total_measurements: int
    met_count: int
    violation_count: int


class SLADashboard(BaseModel):
    overall_achievement_rate: float | None
    total_definitions: int
    active_definitions: int
    total_violations: int
    items: list[SLADashboardItem]


class SLAReportRow(BaseModel):
    sla_name: str
    metric_type: str
    target_value: Decimal
    unit: str
    measured_value: Decimal
    is_met: bool
    period_start: date
    period_end: date
    measured_at: datetime
