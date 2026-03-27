import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification_channel import ChannelType, NotificationEventType


# ---------------------------------------------------------------------------
# Notification Channel schemas
# ---------------------------------------------------------------------------
class NotificationChannelCreate(BaseModel):
    name: str
    channel_type: ChannelType
    config: dict = {}
    is_enabled: bool = True


class NotificationChannelUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None
    is_enabled: bool | None = None


class NotificationChannelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    channel_type: ChannelType
    config: dict
    is_enabled: bool
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class NotificationChannelTestResult(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Notification Rule schemas
# ---------------------------------------------------------------------------
class NotificationRuleCreate(BaseModel):
    name: str
    event_type: NotificationEventType
    channel_id: uuid.UUID
    conditions: dict | None = None
    is_enabled: bool = True


class NotificationRuleUpdate(BaseModel):
    name: str | None = None
    event_type: NotificationEventType | None = None
    channel_id: uuid.UUID | None = None
    conditions: dict | None = None
    is_enabled: bool | None = None


class NotificationRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    event_type: NotificationEventType
    channel_id: uuid.UUID
    conditions: dict | None
    is_enabled: bool
    created_at: datetime
