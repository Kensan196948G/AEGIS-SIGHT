"""Schemas for data export endpoints."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ExportFormat(str, Enum):
    csv = "csv"
    json = "json"


class ExportDataType(str, Enum):
    devices = "devices"
    licenses = "licenses"
    alerts = "alerts"
    audit_logs = "audit-logs"


class ExportParams(BaseModel):
    """Query parameters for export endpoints."""
    format: ExportFormat = ExportFormat.csv
    date_from: datetime | None = None
    date_to: datetime | None = None


class ExportHistoryItem(BaseModel):
    """A record of a past export operation."""
    id: str
    data_type: ExportDataType
    format: ExportFormat
    row_count: int
    exported_at: datetime
    exported_by: str | None = None
