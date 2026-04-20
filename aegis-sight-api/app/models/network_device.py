import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NetworkDeviceType(enum.StrEnum):
    pc = "pc"
    server = "server"
    printer = "printer"
    switch = "switch"
    router = "router"
    ap = "ap"
    unknown = "unknown"


class NetworkDevice(Base):
    __tablename__ = "network_devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ip_address: Mapped[str] = mapped_column(INET, nullable=False, index=True)
    mac_address: Mapped[str] = mapped_column(
        String(17), nullable=False, unique=True, index=True
    )
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_type: Mapped[NetworkDeviceType] = mapped_column(
        Enum(NetworkDeviceType), default=NetworkDeviceType.unknown, nullable=False
    )
    is_managed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
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
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationship to managed device
    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")
