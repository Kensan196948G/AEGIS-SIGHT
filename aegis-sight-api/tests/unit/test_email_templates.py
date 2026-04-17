"""Unit tests for EmailTemplateService — no DB, no network required."""

from __future__ import annotations

import pytest

from app.services.email_templates import EmailTemplateService, RenderedEmail

# ---------------------------------------------------------------------------
# RenderedEmail dataclass
# ---------------------------------------------------------------------------

class TestRenderedEmail:
    def test_fields_stored(self):
        email = RenderedEmail(subject="s", html="<h>", text="t")
        assert email.subject == "s"
        assert email.html == "<h>"
        assert email.text == "t"

    def test_equality(self):
        a = RenderedEmail(subject="x", html="y", text="z")
        b = RenderedEmail(subject="x", html="y", text="z")
        assert a == b


# ---------------------------------------------------------------------------
# _render  (variable substitution)
# ---------------------------------------------------------------------------

class TestRenderHelper:
    def test_replaces_variable(self):
        result = EmailTemplateService._render("Hello {{ name }}", {"name": "Alice"})
        assert result == "Hello Alice"

    def test_replaces_multiple_variables(self):
        result = EmailTemplateService._render(
            "{{ a }} and {{ b }}", {"a": "foo", "b": "bar"}
        )
        assert result == "foo and bar"

    def test_unknown_variable_kept_as_placeholder(self):
        result = EmailTemplateService._render("{{ missing }}", {})
        assert result == "{{ missing }}"

    def test_integer_value_converted_to_str(self):
        result = EmailTemplateService._render("count={{ n }}", {"n": 42})
        assert result == "count=42"

    def test_spaces_around_key_handled(self):
        result = EmailTemplateService._render("{{  spaced  }}", {"spaced": "yes"})
        assert result == "yes"

    def test_no_placeholders_unchanged(self):
        result = EmailTemplateService._render("no placeholders", {"a": "b"})
        assert result == "no placeholders"

    def test_empty_template(self):
        result = EmailTemplateService._render("", {"a": "b"})
        assert result == ""


# ---------------------------------------------------------------------------
# _wrap_html
# ---------------------------------------------------------------------------

class TestWrapHtml:
    def test_contains_doctype(self):
        html = EmailTemplateService._wrap_html("Title", "<p>body</p>")
        assert "<!DOCTYPE html>" in html

    def test_contains_body_content(self):
        html = EmailTemplateService._wrap_html("My Title", "<p>TEST</p>")
        assert "<p>TEST</p>" in html

    def test_contains_aegis_sight_branding(self):
        html = EmailTemplateService._wrap_html("T", "B")
        assert "AEGIS-SIGHT" in html

    def test_title_in_head(self):
        html = EmailTemplateService._wrap_html("My Subject", "body")
        assert "My Subject" in html


# ---------------------------------------------------------------------------
# license_violation
# ---------------------------------------------------------------------------

_LV_VARS = {
    "software_name": "AutoCAD",
    "purchased_count": 10,
    "used_count": 15,
    "over_deployed": 5,
    "detected_at": "2026-04-17 12:00",
}


class TestLicenseViolation:
    def test_returns_rendered_email(self):
        result = EmailTemplateService.license_violation(_LV_VARS.copy())
        assert isinstance(result, RenderedEmail)

    def test_subject_contains_software_name(self):
        result = EmailTemplateService.license_violation(_LV_VARS.copy())
        assert "AutoCAD" in result.subject

    def test_subject_prefix(self):
        result = EmailTemplateService.license_violation(_LV_VARS.copy())
        assert result.subject.startswith("[AEGIS-SIGHT]")

    def test_html_contains_over_deployed_value(self):
        result = EmailTemplateService.license_violation(_LV_VARS.copy())
        assert "5" in result.html

    def test_text_contains_all_fields(self):
        result = EmailTemplateService.license_violation(_LV_VARS.copy())
        assert "AutoCAD" in result.text
        assert "10" in result.text
        assert "15" in result.text
        assert "5" in result.text

    def test_html_is_valid_structure(self):
        result = EmailTemplateService.license_violation(_LV_VARS.copy())
        assert "<!DOCTYPE html>" in result.html
        assert "</html>" in result.html


