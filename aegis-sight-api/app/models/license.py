import enum
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LicenseType(enum.StrEnum):
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
    software_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    license_type: Mapped[LicenseType] = mapped_column(Enum(LicenseType), nullable=False)
    license_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    purchased_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    installed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    m365_assigned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_per_unit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="JPY", nullable=False)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    vendor_contract_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
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

    sku_aliases: Mapped[list["SoftwareSkuAlias"]] = relationship(
        "SoftwareSkuAlias",
        back_populates="license",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SoftwareSkuAlias(Base):
    """Explicit mapping from an external SKU part number to a SoftwareLicense.

    Used by ``SAMService.sync_m365_licenses`` to resolve Graph API SKUs (e.g.
    ``ENTERPRISEPACK``) to the correct license row even when the friendly
    ``software_name`` (e.g. ``Microsoft 365 E3``) has no textual overlap.
    """

    __tablename__ = "software_sku_aliases"
    __table_args__ = (
        UniqueConstraint("sku_part_number", name="uq_software_sku_aliases_sku"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    software_license_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("software_licenses.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sku_part_number: Mapped[str] = mapped_column(String(100), nullable=False)
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

    license: Mapped["SoftwareLicense"] = relationship(
        "SoftwareLicense", back_populates="sku_aliases"
    )
