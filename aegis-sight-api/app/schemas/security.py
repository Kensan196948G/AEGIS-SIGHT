"""Pydantic schemas for security monitoring endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DefenderSummary(BaseModel):
    """Summary of Windows Defender status across all devices."""

    enabled_count: int = 0
    disabled_count: int = 0
    enabled_percentage: float = 0.0


class BitLockerSummary(BaseModel):
    """Summary of BitLocker encryption status across all devices."""

    enabled_count: int = 0
    disabled_count: int = 0
    enabled_percentage: float = 0.0


class PatchSummary(BaseModel):
    """Summary of pending patches across all devices."""

    total_pending: int = 0
    devices_with_pending: int = 0
    devices_fully_patched: int = 0


class SecurityOverview(BaseModel):
    """Combined security overview for the dashboard."""

    total_devices_with_status: int = 0
    defender: DefenderSummary = DefenderSummary()
    bitlocker: BitLockerSummary = BitLockerSummary()
    patches: PatchSummary = PatchSummary()


class DeviceSecurityDetail(BaseModel):
    """Security details for a specific device."""

    model_config = ConfigDict(from_attributes=True)

    device_id: uuid.UUID
    hostname: str
    os_version: str | None = None
    defender_on: bool = False
    bitlocker_on: bool = False
    pattern_date: str | None = None
    pending_patches: int = 0
    last_checked_at: datetime | None = None
