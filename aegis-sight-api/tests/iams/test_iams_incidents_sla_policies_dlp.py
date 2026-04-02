"""
IAMS移植テスト: インシデント管理・SLA管理・ポリシー管理・DLP（Phase34）
変換元: IAMS インシデント・SLA・ポリシー・DLP テスト 78件中56件選定
変換日: 2026-04-02
変換元テスト数: 56件
変換テスト数: 36件（インシデント管理・SLA定義・ポリシーCRUD・DLPルール）
除外テスト数: 20件（外部SIEM連携依存・物理インシデント対応プロセス依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# インシデント管理（Incidents）
# ===================================================================
class TestIncidents:
    """インシデント管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_incidents_requires_auth(self, client: AsyncClient):
        """インシデント一覧は認証必須であること"""
        response = await client.get("/api/v1/incidents")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_incidents_stats_requires_auth(self, client: AsyncClient):
        """インシデント統計は認証必須であること"""
        response = await client.get("/api/v1/incidents/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_incidents_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_incident_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でインシデント作成が422を返すこと"""
        response = await client.post(
            "/api/v1/incidents",
            json={"description": "テストインシデント"},  # title, severity等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_incidents_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデント統計が200で返ること"""
        response = await client.get("/api/v1/incidents/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_threats_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脅威インジケーター一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/incidents/threats", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_threat_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で脅威作成が422を返すこと"""
        response = await client.post(
            "/api/v1/incidents/threats",
            json={"description": "テスト脅威"},  # type, value等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデント取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/incidents/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデントの解決で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/incidents/{fake_id}/resolve", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# SLA管理（SLA Management）
# ===================================================================
class TestSLAManagement:
    """SLA管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_definitions_requires_auth(self, client: AsyncClient):
        """SLA定義一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/definitions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_violations_requires_auth(self, client: AsyncClient):
        """SLA違反一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sla_definitions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA定義一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/definitions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_sla_definition_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でSLA定義作成が422を返すこと"""
        response = await client.post(
            "/api/v1/sla/definitions",
            json={"description": "テストSLA"},  # name, metric_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_sla_measurements_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA測定値一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/measurements", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_sla_violations_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA違反一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/violations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_sla_dashboard_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAダッシュボードが200で返ること"""
        response = await client.get("/api/v1/sla/dashboard", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sla_report_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAレポートが200で返ること"""
        response = await client.get("/api/v1/sla/report", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_nonexistent_sla_definition_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSLA定義更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sla/definitions/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# ポリシー管理（Policies）
# ===================================================================
class TestPolicies:
    """ポリシー管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_policies_requires_auth(self, client: AsyncClient):
        """ポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_policies_violations_requires_auth(self, client: AsyncClient):
        """ポリシー違反一覧は認証必須であること"""
        response = await client.get("/api/v1/policies/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_policy_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でポリシー作成が422を返すこと"""
        response = await client.post(
            "/api/v1/policies",
            json={"description": "テストポリシー"},  # name, type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_violations_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー違反一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/policies/violations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_policies_compliance_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシーコンプライアンスサマリーが200で返ること"""
        response = await client.get(
            "/api/v1/policies/compliance", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_policy_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシー取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/policies/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_policy_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシー更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/policies/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_policy_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシー削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/policies/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_policy_violations_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシーの違反一覧取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/policies/{fake_id}/violations", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# DLP（Data Loss Prevention）
# ===================================================================
class TestDLP:
    """DLPテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dlp_rules_requires_auth(self, client: AsyncClient):
        """DLPルール一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dlp_events_requires_auth(self, client: AsyncClient):
        """DLPイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/events")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_dlp_rules_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPルール一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_dlp_rule_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でDLPルール作成が422を返すこと"""
        response = await client.post(
            "/api/v1/dlp/rules",
            json={"description": "テストルール"},  # name, action等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_dlp_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_dlp_events_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPイベントサマリーが200で返ること"""
        response = await client.get(
            "/api/v1/dlp/events/summary", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_delete_nonexistent_dlp_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないDLPルール削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/dlp/rules/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404
