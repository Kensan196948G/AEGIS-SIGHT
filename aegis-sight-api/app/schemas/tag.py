import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.tag import TagCategory


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    category: TagCategory = TagCategory.general


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str
    category: TagCategory
    created_at: datetime


class TagAssignRequest(BaseModel):
    tag_id: uuid.UUID
    entity_type: str = Field(..., pattern=r"^(device|license|procurement)$")
    entity_id: uuid.UUID


class TagAssignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tag_id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    created_at: datetime


class TagEntityItem(BaseModel):
    entity_type: str
    entity_id: uuid.UUID
    assigned_at: datetime
