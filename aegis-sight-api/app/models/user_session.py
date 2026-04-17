"""User session and activity tracking models.

Tracks RDP, VPN, Citrix, and local sessions along with
user activities such as app launches, web access, file operations,
print jobs, and email usage.
"""

import enum
import uuid
from datetime import datetime, timezone, UTC

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SessionType(str, enum.Enum):
    local = "local"
    rdp = "rdp"
    vpn = "vpn"
    citrix = "citrix"


class ActivityType(str, enum.Enum):
    app_launch = "app_launch"
    web_access = "web_access"
    file_access = "file_access"
    print = "print"
    email = "email"


class UserSession(Base):
    __tablename__ = "user_sessions"

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
    session_type: Mapped[SessionType] = mapped_column(
        Enum(SessionType), nullable=False, index=True
    )
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    source_hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_minutes: Mapped[int | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )

    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")


class UserActivity(Base):
    __tablename__ = "user_activities"

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
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(ActivityType), nullable=False, index=True
    )
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")
