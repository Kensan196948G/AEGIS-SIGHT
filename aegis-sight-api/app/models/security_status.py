from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SecurityStatus(Base):
    __tablename__ = "security_statuses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id"), index=True, nullable=False
    )
    defender_on: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bitlocker_on: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pattern_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pending_patches: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    device = relationship("Device", back_populates="security_statuses")
