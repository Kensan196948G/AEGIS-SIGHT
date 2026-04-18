"""
Report generation service -- CSV-based reports for SAM, assets, and security.

All generators are async iterators that yield CSV rows as strings, suitable
for FastAPI StreamingResponse.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.license import SoftwareLicense
from app.models.security_status import SecurityStatus


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # SAM report (J-SOX compliance)
    # ------------------------------------------------------------------
    async def generate_sam_report(
        self,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> str:
        """
        Generate a Software Asset Management report in CSV format.

        Covers licence compliance status for J-SOX auditing:
          - software name, vendor, licence type
          - purchased vs installed vs M365-assigned counts
          - compliance status and over-deployment count
          - cost information
        """
        stmt = select(SoftwareLicense)
        if date_from:
            stmt = stmt.where(SoftwareLicense.created_at >= date_from)
        if date_to:
            stmt = stmt.where(SoftwareLicense.created_at <= date_to)
        stmt = stmt.order_by(SoftwareLicense.software_name)

        result = await self.db.execute(stmt)
        licenses = result.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "software_name",
            "vendor",
            "license_type",
            "license_key",
            "purchased_count",
            "installed_count",
            "m365_assigned",
            "total_used",
            "is_compliant",
            "over_deployed",
            "cost_per_unit",
            "currency",
            "purchase_date",
            "expiry_date",
            "vendor_contract_id",
            "report_generated_at",
        ])

        now_str = datetime.utcnow().isoformat()
        for lic in licenses:
            total_used = lic.installed_count + lic.m365_assigned
            over_deployed = max(0, total_used - lic.purchased_count)
            writer.writerow([
                lic.software_name,
                lic.vendor,
                lic.license_type.value,
                lic.license_key or "",
                lic.purchased_count,
                lic.installed_count,
                lic.m365_assigned,
                total_used,
                "YES" if over_deployed == 0 else "NO",
                over_deployed,
                str(lic.cost_per_unit) if lic.cost_per_unit else "",
                lic.currency,
                str(lic.purchase_date) if lic.purchase_date else "",
                str(lic.expiry_date) if lic.expiry_date else "",
                lic.vendor_contract_id or "",
                now_str,
            ])

        return output.getvalue()

    # ------------------------------------------------------------------
    # Asset inventory report
    # ------------------------------------------------------------------
    async def generate_asset_report(self) -> str:
        """Generate a CSV report of all IT device assets."""
        result = await self.db.execute(
            select(Device).order_by(Device.hostname)
        )
        devices = result.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id",
            "hostname",
            "os_version",
            "ip_address",
            "mac_address",
            "domain",
            "status",
            "last_seen",
            "created_at",
            "report_generated_at",
        ])

        now_str = datetime.utcnow().isoformat()
        for dev in devices:
            writer.writerow([
                str(dev.id),
                dev.hostname,
                dev.os_version or "",
                dev.ip_address or "",
                dev.mac_address or "",
                dev.domain or "",
                dev.status.value,
                dev.last_seen.isoformat() if dev.last_seen else "",
                dev.created_at.isoformat(),
                now_str,
            ])

        return output.getvalue()

    # ------------------------------------------------------------------
    # Security status report
    # ------------------------------------------------------------------
    async def generate_security_report(self) -> str:
        """Generate a CSV report of security compliance across devices."""
        stmt = (
            select(SecurityStatus, Device)
            .join(Device, SecurityStatus.device_id == Device.id)
            .order_by(Device.hostname, SecurityStatus.checked_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "device_id",
            "hostname",
            "defender_on",
            "bitlocker_on",
            "pattern_date",
            "pending_patches",
            "checked_at",
            "report_generated_at",
        ])

        now_str = datetime.utcnow().isoformat()
        for sec, dev in rows:
            writer.writerow([
                str(dev.id),
                dev.hostname,
                "YES" if sec.defender_on else "NO",
                "YES" if sec.bitlocker_on else "NO",
                sec.pattern_date or "",
                sec.pending_patches,
                sec.checked_at.isoformat(),
                now_str,
            ])

        return output.getvalue()
