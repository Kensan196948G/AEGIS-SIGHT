"""Tests for the database management API endpoints."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.user import User


# ---------------------------------------------------------------------------
# GET /api/v1/database/stats
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestDatabaseStats:
    async def test_admin_can_get_stats(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/database/stats", headers=admin_headers)
        assert resp.status_code == 200

        data = resp.json()
        assert "tables" in data
        table_names = [t["table"] for t in data["tables"]]
        assert "logon_events" in table_names
        assert "audit_logs" in table_names

        for table in data["tables"]:
            assert "row_count" in table
            assert "size" in table

    async def test_non_admin_forbidden(
        self, client: AsyncClient, operator_headers: dict
    ):
        resp = await client.get("/api/v1/database/stats", headers=operator_headers)
        assert resp.status_code == 403

    async def test_unauthenticated_rejected(self, client: AsyncClient):
        resp = await client.get("/api/v1/database/stats")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# GET /api/v1/database/retention
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestRetentionPolicies:
    async def test_admin_can_get_policies(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/database/retention", headers=admin_headers)
        assert resp.status_code == 200

        data = resp.json()
        assert "policies" in data
        assert len(data["policies"]) >= 3

        targets = [p["target"] for p in data["policies"]]
        # Check that all policy categories are present
        assert any("logon" in t.lower() or "log" in t.lower() for t in targets)
        assert any("snapshot" in t.lower() or "hardware" in t.lower() for t in targets)
        assert any("audit" in t.lower() for t in targets)

    async def test_non_admin_forbidden(
        self, client: AsyncClient, readonly_headers: dict
    ):
        resp = await client.get("/api/v1/database/retention", headers=readonly_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/v1/database/retention/run
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestRetentionRun:
    async def test_admin_can_run_cleanup(
        self, client: AsyncClient, admin_headers: dict
    ):
        body = {
            "cleanup_logs": True,
            "cleanup_snapshots": True,
            "archive_audit": False,
            "log_retention_days": 1095,
            "snapshot_retention_days": 365,
        }
        resp = await client.post(
            "/api/v1/database/retention/run",
            json=body,
            headers=admin_headers,
        )
        assert resp.status_code == 200

        data = resp.json()
        assert "logs" in data
        assert "snapshots" in data
        assert data.get("audit") is None  # archive_audit was False

    async def test_selective_cleanup(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Only run snapshot cleanup."""
        body = {
            "cleanup_logs": False,
            "cleanup_snapshots": True,
            "archive_audit": False,
        }
        resp = await client.post(
            "/api/v1/database/retention/run",
            json=body,
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("logs") is None
        assert data.get("snapshots") is not None

    async def test_non_admin_forbidden(
        self, client: AsyncClient, operator_headers: dict
    ):
        resp = await client.post(
            "/api/v1/database/retention/run",
            json={"cleanup_logs": True},
            headers=operator_headers,
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/v1/database/health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestDatabaseHealth:
    async def test_admin_can_get_health(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/database/health", headers=admin_headers)
        assert resp.status_code == 200

        data = resp.json()
        assert "status" in data
        assert data["status"] in ("ok", "degraded")
        assert "connection_pool" in data

        pool = data["connection_pool"]
        assert "pool_size" in pool
        assert "checked_in" in pool
        assert "checked_out" in pool

    async def test_non_admin_forbidden(
        self, client: AsyncClient, auditor_headers: dict
    ):
        resp = await client.get("/api/v1/database/health", headers=auditor_headers)
        assert resp.status_code == 403
