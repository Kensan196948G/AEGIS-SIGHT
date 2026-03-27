import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeviceGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    criteria: dict | None = Field(
        None,
        description="Dynamic filter criteria as JSON (e.g. {\"os\": \"Windows\", \"status\": \"online\"})",
    )
    is_dynamic: bool = False


class DeviceGroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    criteria: dict | None = None
    is_dynamic: bool | None = None


class DeviceGroupMembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    device_id: uuid.UUID
    added_at: datetime


class DeviceGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    criteria: dict | None
    is_dynamic: bool
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    member_count: int = 0


class DeviceGroupDetailResponse(DeviceGroupResponse):
    members: list[DeviceGroupMembershipResponse] = []


class MemberAddRequest(BaseModel):
    device_id: uuid.UUID
