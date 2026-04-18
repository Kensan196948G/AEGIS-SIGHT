from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.license import SoftwareLicense
from app.schemas.license import ComplianceCheckResponse


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
        Sync license assignments from Microsoft 365 Graph API.
        TODO: Implement actual Graph API integration.
        """
        # Placeholder: In production, call MS Graph API to fetch license assignments
        # and update the m365_assigned field for each matching SoftwareLicense.
        return {
            "status": "not_implemented",
            "message": "M365 license sync requires Graph API configuration.",
        }
