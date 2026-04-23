"""Pydantic schemas for SKU → SoftwareLicense alias management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SkuAliasCreate(BaseModel):
    """Payload for creating a new SKU alias bound to a specific license."""

    sku_part_number: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Microsoft Graph SKU part number (e.g. 'ENTERPRISEPACK')",
    )


class SkuAliasUpdate(BaseModel):
    """Partial update: only ``sku_part_number`` can be edited.

    The owning ``software_license_id`` is immutable once created; to re-point
    a SKU to a different license, delete the alias and create a new one.
    """

    sku_part_number: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="New SKU part number",
    )


class SkuAliasResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    software_license_id: uuid.UUID
    sku_part_number: str
    created_at: datetime
    updated_at: datetime
