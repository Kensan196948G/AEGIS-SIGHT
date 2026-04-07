"""Pydantic schemas for log event endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.log_event import FileAction, UsbAction

# ---------- Logon Events ----------

class LogonEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: uuid.UUID
    user_name: str
    event_id: int
    logon_type: int | None = None
    source_ip: str | None = None
    occurred_at: datetime


# ---------- USB Events ----------

class UsbEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: uuid.UUID
    device_name: str
    vendor_id: str | None = None
    product_id: str | None = None
    serial_number: str | None = None
    action: UsbAction
    occurred_at: datetime


# ---------- File Events ----------

class FileEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: uuid.UUID
    user_name: str
    file_path: str
    action: FileAction
    occurred_at: datetime


# ---------- Summary ----------

class LogSummaryResponse(BaseModel):
    total_logon_events: int
    total_usb_events: int
    total_file_events: int
    unique_users: int
    unique_devices: int
