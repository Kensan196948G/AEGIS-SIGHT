import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProcurementCategory(str, enum.Enum):
    hardware = "hardware"
    software = "software"
    service = "service"
    consumable = "consumable"


class ProcurementStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    ordered = "ordered"
    received = "received"
    registered = "registered"
    active = "active"
    disposal_requested = "disposal_requested"
    disposed = "disposed"


class ProcurementRequest(Base):
    __tablename__ = "procurement_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[ProcurementCategory] = mapped_column(
        Enum(ProcurementCategory), nullable=False
    )
    quantity: Mapped[int] = mapped_column(default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=0, nullable=False
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ProcurementStatus] = mapped_column(
        Enum(ProcurementStatus), default=ProcurementStatus.draft, nullable=False
    )
    approver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ordered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True
    )
    disposal_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    disposal_cert: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    requester = relationship("User", foreign_keys=[requester_id], lazy="selectin")
    approver = relationship("User", foreign_keys=[approver_id], lazy="selectin")
    asset = relationship("Device", lazy="selectin")
