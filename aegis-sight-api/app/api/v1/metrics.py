from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    REGISTRY,
    Gauge,
    Info,
    generate_latest,
)

router = APIRouter(tags=["metrics"])


def _get_or_create_gauge(name: str, documentation: str) -> Gauge:
    """Return existing Gauge or create a new one (safe for test re-imports)."""
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]  # type: ignore[return-value]
    return Gauge(name, documentation)


def _get_or_create_info(name: str, documentation: str) -> Info:
    """Return existing Info or create a new one (safe for test re-imports)."""
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]  # type: ignore[return-value]
    return Info(name, documentation)


# ---------------------------------------------------------------------------
# Business Metrics — IAMS移植: 資産管理KPI
# ---------------------------------------------------------------------------

# Device metrics
TOTAL_DEVICES = _get_or_create_gauge(
    "aegis_total_devices", "Total number of managed devices"
)
ACTIVE_DEVICES = _get_or_create_gauge(
    "aegis_active_devices_total", "Number of active (online) devices"
)
OFFLINE_DEVICES = _get_or_create_gauge(
    "aegis_offline_devices_total", "Number of offline devices"
)
WARNING_DEVICES = _get_or_create_gauge(
    "aegis_warning_devices_total", "Number of devices with warnings"
)

# License / SAM metrics
TOTAL_LICENSES = _get_or_create_gauge(
    "aegis_total_licenses", "Total number of managed licenses"
)
COMPLIANCE_RATE = _get_or_create_gauge(
    "aegis_license_compliance_rate", "License compliance rate (0-100)"
)
COMPLIANCE_VIOLATIONS = _get_or_create_gauge(
    "aegis_compliance_violations_total", "Number of license compliance violations"
)

# Procurement metrics
PENDING_PROCUREMENT = _get_or_create_gauge(
    "aegis_pending_procurement_total", "Number of pending procurement requests"
)
TOTAL_PROCUREMENT_COST = _get_or_create_gauge(
    "aegis_procurement_total_cost_yen", "Total procurement cost in JPY"
)

# Security metrics
SECURITY_SCORE = _get_or_create_gauge(
    "aegis_security_score", "Overall security score (0-100)"
)
PATCH_COMPLIANCE_RATE = _get_or_create_gauge(
    "aegis_patch_compliance_rate", "Patch compliance rate (0-100)"
)
OPEN_VULNERABILITIES = _get_or_create_gauge(
    "aegis_open_vulnerabilities_total", "Number of open vulnerabilities"
)

# SLA metrics
SLA_ACHIEVEMENT_RATE = _get_or_create_gauge(
    "aegis_sla_achievement_rate", "Overall SLA achievement rate (0-100)"
)
SLA_VIOLATIONS = _get_or_create_gauge(
    "aegis_sla_violations_total", "Total SLA violations"
)

# Alert metrics
ACTIVE_ALERTS = _get_or_create_gauge(
    "aegis_active_alerts_total", "Number of active alerts"
)
CRITICAL_ALERTS = _get_or_create_gauge(
    "aegis_critical_alerts_total", "Number of critical alerts"
)

# DLP metrics
DLP_BLOCKED_EVENTS = _get_or_create_gauge(
    "aegis_dlp_blocked_events_total", "Number of DLP blocked events"
)

# System info
SYSTEM_INFO = _get_or_create_info(
    "aegis_system", "AEGIS-SIGHT system information"
)

# Set static system info
SYSTEM_INFO.info({
    "version": "0.65.0",
    "project": "AEGIS-SIGHT",
    "description": "Autonomous Endpoint Governance & Integrated Sight",
})


def update_business_metrics_from_db(db_session=None):
    """Update business metrics from database.

    When no DB session is available (demo mode), set demo values.
    """
    # Demo values — replaced by real DB queries when backend is connected
    TOTAL_DEVICES.set(1284)
    ACTIVE_DEVICES.set(1102)
    OFFLINE_DEVICES.set(128)
    WARNING_DEVICES.set(54)
    TOTAL_LICENSES.set(342)
    COMPLIANCE_RATE.set(94.2)
    COMPLIANCE_VIOLATIONS.set(20)
    PENDING_PROCUREMENT.set(12)
    TOTAL_PROCUREMENT_COST.set(13560000)
    SECURITY_SCORE.set(92)
    PATCH_COMPLIANCE_RATE.set(86.1)
    OPEN_VULNERABILITIES.set(6)
    SLA_ACHIEVEMENT_RATE.set(87)
    SLA_VIOLATIONS.set(3)
    ACTIVE_ALERTS.set(7)
    CRITICAL_ALERTS.set(2)
    DLP_BLOCKED_EVENTS.set(2)


@router.get(
    "/metrics",
    response_class=PlainTextResponse,
    summary="Prometheus metrics",
    description="Expose application metrics in Prometheus exposition format for scraping.",
)
async def get_metrics():
    """Expose Prometheus metrics including business KPIs."""
    # Update business metrics on each scrape
    update_business_metrics_from_db()
    return PlainTextResponse(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
