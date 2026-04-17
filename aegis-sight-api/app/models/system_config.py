import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# Default configuration values used for seeding and reset operations.
DEFAULT_CONFIGS: dict[str, dict] = {
    "collection_interval_minutes": {
        "value": 5,
        "category": "agent",
        "description": "Interval in minutes between agent data collection runs",
    },
    "alert_thresholds": {
        "value": {"cpu_percent": 90, "disk_free_gb": 10},
        "category": "alert",
        "description": "Threshold values that trigger alerts (CPU %, disk free GB)",
    },
    "retention_days": {
        "value": 1095,
        "category": "storage",
        "description": "Number of days to retain telemetry and log data (default 3 years)",
    },
    "sam_check_hour": {
        "value": 3,
        "category": "sam",
        "description": "Hour of day (0-23 UTC) when the SAM compliance check runs",
    },
}


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    updater = relationship("User", foreign_keys=[updated_by], lazy="selectin")
