import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UpdateSeverity(enum.StrEnum):
    critical = "critical"
    important = "important"
    moderate = "moderate"
    low = "low"


class PatchStatus(enum.StrEnum):
    not_installed = "not_installed"
    downloading = "downloading"
    installed = "installed"
    failed = "failed"
    not_applicable = "not_applicable"


class VulnerabilitySeverity(enum.StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class WindowsUpdate(Base):
    __tablename__ = "windows_updates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    kb_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    severity: Mapped[UpdateSeverity] = mapped_column(
        Enum(UpdateSeverity), nullable=False
    )
    release_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    device_statuses = relationship(
        "DevicePatchStatus", back_populates="update", lazy="selectin"
    )


class DevicePatchStatus(Base):
    __tablename__ = "device_patch_statuses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    update_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("windows_updates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[PatchStatus] = mapped_column(
        Enum(PatchStatus), default=PatchStatus.not_installed, nullable=False
    )
    installed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    device = relationship("Device", lazy="selectin")
    update = relationship("WindowsUpdate", back_populates="device_statuses", lazy="selectin")


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cve_id: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    severity: Mapped[VulnerabilitySeverity] = mapped_column(
        Enum(VulnerabilitySeverity), nullable=False
    )
    cvss_score: Mapped[Decimal] = mapped_column(
        Numeric(4, 1), nullable=False
    )
    affected_software: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    remediation: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_resolved: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
