"""Log event models: Logon, USB, and File events collected from endpoint agents."""

import enum
from datetime import datetime, UTC

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UsbAction(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"


class FileAction(str, enum.Enum):
    create = "create"
    modify = "modify"
    delete = "delete"
    read = "read"


class LogonEvent(Base):
    __tablename__ = "logon_events"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    device_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    event_id: Mapped[int] = mapped_column(nullable=False, comment="Windows Event ID (4624/4634)")
    logon_type: Mapped[int | None] = mapped_column(nullable=True)
    source_ip: Mapped[str | None] = mapped_column(INET, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    device = relationship("Device", lazy="selectin")


class UsbEvent(Base):
    __tablename__ = "usb_events"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    device_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    product_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[UsbAction] = mapped_column(
        Enum(UsbAction), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    device = relationship("Device", lazy="selectin")


class FileEvent(Base):
    __tablename__ = "file_events"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    device_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    action: Mapped[FileAction] = mapped_column(
        Enum(FileAction), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    device = relationship("Device", lazy="selectin")
