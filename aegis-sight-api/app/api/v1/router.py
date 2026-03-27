"""
Aggregated API v1 router.

Assembles all sub-routers into a single ``/api/v1`` prefix and attaches
OpenAPI tag metadata (descriptions) so the generated documentation groups
endpoints logically.
"""

from fastapi import APIRouter

from app.api.v1.alerts import router as alerts_router
from app.api.v1.assets import router as assets_router
from app.api.v1.batch import router as batch_router
from app.api.v1.config import router as config_router
from app.api.v1.database import router as database_router
from app.api.v1.departments import router as departments_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.logs import router as logs_router
from app.api.v1.m365 import router as m365_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.network import router as network_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.procurement import router as procurement_router
from app.api.v1.sam import router as sam_router
from app.api.v1.scheduler import router as scheduler_router
from app.api.v1.security import router as security_router
from app.api.v1.software import router as software_router
from app.api.v1.reports import router as reports_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.users import router as users_router
from app.api.v1.version import router as version_router
from app.api.v1.ws import router as ws_router

# ---------------------------------------------------------------------------
# OpenAPI tag metadata -- descriptions shown in /docs and /redoc
# ---------------------------------------------------------------------------
TAG_METADATA: list[dict] = [
    {
        "name": "auth",
        "description": (
            "**Authentication and registration.** "
            "Obtain JWT tokens via ``POST /auth/token`` using email+password. "
            "Tokens are passed as ``Authorization: Bearer <token>`` headers. "
            "New accounts are created with ``POST /auth/register``."
        ),
    },
    {
        "name": "users",
        "description": (
            "**User management (admin only).** "
            "List, update roles, and deactivate (soft-delete) user accounts. "
            "Requires the ``admin`` role for list/update/delete operations."
        ),
    },
    {
        "name": "assets",
        "description": (
            "**IT device asset inventory.** "
            "CRUD operations on the device registry. Devices are also "
            "auto-created via the telemetry ingestion endpoint."
        ),
    },
    {
        "name": "telemetry",
        "description": (
            "**Agent telemetry data ingestion.** "
            "Accepts payloads from AEGIS-SIGHT endpoint agents containing "
            "device info, hardware snapshots, security status, and software inventory. "
            "No authentication required (agent uses machine identity)."
        ),
    },
    {
        "name": "dashboard",
        "description": (
            "**Dashboard statistics and alerts.** "
            "Aggregated KPIs: total devices, online devices, license compliance rate, "
            "pending procurements, and active security alerts."
        ),
    },
    {
        "name": "alerts",
        "description": (
            "**Alert management.** "
            "Create, list, acknowledge, and resolve alerts. "
            "Alerts track security events, hardware issues, license violations, "
            "and network anomalies with severity levels (critical/warning/info)."
        ),
    },
    {
        "name": "sam",
        "description": (
            "**Software Asset Management (SAM).** "
            "License CRUD and compliance checking. Compare purchased counts "
            "against installed + M365-assigned counts to detect over-deployment."
        ),
    },
    {
        "name": "procurement",
        "description": (
            "**Procurement request lifecycle.** "
            "Full workflow: draft -> submit -> approve/reject -> order -> receive -> "
            "register -> active -> disposal. Tracks requester, approver, timestamps, "
            "and links received items to the asset registry."
        ),
    },
    {
        "name": "security",
        "description": (
            "**Security monitoring and compliance.** "
            "Aggregated Defender, BitLocker, and patch status across all devices. "
            "Per-device security detail view."
        ),
    },
    {
        "name": "logs",
        "description": (
            "**Log event management.** "
            "Query logon/logoff events, USB connect/disconnect events, and "
            "file operation events with pagination and date-range filters."
        ),
    },
    {
        "name": "audit",
        "description": (
            "**Audit trail (auditor/admin only).** "
            "Immutable log of all system actions. Supports filtering by action, "
            "user, resource type, and date range. Export as CSV or JSON."
        ),
    },
    {
        "name": "reports",
        "description": (
            "**Report generation (auditor/admin only).** "
            "Download SAM compliance, asset inventory, and security posture "
            "reports in CSV format for J-SOX auditing."
        ),
    },
    {
        "name": "software",
        "description": (
            "**Software inventory.** "
            "Track installed software across devices. Populated by agent telemetry."
        ),
    },
    {
        "name": "config",
        "description": (
            "**System configuration (read: all, write: admin only).** "
            "Global settings and thresholds such as alert thresholds, "
            "data retention periods, and feature flags."
        ),
    },
    {
        "name": "departments",
        "description": (
            "**Department management.** "
            "Organizational hierarchy, budget tracking, and department metadata."
        ),
    },
    {
        "name": "batch",
        "description": (
            "**Batch import/export.** "
            "CSV-based bulk operations for devices and licenses. "
            "Upload a CSV to create/update records in bulk."
        ),
    },
    {
        "name": "network",
        "description": (
            "**Network discovery.** "
            "Discovered network devices and linking to managed asset records."
        ),
    },
    {
        "name": "m365",
        "description": (
            "**Microsoft 365 integration.** "
            "License assignment tracking, user synchronization, and "
            "Microsoft Graph API connectivity."
        ),
    },
    {
        "name": "database",
        "description": (
            "**Database management (admin only).** "
            "Statistics, retention policy configuration, manual cleanup "
            "triggers, and connection pool / replication health checks."
        ),
    },
    {
        "name": "scheduler",
        "description": (
            "**Scheduled task management (read: all, write: admin only).** "
            "Configure and monitor recurring jobs such as telemetry collection, "
            "compliance scans, and report generation."
        ),
    },
    {
        "name": "metrics",
        "description": (
            "**Prometheus metrics.** "
            "Exposes application metrics in Prometheus exposition format "
            "for monitoring and alerting infrastructure."
        ),
    },
    {
        "name": "version",
        "description": (
            "**API version information.** "
            "Build metadata, runtime versions, git commit hash, and "
            "minimum supported agent version for compatibility checks."
        ),
    },
    {
        "name": "notifications",
        "description": (
            "**Notification channel and rule management.** "
            "Configure notification channels (email, webhook, Slack, Teams) "
            "and define rules to route events to specific channels."
        ),
    },
    {
        "name": "websocket",
        "description": (
            "**WebSocket real-time notifications.** "
            "Connect via ``/ws/notifications?token=<JWT>`` to receive push "
            "notifications for alerts, device status changes, and system events."
        ),
    },
]

# ---------------------------------------------------------------------------
# Router assembly
# ---------------------------------------------------------------------------
api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(alerts_router)
api_router.include_router(users_router)
api_router.include_router(assets_router)
api_router.include_router(audit_router)
api_router.include_router(config_router)
api_router.include_router(database_router)
api_router.include_router(sam_router)
api_router.include_router(procurement_router)
api_router.include_router(metrics_router)
api_router.include_router(telemetry_router)
api_router.include_router(dashboard_router)
api_router.include_router(security_router)
api_router.include_router(logs_router)
api_router.include_router(reports_router)
api_router.include_router(software_router)
api_router.include_router(network_router)
api_router.include_router(notifications_router)
api_router.include_router(departments_router)
api_router.include_router(batch_router)
api_router.include_router(m365_router)
api_router.include_router(scheduler_router)
api_router.include_router(version_router)
api_router.include_router(ws_router)
