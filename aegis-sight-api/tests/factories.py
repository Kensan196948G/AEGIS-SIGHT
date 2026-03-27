"""
Test data factories using factory_boy + Faker.

Usage in tests:
    user = UserFactory()               # transient (not persisted)
    user = UserFactory(role=UserRole.auditor)
    device = DeviceFactory(status=DeviceStatus.maintenance)
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import factory
from faker import Faker

from app.core.security import get_password_hash
from app.models.device import Device, DeviceStatus
from app.models.license import LicenseType, SoftwareLicense
from app.models.procurement import (
    ProcurementCategory,
    ProcurementRequest,
    ProcurementStatus,
)
from app.models.user import User, UserRole

fake = Faker("ja_JP")

# ---------------------------------------------------------------------------
# We use factory.Factory (not DjangoModelFactory / SQLAlchemyModelFactory)
# so factories produce plain model instances without requiring a live session.
# The test fixture is responsible for ``session.add()`` + ``session.flush()``.
# ---------------------------------------------------------------------------


class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid.uuid4)
    email = factory.LazyAttribute(
        lambda o: f"test-{uuid.uuid4().hex[:8]}@aegis-sight.local"
    )
    hashed_password = factory.LazyFunction(lambda: get_password_hash("testpass123"))
    full_name = factory.LazyFunction(fake.name)
    role = UserRole.readonly
    is_active = True


class DeviceFactory(factory.Factory):
    class Meta:
        model = Device

    id = factory.LazyFunction(uuid.uuid4)
    hostname = factory.Sequence(lambda n: f"TEST-PC-{n:04d}")
    os_version = "Windows 11 Pro 23H2"
    ip_address = factory.LazyFunction(
        lambda: f"10.0.{fake.random_int(0, 255)}.{fake.random_int(1, 254)}"
    )
    mac_address = factory.LazyFunction(
        lambda: ":".join(f"{fake.random_int(0, 255):02X}" for _ in range(6))
    )
    domain = "test.local"
    status = DeviceStatus.active
    last_seen = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class LicenseFactory(factory.Factory):
    class Meta:
        model = SoftwareLicense

    id = factory.LazyFunction(uuid.uuid4)
    software_name = factory.LazyFunction(
        lambda: fake.random_element(
            [
                "Microsoft 365 E3",
                "Adobe Creative Cloud",
                "AutoCAD 2024",
                "Slack Business+",
                "Zoom Enterprise",
            ]
        )
    )
    vendor = factory.LazyFunction(
        lambda: fake.random_element(
            ["Microsoft", "Adobe", "Autodesk", "Salesforce", "Zoom"]
        )
    )
    license_type = LicenseType.subscription
    license_key = factory.LazyFunction(lambda: f"LIC-{uuid.uuid4().hex[:16].upper()}")
    purchased_count = factory.LazyFunction(lambda: fake.random_int(10, 200))
    installed_count = factory.LazyAttribute(
        lambda o: fake.random_int(0, o.purchased_count)
    )
    m365_assigned = 0
    cost_per_unit = factory.LazyFunction(
        lambda: Decimal(str(fake.random_int(1000, 50000)))
    )
    currency = "JPY"
    purchase_date = factory.LazyFunction(
        lambda: date.today() - timedelta(days=fake.random_int(30, 365))
    )
    expiry_date = factory.LazyFunction(
        lambda: date.today() + timedelta(days=fake.random_int(30, 365))
    )
    vendor_contract_id = factory.LazyFunction(
        lambda: f"VC-{uuid.uuid4().hex[:8].upper()}"
    )
    notes = None


class ProcurementFactory(factory.Factory):
    class Meta:
        model = ProcurementRequest

    id = factory.LazyFunction(uuid.uuid4)
    request_number = factory.Sequence(lambda n: f"PR-TEST-{n:04d}")
    item_name = factory.LazyFunction(
        lambda: fake.random_element(
            [
                "Dell Latitude 5550",
                "HP EliteBook 860",
                "Microsoft Surface Pro",
                "Cisco Switch",
                "Server Rack Unit",
            ]
        )
    )
    category = ProcurementCategory.hardware
    quantity = factory.LazyFunction(lambda: fake.random_int(1, 20))
    unit_price = factory.LazyFunction(
        lambda: Decimal(str(fake.random_int(10000, 500000)))
    )
    total_price = factory.LazyAttribute(
        lambda o: o.unit_price * o.quantity
    )
    requester_id = factory.LazyFunction(uuid.uuid4)
    department = factory.LazyFunction(
        lambda: fake.random_element(
            ["Engineering", "IT", "Marketing", "Sales", "HR"]
        )
    )
    purpose = factory.LazyFunction(fake.sentence)
    status = ProcurementStatus.draft
    approver_id = None
    approved_at = None
