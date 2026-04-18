import enum
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ---------------------------------------------------------------------------
# SLA enums
# ---------------------------------------------------------------------------
class SLAMetricType(enum.StrEnum):
    availability = "availability"
    response_time = "response_time"
    resolution_time = "resolution_time"
    patch_compliance = "patch_compliance"


class MeasurementPeriod(enum.StrEnum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class ViolationSeverity(enum.StrEnum):
    warning = "warning"
    breach = "breach"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class SLADefinition(Base):
    __tablename__ = "sla_definitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    metric_type: Mapped[SLAMetricType] = mapped_column(
        Enum(SLAMetricType), nullable=False, index=True
    )
    target_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 4), nullable=False
    )
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    measurement_period: Mapped[MeasurementPeriod] = mapped_column(
        Enum(MeasurementPeriod), nullable=False, index=True
    )
    warning_threshold: Mapped[Decimal] = mapped_column(
        Numeric(12, 4), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    measurements = relationship("SLAMeasurement", back_populates="sla_definition", lazy="selectin")
    violations = relationship("SLAViolation", back_populates="sla_definition", lazy="selectin")


class SLAMeasurement(Base):
    __tablename__ = "sla_measurements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sla_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sla_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    measured_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 4), nullable=False
    )
    target_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 4), nullable=False
    )
    is_met: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    sla_definition = relationship("SLADefinition", back_populates="measurements")
    violations = relationship("SLAViolation", back_populates="measurement", lazy="selectin")


class SLAViolation(Base):
    __tablename__ = "sla_violations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sla_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sla_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    measurement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sla_measurements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    violation_detail: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[ViolationSeverity] = mapped_column(
        Enum(ViolationSeverity), nullable=False, index=True
    )
    notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    sla_definition = relationship("SLADefinition", back_populates="violations")
    measurement = relationship("SLAMeasurement", back_populates="violations")
