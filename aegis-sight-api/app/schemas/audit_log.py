import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.audit_log import AuditAction


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None = None
    action: AuditAction
    resource_type: str
    resource_id: str | None = None
    detail: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


class AuditLogFilter(BaseModel):
    """Query parameters for filtering audit logs."""

    action: AuditAction | None = None
    user_id: uuid.UUID | None = None
    resource_type: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
