"""Remote work models.

Defines VPN connection tracking and remote access policy management
for telework monitoring and compliance.
"""

import enum
import uuid
from datetime import datetime, time, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, String, Time
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VPNProtocol(str, enum.Enum):
    ipsec = "ipsec"
    ssl = "ssl"
    wireguard = "wireguard"
    l2tp = "l2tp"


class VPNConnection(Base):
    __tablename__ = "vpn_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    vpn_server: Mapped[str] = mapped_column(String(500), nullable=False)
    client_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    assigned_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    protocol: Mapped[VPNProtocol] = mapped_column(
        Enum(VPNProtocol), nullable=False, index=True
    )
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    disconnected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bytes_sent: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    bytes_received: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")


class RemoteAccessPolicy(Base):
    __tablename__ = "remote_access_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    allowed_hours_start: Mapped[time] = mapped_column(Time, nullable=False)
    allowed_hours_end: Mapped[time] = mapped_column(Time, nullable=False)
    allowed_days: Mapped[dict] = mapped_column(JSONB, nullable=False)
    require_mfa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_session_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    geo_restriction: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
