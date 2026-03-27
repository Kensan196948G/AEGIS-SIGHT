import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.network_device import NetworkDeviceType


class NetworkDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: str
    mac_address: str
    hostname: str | None
    device_type: NetworkDeviceType
    is_managed: bool
    first_seen: datetime
    last_seen: datetime
    device_id: uuid.UUID | None


class NetworkScanEntry(BaseModel):
    """A single entry reported by a network scan."""
    ip_address: str
    mac_address: str
    hostname: str | None = None
    device_type: NetworkDeviceType = NetworkDeviceType.unknown


class NetworkScanRequest(BaseModel):
    """Payload for registering network scan results."""
    devices: list[NetworkScanEntry]


class NetworkScanResponse(BaseModel):
    created: int
    updated: int


class NetworkDeviceLinkRequest(BaseModel):
    """Payload for linking a network device to a managed device."""
    device_id: uuid.UUID
