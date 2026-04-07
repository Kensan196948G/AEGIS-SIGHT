"""Microsoft 365 integration API endpoints.

All endpoints require admin role authentication.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.core.deps import require_role
from app.core.exceptions import ServiceUnavailableError
from app.models.user import User, UserRole
from app.schemas.m365 import (
    M365LicenseListResponse,
    M365LicenseResponse,
    M365SyncRequest,
    M365SyncResponse,
    M365UserListResponse,
    M365UserResponse,
)
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/m365", tags=["m365"])


def _get_graph_service() -> GraphService:
    return GraphService()


@router.get(
    "/licenses",
    response_model=M365LicenseListResponse,
    summary="List M365 licenses",
    description="Retrieve all Microsoft 365 subscribed SKUs from the tenant.",
)
async def list_m365_licenses(
    _current_user: User = Depends(require_role(UserRole.admin)),
    graph: GraphService = Depends(_get_graph_service),
):
    """Fetch M365 license (subscribed SKU) data from Graph API."""
    try:
        raw_licenses = await graph.get_m365_licenses()
    except Exception as exc:
        logger.error("Failed to fetch M365 licenses: %s", exc)
        raise ServiceUnavailableError("Microsoft Graph API") from exc

    items = []
    for lic in raw_licenses:
        prepaid = lic.get("prepaidUnits", {})
        items.append(
            M365LicenseResponse(
                sku_id=lic.get("skuId", ""),
                sku_part_number=lic.get("skuPartNumber", ""),
                consumed_units=lic.get("consumedUnits", 0),
                prepaid_enabled=prepaid.get("enabled", 0),
                prepaid_suspended=prepaid.get("suspended", 0),
                prepaid_warning=prepaid.get("warning", 0),
                capability_status=lic.get("capabilityStatus", "unknown"),
            )
        )
    return M365LicenseListResponse(items=items, total=len(items))


@router.get(
    "/users",
    response_model=M365UserListResponse,
    summary="List M365 users",
    description="Retrieve all Azure AD users from the tenant.",
)
async def list_m365_users(
    _current_user: User = Depends(require_role(UserRole.admin)),
    graph: GraphService = Depends(_get_graph_service),
):
    """Fetch M365 user data from Graph API."""
    try:
        raw_users = await graph.get_m365_users()
    except Exception as exc:
        logger.error("Failed to fetch M365 users: %s", exc)
        raise ServiceUnavailableError("Microsoft Graph API") from exc

    items = []
    for user in raw_users:
        items.append(
            M365UserResponse(
                id=user.get("id", ""),
                display_name=user.get("displayName"),
                mail=user.get("mail"),
                user_principal_name=user.get("userPrincipalName"),
                account_enabled=user.get("accountEnabled"),
                assigned_license_count=len(user.get("assignedLicenses", [])),
                created_date_time=user.get("createdDateTime"),
            )
        )
    return M365UserListResponse(items=items, total=len(items))


@router.post(
    "/sync",
    response_model=M365SyncResponse,
    summary="Trigger M365 data sync",
    description="Trigger a synchronization of M365 data (licenses, users, devices, alerts).",
)
async def trigger_m365_sync(
    request: M365SyncRequest | None = None,
    _current_user: User = Depends(require_role(UserRole.admin)),
    graph: GraphService = Depends(_get_graph_service),
):
    """Trigger M365 data synchronization."""
    if request is None:
        request = M365SyncRequest()

    details: dict[str, object] = {}
    errors: list[str] = []

    if request.sync_licenses:
        try:
            licenses = await graph.get_m365_licenses()
            details["licenses_fetched"] = len(licenses)
        except Exception as exc:
            logger.error("M365 license sync failed: %s", exc)
            errors.append(f"licenses: {exc}")

    if request.sync_users:
        try:
            users = await graph.get_m365_users()
            details["users_fetched"] = len(users)
        except Exception as exc:
            logger.error("M365 user sync failed: %s", exc)
            errors.append(f"users: {exc}")

    if request.sync_devices:
        try:
            devices = await graph.get_intune_devices()
            details["devices_fetched"] = len(devices)
        except Exception as exc:
            logger.error("M365 device sync failed: %s", exc)
            errors.append(f"devices: {exc}")

    if request.sync_alerts:
        try:
            alerts = await graph.get_defender_alerts()
            details["alerts_fetched"] = len(alerts)
        except Exception as exc:
            logger.error("M365 alert sync failed: %s", exc)
            errors.append(f"alerts: {exc}")

    if errors:
        details["errors"] = errors
        return M365SyncResponse(
            status="partial",
            message=f"Sync completed with {len(errors)} error(s).",
            details=details,
        )

    return M365SyncResponse(
        status="success",
        message="M365 data synchronization completed successfully.",
        details=details,
    )
