"""Remote work Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.remote_work import VPNProtocol


# ---------------------------------------------------------------------------
# VPN Connection schemas
# ---------------------------------------------------------------------------
class VPNConnectionCreate(BaseModel):
    device_id: uuid.UUID | None = None
    user_name: str = Field(..., max_length=255)
    vpn_server: str = Field(..., max_length=500)
    client_ip: str = Field(..., max_length=45)
    assigned_ip: str = Field(..., max_length=45)
    protocol: VPNProtocol


class VPNConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: uuid.UUID | None
    user_name: str
    vpn_server: str
    client_ip: str
    assigned_ip: str
    protocol: VPNProtocol
    connected_at: datetime
    disconnected_at: datetime | None
    duration_minutes: int | None
    bytes_sent: int | None
    bytes_received: int | None
    is_active: bool


class VPNDisconnectRequest(BaseModel):
    bytes_sent: int | None = None
    bytes_received: int | None = None


# ---------------------------------------------------------------------------
# Remote Access Policy schemas
# ---------------------------------------------------------------------------
class RemoteAccessPolicyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    allowed_hours_start: time
    allowed_hours_end: time
    allowed_days: list[str] = Field(
        ..., description="Weekday names, e.g. ['monday','tuesday',...]"
    )
    require_mfa: bool = True
    max_session_hours: int = Field(..., ge=1, le=24)
    geo_restriction: dict | None = None
    is_enabled: bool = True


class RemoteAccessPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    allowed_hours_start: time
    allowed_hours_end: time
    allowed_days: list[str]
    require_mfa: bool
    max_session_hours: int
    geo_restriction: dict | None
    is_enabled: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Analytics schemas
# ---------------------------------------------------------------------------
class RemoteWorkAnalytics(BaseModel):
    total_connections: int
    active_connections: int
    by_protocol: dict[str, int]
    total_bytes_sent: int
    total_bytes_received: int
    peak_hours: list[dict]
    utilization_rate: float = Field(
        description="Active connections / total users ratio"
    )
    top_users: list[dict]
