"""Software inventory model: tracks installed software detected on each device."""

from datetime import date, datetime, UTC

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SoftwareInventory(Base):
    __tablename__ = "software_inventory"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    device_id = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    software_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(255), nullable=True)
    install_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    device = relationship("Device", lazy="selectin")
