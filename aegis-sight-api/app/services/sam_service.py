import logging
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.license import SoftwareLicense, SoftwareSkuAlias
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

        Resolves each SKU to a ``SoftwareLicense`` row in two passes:

        1. **Alias-first.** A ``SoftwareSkuAlias`` row explicitly maps a
           ``skuPartNumber`` (e.g. ``ENTERPRISEPACK``) to a license, which
           handles friendly names (e.g. ``Microsoft 365 E3``) that share no
           substring with the SKU.
        2. **Bidirectional substring fallback.** For SKUs without an alias,
           we fall back to the original heuristic: a license matches when
           its ``software_name`` and the SKU part number overlap in either
           direction (preserves existing behaviour for pre-alias deployments).

        Each license is claimed at most once per sync to avoid duplicate
        assignments when multiple SKUs could otherwise match the same row.

        Returns:
            dict with keys ``status`` (``"ok"`` / ``"error"``),
            ``synced`` (licenses updated), ``skipped`` (licenses unmatched),
            ``total_skus`` (raw SKU count from Graph API).  The error variant
            also carries a ``message`` key.
        """
        try:
            graph = GraphService()
            skus = await graph.get_m365_licenses()
        except Exception:
            logger.exception("Failed to fetch M365 licenses from Graph API")
            return {
                "status": "error",
                "message": "Graph API call failed",
                "synced": 0,
                "skipped": 0,
                "total_skus": 0,
            }

        license_rows = await self.db.execute(select(SoftwareLicense))
        licenses = list(license_rows.scalars().all())

        alias_rows = await self.db.execute(select(SoftwareSkuAlias))
        aliases = alias_rows.scalars().all()

        # sku_part_number (lowercase) -> license_id
        alias_map: dict[str, uuid.UUID] = {
            alias.sku_part_number.lower(): alias.software_license_id
            for alias in aliases
        }
        licenses_by_id = {lic.id: lic for lic in licenses}
        claimed: set[uuid.UUID] = set()

        total_skus = len(skus)
        unmatched_skus: list[tuple[str, int]] = []

        # Pass 1: alias-first matching.
        for sku in skus:
            sku_key = (sku.get("skuPartNumber") or "").lower()
            if not sku_key:
                continue
            units = sku.get("consumedUnits", 0)
            lic_id = alias_map.get(sku_key)
            if (
                lic_id is not None
                and lic_id in licenses_by_id
                and lic_id not in claimed
            ):
                licenses_by_id[lic_id].m365_assigned = units
                claimed.add(lic_id)
            else:
                unmatched_skus.append((sku_key, units))

        # Pass 2: bidirectional substring fallback (legacy behaviour).
        for sku_key, units in unmatched_skus:
            for lic in licenses:
                if lic.id in claimed:
                    continue
                name_lower = lic.software_name.lower()
                if sku_key in name_lower or name_lower in sku_key:
                    lic.m365_assigned = units
                    claimed.add(lic.id)
                    break

        synced = len(claimed)
        skipped = len(licenses) - synced

        await self.db.commit()
        logger.info(
            "M365 sync complete: %d synced, %d skipped (%d aliases in use)",
            synced,
            skipped,
            len(alias_map),
        )
        return {
            "status": "ok",
            "synced": synced,
            "skipped": skipped,
            "total_skus": total_skus,
        }

    # ------------------------------------------------------------------
    # SKU alias management (Issue #479 / PR #478 follow-up)
    # ------------------------------------------------------------------

    async def list_aliases_for_license(
        self, license_id: uuid.UUID
    ) -> list[SoftwareSkuAlias]:
        """List all SKU aliases bound to a specific license.

        Raises ``NotFoundError`` when the license itself does not exist so
        callers can distinguish "no aliases" from "license missing".
        """
        lic_exists = await self.db.execute(
            select(SoftwareLicense.id).where(SoftwareLicense.id == license_id)
        )
        if lic_exists.scalar_one_or_none() is None:
            raise NotFoundError("License", str(license_id))

        rows = await self.db.execute(
            select(SoftwareSkuAlias)
            .where(SoftwareSkuAlias.software_license_id == license_id)
            .order_by(SoftwareSkuAlias.sku_part_number)
        )
        return list(rows.scalars().all())

    async def create_alias(
        self, license_id: uuid.UUID, sku_part_number: str
    ) -> SoftwareSkuAlias:
        """Create a new SKU → license alias.

        Raises ``NotFoundError`` if the target license does not exist, and
        ``ConflictError`` when the SKU is already bound (UNIQUE violation on
        ``sku_part_number``).
        """
        lic_exists = await self.db.execute(
            select(SoftwareLicense.id).where(SoftwareLicense.id == license_id)
        )
        if lic_exists.scalar_one_or_none() is None:
            raise NotFoundError("License", str(license_id))

        alias = SoftwareSkuAlias(
            software_license_id=license_id,
            sku_part_number=sku_part_number,
        )
        self.db.add(alias)
        try:
            await self.db.flush()
        except IntegrityError as exc:
            await self.db.rollback()
            raise ConflictError(
                detail=f"SKU '{sku_part_number}' is already mapped to another license"
            ) from exc
        await self.db.refresh(alias)
        return alias

    async def update_alias(
        self, alias_id: uuid.UUID, sku_part_number: str
    ) -> SoftwareSkuAlias:
        """Update an alias's SKU part number.

        The owning license binding is immutable — callers that need to
        re-point a SKU must delete and re-create.
        """
        rows = await self.db.execute(
            select(SoftwareSkuAlias).where(SoftwareSkuAlias.id == alias_id)
        )
        alias = rows.scalar_one_or_none()
        if alias is None:
            raise NotFoundError("SkuAlias", str(alias_id))

        alias.sku_part_number = sku_part_number
        try:
            await self.db.flush()
        except IntegrityError as exc:
            await self.db.rollback()
            raise ConflictError(
                detail=f"SKU '{sku_part_number}' is already mapped to another license"
            ) from exc
        await self.db.refresh(alias)
        return alias

    async def delete_alias(self, alias_id: uuid.UUID) -> None:
        """Delete an alias; 404 when it does not exist."""
        rows = await self.db.execute(
            select(SoftwareSkuAlias).where(SoftwareSkuAlias.id == alias_id)
        )
        alias = rows.scalar_one_or_none()
        if alias is None:
            raise NotFoundError("SkuAlias", str(alias_id))
        await self.db.delete(alias)
        await self.db.flush()
