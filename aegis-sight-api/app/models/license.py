import enum
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LicenseType(str, enum.Enum):
    perpetual = "perpetual"
    subscription = "subscription"
    oem = "oem"
    volume = "volume"
    freeware = "freeware"
    open_source = "open_source"


class SoftwareLicense(Base):
    __tablename__ = "software_licenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    software_name: Mapped[str] = mapped_column(
        String(255), index=True, nullable=False
    )
    vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    license_type: Mapped[LicenseType] = mapped_column(
        Enum(LicenseType), nullable=False
    )
    license_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    purchased_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    installed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    m365_assigned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_per_unit: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    currency: Mapped[str] = mapped_column(String(3), default="JPY", nullable=False)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    vendor_contract_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
