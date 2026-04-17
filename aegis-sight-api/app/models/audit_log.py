"""
Audit log model -- append-only design.

IMPORTANT: This table is designed as an **immutable append-only ledger**.
Records MUST NEVER be updated or deleted in application code or via direct SQL.
All writes go through AuditService.log_action() which only performs INSERTs.

If regulatory requirements demand data retention policies, implement them via
a separate archival process with its own audit trail -- never via DELETE on
this table.
"""

import enum
import uuid
from datetime import datetime, timezone, UTC

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditAction(str, enum.Enum):
    create = "create"
    update = "update"
    delete = "delete"
    login = "login"
    logout = "logout"
    export = "export"
    approve = "approve"
    reject = "reject"


class AuditLog(Base):
    """
    Append-only audit trail.

    DO NOT add update or delete operations for this model.
    The table is intentionally write-once to preserve a tamper-evident log.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction), nullable=False, index=True
    )
    resource_type: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
