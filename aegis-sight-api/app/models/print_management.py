"""Print management models.

Defines Printer, PrintJob, and PrintPolicy models for tracking
printing activity and enforcing print policies across the organization.
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PrintJobStatus(str, enum.Enum):
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class Printer(Base):
    __tablename__ = "printers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    is_network: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    jobs = relationship("PrintJob", back_populates="printer", lazy="selectin")


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    printer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("printers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    document_name: Mapped[str] = mapped_column(String(500), nullable=False)
    pages: Mapped[int] = mapped_column(Integer, nullable=False)
    copies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    color: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplex: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paper_size: Mapped[str] = mapped_column(
        String(20), default="A4", nullable=False
    )
    status: Mapped[PrintJobStatus] = mapped_column(
        Enum(PrintJobStatus), nullable=False, index=True
    )
    printed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    printer = relationship("Printer", back_populates="jobs")
    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")


class PrintPolicy(Base):
    __tablename__ = "print_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_pages_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_pages_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    allow_color: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_duplex_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    target_departments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
