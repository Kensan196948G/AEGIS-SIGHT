"""Pydantic schemas for software inventory endpoints."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SoftwareInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: uuid.UUID
    software_name: str
    version: str | None = None
    publisher: str | None = None
    install_date: date | None = None
    detected_at: datetime


class SoftwareAggregation(BaseModel):
    """Aggregated view: software name -> install count across devices."""

    software_name: str
    publisher: str | None = None
    installed_count: int
