import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DeviceStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    decommissioned = "decommissioned"
    maintenance = "maintenance"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    hostname: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    os_version: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[DeviceStatus] = mapped_column(
        Enum(DeviceStatus), default=DeviceStatus.active, nullable=False
    )
    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    hardware_snapshots = relationship(
        "HardwareSnapshot", back_populates="device", lazy="selectin"
    )
    security_statuses = relationship(
        "SecurityStatus", back_populates="device", lazy="selectin"
    )
