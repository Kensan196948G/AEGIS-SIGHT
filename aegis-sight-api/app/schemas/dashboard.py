"""Pydantic schemas for dashboard statistics and alerts."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DashboardStats(BaseModel):
    """Aggregated dashboard statistics."""

    total_devices: int = 0
    online_devices: int = 0
    total_licenses: int = 0
    compliance_rate: float = 0.0
    pending_procurements: int = 0
    active_alerts: int = 0


class AlertItem(BaseModel):
    """A single alert entry for the dashboard."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    severity: str
    title: str
    description: str
    device_hostname: str | None = None
    created_at: datetime


class AlertListResponse(BaseModel):
    """Response containing a list of recent alerts."""

    alerts: list[AlertItem] = []
    total: int = 0
