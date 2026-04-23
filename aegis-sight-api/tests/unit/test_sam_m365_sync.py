"""Unit tests for SAMService.sync_m365_licenses — Graph API integration."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.sam_service import SAMService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_license(name: str, m365_assigned: int = 0):
    lic = MagicMock()
    lic.id = uuid.uuid4()
    lic.software_name = name
    lic.m365_assigned = m365_assigned
    return lic


def _make_db(licenses: list, aliases: list | None = None) -> AsyncMock:
    """Mock AsyncSession that returns licenses on the 1st execute() call
    and aliases on the 2nd. Mirrors the query order in SAMService."""
    db = AsyncMock()
    aliases = aliases or []

    license_result = MagicMock()
    license_result.scalars.return_value.all.return_value = licenses

    alias_result = MagicMock()
    alias_result.scalars.return_value.all.return_value = aliases

    db.execute = AsyncMock(side_effect=[license_result, alias_result])
    db.commit = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# Return value structure
# ---------------------------------------------------------------------------


class TestSyncM365LicensesReturnStructure:
    async def test_returns_dict(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await svc.sync_m365_licenses()
        assert isinstance(result, dict)

    async def test_status_ok_on_success(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await svc.sync_m365_licenses()
        assert result["status"] == "ok"

    async def test_has_synced_key(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await svc.sync_m365_licenses()
        assert "synced" in result

    async def test_has_skipped_key(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await svc.sync_m365_licenses()
        assert "skipped" in result

    async def test_has_total_skus_key(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 5}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert result["total_skus"] == 1


# ---------------------------------------------------------------------------
# Matching logic
# ---------------------------------------------------------------------------


class TestSyncM365LicensesMatching:
    async def test_matched_license_gets_consumed_units(self) -> None:
        lic = _make_license("enterprisepack", m365_assigned=0)
        db = _make_db([lic])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 42}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            await svc.sync_m365_licenses()
        assert lic.m365_assigned == 42

    async def test_case_insensitive_match(self) -> None:
        lic = _make_license("EnterPrisePack", m365_assigned=0)
        db = _make_db([lic])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 10}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            await svc.sync_m365_licenses()
        assert lic.m365_assigned == 10

    async def test_no_match_leaves_license_unchanged(self) -> None:
        lic = _make_license("Unrelated Software", m365_assigned=5)
        db = _make_db([lic])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 99}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            await svc.sync_m365_licenses()
        assert lic.m365_assigned == 5

    async def test_synced_count_equals_matched_licenses(self) -> None:
        lic1 = _make_license("enterprisepack")
        lic2 = _make_license("something else")
        db = _make_db([lic1, lic2])
        svc = SAMService(db=db)
        skus = [{"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 1}]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert result["synced"] == 1
        assert result["skipped"] == 1

    async def test_all_skipped_when_no_skus(self) -> None:
        lic = _make_license("Microsoft 365")
        db = _make_db([lic])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await svc.sync_m365_licenses()
        assert result["synced"] == 0
        assert result["skipped"] == 1

    async def test_multiple_licenses_matched(self) -> None:
        lic1 = _make_license("enterprisepack")
        lic2 = _make_license("visio")
        db = _make_db([lic1, lic2])
        svc = SAMService(db=db)
        skus = [
            {"skuPartNumber": "ENTERPRISEPACK", "consumedUnits": 20},
            {"skuPartNumber": "VISIOCLIENT", "consumedUnits": 5},
        ]
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert result["synced"] == 2
        assert result["skipped"] == 0


# ---------------------------------------------------------------------------
# DB commit is called
# ---------------------------------------------------------------------------


class TestSyncM365LicensesDbCommit:
    async def test_commit_called_on_success(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            await svc.sync_m365_licenses()
        db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestSyncM365LicensesErrorHandling:
    async def test_graph_api_failure_returns_error_dict(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(
                side_effect=RuntimeError("Token error")
            )
            result = await svc.sync_m365_licenses()
        assert result["status"] == "error"

    async def test_graph_api_failure_synced_zero(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(
                side_effect=Exception("Network error")
            )
            result = await svc.sync_m365_licenses()
        assert result["synced"] == 0

    async def test_graph_api_failure_no_commit(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(
                side_effect=RuntimeError("fail")
            )
            await svc.sync_m365_licenses()
        db.commit.assert_not_awaited()

    async def test_sku_without_skupartnumber_ignored(self) -> None:
        db = _make_db([])
        svc = SAMService(db=db)
        skus = [{"consumedUnits": 5}]  # no skuPartNumber — excluded from sku_map
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=skus)
            result = await svc.sync_m365_licenses()
        assert result["status"] == "ok"
        # total_skus reflects raw API response count; matching uses only valid entries
        assert result["total_skus"] == 1
        assert result["synced"] == 0
