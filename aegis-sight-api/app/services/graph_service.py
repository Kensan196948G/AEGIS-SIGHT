"""Microsoft Graph API integration service.

Uses MSAL Client Credentials Flow to authenticate and httpx to call
the Microsoft Graph REST API for M365 license, user, Intune device,
and Defender alert data.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
import msal

from app.core.config import settings

logger = logging.getLogger(__name__)

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
GRAPH_BETA_URL = "https://graph.microsoft.com/beta"


class GraphService:
    """Service for interacting with Microsoft Graph API."""

    def __init__(self) -> None:
        self._app = msal.ConfidentialClientApplication(
            client_id=settings.AZURE_CLIENT_ID,
            client_credential=settings.AZURE_CLIENT_SECRET,
            authority=f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}",
        )

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def _get_access_token(self) -> str:
        """Acquire an access token via Client Credentials Flow."""
        result = self._app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"],
        )
        if "access_token" not in result:
            error = result.get("error_description", result.get("error", "unknown"))
            logger.error("Failed to acquire Graph token: %s", error)
            raise RuntimeError(f"Graph token acquisition failed: {error}")
        return result["access_token"]

    async def _get_headers(self) -> dict[str, str]:
        token = await self._get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Generic request helper
    # ------------------------------------------------------------------

    async def _get(self, url: str) -> dict[str, Any]:
        """Perform a GET request against the Graph API."""
        headers = await self._get_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

    async def _get_all_pages(self, url: str) -> list[dict[str, Any]]:
        """Follow @odata.nextLink to retrieve all pages."""
        headers = await self._get_headers()
        items: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            next_url: str | None = url
            while next_url:
                response = await client.get(next_url, headers=headers)
                response.raise_for_status()
                data = response.json()
                items.extend(data.get("value", []))
                next_url = data.get("@odata.nextLink")
        return items

    # ------------------------------------------------------------------
    # M365 Licenses
    # ------------------------------------------------------------------

    async def get_m365_licenses(self) -> list[dict[str, Any]]:
        """Retrieve all subscribed SKUs (M365 license overview).

        Graph endpoint: GET /subscribedSkus
        """
        data = await self._get(f"{GRAPH_BASE_URL}/subscribedSkus")
        return data.get("value", [])

    # ------------------------------------------------------------------
    # M365 Users
    # ------------------------------------------------------------------

    async def get_m365_users(self) -> list[dict[str, Any]]:
        """Retrieve all users from Azure AD.

        Graph endpoint: GET /users
        """
        url = (
            f"{GRAPH_BASE_URL}/users"
            "?$select=id,displayName,mail,userPrincipalName,"
            "accountEnabled,assignedLicenses,createdDateTime"
            "&$top=999"
        )
        return await self._get_all_pages(url)

    # ------------------------------------------------------------------
    # Intune Devices
    # ------------------------------------------------------------------

    async def get_intune_devices(self) -> list[dict[str, Any]]:
        """Retrieve managed devices from Intune.

        Graph endpoint: GET /deviceManagement/managedDevices
        """
        url = (
            f"{GRAPH_BASE_URL}/deviceManagement/managedDevices"
            "?$select=id,deviceName,operatingSystem,osVersion,"
            "complianceState,lastSyncDateTime,userPrincipalName,"
            "managedDeviceOwnerType,enrolledDateTime"
            "&$top=999"
        )
        return await self._get_all_pages(url)

    # ------------------------------------------------------------------
    # Defender for Endpoint Alerts
    # ------------------------------------------------------------------

    async def get_defender_alerts(self) -> list[dict[str, Any]]:
        """Retrieve Defender for Endpoint alerts.

        Graph endpoint (beta): GET /security/alerts_v2
        """
        url = (
            f"{GRAPH_BETA_URL}/security/alerts_v2"
            "?$top=200"
            "&$orderby=createdDateTime desc"
        )
        return await self._get_all_pages(url)
