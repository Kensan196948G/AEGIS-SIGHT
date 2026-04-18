import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.license import SoftwareLicense
from app.schemas.license import ComplianceCheckResponse
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)


class SAMService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def run_compliance_check(self) -> list[ComplianceCheckResponse]:
        """Run compliance check across all software licenses."""
        result = await self.db.execute(select(SoftwareLicense))
        licenses = result.scalars().all()

        checks: list[ComplianceCheckResponse] = []
        for lic in licenses:
            total_used = lic.installed_count + lic.m365_assigned
            over_deployed = max(0, total_used - lic.purchased_count)
            checks.append(
                ComplianceCheckResponse(
                    license_id=lic.id,
                    software_name=lic.software_name,
                    purchased_count=lic.purchased_count,
                    installed_count=lic.installed_count,
                    m365_assigned=lic.m365_assigned,
                    total_used=total_used,
                    is_compliant=over_deployed == 0,
                    over_deployed=over_deployed,
                )
            )
        return checks

    async def sync_m365_licenses(self) -> dict:
        """
        Sync M365 license assignment counts from Microsoft Graph API.

        Fetches subscribedSkus and matches each SKU to SoftwareLicense rows by
        software_name (case-insensitive, partial match against skuPartNumber).
        Updates m365_assigned with consumedUnits for each matched license.

        Returns a summary with counts of synced, skipped, and failed records.
        """
        try:
            graph = GraphService()
            skus = await graph.get_m365_licenses()
        except Exception:
            logger.exception("Failed to fetch M365 licenses from Graph API")
            return {"status": "error", "message": "Graph API call failed", "synced": 0}

        # Build a lookup: normalised SKU part number → consumedUnits
        sku_map: dict[str, int] = {
            sku.get("skuPartNumber", "").lower(): sku.get("consumedUnits", 0)
            for sku in skus
            if sku.get("skuPartNumber")
        }

        result_rows = await self.db.execute(select(SoftwareLicense))
        licenses = result_rows.scalars().all()

        synced = skipped = 0
        for lic in licenses:
            name_lower = lic.software_name.lower()
            # Match by substring: e.g. "Microsoft 365 E3" → "e3" substring of "enterprisepack"
            matched_units: int | None = None
            for sku_key, units in sku_map.items():
                if sku_key in name_lower or name_lower in sku_key:
                    matched_units = units
                    break

            if matched_units is not None:
                lic.m365_assigned = matched_units
                synced += 1
            else:
                skipped += 1

        await self.db.commit()
        logger.info("M365 sync complete: %d synced, %d skipped", synced, skipped)
        return {"status": "ok", "synced": synced, "skipped": skipped, "total_skus": len(skus)}
