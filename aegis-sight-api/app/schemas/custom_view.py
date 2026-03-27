import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CustomViewCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    entity_type: str = Field(
        ..., pattern=r"^(devices|licenses|procurements)$"
    )
    columns: dict | None = Field(
        None,
        description="Column configuration as JSON (e.g. [\"name\", \"status\", \"os\"])",
    )
    filters: dict | None = Field(
        None,
        description="Filter criteria as JSON",
    )
    sort_by: str | None = None
    sort_order: str = Field(default="asc", pattern=r"^(asc|desc)$")
    is_default: bool = False
    is_shared: bool = False


class CustomViewUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    entity_type: str | None = Field(
        None, pattern=r"^(devices|licenses|procurements)$"
    )
    columns: dict | None = None
    filters: dict | None = None
    sort_by: str | None = None
    sort_order: str | None = Field(None, pattern=r"^(asc|desc)$")
    is_default: bool | None = None


class CustomViewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    entity_type: str
    columns: dict | None
    filters: dict | None
    sort_by: str | None
    sort_order: str
    is_default: bool
    owner_id: uuid.UUID
    is_shared: bool
    created_at: datetime


class ShareToggleRequest(BaseModel):
    is_shared: bool
