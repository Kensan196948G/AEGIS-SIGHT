"""
Integration tests for AEGIS-SIGHT API.

These tests exercise end-to-end workflows spanning multiple endpoints,
verifying that data flows correctly between subsystems.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# 1. Telemetry -> Dashboard statistics
# ---------------------------------------------------------------------------
class TestTelemetryDashboardIntegration:
    """Send telemetry data and verify it appears in dashboard statistics."""

    async def test_telemetry_creates_device_and_appears_in_dashboard(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Telemetry submission should create a device visible in dashboard stats."""
        hostname = f"INTEG-TELEM-{uuid.uuid4().hex[:6]}"
        payload = {
            "device_info": {
                "hostname": hostname,
                "os_version": "Windows 11 Pro 23H2",
                "ip_address": "10.0.100.42",
                "mac_address": "AA:BB:CC:DD:EE:01",
                "domain": "integ.local",
            },
            "hardware": {
                "cpu_model": "Intel Core i7-13700",
                "memory_gb": 32.0,
                "disk_total_gb": 512.0,
                "disk_free_gb": 256.0,
                "serial_number": "SN-INTEG-001",
            },
            "security": {
                "defender_on": True,
                "bitlocker_on": True,
                "pattern_date": "2026-03-25",
                "pending_patches": 0,
            },
            "software_inventory": [],
            "collected_at": datetime.now(UTC).isoformat(),
        }

        # Send telemetry
        resp = await client.post("/api/v1/telemetry", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["hostname"] == hostname
        data["device_id"]

        # Verify device appears in asset list
        assets_resp = await client.get("/api/v1/assets", headers=auth_headers)
        assert assets_resp.status_code == 200
        hostnames = [d["hostname"] for d in assets_resp.json()["items"]]
        assert hostname in hostnames

        # Verify dashboard stats reflect the new device
        stats_resp = await client.get(
            "/api/v1/dashboard/stats", headers=auth_headers
        )
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_devices"] >= 1

    async def test_telemetry_with_security_issues_triggers_dashboard_alerts(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Telemetry with security problems should appear in dashboard alerts."""
        hostname = f"INTEG-ALERT-{uuid.uuid4().hex[:6]}"
        payload = {
            "device_info": {
                "hostname": hostname,
                "os_version": "Windows 10 Pro 22H2",
                "ip_address": "10.0.100.99",
                "mac_address": "AA:BB:CC:DD:EE:02",
            },
            "security": {
                "defender_on": False,
                "bitlocker_on": False,
                "pending_patches": 12,
            },
            "collected_at": datetime.now(UTC).isoformat(),
        }

        resp = await client.post("/api/v1/telemetry", json=payload)
        assert resp.status_code == 200

        # Dashboard alerts should include security issues for this device
        alerts_resp = await client.get(
            "/api/v1/dashboard/alerts", headers=auth_headers
        )
        assert alerts_resp.status_code == 200
        alerts = alerts_resp.json()["alerts"]
        device_alerts = [a for a in alerts if a["device_hostname"] == hostname]
        assert len(device_alerts) >= 1, "Expected at least one alert for the insecure device"


# ---------------------------------------------------------------------------
# 2. Device registration -> Asset list
# ---------------------------------------------------------------------------
class TestDeviceAssetIntegration:
    """Register a device and confirm it appears in the asset inventory."""

    async def test_created_device_appears_in_asset_list(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ):
        hostname = f"INTEG-DEV-{uuid.uuid4().hex[:6]}"
        create_resp = await client.post(
            "/api/v1/assets",
            headers=auth_headers,
            json={
                "hostname": hostname,
                "os_version": "Windows 11 Enterprise 23H2",
                "ip_address": "192.168.1.10",
                "mac_address": "11:22:33:44:55:66",
                "domain": "corp.local",
                "status": "active",
            },
        )
        assert create_resp.status_code == 201
        device_id = create_resp.json()["id"]

        # Confirm the device appears in the list
        list_resp = await client.get("/api/v1/assets", headers=auth_headers)
        assert list_resp.status_code == 200
        ids = [d["id"] for d in list_resp.json()["items"]]
        assert device_id in ids

        # Confirm individual get works
        get_resp = await client.get(
            f"/api/v1/assets/{device_id}", headers=auth_headers
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["hostname"] == hostname

    async def test_device_count_increments_on_creation(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ):
        # Get initial count
        count_before = (
            await client.get("/api/v1/assets/count", headers=auth_headers)
        ).json()["count"]

        hostname = f"INTEG-CNT-{uuid.uuid4().hex[:6]}"
        await client.post(
            "/api/v1/assets",
            headers=auth_headers,
            json={"hostname": hostname, "status": "active"},
        )

        count_after = (
            await client.get("/api/v1/assets/count", headers=auth_headers)
        ).json()["count"]

        assert count_after == count_before + 1


# ---------------------------------------------------------------------------
# 3. License registration -> SAM compliance check
# ---------------------------------------------------------------------------
class TestLicenseSAMIntegration:
    """Register a license and verify SAM compliance check reflects it."""

    async def test_compliant_license_passes_check(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ):
        create_resp = await client.post(
            "/api/v1/sam/licenses",
            headers=auth_headers,
            json={
                "software_name": f"IntegTest-SW-{uuid.uuid4().hex[:6]}",
                "vendor": "TestVendor",
                "license_type": "subscription",
                "purchased_count": 100,
                "installed_count": 50,
                "m365_assigned": 0,
            },
        )
        assert create_resp.status_code == 201
        license_id = create_resp.json()["id"]

        # Run compliance check
        compliance_resp = await client.post(
            "/api/v1/sam/compliance/check", headers=auth_headers
        )
        assert compliance_resp.status_code == 200
        results = compliance_resp.json()
        target = [r for r in results if r["license_id"] == license_id]
        assert len(target) == 1
        assert target[0]["is_compliant"] is True
        assert target[0]["over_deployed"] == 0

    async def test_over_deployed_license_fails_check(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ):
        create_resp = await client.post(
            "/api/v1/sam/licenses",
            headers=auth_headers,
            json={
                "software_name": f"OverDeploy-{uuid.uuid4().hex[:6]}",
                "vendor": "TestVendor",
                "license_type": "perpetual",
                "purchased_count": 10,
                "installed_count": 25,
                "m365_assigned": 0,
            },
        )
        assert create_resp.status_code == 201
        license_id = create_resp.json()["id"]

        compliance_resp = await client.get(
            "/api/v1/sam/compliance", headers=auth_headers
        )
        assert compliance_resp.status_code == 200
        results = compliance_resp.json()
        target = [r for r in results if r["license_id"] == license_id]
        assert len(target) == 1
        assert target[0]["is_compliant"] is False
        assert target[0]["over_deployed"] == 15


# ---------------------------------------------------------------------------
# 4. Procurement lifecycle: create -> submit -> approve -> order -> receive
# ---------------------------------------------------------------------------
class TestProcurementLifecycleIntegration:
    """Test the full procurement request lifecycle end-to-end."""

    async def test_full_procurement_lifecycle(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ):
        # 1. Create
        create_resp = await client.post(
            "/api/v1/procurement",
            headers=auth_headers,
            json={
                "item_name": "Dell Latitude 5560",
                "category": "hardware",
                "quantity": 5,
                "unit_price": "120000",
                "department": "Engineering",
                "purpose": "Developer laptop refresh",
            },
        )
        assert create_resp.status_code == 201
        proc = create_resp.json()
        proc_id = proc["id"]
        assert proc["status"] == "draft"
        assert proc["total_price"] == "600000.00"

        # 2. Submit for approval
        submit_resp = await client.post(
            f"/api/v1/procurement/{proc_id}/submit",
            headers=auth_headers,
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "submitted"

        # 3. Approve
        approve_resp = await client.post(
            f"/api/v1/procurement/{proc_id}/approve",
            headers=auth_headers,
        )
        assert approve_resp.status_code == 200
        approved = approve_resp.json()
        assert approved["status"] == "approved"
        assert approved["approver_id"] is not None
        assert approved["approved_at"] is not None

        # 4. Order
        order_resp = await client.post(
            f"/api/v1/procurement/{proc_id}/order",
            headers=auth_headers,
        )
        assert order_resp.status_code == 200
        assert order_resp.json()["status"] == "ordered"
        assert order_resp.json()["ordered_at"] is not None

        # 5. Receive
        receive_resp = await client.post(
            f"/api/v1/procurement/{proc_id}/receive",
            headers=auth_headers,
        )
        assert receive_resp.status_code == 200
        assert receive_resp.json()["status"] == "received"
        assert receive_resp.json()["received_at"] is not None

    async def test_procurement_appears_in_list_after_creation(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ):
        create_resp = await client.post(
            "/api/v1/procurement",
            headers=auth_headers,
            json={
                "item_name": f"IntegTest-Item-{uuid.uuid4().hex[:6]}",
                "category": "software",
                "quantity": 1,
                "unit_price": "5000",
                "department": "IT",
                "purpose": "Integration testing",
            },
        )
        assert create_resp.status_code == 201
        proc_id = create_resp.json()["id"]

        list_resp = await client.get(
            "/api/v1/procurement", headers=auth_headers
        )
        assert list_resp.status_code == 200
        ids = [p["id"] for p in list_resp.json()["items"]]
        assert proc_id in ids

    async def test_pending_procurements_reflected_in_dashboard(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ):
        # Create and submit a procurement request (it becomes "submitted")
        create_resp = await client.post(
            "/api/v1/procurement",
            headers=auth_headers,
            json={
                "item_name": "Dashboard Test Item",
                "category": "consumable",
                "quantity": 10,
                "unit_price": "500",
                "department": "Marketing",
                "purpose": "Dashboard integration test",
            },
        )
        proc_id = create_resp.json()["id"]
        await client.post(
            f"/api/v1/procurement/{proc_id}/submit", headers=auth_headers
        )

        stats_resp = await client.get(
            "/api/v1/dashboard/stats", headers=auth_headers
        )
        assert stats_resp.status_code == 200
        assert stats_resp.json()["pending_procurements"] >= 1


# ---------------------------------------------------------------------------
# 5. Alert lifecycle: create -> acknowledge -> resolve
# ---------------------------------------------------------------------------
class TestAlertLifecycleIntegration:
    """Test the full alert lifecycle from creation to resolution."""

    async def test_full_alert_lifecycle(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ):
        # 1. Create alert
        create_resp = await client.post(
            "/api/v1/alerts",
            headers=auth_headers,
            json={
                "severity": "critical",
                "category": "security",
                "title": "Integration Test Alert",
                "message": "This is a test alert for integration testing.",
            },
        )
        assert create_resp.status_code == 201
        alert = create_resp.json()
        alert_id = alert["id"]
        assert alert["is_acknowledged"] is False
        assert alert["resolved_at"] is None

        # 2. Verify it appears in alert list
        list_resp = await client.get("/api/v1/alerts", headers=auth_headers)
        assert list_resp.status_code == 200
        ids = [a["id"] for a in list_resp.json()["items"]]
        assert alert_id in ids

        # 3. Verify alert stats reflect it
        stats_resp = await client.get(
            "/api/v1/alerts/stats", headers=auth_headers
        )
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["critical"] >= 1
        assert stats["unacknowledged"] >= 1
        assert stats["unresolved"] >= 1

        # 4. Acknowledge
        ack_resp = await client.patch(
            f"/api/v1/alerts/{alert_id}/acknowledge",
            headers=auth_headers,
        )
        assert ack_resp.status_code == 200
        assert ack_resp.json()["is_acknowledged"] is True
        assert ack_resp.json()["acknowledged_at"] is not None

        # 5. Resolve
        resolve_resp = await client.patch(
            f"/api/v1/alerts/{alert_id}/resolve",
            headers=auth_headers,
        )
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["resolved_at"] is not None

    async def test_cannot_acknowledge_already_acknowledged_alert(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ):
        create_resp = await client.post(
            "/api/v1/alerts",
            headers=auth_headers,
            json={
                "severity": "warning",
                "category": "hardware",
                "title": "Double-ack test",
                "message": "Testing double acknowledgement.",
            },
        )
        alert_id = create_resp.json()["id"]

        # First ack succeeds
        await client.patch(
            f"/api/v1/alerts/{alert_id}/acknowledge", headers=auth_headers
        )

        # Second ack should fail
        resp = await client.patch(
            f"/api/v1/alerts/{alert_id}/acknowledge", headers=auth_headers
        )
        assert resp.status_code == 400

    async def test_resolve_auto_acknowledges(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ):
        create_resp = await client.post(
            "/api/v1/alerts",
            headers=auth_headers,
            json={
                "severity": "info",
                "category": "network",
                "title": "Auto-ack test",
                "message": "Resolving without explicit ack.",
            },
        )
        alert_id = create_resp.json()["id"]

        # Resolve directly without acknowledging first
        resolve_resp = await client.patch(
            f"/api/v1/alerts/{alert_id}/resolve", headers=auth_headers
        )
        assert resolve_resp.status_code == 200
        resolved = resolve_resp.json()
        assert resolved["is_acknowledged"] is True
        assert resolved["resolved_at"] is not None


# ---------------------------------------------------------------------------
# 6. User creation -> Role-based access control
# ---------------------------------------------------------------------------
class TestUserRoleIntegration:
    """Create users with different roles and verify access control."""

    async def test_register_user_and_login(
        self, client: AsyncClient
    ):
        email = f"integ-{uuid.uuid4().hex[:6]}@aegis-sight.local"
        password = "SecurePass123!"

        # Register
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "full_name": "Integration Tester",
                "role": "readonly",
            },
        )
        assert reg_resp.status_code == 201
        user_data = reg_resp.json()
        assert user_data["email"] == email
        assert user_data["role"] == "readonly"

        # Login
        login_resp = await client.post(
            "/api/v1/auth/token",
            data={"username": email, "password": password},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        assert token is not None

        # Use token to access /auth/me
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email

    async def test_admin_can_list_and_update_users(
        self,
        client: AsyncClient,
        admin_headers: dict[str, str],
    ):
        # Register a user first
        email = f"integ-target-{uuid.uuid4().hex[:6]}@aegis-sight.local"
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "Pass123!",
                "full_name": "Target User",
                "role": "readonly",
            },
        )
        user_id = reg_resp.json()["id"]

        # Admin can list users
        list_resp = await client.get("/api/v1/users", headers=admin_headers)
        assert list_resp.status_code == 200

        # Admin can update user role
        update_resp = await client.patch(
            f"/api/v1/users/{user_id}",
            headers=admin_headers,
            json={"role": "operator"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["role"] == "operator"

    async def test_readonly_cannot_list_users(
        self,
        client: AsyncClient,
        readonly_headers: dict[str, str],
    ):
        resp = await client.get("/api/v1/users", headers=readonly_headers)
        assert resp.status_code == 403

    async def test_readonly_can_read_assets(
        self,
        client: AsyncClient,
        readonly_headers: dict[str, str],
    ):
        resp = await client.get("/api/v1/assets", headers=readonly_headers)
        assert resp.status_code == 200
