"""
IAMS移植テスト: インシデント管理・SLA管理・バッチ処理・DLP・タグ管理詳細（Phase44）
変換元: IAMS インシデント・SLA・バッチ・DLP・タグテスト 80件中58件選定
変換日: 2026-04-02
変換元テスト数: 58件
変換テスト数: 36件（インシデントCRUD・SLA定義・バッチインポート・DLPルール・タグ管理）
除外テスト数: 22件（外部SIEM連携依存・リアルタイムアラート依存・バッチジョブ実行状態依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# インシデント管理詳細（Incidents Detail）
# ===================================================================
class TestIncidentsDetail:
    """インシデント管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_incidents_requires_auth(self, client: AsyncClient):
        """インシデント一覧は認証必須であること"""
        response = await client.get("/api/v1/incidents")
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
    async def test_incidents_stats_requires_auth(self, client: AsyncClient):
        """インシデント統計は認証必須であること"""
        response = await client.get("/api/v1/incidents/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_incidents_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデント統計が200で返ること"""
        response = await client.get("/api/v1/incidents/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_incidents_threats_requires_auth(self, client: AsyncClient):
        """脅威インシデント一覧は認証必須であること"""
        response = await client.get("/api/v1/incidents/threats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_incidents_threats_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脅威インシデント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/incidents/threats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

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
    async def test_assign_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデントのアサインで404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/incidents/{fake_id}/assign",
            json={"assignee_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデントの解決で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/incidents/{fake_id}/resolve",
            json={"resolution": "テスト解決"},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# SLA管理詳細（SLA Management Detail）
# ===================================================================
class TestSLAManagementDetail:
    """SLA管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_definitions_requires_auth(self, client: AsyncClient):
        """SLA定義一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/definitions")
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
    async def test_get_nonexistent_sla_definition_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSLA定義取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/sla/definitions/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_sla_violations_requires_auth(self, client: AsyncClient):
        """SLA違反一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_violations_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA違反一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/violations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_sla_dashboard_requires_auth(self, client: AsyncClient):
        """SLAダッシュボードは認証必須であること"""
        response = await client.get("/api/v1/sla/dashboard")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_dashboard_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAダッシュボードが200で返ること"""
        response = await client.get("/api/v1/sla/dashboard", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# バッチ処理詳細（Batch Processing Detail）
# ===================================================================
class TestBatchProcessingDetail:
    """バッチ処理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_batch_jobs_requires_auth(self, client: AsyncClient):
        """バッチジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/batch/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/batch/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_batch_import_devices_requires_auth(self, client: AsyncClient):
        """デバイス一括インポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/devices", json=[])
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_export_devices_requires_auth(self, client: AsyncClient):
        """デバイス一括エクスポートは認証必須であること"""
        response = await client.get("/api/v1/batch/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_import_licenses_requires_auth(self, client: AsyncClient):
        """ライセンス一括インポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/licenses", json=[])
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_export_licenses_requires_auth(self, client: AsyncClient):
        """ライセンス一括エクスポートは認証必須であること"""
        response = await client.get("/api/v1/batch/export/licenses")
        assert response.status_code == 401


# ===================================================================
# DLP（データ漏洩防止）詳細（DLP Detail）
# ===================================================================
class TestDLPDetail:
    """DLP詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dlp_rules_requires_auth(self, client: AsyncClient):
        """DLPルール一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/rules")
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
    async def test_get_nonexistent_dlp_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないDLPルール取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/dlp/rules/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_dlp_events_requires_auth(self, client: AsyncClient):
        """DLPイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/events")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dlp_events_returns_paginated(
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
        response = await client.get("/api/v1/dlp/events/summary", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# タグ管理詳細（Tags Detail）
# ===================================================================
class TestTagsDetail:
    """タグ管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_tags_requires_auth(self, client: AsyncClient):
        """タグ一覧は認証必須であること"""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_tags_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグ取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/tags/{fake_id}", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_tag_entities_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグのエンティティ取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/tags/{fake_id}/entities", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_assign_tag_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でタグアサインが422を返すこと"""
        response = await client.post(
            "/api/v1/tags/assign",
            json={"notes": "テスト"},  # tag_id, entity_id等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422
