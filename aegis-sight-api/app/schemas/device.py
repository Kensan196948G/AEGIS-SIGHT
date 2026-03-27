import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.device import DeviceStatus


class DeviceCreate(BaseModel):
    hostname: str
    os_version: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    domain: str | None = None
    status: DeviceStatus = DeviceStatus.active


class DeviceUpdate(BaseModel):
    hostname: str | None = None
    os_version: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    domain: str | None = None
    status: DeviceStatus | None = None
    last_seen: datetime | None = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    hostname: str
    os_version: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    domain: str | None = None
    status: DeviceStatus
    last_seen: datetime | None = None
    created_at: datetime
