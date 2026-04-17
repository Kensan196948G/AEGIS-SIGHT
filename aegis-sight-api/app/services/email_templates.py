"""
Email template service for AEGIS-SIGHT notifications.

Provides HTML + plain-text templates with Jinja2-style variable substitution
for common notification types.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class RenderedEmail:
    """Container for rendered email content."""

    subject: str
    html: str
    text: str


class EmailTemplateService:
    """Stateless email template renderer."""

    # ------------------------------------------------------------------
    # Variable substitution (Jinja2-style: {{ var_name }})
    # ------------------------------------------------------------------
    @staticmethod
    def _render(template: str, variables: dict) -> str:
        """Replace {{ key }} placeholders with values from variables dict."""
        def _replace(match: re.Match) -> str:
            key = match.group(1).strip()
            return str(variables.get(key, f"{{{{ {key} }}}}"))

        return re.sub(r"\{\{\s*(\w+)\s*\}\}", _replace, template)

    # ------------------------------------------------------------------
    # Common HTML wrapper
    # ------------------------------------------------------------------
    @staticmethod
    def _wrap_html(title: str, body_html: str) -> str:
        return f"""\
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
    .card {{ background-color: #ffffff; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
    .header {{ background-color: #1e40af; color: #ffffff; border-radius: 8px 8px 0 0; padding: 16px 24px; margin-bottom: 0; }}
    .header h1 {{ margin: 0; font-size: 18px; }}
    .badge-critical {{ display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #fee2e2; color: #dc2626; font-weight: 600; font-size: 12px; }}
    .badge-warning {{ display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #fef3c7; color: #d97706; font-weight: 600; font-size: 12px; }}
    .badge-info {{ display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #dbeafe; color: #2563eb; font-weight: 600; font-size: 12px; }}
    .badge-success {{ display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #d1fae5; color: #059669; font-weight: 600; font-size: 12px; }}
    .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
    th {{ background-color: #f9fafb; font-weight: 600; color: #374151; }}
    .btn {{ display: inline-block; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }}
    .btn-primary {{ background-color: #1e40af; color: #ffffff; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>AEGIS-SIGHT</h1></div>
    <div class="card">
      {body_html}
    </div>
    <div class="footer">
      <p>This is an automated notification from AEGIS-SIGHT IT Management Platform.</p>
    </div>
  </div>
</body>
</html>"""

    # ------------------------------------------------------------------
    # Template: license_violation
    # ------------------------------------------------------------------
    @classmethod
    def license_violation(cls, variables: dict) -> RenderedEmail:
        """
        Required variables:
          - software_name: str
          - purchased_count: int
          - used_count: int
          - over_deployed: int
          - detected_at: str
        """
        subject = cls._render(
            "[AEGIS-SIGHT] License violation: {{ software_name }}", variables
        )

        body_html = cls._render(
            """\
<h2 style="margin-top:0;color:#dc2626;">License Violation Detected</h2>
<p>The following software exceeds its licensed capacity:</p>
<table>
  <tr><th>Software</th><td>{{ software_name }}</td></tr>
  <tr><th>Purchased</th><td>{{ purchased_count }}</td></tr>
  <tr><th>In Use</th><td>{{ used_count }}</td></tr>
  <tr><th>Over-deployed</th><td><span class="badge-critical">{{ over_deployed }}</span></td></tr>
  <tr><th>Detected</th><td>{{ detected_at }}</td></tr>
</table>
<p style="margin-top:16px;">Please review the license allocation and take corrective action.</p>""",
            variables,
        )

        text = cls._render(
            """\
[AEGIS-SIGHT] License Violation Detected

Software: {{ software_name }}
Purchased: {{ purchased_count }}
In Use: {{ used_count }}
Over-deployed: {{ over_deployed }}
Detected: {{ detected_at }}

Please review the license allocation and take corrective action.""",
            variables,
        )

        return RenderedEmail(
            subject=subject,
            html=cls._wrap_html(subject, body_html),
            text=text,
        )

    # ------------------------------------------------------------------
    # Template: license_expiry
    # ------------------------------------------------------------------
    @classmethod
    def license_expiry(cls, variables: dict) -> RenderedEmail:
        """
        Required variables:
          - software_name: str
          - expiry_date: str
          - days_remaining: int
          - license_count: int
        """
        subject = cls._render(
            "[AEGIS-SIGHT] License expiring: {{ software_name }} ({{ days_remaining }} days)",
            variables,
        )

        body_html = cls._render(
            """\
<h2 style="margin-top:0;color:#d97706;">License Expiry Warning</h2>
<p>A software license is approaching its expiration date:</p>
<table>
  <tr><th>Software</th><td>{{ software_name }}</td></tr>
  <tr><th>Expiry Date</th><td>{{ expiry_date }}</td></tr>
  <tr><th>Days Remaining</th><td><span class="badge-warning">{{ days_remaining }}</span></td></tr>
  <tr><th>License Count</th><td>{{ license_count }}</td></tr>
</table>
<p style="margin-top:16px;">Please initiate renewal procedures to avoid service interruption.</p>""",
            variables,
        )

        text = cls._render(
            """\
[AEGIS-SIGHT] License Expiry Warning

Software: {{ software_name }}
Expiry Date: {{ expiry_date }}
Days Remaining: {{ days_remaining }}
License Count: {{ license_count }}

Please initiate renewal procedures to avoid service interruption.""",
            variables,
        )

        return RenderedEmail(
            subject=subject,
            html=cls._wrap_html(subject, body_html),
            text=text,
        )

    # ------------------------------------------------------------------
    # Template: security_alert
    # ------------------------------------------------------------------
    @classmethod
    def security_alert(cls, variables: dict) -> RenderedEmail:
        """
        Required variables:
          - title: str
          - severity: str
          - description: str
          - device_name: str (optional, default "N/A")
          - detected_at: str
        """
        variables.setdefault("device_name", "N/A")
        severity = variables.get("severity", "unknown")
        badge_class = (
            "badge-critical" if severity == "critical" else "badge-warning"
        )

        subject = cls._render(
            "[AEGIS-SIGHT] Security Alert ({{ severity }}): {{ title }}", variables
        )

        body_html = cls._render(
            f"""\
<h2 style="margin-top:0;color:#dc2626;">Security Alert</h2>
<table>
  <tr><th>Title</th><td>{{{{ title }}}}</td></tr>
  <tr><th>Severity</th><td><span class="{badge_class}">{{{{ severity }}}}</span></td></tr>
  <tr><th>Description</th><td>{{{{ description }}}}</td></tr>
  <tr><th>Device</th><td>{{{{ device_name }}}}</td></tr>
  <tr><th>Detected</th><td>{{{{ detected_at }}}}</td></tr>
</table>
<p style="margin-top:16px;">Immediate investigation is recommended.</p>""",
            variables,
        )

        text = cls._render(
            """\
[AEGIS-SIGHT] Security Alert

Title: {{ title }}
Severity: {{ severity }}
Description: {{ description }}
Device: {{ device_name }}
Detected: {{ detected_at }}

Immediate investigation is recommended.""",
            variables,
        )

        return RenderedEmail(
            subject=subject,
            html=cls._wrap_html(subject, body_html),
            text=text,
        )

    # ------------------------------------------------------------------
    # Template: procurement_approval
    # ------------------------------------------------------------------
    @classmethod
    def procurement_approval(cls, variables: dict) -> RenderedEmail:
        """
        Required variables:
          - request_id: str
          - item_name: str
          - requester_name: str
          - quantity: int
          - estimated_cost: str
          - justification: str
        """
        subject = cls._render(
            "[AEGIS-SIGHT] Procurement approval required: {{ item_name }}",
            variables,
        )

        body_html = cls._render(
            """\
<h2 style="margin-top:0;color:#2563eb;">Procurement Approval Required</h2>
<p>A new procurement request requires your approval:</p>
<table>
  <tr><th>Request ID</th><td>{{ request_id }}</td></tr>
  <tr><th>Item</th><td>{{ item_name }}</td></tr>
  <tr><th>Requester</th><td>{{ requester_name }}</td></tr>
  <tr><th>Quantity</th><td>{{ quantity }}</td></tr>
  <tr><th>Estimated Cost</th><td>{{ estimated_cost }}</td></tr>
  <tr><th>Justification</th><td>{{ justification }}</td></tr>
</table>
<p style="margin-top:16px;">Please review and approve or reject this request in the AEGIS-SIGHT dashboard.</p>""",
            variables,
        )

        text = cls._render(
            """\
[AEGIS-SIGHT] Procurement Approval Required

Request ID: {{ request_id }}
Item: {{ item_name }}
Requester: {{ requester_name }}
Quantity: {{ quantity }}
Estimated Cost: {{ estimated_cost }}
Justification: {{ justification }}

Please review and approve or reject this request in the AEGIS-SIGHT dashboard.""",
            variables,
        )

        return RenderedEmail(
            subject=subject,
            html=cls._wrap_html(subject, body_html),
            text=text,
        )

    # ------------------------------------------------------------------
    # Template: daily_summary
    # ------------------------------------------------------------------
    @classmethod
    def daily_summary(cls, variables: dict) -> RenderedEmail:
        """
        Required variables:
          - date: str
          - total_devices: int
          - online_devices: int
          - critical_alerts: int
          - warning_alerts: int
          - license_violations: int
          - pending_procurements: int
        """
        subject = cls._render(
            "[AEGIS-SIGHT] Daily Summary - {{ date }}", variables
        )

        body_html = cls._render(
            """\
<h2 style="margin-top:0;color:#1e40af;">Daily Summary - {{ date }}</h2>
<table>
  <tr><th>Total Devices</th><td>{{ total_devices }}</td></tr>
  <tr><th>Online Devices</th><td><span class="badge-success">{{ online_devices }}</span></td></tr>
  <tr><th>Critical Alerts</th><td><span class="badge-critical">{{ critical_alerts }}</span></td></tr>
  <tr><th>Warning Alerts</th><td><span class="badge-warning">{{ warning_alerts }}</span></td></tr>
  <tr><th>License Violations</th><td>{{ license_violations }}</td></tr>
  <tr><th>Pending Procurements</th><td>{{ pending_procurements }}</td></tr>
</table>
<p style="margin-top:16px;">Log in to the AEGIS-SIGHT dashboard for detailed information.</p>""",
            variables,
        )

        text = cls._render(
            """\
[AEGIS-SIGHT] Daily Summary - {{ date }}

Total Devices: {{ total_devices }}
Online Devices: {{ online_devices }}
Critical Alerts: {{ critical_alerts }}
Warning Alerts: {{ warning_alerts }}
License Violations: {{ license_violations }}
Pending Procurements: {{ pending_procurements }}

Log in to the AEGIS-SIGHT dashboard for detailed information.""",
            variables,
        )

        return RenderedEmail(
            subject=subject,
            html=cls._wrap_html(subject, body_html),
            text=text,
        )

    # ------------------------------------------------------------------
    # Dispatcher
    # ------------------------------------------------------------------
    TEMPLATES: ClassVar[dict[str, Callable[..., RenderedEmail]]] = {
        "license_violation": license_violation,
        "license_expiry": license_expiry,
        "security_alert": security_alert,
        "procurement_approval": procurement_approval,
        "daily_summary": daily_summary,
    }

    @classmethod
    def render(cls, template_name: str, variables: dict) -> RenderedEmail:
        """
        Render a named template with the given variables.

        Raises KeyError if the template name is not recognized.
        """
        if template_name not in cls.TEMPLATES:
            raise KeyError(
                f"Unknown email template: '{template_name}'. "
                f"Available: {', '.join(cls.TEMPLATES.keys())}"
            )
        return getattr(cls, template_name)(variables)
