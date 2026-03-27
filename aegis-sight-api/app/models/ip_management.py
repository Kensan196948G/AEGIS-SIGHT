import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AssignmentType(str, enum.Enum):
    static = "static"
    dhcp = "dhcp"
    reserved = "reserved"


class AssignmentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    reserved = "reserved"
    conflict = "conflict"


class IPRange(Base):
    __tablename__ = "ip_ranges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    network_address: Mapped[str] = mapped_column(
        String(43), nullable=False, unique=True, index=True,
        comment="CIDR notation, e.g. 192.168.1.0/24",
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vlan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gateway: Mapped[str | None] = mapped_column(String(45), nullable=True)
    dns_servers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dhcp_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    location: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="本社 / 支社 / 現場",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    assignments = relationship(
        "IPAssignment", back_populates="ip_range", lazy="selectin"
    )


class IPAssignment(Base):
    __tablename__ = "ip_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ip_address: Mapped[str] = mapped_column(
        INET, nullable=False, index=True
    )
    mac_address: Mapped[str | None] = mapped_column(
        String(17), nullable=True
    )
    hostname: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    range_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ip_ranges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assignment_type: Mapped[AssignmentType] = mapped_column(
        Enum(AssignmentType), default=AssignmentType.static, nullable=False
    )
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus), default=AssignmentStatus.active, nullable=False
    )
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    ip_range = relationship("IPRange", back_populates="assignments", lazy="selectin")
    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")
