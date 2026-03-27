import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SystemConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    value: Any
    category: str
    description: str | None
    updated_by: uuid.UUID | None
    updated_at: datetime
    created_at: datetime


class SystemConfigUpdate(BaseModel):
    value: Any


class SystemConfigListResponse(BaseModel):
    items: list[SystemConfigResponse]
    total: int
