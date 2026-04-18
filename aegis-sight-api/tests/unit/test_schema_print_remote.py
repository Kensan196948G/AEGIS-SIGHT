"""Unit tests for print_management and remote_work Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import time

import pytest
from pydantic import ValidationError

from app.models.print_management import PrintJobStatus
from app.models.remote_work import VPNProtocol
from app.schemas.print_management import (
    PrinterCreate,
    PrintEvaluateRequest,
    PrintEvaluateResponse,
    PrintJobCreate,
    PrintPolicyCreate,
    PrintPolicyViolation,
)
from app.schemas.remote_work import (
    RemoteAccessPolicyCreate,
    RemoteWorkAnalytics,
    VPNConnectionCreate,
    VPNDisconnectRequest,
)

# ---------------------------------------------------------------------------
# PrinterCreate
# ---------------------------------------------------------------------------


class TestPrinterCreate:
    def test_defaults(self) -> None:
        p = PrinterCreate(
            name="HP LaserJet",
            location="Floor 3",
            model="HP LaserJet 400",
        )
        assert p.is_network is True
        assert p.is_active is True
        assert p.ip_address is None
        assert p.department is None

    def test_name_max_255(self) -> None:
        PrinterCreate(name="x" * 255, location="L", model="M")

    def test_name_over_255_raises(self) -> None:
        with pytest.raises(ValidationError):
            PrinterCreate(name="x" * 256, location="L", model="M")

    def test_with_ip_and_department(self) -> None:
        p = PrinterCreate(
            name="Canon",
            location="IT Room",
            model="Canon MF",
            ip_address="192.168.1.100",
            department="IT",
        )
        assert p.ip_address == "192.168.1.100"
        assert p.department == "IT"


# ---------------------------------------------------------------------------
# PrintJobCreate
# ---------------------------------------------------------------------------


class TestPrintJobCreate:
    def test_defaults(self) -> None:
        j = PrintJobCreate(
            printer_id=uuid.uuid4(),
            user_name="alice",
            document_name="report.pdf",
            pages=10,
            status=PrintJobStatus.completed,
        )
        assert j.copies == 1
        assert j.color is False
        assert j.duplex is False
        assert j.paper_size == "A4"
        assert j.device_id is None

    def test_all_statuses(self) -> None:
        pid = uuid.uuid4()
        for st in PrintJobStatus:
            j = PrintJobCreate(
                printer_id=pid,
                user_name="u",
                document_name="d",
                pages=1,
                status=st,
            )
            assert j.status == st

    def test_pages_ge_1(self) -> None:
        with pytest.raises(ValidationError):
            PrintJobCreate(
                printer_id=uuid.uuid4(),
                user_name="u",
                document_name="d",
                pages=0,
                status=PrintJobStatus.completed,
            )

    def test_copies_ge_1(self) -> None:
        with pytest.raises(ValidationError):
            PrintJobCreate(
                printer_id=uuid.uuid4(),
                user_name="u",
                document_name="d",
                pages=5,
                copies=0,
                status=PrintJobStatus.completed,
            )


# ---------------------------------------------------------------------------
# PrintPolicyCreate
# ---------------------------------------------------------------------------


class TestPrintPolicyCreate:
    def test_defaults(self) -> None:
        p = PrintPolicyCreate(name="Default Policy")
        assert p.allow_color is True
        assert p.allow_duplex_only is False
        assert p.is_enabled is True
        assert p.max_pages_per_day is None
        assert p.target_departments is None

    def test_max_pages_constraints(self) -> None:
        p = PrintPolicyCreate(name="Limited", max_pages_per_day=50, max_pages_per_month=500)
        assert p.max_pages_per_day == 50

    def test_max_pages_per_day_zero_raises(self) -> None:
        with pytest.raises(ValidationError):
            PrintPolicyCreate(name="P", max_pages_per_day=0)

    def test_with_departments(self) -> None:
        p = PrintPolicyCreate(name="Dept Policy", target_departments=["IT", "Finance"])
        assert len(p.target_departments) == 2


# ---------------------------------------------------------------------------
# PrintEvaluateRequest
# ---------------------------------------------------------------------------


class TestPrintEvaluateRequest:
    def test_defaults(self) -> None:
        r = PrintEvaluateRequest(user_name="bob", pages=5)
        assert r.copies == 1
        assert r.color is False
        assert r.duplex is False
        assert r.department is None

    def test_pages_ge_1(self) -> None:
        with pytest.raises(ValidationError):
            PrintEvaluateRequest(user_name="u", pages=0)


# ---------------------------------------------------------------------------
# PrintEvaluateResponse / PrintPolicyViolation
# ---------------------------------------------------------------------------


class TestPrintEvaluateResponse:
    def test_allowed(self) -> None:
        r = PrintEvaluateResponse(allowed=True, violations=[])
        assert r.allowed is True

    def test_with_violations(self) -> None:
        v = PrintPolicyViolation(
            policy_id=uuid.uuid4(),
            policy_name="Color Policy",
            reason="Color printing not allowed",
        )
        r = PrintEvaluateResponse(allowed=False, violations=[v])
        assert len(r.violations) == 1
        assert r.violations[0].reason == "Color printing not allowed"


# ---------------------------------------------------------------------------
# VPNConnectionCreate
# ---------------------------------------------------------------------------


class TestVPNConnectionCreate:
    def test_basic_construction(self) -> None:
        c = VPNConnectionCreate(
            user_name="alice",
            vpn_server="vpn.example.com",
            client_ip="203.0.113.1",
            assigned_ip="10.8.0.2",
            protocol=VPNProtocol.wireguard,
        )
        assert c.protocol == VPNProtocol.wireguard
        assert c.device_id is None

    def test_all_protocols(self) -> None:
        for proto in VPNProtocol:
            c = VPNConnectionCreate(
                user_name="u",
                vpn_server="s",
                client_ip="1.2.3.4",
                assigned_ip="10.0.0.1",
                protocol=proto,
            )
            assert c.protocol == proto


# ---------------------------------------------------------------------------
# VPNDisconnectRequest
# ---------------------------------------------------------------------------


class TestVPNDisconnectRequest:
    def test_all_optional(self) -> None:
        r = VPNDisconnectRequest()
        assert r.bytes_sent is None
        assert r.bytes_received is None

    def test_with_values(self) -> None:
        r = VPNDisconnectRequest(bytes_sent=1024, bytes_received=2048)
        assert r.bytes_sent == 1024


# ---------------------------------------------------------------------------
# RemoteAccessPolicyCreate
# ---------------------------------------------------------------------------


class TestRemoteAccessPolicyCreate:
    def test_defaults(self) -> None:
        p = RemoteAccessPolicyCreate(
            name="Remote Policy",
            allowed_hours_start=time(9, 0),
            allowed_hours_end=time(18, 0),
            allowed_days=["monday", "tuesday", "wednesday"],
            max_session_hours=8,
        )
        assert p.require_mfa is True
        assert p.is_enabled is True
        assert p.geo_restriction is None

    def test_max_session_hours_range(self) -> None:
        RemoteAccessPolicyCreate(
            name="P",
            allowed_hours_start=time(0, 0),
            allowed_hours_end=time(23, 59),
            allowed_days=["monday"],
            max_session_hours=24,
        )

    def test_max_session_hours_zero_raises(self) -> None:
        with pytest.raises(ValidationError):
            RemoteAccessPolicyCreate(
                name="P",
                allowed_hours_start=time(9, 0),
                allowed_hours_end=time(18, 0),
                allowed_days=["monday"],
                max_session_hours=0,
            )

    def test_max_session_hours_over_24_raises(self) -> None:
        with pytest.raises(ValidationError):
            RemoteAccessPolicyCreate(
                name="P",
                allowed_hours_start=time(9, 0),
                allowed_hours_end=time(18, 0),
                allowed_days=["monday"],
                max_session_hours=25,
            )


# ---------------------------------------------------------------------------
# RemoteWorkAnalytics
# ---------------------------------------------------------------------------


class TestRemoteWorkAnalytics:
    def test_construction(self) -> None:
        r = RemoteWorkAnalytics(
            total_connections=100,
            active_connections=10,
            by_protocol={"wireguard": 50, "ssl": 50},
            total_bytes_sent=1000000,
            total_bytes_received=2000000,
            peak_hours=[],
            utilization_rate=0.1,
            top_users=[],
        )
        assert r.active_connections == 10
        assert r.utilization_rate == 0.1
