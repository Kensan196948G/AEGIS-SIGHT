"""
Audit logging service -- centralised utility for recording audit events.

Usage from any service or endpoint::

    audit = AuditService(db)
    await audit.log_action(
        action=AuditAction.create,
        resource_type="device",
        resource_id=str(device.id),
        user_id=current_user.id,
        detail={"hostname": device.hostname},
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction, AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        *,
        action: AuditAction,
        resource_type: str,
        resource_id: str | None = None,
        user_id: uuid.UUID | None = None,
        detail: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        """Insert an append-only audit log entry."""
        entry = AuditLog(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            detail=detail,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def query_logs(
        self,
        *,
        action: AuditAction | None = None,
        user_id: uuid.UUID | None = None,
        resource_type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """Query audit logs with optional filters. Returns (items, total)."""
        stmt = select(AuditLog)
        count_stmt = select(func.count()).select_from(AuditLog)

        if action is not None:
            stmt = stmt.where(AuditLog.action == action)
            count_stmt = count_stmt.where(AuditLog.action == action)
        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == user_id)
            count_stmt = count_stmt.where(AuditLog.user_id == user_id)
        if resource_type is not None:
            stmt = stmt.where(AuditLog.resource_type == resource_type)
            count_stmt = count_stmt.where(AuditLog.resource_type == resource_type)
        if date_from is not None:
            stmt = stmt.where(AuditLog.created_at >= date_from)
            count_stmt = count_stmt.where(AuditLog.created_at >= date_from)
        if date_to is not None:
            stmt = stmt.where(AuditLog.created_at <= date_to)
            count_stmt = count_stmt.where(AuditLog.created_at <= date_to)

        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        return items, total
