"""Pydantic schemas for M365 Graph API responses."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

# ------------------------------------------------------------------
# License schemas
# ------------------------------------------------------------------

class M365LicenseResponse(BaseModel):
    """Represents a subscribed SKU from Microsoft 365."""

    sku_id: str
    sku_part_number: str
    consumed_units: int
    prepaid_enabled: int
    prepaid_suspended: int
    prepaid_warning: int
    capability_status: str


class M365LicenseListResponse(BaseModel):
    items: list[M365LicenseResponse]
    total: int


# ------------------------------------------------------------------
# User schemas
# ------------------------------------------------------------------

class M365UserResponse(BaseModel):
    """Represents a user from Azure AD."""

    id: str
    display_name: str | None = None
    mail: str | None = None
    user_principal_name: str | None = None
    account_enabled: bool | None = None
    assigned_license_count: int = 0
    created_date_time: str | None = None


class M365UserListResponse(BaseModel):
    items: list[M365UserResponse]
    total: int


# ------------------------------------------------------------------
# Sync schemas
# ------------------------------------------------------------------

class M365SyncRequest(BaseModel):
    """Optional parameters for triggering a sync."""

    sync_licenses: bool = True
    sync_users: bool = True
    sync_devices: bool = True
    sync_alerts: bool = True


class M365SyncResponse(BaseModel):
    status: str
    message: str
    details: dict[str, Any] = {}
