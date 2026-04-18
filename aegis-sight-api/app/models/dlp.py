"""DLP (Data Loss Prevention) models.

Defines DLP rules for file operation monitoring and DLP events
that record when rules are triggered by file operations.
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DLPRuleType(enum.StrEnum):
    file_extension = "file_extension"
    path_pattern = "path_pattern"
    content_keyword = "content_keyword"
    size_limit = "size_limit"


class DLPAction(enum.StrEnum):
    alert = "alert"
    block = "block"
    log = "log"


class DLPSeverity(enum.StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class DLPActionTaken(enum.StrEnum):
    alerted = "alerted"
    blocked = "blocked"
    logged = "logged"


class DLPRule(Base):
    __tablename__ = "dlp_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rule_type: Mapped[DLPRuleType] = mapped_column(
        Enum(DLPRuleType), nullable=False, index=True
    )
    pattern: Mapped[str] = mapped_column(String(1000), nullable=False)
    action: Mapped[DLPAction] = mapped_column(
        Enum(DLPAction), nullable=False
    )
    severity: Mapped[DLPSeverity] = mapped_column(
        Enum(DLPSeverity), nullable=False, index=True
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    events = relationship("DLPEvent", back_populates="rule", lazy="selectin")


class DLPEvent(Base):
    __tablename__ = "dlp_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dlp_rules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(2000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    action_taken: Mapped[DLPActionTaken] = mapped_column(
        Enum(DLPActionTaken), nullable=False, index=True
    )
    matched_pattern: Mapped[str] = mapped_column(String(1000), nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    rule = relationship("DLPRule", back_populates="events")
    device = relationship("Device", foreign_keys=[device_id], lazy="selectin")
