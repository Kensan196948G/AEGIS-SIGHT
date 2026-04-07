"""Models for device configuration change tracking."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SnapshotType(str, enum.Enum):
    hardware = "hardware"
    software = "software"
    security = "security"
    network = "network"


class ChangeType(str, enum.Enum):
    added = "added"
    modified = "modified"
    removed = "removed"


class ConfigSnapshot(Base):
    __tablename__ = "config_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    snapshot_type: Mapped[SnapshotType] = mapped_column(
        Enum(SnapshotType), nullable=False, index=True
    )
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    device = relationship("Device", backref="config_snapshots")
    changes_before = relationship(
        "ConfigChange",
        foreign_keys="ConfigChange.snapshot_before_id",
        back_populates="snapshot_before",
    )
    changes_after = relationship(
        "ConfigChange",
        foreign_keys="ConfigChange.snapshot_after_id",
        back_populates="snapshot_after",
    )


class ConfigChange(Base):
    __tablename__ = "config_changes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    snapshot_before_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("config_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )
    snapshot_after_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("config_snapshots.id", ondelete="CASCADE"),
        nullable=False,
    )
    change_type: Mapped[ChangeType] = mapped_column(
        Enum(ChangeType), nullable=False, index=True
    )
    field_path: Mapped[str] = mapped_column(String(512), nullable=False)
    old_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    device = relationship("Device", backref="config_changes")
    snapshot_before = relationship(
        "ConfigSnapshot",
        foreign_keys=[snapshot_before_id],
        back_populates="changes_before",
    )
    snapshot_after = relationship(
        "ConfigSnapshot",
        foreign_keys=[snapshot_after_id],
        back_populates="changes_after",
    )
