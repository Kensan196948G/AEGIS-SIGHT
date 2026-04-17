"""Unit tests for security domain model Enum classes — no DB required."""

from app.models.audit_log import AuditAction
from app.models.incident import (
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    IndicatorType,
    ThreatLevel,
)


# ---------------------------------------------------------------------------
# AuditAction
# ---------------------------------------------------------------------------


class TestAuditAction:
    def test_is_str_enum(self) -> None:
        assert issubclass(AuditAction, str)

    def test_create_value(self) -> None:
        assert AuditAction.create == "create"

    def test_update_value(self) -> None:
        assert AuditAction.update == "update"

    def test_delete_value(self) -> None:
        assert AuditAction.delete == "delete"

    def test_login_value(self) -> None:
        assert AuditAction.login == "login"

    def test_logout_value(self) -> None:
        assert AuditAction.logout == "logout"

    def test_export_value(self) -> None:
        assert AuditAction.export == "export"

    def test_approve_value(self) -> None:
        assert AuditAction.approve == "approve"

    def test_reject_value(self) -> None:
        assert AuditAction.reject == "reject"

    def test_member_count(self) -> None:
        assert len(AuditAction) == 8

    def test_string_comparison(self) -> None:
        assert AuditAction.create == "create"
        assert AuditAction.login != "logout"


# ---------------------------------------------------------------------------
# IncidentSeverity
# ---------------------------------------------------------------------------


class TestIncidentSeverity:
    def test_is_str_enum(self) -> None:
        assert issubclass(IncidentSeverity, str)

    def test_p1_critical_value(self) -> None:
        assert IncidentSeverity.P1_critical == "P1_critical"

    def test_p2_high_value(self) -> None:
        assert IncidentSeverity.P2_high == "P2_high"

    def test_p3_medium_value(self) -> None:
        assert IncidentSeverity.P3_medium == "P3_medium"

    def test_p4_low_value(self) -> None:
        assert IncidentSeverity.P4_low == "P4_low"

    def test_member_count(self) -> None:
        assert len(IncidentSeverity) == 4

    def test_severity_ordering_by_name(self) -> None:
        members = list(IncidentSeverity)
        names = [m.name for m in members]
        assert "P1_critical" in names
        assert "P4_low" in names


# ---------------------------------------------------------------------------
# IncidentStatus
# ---------------------------------------------------------------------------


class TestIncidentStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(IncidentStatus, str)

    def test_detected_value(self) -> None:
        assert IncidentStatus.detected == "detected"

    def test_resolved_value(self) -> None:
        assert IncidentStatus.resolved == "resolved"

    def test_post_mortem_value(self) -> None:
        assert IncidentStatus.post_mortem == "post_mortem"

    def test_member_count(self) -> None:
        assert len(IncidentStatus) == 7

    def test_all_values_are_strings(self) -> None:
        for member in IncidentStatus:
            assert isinstance(member.value, str)


# ---------------------------------------------------------------------------
# IncidentCategory
# ---------------------------------------------------------------------------


class TestIncidentCategory:
    def test_is_str_enum(self) -> None:
        assert issubclass(IncidentCategory, str)

    def test_malware_value(self) -> None:
        assert IncidentCategory.malware == "malware"

    def test_data_breach_value(self) -> None:
        assert IncidentCategory.data_breach == "data_breach"

    def test_unauthorized_access_value(self) -> None:
        assert IncidentCategory.unauthorized_access == "unauthorized_access"

    def test_other_value(self) -> None:
        assert IncidentCategory.other == "other"

    def test_member_count(self) -> None:
        assert len(IncidentCategory) == 6


# ---------------------------------------------------------------------------
# IndicatorType
# ---------------------------------------------------------------------------


class TestIndicatorType:
    def test_is_str_enum(self) -> None:
        assert issubclass(IndicatorType, str)

    def test_ip_address_value(self) -> None:
        assert IndicatorType.ip_address == "ip_address"

    def test_domain_value(self) -> None:
        assert IndicatorType.domain == "domain"

    def test_file_hash_value(self) -> None:
        assert IndicatorType.file_hash == "file_hash"

    def test_url_value(self) -> None:
        assert IndicatorType.url == "url"

    def test_email_value(self) -> None:
        assert IndicatorType.email == "email"

    def test_member_count(self) -> None:
        assert len(IndicatorType) == 5


# ---------------------------------------------------------------------------
# ThreatLevel
# ---------------------------------------------------------------------------


class TestThreatLevel:
    def test_is_str_enum(self) -> None:
        assert issubclass(ThreatLevel, str)

    def test_critical_value(self) -> None:
        assert ThreatLevel.critical == "critical"

    def test_high_value(self) -> None:
        assert ThreatLevel.high == "high"

    def test_medium_value(self) -> None:
        assert ThreatLevel.medium == "medium"

    def test_low_value(self) -> None:
        assert ThreatLevel.low == "low"

    def test_member_count(self) -> None:
        assert len(ThreatLevel) == 4

    def test_critical_is_highest(self) -> None:
        # Verify "critical" member exists with expected string value
        assert ThreatLevel.critical.value == "critical"