# ---------------------------------------------------------------------------
# license_expiry
# ---------------------------------------------------------------------------

_LE_VARS = {
    "software_name": "Office365",
    "expiry_date": "2026-05-01",
    "days_remaining": 14,
    "license_count": 50,
}


class TestLicenseExpiry:
    def test_returns_rendered_email(self):
        result = EmailTemplateService.license_expiry(_LE_VARS.copy())
        assert isinstance(result, RenderedEmail)

    def test_subject_contains_software_and_days(self):
        result = EmailTemplateService.license_expiry(_LE_VARS.copy())
        assert "Office365" in result.subject
        assert "14" in result.subject

    def test_subject_prefix(self):
        result = EmailTemplateService.license_expiry(_LE_VARS.copy())
        assert result.subject.startswith("[AEGIS-SIGHT]")

    def test_html_contains_expiry_date(self):
        result = EmailTemplateService.license_expiry(_LE_VARS.copy())
        assert "2026-05-01" in result.html

    def test_text_contains_license_count(self):
        result = EmailTemplateService.license_expiry(_LE_VARS.copy())
        assert "50" in result.text

    def test_html_wrapped(self):
        result = EmailTemplateService.license_expiry(_LE_VARS.copy())
        assert "<!DOCTYPE html>" in result.html


# ---------------------------------------------------------------------------
# security_alert
# ---------------------------------------------------------------------------

_SA_VARS_CRITICAL = {
    "title": "Malware Detected",
    "severity": "critical",
    "description": "Ransomware activity found",
    "device_name": "DESKTOP-001",
    "detected_at": "2026-04-17 09:00",
}

_SA_VARS_HIGH = {
    "title": "Suspicious Login",
    "severity": "high",
    "description": "Multiple failed logins",
    "detected_at": "2026-04-17 10:00",
}


class TestSecurityAlert:
    def test_returns_rendered_email(self):
        result = EmailTemplateService.security_alert(_SA_VARS_CRITICAL.copy())
        assert isinstance(result, RenderedEmail)

    def test_subject_contains_severity_and_title(self):
        result = EmailTemplateService.security_alert(_SA_VARS_CRITICAL.copy())
        assert "critical" in result.subject
        assert "Malware Detected" in result.subject

    def test_critical_uses_badge_critical(self):
        result = EmailTemplateService.security_alert(_SA_VARS_CRITICAL.copy())
        assert "badge-critical" in result.html

    def test_non_critical_uses_badge_warning(self):
        result = EmailTemplateService.security_alert(_SA_VARS_HIGH.copy())
        assert "badge-warning" in result.html

    def test_device_name_default_applied(self):
        vars_copy = _SA_VARS_HIGH.copy()
        assert "device_name" not in vars_copy
        EmailTemplateService.security_alert(vars_copy)
        assert vars_copy["device_name"] == "N/A"

    def test_device_name_default_appears_in_text(self):
        result = EmailTemplateService.security_alert(_SA_VARS_HIGH.copy())
        assert "N/A" in result.text

    def test_explicit_device_name_preserved(self):
        result = EmailTemplateService.security_alert(_SA_VARS_CRITICAL.copy())
        assert "DESKTOP-001" in result.text

    def test_html_wrapped(self):
        result = EmailTemplateService.security_alert(_SA_VARS_CRITICAL.copy())
        assert "<!DOCTYPE html>" in result.html


# ---------------------------------------------------------------------------
# procurement_approval
# ---------------------------------------------------------------------------

_PA_VARS = {
    "request_id": "REQ-2026-001",
    "item_name": "Dell Laptop",
    "requester_name": "Bob Smith",
    "quantity": 3,
    "estimated_cost": "¥450,000",
    "justification": "Replacement for aging hardware",
}


