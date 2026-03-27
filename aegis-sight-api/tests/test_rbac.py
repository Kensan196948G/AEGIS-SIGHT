"""
RBAC (Role-Based Access Control) integration tests for AEGIS-SIGHT API.

Verifies that each role (admin, operator, auditor, readonly) can only
access the endpoints permitted by the access control matrix.

Role matrix summary:
  - admin:    Full access to all endpoints
  - operator: Operational endpoints (assets, alerts, procurement, telemetry, etc.)
              but NOT user management (list/update/delete users), config writes,
              scheduler writes, audit logs, or reports
  - auditor:  Audit logs, reports, and read-only access to dashboards/alerts
              but NOT write operations on assets, procurement, config, etc.
  - readonly: Read-only access to assets, dashboard, alerts listing, logs
              but NO write operations or admin-only endpoints
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from app.models.user import User

pytestmark = [pytest.mark.integration, pytest.mark.rbac]


# ---------------------------------------------------------------------------
# Helper constants
# ---------------------------------------------------------------------------
SAMPLE_DEVICE_PAYLOAD = {
    "hostname": "RBAC-TEST-DEVICE",
    "os_version": "Windows 11 Pro",
    "status": "active",
}

SAMPLE_ALERT_PAYLOAD = {
    "severity": "warning",
    "category": "security",
    "title": "RBAC test alert",
    "message": "Created during RBAC testing.",
}

SAMPLE_LICENSE_PAYLOAD = {
    "software_name": "RBAC-TestSW",
    "vendor": "TestVendor",
    "license_type": "subscription",
    "purchased_count": 10,
    "installed_count": 5,
}

SAMPLE_PROCUREMENT_PAYLOAD = {
    "item_name": "RBAC Test Item",
    "category": "hardware",
    "quantity": 1,
    "unit_price": "10000",
    "department": "IT",
    "purpose": "RBAC integration test",
}


# ---------------------------------------------------------------------------
# Admin: full access
# ---------------------------------------------------------------------------
class TestAdminAccess:
    """Admin should have unrestricted access to all endpoints."""

    async def test_admin_can_list_users(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/users", headers=admin_headers)
        assert resp.status_code == 200

    async def test_admin_can_create_device(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        payload = {**SAMPLE_DEVICE_PAYLOAD, "hostname": f"ADMIN-{uuid.uuid4().hex[:6]}"}
        resp = await client.post("/api/v1/assets", headers=admin_headers, json=payload)
        assert resp.status_code == 201

    async def test_admin_can_create_alert(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.post(
            "/api/v1/alerts", headers=admin_headers, json=SAMPLE_ALERT_PAYLOAD
        )
        assert resp.status_code == 201

    async def test_admin_can_access_audit_logs(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/audit/logs", headers=admin_headers)
        assert resp.status_code == 200

    async def test_admin_can_access_reports(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/reports/sam", headers=admin_headers)
        assert resp.status_code == 200

    async def test_admin_can_create_license(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        payload = {
            **SAMPLE_LICENSE_PAYLOAD,
            "software_name": f"Admin-SW-{uuid.uuid4().hex[:6]}",
        }
        resp = await client.post(
            "/api/v1/sam/licenses", headers=admin_headers, json=payload
        )
        assert resp.status_code == 201

    async def test_admin_can_create_procurement(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.post(
            "/api/v1/procurement", headers=admin_headers, json=SAMPLE_PROCUREMENT_PAYLOAD
        )
        assert resp.status_code == 201

    async def test_admin_can_list_configs(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/config", headers=admin_headers)
        assert resp.status_code == 200

    async def test_admin_can_list_scheduler_tasks(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/scheduler/tasks", headers=admin_headers)
        assert resp.status_code == 200

    async def test_admin_can_get_dashboard_stats(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/dashboard/stats", headers=admin_headers)
        assert resp.status_code == 200

    async def test_admin_can_get_security_overview(
        self, client: AsyncClient, admin_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/security/overview", headers=admin_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Operator: operational access, no admin
# ---------------------------------------------------------------------------
class TestOperatorAccess:
    """Operator should have access to operational endpoints but not admin-only ones."""

    async def test_operator_can_list_assets(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/assets", headers=operator_headers)
        assert resp.status_code == 200

    async def test_operator_can_create_device(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        payload = {**SAMPLE_DEVICE_PAYLOAD, "hostname": f"OP-{uuid.uuid4().hex[:6]}"}
        resp = await client.post("/api/v1/assets", headers=operator_headers, json=payload)
        assert resp.status_code == 201

    async def test_operator_can_create_alert(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.post(
            "/api/v1/alerts", headers=operator_headers, json=SAMPLE_ALERT_PAYLOAD
        )
        assert resp.status_code == 201

    async def test_operator_can_list_alerts(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/alerts", headers=operator_headers)
        assert resp.status_code == 200

    async def test_operator_can_get_dashboard(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/dashboard/stats", headers=operator_headers)
        assert resp.status_code == 200

    async def test_operator_can_create_procurement(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.post(
            "/api/v1/procurement",
            headers=operator_headers,
            json=SAMPLE_PROCUREMENT_PAYLOAD,
        )
        assert resp.status_code == 201

    async def test_operator_can_list_licenses(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/sam/licenses", headers=operator_headers)
        assert resp.status_code == 200

    async def test_operator_cannot_list_users(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/users", headers=operator_headers)
        assert resp.status_code == 403

    async def test_operator_cannot_update_users(
        self,
        client: AsyncClient,
        operator_headers: dict[str, str],
        readonly_user: User,
    ):
        resp = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            headers=operator_headers,
            json={"role": "admin"},
        )
        assert resp.status_code == 403

    async def test_operator_cannot_deactivate_users(
        self,
        client: AsyncClient,
        operator_headers: dict[str, str],
        readonly_user: User,
    ):
        resp = await client.delete(
            f"/api/v1/users/{readonly_user.id}",
            headers=operator_headers,
        )
        assert resp.status_code == 403

    async def test_operator_cannot_access_audit_logs(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/audit/logs", headers=operator_headers)
        assert resp.status_code == 403

    async def test_operator_cannot_access_reports(
        self, client: AsyncClient, operator_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/reports/sam", headers=operator_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Auditor: audit/report access + read access, no write on assets/procurement
# ---------------------------------------------------------------------------
class TestAuditorAccess:
    """Auditor should access audit logs, reports, and read endpoints only."""

    async def test_auditor_can_access_audit_logs(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/audit/logs", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_can_export_audit_logs_csv(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get(
            "/api/v1/audit/logs/export?format=csv", headers=auditor_headers
        )
        assert resp.status_code == 200

    async def test_auditor_can_access_sam_report(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/reports/sam", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_can_access_asset_report(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/reports/assets", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_can_access_security_report(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/reports/security", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_can_read_assets(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/assets", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_can_read_dashboard(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/dashboard/stats", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_can_list_alerts(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/alerts", headers=auditor_headers)
        assert resp.status_code == 200

    async def test_auditor_cannot_list_users(
        self, client: AsyncClient, auditor_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/users", headers=auditor_headers)
        assert resp.status_code == 403

    async def test_auditor_cannot_update_users(
        self,
        client: AsyncClient,
        auditor_headers: dict[str, str],
        readonly_user: User,
    ):
        resp = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            headers=auditor_headers,
            json={"role": "admin"},
        )
        assert resp.status_code == 403

    async def test_auditor_cannot_deactivate_users(
        self,
        client: AsyncClient,
        auditor_headers: dict[str, str],
        readonly_user: User,
    ):
        resp = await client.delete(
            f"/api/v1/users/{readonly_user.id}",
            headers=auditor_headers,
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Readonly: read-only access, all writes should be rejected
# ---------------------------------------------------------------------------
class TestReadonlyAccess:
    """Readonly user should only have read access, all writes should fail."""

    async def test_readonly_can_list_assets(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/assets", headers=readonly_headers)
        assert resp.status_code == 200

    async def test_readonly_can_get_dashboard(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get(
            "/api/v1/dashboard/stats", headers=readonly_headers
        )
        assert resp.status_code == 200

    async def test_readonly_can_list_alerts(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/alerts", headers=readonly_headers)
        assert resp.status_code == 200

    async def test_readonly_can_list_licenses(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/sam/licenses", headers=readonly_headers)
        assert resp.status_code == 200

    async def test_readonly_can_list_procurement(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/procurement", headers=readonly_headers)
        assert resp.status_code == 200

    async def test_readonly_can_get_security_overview(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get(
            "/api/v1/security/overview", headers=readonly_headers
        )
        assert resp.status_code == 200

    async def test_readonly_can_list_logs(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/logs/logon", headers=readonly_headers)
        assert resp.status_code == 200

    async def test_readonly_can_get_log_summary(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/logs/summary", headers=readonly_headers)
        assert resp.status_code == 200

    async def test_readonly_cannot_list_users(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/users", headers=readonly_headers)
        assert resp.status_code == 403

    async def test_readonly_cannot_update_users(
        self,
        client: AsyncClient,
        readonly_headers: dict[str, str],
        admin_user: User,
    ):
        resp = await client.patch(
            f"/api/v1/users/{admin_user.id}",
            headers=readonly_headers,
            json={"role": "admin"},
        )
        assert resp.status_code == 403

    async def test_readonly_cannot_deactivate_users(
        self,
        client: AsyncClient,
        readonly_headers: dict[str, str],
        admin_user: User,
    ):
        resp = await client.delete(
            f"/api/v1/users/{admin_user.id}",
            headers=readonly_headers,
        )
        assert resp.status_code == 403

    async def test_readonly_cannot_access_audit_logs(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/audit/logs", headers=readonly_headers)
        assert resp.status_code == 403

    async def test_readonly_cannot_access_reports(
        self, client: AsyncClient, readonly_headers: dict[str, str]
    ):
        resp = await client.get("/api/v1/reports/sam", headers=readonly_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Unauthenticated access
# ---------------------------------------------------------------------------
class TestUnauthenticatedAccess:
    """Unauthenticated requests should be rejected with 401."""

    @pytest.mark.parametrize(
        "method,path",
        [
            ("GET", "/api/v1/assets"),
            ("GET", "/api/v1/alerts"),
            ("GET", "/api/v1/dashboard/stats"),
            ("GET", "/api/v1/sam/licenses"),
            ("GET", "/api/v1/procurement"),
            ("GET", "/api/v1/users"),
            ("GET", "/api/v1/audit/logs"),
            ("GET", "/api/v1/reports/sam"),
            ("GET", "/api/v1/security/overview"),
            ("GET", "/api/v1/logs/logon"),
            ("GET", "/api/v1/config"),
            ("GET", "/api/v1/scheduler/tasks"),
        ],
    )
    async def test_unauthenticated_requests_get_401(
        self, client: AsyncClient, method: str, path: str
    ):
        resp = await client.request(method, path)
        assert resp.status_code == 401
