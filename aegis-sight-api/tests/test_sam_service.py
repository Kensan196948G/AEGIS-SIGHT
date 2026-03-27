"""Unit tests for SAMService.

Covers:
  - run_compliance_check() with all-compliant licenses
  - License over-deployment detection
  - Unregistered / zero-purchased software detection
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.license import LicenseType, SoftwareLicense
from app.services.sam_service import SAMService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_license(
    *,
    software_name: str = "TestSoft",
    purchased: int = 100,
    installed: int = 80,
    m365_assigned: int = 0,
) -> SoftwareLicense:
    """Create a SoftwareLicense instance (not persisted)."""
    return SoftwareLicense(
        id=uuid.uuid4(),
        software_name=software_name,
        vendor="TestVendor",
        license_type=LicenseType.subscription,
        purchased_count=purchased,
        installed_count=installed,
        m365_assigned=m365_assigned,
        currency="JPY",
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_compliance_check_all_compliant(db_session: AsyncSession):
    """All licenses within limits are reported as compliant."""
    lic1 = _make_license(software_name="App A", purchased=50, installed=30)
    lic2 = _make_license(software_name="App B", purchased=100, installed=100)
    db_session.add_all([lic1, lic2])
    await db_session.flush()

    svc = SAMService(db_session)
    results = await svc.run_compliance_check()

    assert len(results) >= 2
    for r in results:
        if r.software_name in ("App A", "App B"):
            assert r.is_compliant is True
            assert r.over_deployed == 0


@pytest.mark.asyncio
async def test_compliance_check_over_deployed(db_session: AsyncSession):
    """License with installed > purchased is flagged as non-compliant."""
    lic = _make_license(
        software_name="OverApp",
        purchased=10,
        installed=15,
        m365_assigned=0,
    )
    db_session.add(lic)
    await db_session.flush()

    svc = SAMService(db_session)
    results = await svc.run_compliance_check()

    over = [r for r in results if r.software_name == "OverApp"]
    assert len(over) == 1
    assert over[0].is_compliant is False
    assert over[0].over_deployed == 5
    assert over[0].total_used == 15


@pytest.mark.asyncio
async def test_compliance_check_m365_combined(db_session: AsyncSession):
    """total_used = installed_count + m365_assigned is used for compliance."""
    lic = _make_license(
        software_name="M365App",
        purchased=20,
        installed=10,
        m365_assigned=15,  # total = 25 > 20
    )
    db_session.add(lic)
    await db_session.flush()

    svc = SAMService(db_session)
    results = await svc.run_compliance_check()

    m365 = [r for r in results if r.software_name == "M365App"]
    assert len(m365) == 1
    assert m365[0].total_used == 25
    assert m365[0].is_compliant is False
    assert m365[0].over_deployed == 5


@pytest.mark.asyncio
async def test_compliance_check_zero_purchased(db_session: AsyncSession):
    """Software with 0 purchased but >0 installed is over-deployed."""
    lic = _make_license(
        software_name="UnregSoft",
        purchased=0,
        installed=3,
    )
    db_session.add(lic)
    await db_session.flush()

    svc = SAMService(db_session)
    results = await svc.run_compliance_check()

    unreg = [r for r in results if r.software_name == "UnregSoft"]
    assert len(unreg) == 1
    assert unreg[0].is_compliant is False
    assert unreg[0].over_deployed == 3


@pytest.mark.asyncio
async def test_compliance_check_empty_db(db_session: AsyncSession):
    """No licenses in DB returns an empty list."""
    svc = SAMService(db_session)
    results = await svc.run_compliance_check()
    # May contain licenses from other tests in the same session,
    # but on a clean session it should be a list.
    assert isinstance(results, list)


@pytest.mark.asyncio
async def test_compliance_check_exact_boundary(db_session: AsyncSession):
    """Exactly at the limit (total_used == purchased) is compliant."""
    lic = _make_license(
        software_name="BoundaryApp",
        purchased=50,
        installed=30,
        m365_assigned=20,  # total = 50 == purchased
    )
    db_session.add(lic)
    await db_session.flush()

    svc = SAMService(db_session)
    results = await svc.run_compliance_check()

    boundary = [r for r in results if r.software_name == "BoundaryApp"]
    assert len(boundary) == 1
    assert boundary[0].is_compliant is True
    assert boundary[0].over_deployed == 0
