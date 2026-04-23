"""Unit tests for alias-first matching in SAMService.sync_m365_licenses.

Covers the behaviour added for Issue #477: explicit
``software_sku_aliases`` rows should win over the legacy bidirectional
substring fallback, while pre-alias deployments continue to work.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.sam_service import SAMService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_license(name: str, m365_assigned: int = 0, lic_id: uuid.UUID | None = None):
    lic = MagicMock()
    lic.id = lic_id or uuid.uuid4()
    lic.software_name = name
    lic.m365_assigned = m365_assigned
    return lic


def _make_alias(license_id: uuid.UUID, sku_part_number: str):
    alias = MagicMock()
    alias.software_license_id = license_id
    alias.sku_part_number = sku_part_number
    return alias


def _make_db(licenses: list, aliases: list | None = None) -> AsyncMock:
    db = AsyncMock()
    aliases = aliases or []

    license_result = MagicMock()
    license_result.scalars.return_value.all.return_value = licenses

    alias_result = MagicMock()
    alias_result.scalars.return_value.all.return_value = aliases

    db.execute = AsyncMock(side_effect=[license_result, alias_result])
    db.commit = AsyncMock()
    return db


def _patch_graph(skus: list):
    """Return a ``GraphService`` patcher that yields the given SKU payload."""
    mock_gs = patch("app.services.sam_service.GraphService")
    return mock_gs, skus


# ---------------------------------------------------------------------------
# Alias-first matching
# ---------------------------------------------------------------------------


class TestAliasHitAssignsMatchedLicense:
    async def test_alias_resolves_friendly_name(self) -> None:
        lic = _make_license("Microsoft 365 E3")
        alias = _make_alias(lic.id, "ENTERPRISEPACK")
        db = _make_db([lic], aliases=[alias])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 25}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert lic.m365_assigned == 25
        assert result["synced"] == 1
        assert result["skipped"] == 0

    async def test_alias_is_case_insensitive(self) -> None:
        lic = _make_license("Microsoft 365 E3")
        alias = _make_alias(lic.id, "enterprisepack")  # stored lowercase
        db = _make_db([lic], aliases=[alias])
        svc = SAMService(db=db)
        # Graph API emits uppercase part numbers
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 12}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            await svc.sync_m365_licenses()
        assert lic.m365_assigned == 12

    async def test_alias_wins_over_substring_candidate(self) -> None:
        """If both an alias and a substring match exist, the alias takes the
        SKU so the substring candidate is left untouched."""
        aliased = _make_license("Microsoft 365 E3")
        substring = _make_license("enterprisepack", m365_assigned=0)
        alias = _make_alias(aliased.id, "ENTERPRISEPACK")
        db = _make_db([aliased, substring], aliases=[alias])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 50}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            await svc.sync_m365_licenses()
        assert aliased.m365_assigned == 50
        assert substring.m365_assigned == 0


# ---------------------------------------------------------------------------
# Fallback to substring when alias misses
# ---------------------------------------------------------------------------


class TestSubstringFallbackWhenAliasMisses:
    async def test_no_alias_uses_substring(self) -> None:
        lic = _make_license("enterprisepack")
        db = _make_db([lic], aliases=[])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 7}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert lic.m365_assigned == 7
        assert result["synced"] == 1

    async def test_alias_for_other_sku_leaves_fallback_untouched(self) -> None:
        """An alias for SKU-A should not interfere with substring resolution
        of SKU-B."""
        aliased = _make_license("Microsoft 365 E3")
        fallback = _make_license("visio")
        alias = _make_alias(aliased.id, "ENTERPRISEPACK")
        db = _make_db([aliased, fallback], aliases=[alias])
        svc = SAMService(db=db)
        skus = [
            {"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 10},
            {"skuPartNumber": "VISIOCLIENT", "consumedUnits": 3},
        ]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert aliased.m365_assigned == 10
        assert fallback.m365_assigned == 3
        assert result["synced"] == 2
        assert result["skipped"] == 0


# ---------------------------------------------------------------------------
# Defensive: dangling alias rows
# ---------------------------------------------------------------------------


class TestAliasReferentialIntegrity:
    async def test_alias_to_missing_license_is_ignored(self) -> None:
        """If an alias points to a license_id that is not loaded (stale row,
        race condition, manual DB edit) we must not crash and must not skip
        legitimate substring matches."""
        fallback = _make_license("enterprisepack")
        dangling = _make_alias(uuid.uuid4(), "ENTERPRISEPACK")
        db = _make_db([fallback], aliases=[dangling])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 4}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        # Alias cannot resolve → substring fallback picks up the SKU
        assert fallback.m365_assigned == 4
        assert result["synced"] == 1


# ---------------------------------------------------------------------------
# One-license-per-sync invariant
# ---------------------------------------------------------------------------


class TestClaimedLicenseExclusivity:
    async def test_license_not_double_assigned_by_second_sku(self) -> None:
        """If an alias already claimed a license, a later SKU must not
        overwrite it through a substring match."""
        lic = _make_license("Microsoft 365 E3")
        alias = _make_alias(lic.id, "ENTERPRISEPACK")
        db = _make_db([lic], aliases=[alias])
        svc = SAMService(db=db)
        skus = [
            {"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 30},
            # A nonsense SKU that happens to substring-match "Microsoft 365 E3"
            {"skuPartNumber": "microsoft 365 e3 extra", "consumedUnits": 999},
        ]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            await svc.sync_m365_licenses()
        assert lic.m365_assigned == 30

    async def test_substring_claims_one_license_only(self) -> None:
        """Two identically named licenses should not both be updated by the
        same SKU: the first wins, the second is skipped."""
        lic1 = _make_license("enterprisepack", m365_assigned=0)
        lic2 = _make_license("enterprisepack", m365_assigned=5)
        db = _make_db([lic1, lic2], aliases=[])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 77}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert lic1.m365_assigned == 77
        assert lic2.m365_assigned == 5  # unchanged
        assert result["synced"] == 1
        assert result["skipped"] == 1
