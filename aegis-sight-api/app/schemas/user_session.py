"""User session and activity Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user_session import ActivityType, SessionType


# ---------------------------------------------------------------------------
# UserSession schemas
# ---------------------------------------------------------------------------
class SessionCreate(BaseModel):
    device_id: uuid.UUID | None = None
    user_name: str = Field(..., max_length=255)
    session_type: SessionType
    source_ip: str | None = Field(None, max_length=45)
    source_hostname: str | None = Field(None, max_length=255)


class SessionEnd(BaseModel):
    ended_at: datetime | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID | None
    user_name: str
    session_type: SessionType
    source_ip: str | None
    source_hostname: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: int | None
    is_active: bool


# ---------------------------------------------------------------------------
# UserActivity schemas
# ---------------------------------------------------------------------------
class ActivityCreate(BaseModel):
    device_id: uuid.UUID | None = None
    user_name: str = Field(..., max_length=255)
    activity_type: ActivityType
    detail: dict | None = None


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID | None
    user_name: str
    activity_type: ActivityType
    detail: dict | None
    occurred_at: datetime


# ---------------------------------------------------------------------------
# Analytics schemas
# ---------------------------------------------------------------------------
class SessionAnalytics(BaseModel):
    total_sessions: int
    active_sessions: int
    by_type: dict[str, int]
    by_user: list[dict]
    peak_hours: list[dict]


class UserBehaviorProfile(BaseModel):
    user_name: str
    total_sessions: int
    total_duration_minutes: int
    avg_duration_minutes: float
    session_types: dict[str, int]
    activity_types: dict[str, int]
    recent_activities: list[ActivityResponse]
    active_sessions: int
