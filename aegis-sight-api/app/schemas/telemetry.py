"""Pydantic schemas for telemetry data ingestion from AEGIS-SIGHT agents."""

from datetime import datetime

from pydantic import BaseModel, Field


class DeviceInfo(BaseModel):
    """Device identification information sent by the agent."""

    hostname: str = Field(..., min_length=1, max_length=255)
    os_version: str | None = Field(None, max_length=255)
    ip_address: str | None = Field(None, max_length=45)
    mac_address: str | None = Field(
        None, pattern=r"^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$"
    )
    domain: str | None = Field(None, max_length=255)


class HardwareInfo(BaseModel):
    """Hardware snapshot data collected by the agent."""

    cpu_model: str | None = Field(None, max_length=255)
    memory_gb: float | None = Field(None, ge=0)
    disk_total_gb: float | None = Field(None, ge=0)
    disk_free_gb: float | None = Field(None, ge=0)
    serial_number: str | None = Field(None, max_length=255)


class SecurityInfo(BaseModel):
    """Security status data collected by the agent."""

    defender_on: bool = False
    bitlocker_on: bool = False
    pattern_date: str | None = Field(None, max_length=50)
    pending_patches: int = Field(0, ge=0)


class SoftwareItem(BaseModel):
    """A single installed software entry."""

    name: str = Field(..., min_length=1, max_length=255)
    version: str | None = Field(None, max_length=100)
    publisher: str | None = Field(None, max_length=255)
    install_date: str | None = Field(None, max_length=20)


class TelemetryPayload(BaseModel):
    """Top-level payload sent by the AEGIS-SIGHT agent."""

    device_info: DeviceInfo
    hardware: HardwareInfo | None = None
    security: SecurityInfo | None = None
    software_inventory: list[SoftwareItem] = Field(default_factory=list)
    collected_at: datetime


class TelemetryResponse(BaseModel):
    """Response returned after successfully processing telemetry data."""

    status: str = "accepted"
    device_id: str
    hostname: str
    snapshots_saved: int = 0
