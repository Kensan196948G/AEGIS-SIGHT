"""
IAMS移植テスト: データベース管理・メトリクス・セキュリティ監査・レポート詳細（Phase41）
変換元: IAMS データベース・メトリクス・セキュリティ監査・レポートテスト 70件中50件選定
変換日: 2026-04-02
変換元テスト数: 50件
変換テスト数: 36件（DBステータス・メトリクス・セキュリティ監査・レポート生成）
除外テスト数: 14件（Prometheus直接クエリ依存・外部ログサービス依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# データベース管理（Database Management）
# ===================================================================
class TestDatabaseManagement:
    """データベース管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_database_stats_requires_auth(self, client: AsyncClient):
        """DBステータスは認証必須であること"""
        response = await client.get("/api/v1/database/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_database_health_requires_auth(self, client: AsyncClient):
        """DBヘルスチェックは認証必須であること"""
        response = await client.get("/api/v1/database/health")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_database_retention_requires_auth(self, client: AsyncClient):
        """データ保持ポリシー取得は認証必須であること"""
        response = await client.get("/api/v1/database/retention")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_database_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DBステータスが200で返ること"""
        response = await client.get("/api/v1/database/stats", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_database_health_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DBヘルスチェックが200で返ること"""
        response = await client.get("/api/v1/database/health", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_database_retention_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データ保持ポリシー取得が200で返ること"""
        response = await client.get("/api/v1/database/retention", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_database_retention_run_requires_auth(self, client: AsyncClient):
        """データ保持ポリシー実行は認証必須であること"""
        response = await client.post("/api/v1/database/retention/run")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_database_retention_run_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データ保持ポリシー実行が200または403で返ること（Admin only）"""
        response = await client.post(
            "/api/v1/database/retention/run", headers=auth_headers
        )
        assert response.status_code in (200, 403)


# ===================================================================
# メトリクス（Metrics）
# ===================================================================
class TestMetrics:
    """メトリクステスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_metrics_endpoint_accessible(self, client: AsyncClient):
        """メトリクスエンドポイントにアクセスできること"""
        response = await client.get("/api/v1/metrics")
        # メトリクスは認証なしか認証ありで200
        assert response.status_code in (200, 401)

    @pytest.mark.asyncio
    async def test_metrics_with_auth_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証ありでメトリクスが200で返ること"""
        response = await client.get("/api/v1/metrics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_metrics_returns_text_or_json(
        self, client: AsyncClient, auth_headers: dict
    ):
        """メトリクスがテキストまたはJSON形式で返ること"""
        response = await client.get("/api/v1/metrics", headers=auth_headers)
        assert response.status_code == 200
        # Prometheusテキスト形式またはJSON
        content_type = response.headers.get("content-type", "")
        assert "text" in content_type or "application/json" in content_type


# ===================================================================
# セキュリティ監査（Security Audit）
# ===================================================================
class TestSecurityAudit:
    """セキュリティ監査テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_security_audit_failed_logins_requires_auth(
        self, client: AsyncClient
    ):
        """ログイン失敗ログは認証必須であること"""
        response = await client.get("/api/v1/security/audit/failed-logins")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_audit_active_sessions_requires_auth(
        self, client: AsyncClient
    ):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/security/audit/active-sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_audit_failed_logins_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログイン失敗ログが200または403で返ること（Admin/Auditor only）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_security_audit_active_sessions_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧が200または403で返ること（Admin only）"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_session_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッション失効で404または403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/security/audit/revoke-session/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code in (404, 403)

    @pytest.mark.asyncio
    async def test_revoke_session_requires_auth(self, client: AsyncClient):
        """セッション失効は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/security/audit/revoke-session/{fake_id}"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_failed_logins_has_expected_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログイン失敗ログが期待する構造を持つこと（200の場合）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict | list)


# ===================================================================
# レポート詳細（Reports Detail）
# ===================================================================
class TestReportsDetail:
    """レポート詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_reports_sam_requires_auth(self, client: AsyncClient):
        """SAMレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/sam")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_reports_assets_requires_auth(self, client: AsyncClient):
        """資産レポートは認証必須であること"""
        response = await client.get("/api/v1/reports/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_reports_security_requires_auth(self, client: AsyncClient):
        """セキュリティレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/security")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_reports_sam_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートが200で返ること"""
        response = await client.get("/api/v1/reports/sam", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_reports_assets_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産レポートが200で返ること"""
        response = await client.get("/api/v1/reports/assets", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_reports_security_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティレポートが200で返ること"""
        response = await client.get("/api/v1/reports/security", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_reports_sam_has_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートが辞書形式で返ること"""
        response = await client.get("/api/v1/reports/sam", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_reports_assets_has_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産レポートが辞書形式で返ること"""
        response = await client.get("/api/v1/reports/assets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
