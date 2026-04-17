import enum
import uuid
from datetime import datetime, timezone, UTC

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ---------------------------------------------------------------------------
# Incident enums
# ---------------------------------------------------------------------------
class IncidentSeverity(str, enum.Enum):
    P1_critical = "P1_critical"
    P2_high = "P2_high"
    P3_medium = "P3_medium"
    P4_low = "P4_low"


class IncidentStatus(str, enum.Enum):
    detected = "detected"
    investigating = "investigating"
    containing = "containing"
    eradicating = "eradicating"
    recovering = "recovering"
    resolved = "resolved"
    post_mortem = "post_mortem"


class IncidentCategory(str, enum.Enum):
    malware = "malware"
    unauthorized_access = "unauthorized_access"
    data_breach = "data_breach"
    policy_violation = "policy_violation"
    hardware_failure = "hardware_failure"
    other = "other"


# ---------------------------------------------------------------------------
# Threat indicator enums
# ---------------------------------------------------------------------------
class IndicatorType(str, enum.Enum):
    ip_address = "ip_address"
    domain = "domain"
    file_hash = "file_hash"
    url = "url"
    email = "email"


class ThreatLevel(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(
        Enum(IncidentSeverity), nullable=False, index=True
    )
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus), nullable=False, default=IncidentStatus.detected, index=True
    )
    category: Mapped[IncidentCategory] = mapped_column(
        Enum(IncidentCategory), nullable=False, index=True
    )
    affected_devices: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reported_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    timeline: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    lessons_learned: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to], lazy="selectin")
    reporter = relationship("User", foreign_keys=[reported_by], lazy="selectin")


class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    indicator_type: Mapped[IndicatorType] = mapped_column(
        Enum(IndicatorType), nullable=False, index=True
    )
    value: Mapped[str] = mapped_column(String(1000), nullable=False)
    threat_level: Mapped[ThreatLevel] = mapped_column(
        Enum(ThreatLevel), nullable=False, index=True
    )
    source: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    related_incidents: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