class TestProcurementApproval:
    def test_returns_rendered_email(self):
        result = EmailTemplateService.procurement_approval(_PA_VARS.copy())
        assert isinstance(result, RenderedEmail)

    def test_subject_contains_item_name(self):
        result = EmailTemplateService.procurement_approval(_PA_VARS.copy())
        assert "Dell Laptop" in result.subject

    def test_subject_prefix(self):
        result = EmailTemplateService.procurement_approval(_PA_VARS.copy())
        assert result.subject.startswith("[AEGIS-SIGHT]")

    def test_html_contains_request_id(self):
        result = EmailTemplateService.procurement_approval(_PA_VARS.copy())
        assert "REQ-2026-001" in result.html

    def test_text_contains_requester_and_cost(self):
        result = EmailTemplateService.procurement_approval(_PA_VARS.copy())
        assert "Bob Smith" in result.text
        assert "¥450,000" in result.text

    def test_html_wrapped(self):
        result = EmailTemplateService.procurement_approval(_PA_VARS.copy())
        assert "<!DOCTYPE html>" in result.html


# ---------------------------------------------------------------------------
# daily_summary
# ---------------------------------------------------------------------------

_DS_VARS = {
    "date": "2026-04-17",
    "total_devices": 200,
    "online_devices": 185,
    "critical_alerts": 3,
    "warning_alerts": 12,
    "license_violations": 1,
    "pending_procurements": 5,
}


class TestDailySummary:
    def test_returns_rendered_email(self):
        result = EmailTemplateService.daily_summary(_DS_VARS.copy())
        assert isinstance(result, RenderedEmail)

    def test_subject_contains_date(self):
        result = EmailTemplateService.daily_summary(_DS_VARS.copy())
        assert "2026-04-17" in result.subject

    def test_subject_prefix(self):
        result = EmailTemplateService.daily_summary(_DS_VARS.copy())
        assert result.subject.startswith("[AEGIS-SIGHT]")

    def test_html_contains_device_counts(self):
        result = EmailTemplateService.daily_summary(_DS_VARS.copy())
        assert "200" in result.html
        assert "185" in result.html

    def test_text_contains_all_metrics(self):
        result = EmailTemplateService.daily_summary(_DS_VARS.copy())
        assert "3" in result.text   # critical_alerts
        assert "12" in result.text  # warning_alerts
        assert "1" in result.text   # license_violations

    def test_html_wrapped(self):
        result = EmailTemplateService.daily_summary(_DS_VARS.copy())
        assert "<!DOCTYPE html>" in result.html


# ---------------------------------------------------------------------------
# render() dispatcher
# ---------------------------------------------------------------------------

class TestRenderDispatch:
    def test_license_violation_dispatch(self):
        result = EmailTemplateService.render("license_violation", _LV_VARS.copy())
        assert isinstance(result, RenderedEmail)
        assert "AutoCAD" in result.subject

    def test_license_expiry_dispatch(self):
        result = EmailTemplateService.render("license_expiry", _LE_VARS.copy())
        assert isinstance(result, RenderedEmail)
        assert "Office365" in result.subject

    def test_security_alert_dispatch(self):
        result = EmailTemplateService.render("security_alert", _SA_VARS_CRITICAL.copy())
        assert isinstance(result, RenderedEmail)
        assert "critical" in result.subject

    def test_procurement_approval_dispatch(self):
        result = EmailTemplateService.render("procurement_approval", _PA_VARS.copy())
        assert isinstance(result, RenderedEmail)
        assert "Dell Laptop" in result.subject

    def test_daily_summary_dispatch(self):
        result = EmailTemplateService.render("daily_summary", _DS_VARS.copy())
        assert isinstance(result, RenderedEmail)
        assert "2026-04-17" in result.subject

    def test_unknown_template_raises_key_error(self):
        with pytest.raises(KeyError, match="Unknown email template"):
            EmailTemplateService.render("nonexistent", {})

    def test_error_message_lists_available_templates(self):
        with pytest.raises(KeyError) as exc_info:
            EmailTemplateService.render("bad_name", {})
        assert "license_violation" in str(exc_info.value)

    def test_all_template_names_dispatchable(self):
        template_vars = {
            "license_violation": _LV_VARS.copy(),
            "license_expiry": _LE_VARS.copy(),
            "security_alert": _SA_VARS_CRITICAL.copy(),
            "procurement_approval": _PA_VARS.copy(),
            "daily_summary": _DS_VARS.copy(),
        }
        for name, variables in template_vars.items():
            result = EmailTemplateService.render(name, variables)
            assert isinstance(result, RenderedEmail), f"render('{name}') failed"
