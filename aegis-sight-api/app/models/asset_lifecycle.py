import enum
import uuid
from datetime import date, datetime, UTC

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LifecycleEventType(str, enum.Enum):
    procured = "procured"
    deployed = "deployed"
    reassigned = "reassigned"
    maintenance = "maintenance"
    disposal_requested = "disposal_requested"
    disposal_approved = "disposal_approved"
    disposed = "disposed"


class DisposalMethod(str, enum.Enum):
    recycle = "recycle"
    destroy = "destroy"
    donate = "donate"
    return_to_vendor = "return_to_vendor"


class DisposalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class AssetLifecycleEvent(Base):
    __tablename__ = "asset_lifecycle_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[LifecycleEventType] = mapped_column(
        Enum(LifecycleEventType), nullable=False
    )
    performed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    device = relationship("Device", lazy="selectin")
    performer = relationship("User", lazy="selectin")


class DisposalRequest(Base):
    __tablename__ = "disposal_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    method: Mapped[DisposalMethod] = mapped_column(
        Enum(DisposalMethod), nullable=False
    )
    requested_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[DisposalStatus] = mapped_column(
        Enum(DisposalStatus), default=DisposalStatus.pending, nullable=False
    )
    certificate_path: Mapped[str | None] = mapped_column(
        String(512), nullable=True
    )
    certificate_number: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    disposal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    device = relationship("Device", lazy="selectin")
    requester = relationship("User", foreign_keys=[requested_by], lazy="selectin")
    approver = relationship("User", foreign_keys=[approved_by], lazy="selectin")
