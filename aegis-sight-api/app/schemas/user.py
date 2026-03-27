import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.readonly


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserSettings(BaseModel):
    email_notifications: bool = True
    alert_severity_filter: str = "all"
    language: str = "ja"
    theme: str = "system"


class UserSettingsUpdate(BaseModel):
    email_notifications: bool | None = None
    alert_severity_filter: str | None = None
    language: str | None = None
    theme: str | None = None
