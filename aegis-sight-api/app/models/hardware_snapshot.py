from datetime import datetime, timezone, UTC

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class HardwareSnapshot(Base):
    __tablename__ = "hardware_snapshots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id"), index=True, nullable=False
    )
    cpu_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    memory_gb: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    disk_total_gb: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    disk_free_gb: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    snapped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    device = relationship("Device", back_populates="hardware_snapshots")
