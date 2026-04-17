"""
AEGIS-SIGHT -- Database seed data script.

Creates test data for local development and QA environments:
  - Admin + role-based test users
  - 10 devices (mixed statuses)
  - 5 software licenses (including 1 over-allocated, 1 near-expiry)
  - 3 procurement requests (draft / submitted / approved)

Usage:
    python -m scripts.seed_data          # from aegis-sight-api/
    # or
    DATABASE_URL=postgresql+asyncpg://... python scripts/seed_data.py
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.device import Device, DeviceStatus
from app.models.license import LicenseType, SoftwareLicense
from app.models.procurement import (
    ProcurementCategory,
    ProcurementRequest,
    ProcurementStatus,
)
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Engine / session -- honours DATABASE_URL from env / .env
# ---------------------------------------------------------------------------
engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

DEFAULT_PASSWORD = get_password_hash("Password123!")
NOW = datetime.now(UTC)
TODAY = date.today()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _clear_tables(session: AsyncSession) -> None:
    """Truncate seed-target tables (order respects FK constraints)."""
    for table in (
        "procurement_requests",
        "software_licenses",
        "hardware_snapshots",
        "security_statuses",
        "devices",
        "users",
    ):
        await session.execute(text(f"DELETE FROM {table}"))
    await session.commit()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
def _build_users() -> list[User]:
    return [
        User(
            id=uuid.uuid4(),
            email="admin@mirai-kensetsu.co.jp",
            hashed_password=DEFAULT_PASSWORD,
            full_name="Admin User",
            role=UserRole.admin,
            is_active=True,
        ),
        User(
            id=uuid.uuid4(),
            email="operator@mirai-kensetsu.co.jp",
            hashed_password=DEFAULT_PASSWORD,
            full_name="Operator User",
            role=UserRole.operator,
            is_active=True,
        ),
        User(
            id=uuid.uuid4(),
            email="auditor@mirai-kensetsu.co.jp",
            hashed_password=DEFAULT_PASSWORD,
            full_name="Auditor User",
            role=UserRole.auditor,
            is_active=True,
        ),
        User(
            id=uuid.uuid4(),
            email="readonly@mirai-kensetsu.co.jp",
            hashed_password=DEFAULT_PASSWORD,
            full_name="ReadOnly User",
            role=UserRole.readonly,
            is_active=True,
        ),
    ]


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------
def _build_devices() -> list[Device]:
    devices: list[Device] = []
    statuses = [
        DeviceStatus.active,
        DeviceStatus.active,
        DeviceStatus.active,
        DeviceStatus.active,
        DeviceStatus.active,
        DeviceStatus.active,
        DeviceStatus.inactive,
        DeviceStatus.inactive,
        DeviceStatus.maintenance,
        DeviceStatus.decommissioned,
    ]
    for i in range(10):
        devices.append(
            Device(
                id=uuid.uuid4(),
                hostname=f"MIRAI-PC-{i + 1:03d}",
                os_version="Windows 11 Pro 23H2" if i < 7 else "Windows 10 Pro 22H2",
                ip_address=f"192.168.1.{100 + i}",
                mac_address=f"00:1A:2B:3C:4D:{i:02X}",
                domain="mirai-kensetsu.local",
                status=statuses[i],
                last_seen=NOW - timedelta(hours=i * 3),
            )
        )
    return devices


# ---------------------------------------------------------------------------
# Licenses
# ---------------------------------------------------------------------------
def _build_licenses() -> list[SoftwareLicense]:
    return [
        # Normal subscription
        SoftwareLicense(
            id=uuid.uuid4(),
            software_name="Microsoft 365 E3",
            vendor="Microsoft",
            license_type=LicenseType.subscription,
            license_key=None,
            purchased_count=100,
            installed_count=85,
            m365_assigned=85,
            cost_per_unit=Decimal("4500"),
            currency="JPY",
            purchase_date=TODAY - timedelta(days=180),
            expiry_date=TODAY + timedelta(days=185),
            vendor_contract_id="MS-M365-2024-001",
            notes="Annual subscription",
        ),
        # Perpetual with room
        SoftwareLicense(
            id=uuid.uuid4(),
            software_name="Adobe Acrobat Pro DC",
            vendor="Adobe",
            license_type=LicenseType.perpetual,
            license_key="ADBE-XXXX-XXXX-XXXX",
            purchased_count=50,
            installed_count=32,
            m365_assigned=0,
            cost_per_unit=Decimal("68000"),
            currency="JPY",
            purchase_date=TODAY - timedelta(days=365),
            expiry_date=None,
            vendor_contract_id="ADBE-2023-005",
            notes="Perpetual license",
        ),
        # Volume license
        SoftwareLicense(
            id=uuid.uuid4(),
            software_name="AutoCAD 2024",
            vendor="Autodesk",
            license_type=LicenseType.volume,
            license_key=None,
            purchased_count=20,
            installed_count=18,
            m365_assigned=0,
            cost_per_unit=Decimal("250000"),
            currency="JPY",
            purchase_date=TODAY - timedelta(days=90),
            expiry_date=TODAY + timedelta(days=275),
            vendor_contract_id="ADSK-2024-012",
            notes="Volume license agreement",
        ),
        # OVER-ALLOCATED: installed > purchased
        SoftwareLicense(
            id=uuid.uuid4(),
            software_name="Slack Business+",
            vendor="Salesforce",
            license_type=LicenseType.subscription,
            license_key=None,
            purchased_count=30,
            installed_count=35,
            m365_assigned=0,
            cost_per_unit=Decimal("2100"),
            currency="JPY",
            purchase_date=TODAY - timedelta(days=60),
            expiry_date=TODAY + timedelta(days=305),
            vendor_contract_id="SF-SLACK-2024-003",
            notes="ALERT: Over-allocated by 5 seats",
        ),
        # NEAR EXPIRY: expires in 7 days
        SoftwareLicense(
            id=uuid.uuid4(),
            software_name="ESET Endpoint Security",
            vendor="ESET",
            license_type=LicenseType.subscription,
            license_key="ESET-XXXX-XXXX-XXXX",
            purchased_count=200,
            installed_count=180,
            m365_assigned=0,
            cost_per_unit=Decimal("3800"),
            currency="JPY",
            purchase_date=TODAY - timedelta(days=358),
            expiry_date=TODAY + timedelta(days=7),
            vendor_contract_id="ESET-2024-001",
            notes="WARNING: Renewal due in 7 days",
        ),
    ]


# ---------------------------------------------------------------------------
# Procurement requests
# ---------------------------------------------------------------------------
def _build_procurements(
    requester_id: uuid.UUID,
    approver_id: uuid.UUID,
) -> list[ProcurementRequest]:
    return [
        # Draft
        ProcurementRequest(
            id=uuid.uuid4(),
            request_number="PR-2024-001",
            item_name="Dell Latitude 5550 Laptop",
            category=ProcurementCategory.hardware,
            quantity=5,
            unit_price=Decimal("185000"),
            total_price=Decimal("925000"),
            requester_id=requester_id,
            department="Engineering",
            purpose="New hire equipment for Q2 2024 onboarding",
            status=ProcurementStatus.draft,
        ),
        # Submitted
        ProcurementRequest(
            id=uuid.uuid4(),
            request_number="PR-2024-002",
            item_name="Microsoft 365 E3 Licenses (追加10席)",
            category=ProcurementCategory.software,
            quantity=10,
            unit_price=Decimal("4500"),
            total_price=Decimal("45000"),
            requester_id=requester_id,
            department="IT",
            purpose="License expansion for new hires in marketing department",
            status=ProcurementStatus.submitted,
        ),
        # Approved
        ProcurementRequest(
            id=uuid.uuid4(),
            request_number="PR-2024-003",
            item_name="Cisco Catalyst 9200L Switch",
            category=ProcurementCategory.hardware,
            quantity=2,
            unit_price=Decimal("350000"),
            total_price=Decimal("700000"),
            requester_id=requester_id,
            department="Infrastructure",
            purpose="Network upgrade for 3F server room",
            status=ProcurementStatus.approved,
            approver_id=approver_id,
            approved_at=NOW - timedelta(days=2),
        ),
    ]


# ---------------------------------------------------------------------------
# Main seeder
# ---------------------------------------------------------------------------
async def seed() -> None:
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        await _clear_tables(session)

        # Users
        users = _build_users()
        session.add_all(users)
        await session.flush()

        admin_user = users[0]
        operator_user = users[1]

        # Devices
        devices = _build_devices()
        session.add_all(devices)

        # Licenses
        licenses = _build_licenses()
        session.add_all(licenses)

        # Procurements
        procurements = _build_procurements(
            requester_id=operator_user.id,
            approver_id=admin_user.id,
        )
        session.add_all(procurements)

        await session.commit()

    print("--- Seed data created successfully ---")
    print(f"  Users:        {len(users)}")
    print(f"  Devices:      {len(devices)}")
    print(f"  Licenses:     {len(licenses)}")
    print(f"  Procurements: {len(procurements)}")
    print()
    print("  Admin login:  admin@mirai-kensetsu.co.jp / Password123!")


if __name__ == "__main__":
    asyncio.run(seed())
