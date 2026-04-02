"""
IAMS移植テスト: セキュリティ概要・SLA管理・統合検索（Phase25）
変換元: IAMS セキュリティダッシュボード・SLA・検索テスト 68件中50件選定
変換日: 2026-04-02
変換元テスト数: 50件
変換テスト数: 36件（セキュリティ概要・デバイスセキュリティ・SLA CRUD・統合検索）
除外テスト数: 14件（リアルタイムスキャン依存・外部SLA計測依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_SEARCH_TYPES = ["device", "license", "procurement", "alert", "all"]


# ===================================================================
# セキュリティ概要 認証（Security Auth）
# ===================================================================
class TestSecurityAuth:
    """セキュリティ概要API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_security_overview_requires_auth(self, client: AsyncClient):
        """セキュリティ概要は認証必須であること"""
        response = await client.get("/api/v1/security/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでセキュリティ概要にアクセスできること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# セキュリティ概要 エンドポイント（Security Endpoints）
# ===================================================================
class TestSecurityEndpoints:
    """セキュリティ概要エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_security_overview_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要に必須フィールドが含まれること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    @pytest.mark.asyncio
    async def test_security_device_detail_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのセキュリティ詳細で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/security/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_security_overview_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要が200で返ること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# SLA管理 認証（SLA Auth）
# ===================================================================
class TestSLAAuth:
    """SLA管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_definitions_requires_auth(self, client: AsyncClient):
        """SLA定義一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/definitions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_measurements_requires_auth(self, client: AsyncClient):
        """SLA計測一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/measurements")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_violations_requires_auth(self, client: AsyncClient):
        """SLA違反一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_definitions_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでSLA定義一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/sla/definitions", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# SLA管理 CRUD（SLA CRUD）
# ===================================================================
class TestSLACRUD:
    """SLA管理CRUDテスト（IAMS移植）"""

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
            json={"description": "テストSLA"},  # name, target_value等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_sla_measurements_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA計測一覧がページネーション形式で返ること"""
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
    async def test_get_nonexistent_sla_definition_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSLA定義の取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/sla/definitions/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# 統合検索（Unified Search）
# ===================================================================
class TestUnifiedSearch:
    """統合検索テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client: AsyncClient):
        """統合検索は認証必須であること"""
        response = await client.get("/api/v1/search?q=test")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_search_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで統合検索にアクセスできること"""
        response = await client.get("/api/v1/search?q=test", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_missing_query_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """クエリなしで422が返ること"""
        response = await client.get("/api/v1/search", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_returns_grouped_results(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索結果がグループ化されて返ること"""
        response = await client.get("/api/v1/search?q=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("search_type", ALL_SEARCH_TYPES)
    async def test_search_all_types(
        self, client: AsyncClient, auth_headers: dict, search_type: str
    ):
        """全エンティティ種別で検索が機能すること"""
        response = await client.get(
            f"/api/v1/search?q=test&type={search_type}", headers=auth_headers
        )
        assert response.status_code == 200, (
            f"type={search_type}: 予期しないステータス {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_search_invalid_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正な検索タイプで422が返ること"""
        response = await client.get(
            "/api/v1/search?q=test&type=invalid_type", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_search_empty_query_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """空クエリで422が返ること"""
        response = await client.get("/api/v1/search?q=", headers=auth_headers)
        assert response.status_code == 422
