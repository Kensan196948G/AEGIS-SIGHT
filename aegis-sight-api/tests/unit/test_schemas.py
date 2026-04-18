"""Unit tests for app/schemas/ Pydantic models.

Covers validation, defaults, enum fields, and from_attributes config.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

# ---------------------------------------------------------------------------
# Device schemas
# ---------------------------------------------------------------------------
from app.schemas.device import DeviceCreate, DeviceResponse, DeviceUpdate
from app.models.device import DeviceStatus

# ---------------------------------------------------------------------------
# Alert schemas
# ---------------------------------------------------------------------------
from app.schemas.alert import AlertAcknowledge, AlertCreate, AlertResponse, AlertStats
from app.models.alert import AlertCategory, AlertSeverity

# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------
from app.schemas.user import Token, TokenData, UserCreate, UserSettings, UserSettingsUpdate, UserUpdate

# ---------------------------------------------------------------------------
# Procurement schemas
# ---------------------------------------------------------------------------
from app.schemas.procurement import ProcurementCreate, ProcurementResponse, ProcurementUpdate
from app.models.procurement import ProcurementCategory, ProcurementStatus

# ---------------------------------------------------------------------------
# License schemas
# ---------------------------------------------------------------------------
from app.schemas.license import (
    ComplianceCheckResponse,
    ExpiringLicenseResponse,
    LicenseCreate,
    LicenseResponse,
    LicenseUpdate,
)
from app.models.license import LicenseType

# ---------------------------------------------------------------------------
# Department schemas
# ---------------------------------------------------------------------------
from app.schemas.department import (
    DepartmentCostResponse,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentTreeResponse,
    DepartmentUpdate,
)

# ---------------------------------------------------------------------------
# Audit log schemas
# ---------------------------------------------------------------------------
from app.schemas.audit_log import AuditLogFilter, AuditLogResponse
from app.models.audit_log import AuditAction

# ---------------------------------------------------------------------------
# Software inventory schemas
# ---------------------------------------------------------------------------
from app.schemas.software_inventory import SoftwareAggregation, SoftwareInventoryResponse


# ===========================================================================
# DeviceCreate
# ===========================================================================
class TestDeviceCreate:
    def test_requires_hostname(self) -> None:
        with pytest.raises(ValidationError):
            DeviceCreate()  # type: ignore[call-arg]

    def test_valid_minimal(self) -> None:
        d = DeviceCreate(hostname="PC-001")
        assert d.hostname == "PC-001"

    def test_default_status_is_active(self) -> None:
        d = DeviceCreate(hostname="PC-001")
        assert d.status == DeviceStatus.active

    def test_optional_fields_default_none(self) -> None:
        d = DeviceCreate(hostname="PC-001")
        assert d.os_version is None
        assert d.ip_address is None
        assert d.mac_address is None
        assert d.domain is None

    def test_explicit_status(self) -> None:
        d = DeviceCreate(hostname="PC-001", status=DeviceStatus.inactive)
        assert d.status == DeviceStatus.inactive

    def test_full_fields(self) -> None:
        d = DeviceCreate(
            hostname="PC-001",
            os_version="Windows 11",
            ip_address="192.168.1.1",
            mac_address="AA:BB:CC:DD:EE:FF",
            domain="corp.example.com",
            status=DeviceStatus.maintenance,
        )
        assert d.domain == "corp.example.com"


# ===========================================================================
# DeviceUpdate
# ===========================================================================
class TestDeviceUpdate:
    def test_all_fields_optional(self) -> None:
        d = DeviceUpdate()
        assert d.hostname is None
        assert d.status is None

    def test_partial_update(self) -> None:
        d = DeviceUpdate(hostname="PC-NEW")
        assert d.hostname == "PC-NEW"
        assert d.ip_address is None


# ===========================================================================
# DeviceResponse
# ===========================================================================
class TestDeviceResponse:
    def test_from_attributes_config(self) -> None:
        assert DeviceResponse.model_config.get("from_attributes") is True

    def test_valid_construction(self) -> None:
        now = datetime.utcnow()
        dr = DeviceResponse(
            id=uuid.uuid4(),
            hostname="PC-001",
            status=DeviceStatus.active,
            created_at=now,
        )
        assert dr.hostname == "PC-001"
        assert dr.os_version is None


# ===========================================================================
# AlertCreate
# ===========================================================================
class TestAlertCreate:
    def test_requires_severity(self) -> None:
        with pytest.raises(ValidationError):
            AlertCreate(category=AlertCategory.security, title="t", message="m")  # type: ignore[call-arg]

    def test_requires_category(self) -> None:
        with pytest.raises(ValidationError):
            AlertCreate(severity=AlertSeverity.critical, title="t", message="m")  # type: ignore[call-arg]

    def test_requires_title(self) -> None:
        with pytest.raises(ValidationError):
            AlertCreate(severity=AlertSeverity.critical, category=AlertCategory.security, message="m")  # type: ignore[call-arg]

    def test_requires_message(self) -> None:
        with pytest.raises(ValidationError):
            AlertCreate(severity=AlertSeverity.critical, category=AlertCategory.security, title="t")  # type: ignore[call-arg]

    def test_valid_minimal(self) -> None:
        a = AlertCreate(
            severity=AlertSeverity.warning,
            category=AlertCategory.license,
            title="License expiring",
            message="License expires in 7 days",
        )
        assert a.device_id is None
        assert a.severity == AlertSeverity.warning

    def test_with_device_id(self) -> None:
        dev_id = uuid.uuid4()
        a = AlertCreate(
            device_id=dev_id,
            severity=AlertSeverity.critical,
            category=AlertCategory.hardware,
            title="Disk failure",
            message="SMART error detected",
        )
        assert a.device_id == dev_id


# ===========================================================================
# AlertStats
# ===========================================================================
class TestAlertStats:
    def test_valid_stats(self) -> None:
        s = AlertStats(
            total=10, critical=2, warning=3, info=5,
            unacknowledged=4, unresolved=6,
        )
        assert s.total == 10
        assert s.critical == 2

    def test_zero_stats(self) -> None:
        s = AlertStats(total=0, critical=0, warning=0, info=0, unacknowledged=0, unresolved=0)
        assert s.total == 0

    def test_requires_all_fields(self) -> None:
        with pytest.raises(ValidationError):
            AlertStats(total=1, critical=0)  # type: ignore[call-arg]


# ===========================================================================
# AlertResponse
# ===========================================================================
class TestAlertResponse:
    def test_from_attributes_config(self) -> None:
        assert AlertResponse.model_config.get("from_attributes") is True

    def test_valid_construction(self) -> None:
        now = datetime.utcnow()
        ar = AlertResponse(
            id=uuid.uuid4(),
            device_id=None,
            severity=AlertSeverity.info,
            category=AlertCategory.network,
            title="Test alert",
            message="Test message",
            is_acknowledged=False,
            acknowledged_by=None,
            acknowledged_at=None,
            resolved_at=None,
            created_at=now,
        )
        assert ar.is_acknowledged is False


# ===========================================================================
# Token / TokenData
# ===========================================================================
class TestToken:
    def test_default_token_type(self) -> None:
        t = Token(access_token="abc123")
        assert t.token_type == "bearer"

    def test_custom_token_type(self) -> None:
        t = Token(access_token="abc123", token_type="jwt")
        assert t.token_type == "jwt"

    def test_requires_access_token(self) -> None:
        with pytest.raises(ValidationError):
            Token()  # type: ignore[call-arg]


class TestTokenData:
    def test_default_sub_is_none(self) -> None:
        td = TokenData()
        assert td.sub is None

    def test_with_sub(self) -> None:
        td = TokenData(sub="user-uuid-123")
        assert td.sub == "user-uuid-123"


# ===========================================================================
# UserCreate
# ===========================================================================
class TestUserCreate:
    def test_valid_user(self) -> None:
        u = UserCreate(email="test@example.com", password="secret", full_name="Test User")
        assert u.email == "test@example.com"

    def test_default_role_is_readonly(self) -> None:
        u = UserCreate(email="test@example.com", password="secret", full_name="Test User")
        from app.models.user import UserRole
        assert u.role == UserRole.readonly

    def test_invalid_email_raises(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="not-an-email", password="secret", full_name="Test")

    def test_requires_password(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", full_name="Test")  # type: ignore[call-arg]

    def test_requires_full_name(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", password="secret")  # type: ignore[call-arg]


# ===========================================================================
# UserSettings
# ===========================================================================
class TestUserSettings:
    def test_defaults(self) -> None:
        s = UserSettings()
        assert s.email_notifications is True
        assert s.alert_severity_filter == "all"
        assert s.language == "ja"
        assert s.theme == "system"

    def test_custom_values(self) -> None:
        s = UserSettings(language="en", theme="dark")
        assert s.language == "en"
        assert s.theme == "dark"


class TestUserSettingsUpdate:
    def test_all_optional(self) -> None:
        s = UserSettingsUpdate()
        assert s.email_notifications is None
        assert s.language is None


# ===========================================================================
# UserUpdate
# ===========================================================================
class TestUserUpdate:
    def test_all_optional(self) -> None:
        u = UserUpdate()
        assert u.full_name is None
        assert u.role is None
        assert u.is_active is None


# ===========================================================================
# ProcurementCreate
# ===========================================================================
class TestProcurementCreate:
    def test_valid_minimal(self) -> None:
        p = ProcurementCreate(
            item_name="Laptop",
            category=ProcurementCategory.hardware,
            department="IT",
            purpose="Development",
        )
        assert p.quantity == 1
        assert p.unit_price == Decimal("0")

    def test_requires_item_name(self) -> None:
        with pytest.raises(ValidationError):
            ProcurementCreate(category=ProcurementCategory.hardware, department="IT", purpose="Dev")  # type: ignore[call-arg]

    def test_requires_category(self) -> None:
        with pytest.raises(ValidationError):
            ProcurementCreate(item_name="Laptop", department="IT", purpose="Dev")  # type: ignore[call-arg]

    def test_requires_department(self) -> None:
        with pytest.raises(ValidationError):
            ProcurementCreate(item_name="Laptop", category=ProcurementCategory.hardware, purpose="Dev")  # type: ignore[call-arg]

    def test_requires_purpose(self) -> None:
        with pytest.raises(ValidationError):
            ProcurementCreate(item_name="Laptop", category=ProcurementCategory.hardware, department="IT")  # type: ignore[call-arg]

    def test_custom_unit_price(self) -> None:
        p = ProcurementCreate(
            item_name="Monitor",
            category=ProcurementCategory.hardware,
            department="IT",
            purpose="Office",
            unit_price=Decimal("49999.99"),
        )
        assert p.unit_price == Decimal("49999.99")


# ===========================================================================
# ProcurementUpdate
# ===========================================================================
class TestProcurementUpdate:
    def test_all_optional(self) -> None:
        p = ProcurementUpdate()
        assert p.item_name is None
        assert p.category is None
        assert p.quantity is None


# ===========================================================================
# ProcurementResponse
# ===========================================================================
class TestProcurementResponse:
    def test_from_attributes_config(self) -> None:
        assert ProcurementResponse.model_config.get("from_attributes") is True


# ===========================================================================
# LicenseCreate
# ===========================================================================
class TestLicenseCreate:
    def test_valid_minimal(self) -> None:
        lc = LicenseCreate(
            software_name="Microsoft 365",
            vendor="Microsoft",
            license_type=LicenseType.subscription,
        )
        assert lc.purchased_count == 0
        assert lc.installed_count == 0
        assert lc.currency == "JPY"

    def test_requires_software_name(self) -> None:
        with pytest.raises(ValidationError):
            LicenseCreate(vendor="MS", license_type=LicenseType.subscription)  # type: ignore[call-arg]

    def test_requires_vendor(self) -> None:
        with pytest.raises(ValidationError):
            LicenseCreate(software_name="MS365", license_type=LicenseType.subscription)  # type: ignore[call-arg]

    def test_requires_license_type(self) -> None:
        with pytest.raises(ValidationError):
            LicenseCreate(software_name="MS365", vendor="Microsoft")  # type: ignore[call-arg]

    def test_defaults_none_fields(self) -> None:
        lc = LicenseCreate(
            software_name="Tool",
            vendor="Vendor",
            license_type=LicenseType.freeware,
        )
        assert lc.license_key is None
        assert lc.cost_per_unit is None
        assert lc.purchase_date is None
        assert lc.expiry_date is None
        assert lc.notes is None


# ===========================================================================
# LicenseUpdate
# ===========================================================================
class TestLicenseUpdate:
    def test_all_optional(self) -> None:
        lu = LicenseUpdate()
        assert lu.software_name is None
        assert lu.license_type is None


# ===========================================================================
# ComplianceCheckResponse
# ===========================================================================
class TestComplianceCheckResponse:
    def test_valid(self) -> None:
        ccr = ComplianceCheckResponse(
            license_id=uuid.uuid4(),
            software_name="App",
            purchased_count=10,
            installed_count=8,
            m365_assigned=2,
            total_used=10,
            is_compliant=True,
            over_deployed=0,
        )
        assert ccr.is_compliant is True
        assert ccr.over_deployed == 0

    def test_over_deployed(self) -> None:
        ccr = ComplianceCheckResponse(
            license_id=uuid.uuid4(),
            software_name="App",
            purchased_count=5,
            installed_count=7,
            m365_assigned=0,
            total_used=7,
            is_compliant=False,
            over_deployed=2,
        )
        assert ccr.is_compliant is False
        assert ccr.over_deployed == 2


# ===========================================================================
# DepartmentCreate
# ===========================================================================
class TestDepartmentCreate:
    def test_valid_minimal(self) -> None:
        d = DepartmentCreate(name="IT Department", code="IT")
        assert d.parent_id is None
        assert d.budget_yearly is None

    def test_name_too_short_raises(self) -> None:
        with pytest.raises(ValidationError):
            DepartmentCreate(name="", code="IT")

    def test_code_too_short_raises(self) -> None:
        with pytest.raises(ValidationError):
            DepartmentCreate(name="IT Department", code="")

    def test_name_max_length_exceeded(self) -> None:
        with pytest.raises(ValidationError):
            DepartmentCreate(name="A" * 256, code="IT")

    def test_code_max_length_exceeded(self) -> None:
        with pytest.raises(ValidationError):
            DepartmentCreate(name="IT Department", code="X" * 51)

    def test_with_all_fields(self) -> None:
        d = DepartmentCreate(
            name="Engineering",
            code="ENG",
            manager_name="John Doe",
            budget_yearly=Decimal("5000000"),
            description="Engineering team",
        )
        assert d.manager_name == "John Doe"
        assert d.budget_yearly == Decimal("5000000")


# ===========================================================================
# DepartmentUpdate
# ===========================================================================
class TestDepartmentUpdate:
    def test_all_optional(self) -> None:
        d = DepartmentUpdate()
        assert d.name is None
        assert d.code is None

    def test_name_too_short_raises(self) -> None:
        with pytest.raises(ValidationError):
            DepartmentUpdate(name="")


# ===========================================================================
# DepartmentTreeResponse
# ===========================================================================
class TestDepartmentTreeResponse:
    def test_defaults(self) -> None:
        now = datetime.utcnow()
        dt = DepartmentTreeResponse(
            id=uuid.uuid4(),
            name="Root",
            code="ROOT",
            created_at=now,
            updated_at=now,
        )
        assert dt.children == []
        assert dt.device_count == 0

    def test_from_attributes_config(self) -> None:
        assert DepartmentResponse.model_config.get("from_attributes") is True


# ===========================================================================
# DepartmentCostResponse
# ===========================================================================
class TestDepartmentCostResponse:
    def test_defaults(self) -> None:
        dcr = DepartmentCostResponse(
            department_id=uuid.uuid4(),
            department_name="IT",
            department_code="IT",
        )
        assert dcr.device_count == 0
        assert dcr.license_cost_total == Decimal("0")
        assert dcr.procurement_cost_total == Decimal("0")
        assert dcr.total_cost == Decimal("0")


# ===========================================================================
# AuditLogFilter
# ===========================================================================
class TestAuditLogFilter:
    def test_all_optional(self) -> None:
        f = AuditLogFilter()
        assert f.action is None
        assert f.user_id is None
        assert f.resource_type is None
        assert f.date_from is None
        assert f.date_to is None

    def test_with_action(self) -> None:
        f = AuditLogFilter(action=AuditAction.login)
        assert f.action == AuditAction.login


# ===========================================================================
# AuditLogResponse
# ===========================================================================
class TestAuditLogResponse:
    def test_from_attributes_config(self) -> None:
        assert AuditLogResponse.model_config.get("from_attributes") is True

    def test_valid_construction(self) -> None:
        now = datetime.utcnow()
        alr = AuditLogResponse(
            id=uuid.uuid4(),
            action=AuditAction.create,
            resource_type="device",
            created_at=now,
        )
        assert alr.user_id is None
        assert alr.detail is None
        assert alr.ip_address is None


# ===========================================================================
# SoftwareAggregation
# ===========================================================================
class TestSoftwareAggregation:
    def test_valid(self) -> None:
        sa = SoftwareAggregation(software_name="Google Chrome", installed_count=42)
        assert sa.installed_count == 42
        assert sa.publisher is None

    def test_with_publisher(self) -> None:
        sa = SoftwareAggregation(software_name="Chrome", publisher="Google", installed_count=10)
        assert sa.publisher == "Google"

    def test_requires_software_name(self) -> None:
        with pytest.raises(ValidationError):
            SoftwareAggregation(installed_count=5)  # type: ignore[call-arg]

    def test_requires_installed_count(self) -> None:
        with pytest.raises(ValidationError):
            SoftwareAggregation(software_name="Chrome")  # type: ignore[call-arg]


# ===========================================================================
# SoftwareInventoryResponse
# ===========================================================================
class TestSoftwareInventoryResponse:
    def test_from_attributes_config(self) -> None:
        assert SoftwareInventoryResponse.model_config.get("from_attributes") is True

    def test_valid_construction(self) -> None:
        now = datetime.utcnow()
        sir = SoftwareInventoryResponse(
            id=1,
            device_id=uuid.uuid4(),
            software_name="Firefox",
            detected_at=now,
        )
        assert sir.version is None
        assert sir.publisher is None
        assert sir.install_date is None

    def test_with_all_fields(self) -> None:
        now = datetime.utcnow()
        sir = SoftwareInventoryResponse(
            id=99,
            device_id=uuid.uuid4(),
            software_name="VSCode",
            version="1.85.0",
            publisher="Microsoft",
            install_date=date(2024, 1, 15),
            detected_at=now,
        )
        assert sir.version == "1.85.0"
        assert sir.install_date == date(2024, 1, 15)
