"""Unit tests for SAMService SKU alias CRUD (Issue #479).

Exercises the service-layer methods that back the admin endpoints, using
AsyncMock-based session mocks rather than a real database. The service is
responsible for: returning aliases for an existing license, producing
clear NotFound / Conflict errors, and forbidding cross-license re-binding
via immutable ``software_license_id``.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, NotFoundError
from app.services.sam_service import SAMService

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


def _make_alias(
    alias_id: uuid.UUID | None = None,
    license_id: uuid.UUID | None = None,
    sku_part_number: str = "ENTERPRISEPACK",
):
    a = MagicMock()
    a.id = alias_id or uuid.uuid4()
    a.software_license_id = license_id or uuid.uuid4()
    a.sku_part_number = sku_part_number
    return a


def _make_db_license_exists(
    exists: bool,
    alias_rows: list | None = None,
    single_alias=None,
) -> AsyncMock:
    """Build an AsyncMock session.

    Call sequence:
      1. ``select(SoftwareLicense.id).where(id == license_id)`` → scalar_one_or_none
      2. ``select(SoftwareSkuAlias).where(...)`` or ``.where(id == alias_id)``
         → scalars().all() or scalar_one_or_none()
    """
    db = AsyncMock()

    lic_result = MagicMock()
    lic_result.scalar_one_or_none.return_value = MagicMock() if exists else None

    alias_result = MagicMock()
    if alias_rows is not None:
        alias_result.scalars.return_value.all.return_value = alias_rows
    if single_alias is not None:
        alias_result.scalar_one_or_none.return_value = single_alias
    elif alias_rows is None:
        alias_result.scalar_one_or_none.return_value = None

    db.execute = AsyncMock(side_effect=[lic_result, alias_result])
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
    db.rollback = AsyncMock()
    return db


def _make_db_single_alias_query(alias) -> AsyncMock:
    """Session whose first (and only) execute() returns the given alias."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = alias
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.rollback = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# list_aliases_for_license
# ---------------------------------------------------------------------------


class TestListAliasesForLicense:
    async def test_license_missing_raises_not_found(self) -> None:
        db = _make_db_license_exists(exists=False)
        svc = SAMService(db=db)
        with pytest.raises(NotFoundError):
            await svc.list_aliases_for_license(uuid.uuid4())

    async def test_returns_empty_list_when_no_aliases(self) -> None:
        db = _make_db_license_exists(exists=True, alias_rows=[])
        svc = SAMService(db=db)
        aliases = await svc.list_aliases_for_license(uuid.uuid4())
        assert aliases == []

    async def test_returns_all_aliases(self) -> None:
        lic_id = uuid.uuid4()
        stored = [
            _make_alias(license_id=lic_id, sku_part_number="ENTERPRISEPACK"),
            _make_alias(license_id=lic_id, sku_part_number="VISIOCLIENT"),
        ]
        db = _make_db_license_exists(exists=True, alias_rows=stored)
        svc = SAMService(db=db)
        aliases = await svc.list_aliases_for_license(lic_id)
        assert aliases == stored


# ---------------------------------------------------------------------------
# create_alias
# ---------------------------------------------------------------------------


class TestCreateAlias:
    async def test_license_missing_raises_not_found(self) -> None:
        db = _make_db_license_exists(exists=False)
        svc = SAMService(db=db)
        with pytest.raises(NotFoundError):
            await svc.create_alias(uuid.uuid4(), "ENTERPRISEPACK")

    async def test_duplicate_sku_raises_conflict(self) -> None:
        db = _make_db_license_exists(exists=True)
        db.flush = AsyncMock(side_effect=IntegrityError("x", "y", Exception("dup")))
        svc = SAMService(db=db)
        with pytest.raises(ConflictError):
            await svc.create_alias(uuid.uuid4(), "ENTERPRISEPACK")
        db.rollback.assert_awaited_once()

    async def test_success_adds_and_returns_alias(self) -> None:
        db = _make_db_license_exists(exists=True)
        svc = SAMService(db=db)
        lic_id = uuid.uuid4()
        alias = await svc.create_alias(lic_id, "ENTERPRISEPACK")
        db.add.assert_called_once()
        added = db.add.call_args.args[0]
        assert added.software_license_id == lic_id
        assert added.sku_part_number == "ENTERPRISEPACK"
        assert alias is added


# ---------------------------------------------------------------------------
# update_alias
# ---------------------------------------------------------------------------


class TestUpdateAlias:
    async def test_missing_alias_raises_not_found(self) -> None:
        db = _make_db_single_alias_query(None)
        svc = SAMService(db=db)
        with pytest.raises(NotFoundError):
            await svc.update_alias(uuid.uuid4(), "ENTERPRISEPACK")

    async def test_sku_conflict_raises_conflict(self) -> None:
        existing = _make_alias(sku_part_number="OLDSKU")
        db = _make_db_single_alias_query(existing)
        db.flush = AsyncMock(side_effect=IntegrityError("x", "y", Exception("dup")))
        svc = SAMService(db=db)
        with pytest.raises(ConflictError):
            await svc.update_alias(existing.id, "TAKENSKU")
        db.rollback.assert_awaited_once()

    async def test_success_mutates_sku_part_number(self) -> None:
        existing = _make_alias(sku_part_number="OLDSKU")
        db = _make_db_single_alias_query(existing)
        svc = SAMService(db=db)
        updated = await svc.update_alias(existing.id, "NEWSKU")
        assert updated is existing
        assert existing.sku_part_number == "NEWSKU"

    async def test_license_binding_is_not_mutable_via_update(self) -> None:
        """Update path only writes ``sku_part_number`` — the FK stays."""
        original_license_id = uuid.uuid4()
        existing = _make_alias(license_id=original_license_id, sku_part_number="OLD")
        db = _make_db_single_alias_query(existing)
        svc = SAMService(db=db)
        await svc.update_alias(existing.id, "NEW")
        assert existing.software_license_id == original_license_id


# ---------------------------------------------------------------------------
# delete_alias
# ---------------------------------------------------------------------------


class TestDeleteAlias:
    async def test_missing_alias_raises_not_found(self) -> None:
        db = _make_db_single_alias_query(None)
        svc = SAMService(db=db)
        with pytest.raises(NotFoundError):
            await svc.delete_alias(uuid.uuid4())

    async def test_success_calls_delete_and_flush(self) -> None:
        existing = _make_alias()
        db = _make_db_single_alias_query(existing)
        svc = SAMService(db=db)
        await svc.delete_alias(existing.id)
        db.delete.assert_awaited_once_with(existing)
        db.flush.assert_awaited_once()
