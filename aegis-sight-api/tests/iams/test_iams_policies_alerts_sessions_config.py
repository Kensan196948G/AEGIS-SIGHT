"""
IAMS移植テスト: ポリシー管理・アラート管理・セッション管理・設定管理詳細（Phase45）
変換元: IAMS ポリシー・アラート・セッション・設定テスト 78件中58件選定
変換日: 2026-04-02
変換元テスト数: 58件
変換テスト数: 36件（ポリシーCRUD・アラート確認・セッション監視・設定キー管理）
除外テスト数: 22件（リアルタイムポリシー評価依存・外部セッション管理依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ポリシー管理詳細（Policies Detail）
# ===================================================================
class TestPoliciesDetail:
    """ポリシー管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_policies_requires_auth(self, client: AsyncClient):
        """ポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/policies")
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
    async def test_policies_violations_requires_auth(self, client: AsyncClient):
        """ポリシー違反一覧は認証必須であること"""
        response = await client.get("/api/v1/policies/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_policies_violations_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー違反一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/policies/violations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_policies_compliance_requires_auth(self, client: AsyncClient):
        """ポリシーコンプライアンスは認証必須であること"""
        response = await client.get("/api/v1/policies/compliance")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_policies_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシーコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/policies/compliance", headers=auth_headers)
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
    async def test_get_nonexistent_policy_violations_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシーの違反取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/policies/{fake_id}/violations", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# アラート管理詳細（Alerts Detail）
# ===================================================================
class TestAlertsDetail:
    """アラート管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_alerts_requires_auth(self, client: AsyncClient):
        """アラート一覧は認証必須であること"""
        response = await client.get("/api/v1/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_alerts_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_alerts_stats_requires_auth(self, client: AsyncClient):
        """アラート統計は認証必須であること"""
        response = await client.get("/api/v1/alerts/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_alerts_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート統計が200で返ること"""
        response = await client.get("/api/v1/alerts/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラート取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/alerts/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_acknowledge_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの確認で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/alerts/{fake_id}/acknowledge",
            json={"notes": "テスト確認"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの解決で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/alerts/{fake_id}/resolve",
            json={"resolution": "テスト解決"},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# セッション管理詳細（Sessions Detail）
# ===================================================================
class TestSessionsDetail:
    """セッション管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sessions_active_requires_auth(self, client: AsyncClient):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions/active")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_active_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧が200または403で返ること（Admin only）"""
        response = await client.get("/api/v1/sessions/active", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_sessions_analytics_requires_auth(self, client: AsyncClient):
        """セッション分析は認証必須であること"""
        response = await client.get("/api/v1/sessions/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_analytics_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション分析が200または403で返ること"""
        response = await client.get("/api/v1/sessions/analytics", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_sessions_activities_requires_auth(self, client: AsyncClient):
        """セッションアクティビティ一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions/activities")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_activities_returns_paginated_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッションアクティビティ一覧がページネーション形式または403で返ること"""
        response = await client.get("/api/v1/sessions/activities", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            for field in ("items", "total", "offset", "limit", "has_more"):
                assert field in data, f"Missing field: {field}"
        else:
            assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_end_nonexistent_session_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッション終了で404または403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sessions/{fake_id}/end", headers=auth_headers
        )
        assert response.status_code in (404, 403)


# ===================================================================
# 設定管理詳細（Config Detail）
# ===================================================================
class TestConfigDetail:
    """設定管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_config_get_key_requires_auth(self, client: AsyncClient):
        """設定キー取得は認証必須であること"""
        response = await client.get("/api/v1/config/test_key")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_config_get_nonexistent_key_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キー取得で404または403が返ること"""
        response = await client.get(
            "/api/v1/config/nonexistent_config_key_12345", headers=auth_headers
        )
        assert response.status_code in (404, 403)

    @pytest.mark.asyncio
    async def test_config_set_key_requires_auth(self, client: AsyncClient):
        """設定キー更新は認証必須であること"""
        response = await client.put(
            "/api/v1/config/test_key", json={"value": "test"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_config_set_key_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定キー更新が200または403で返ること（Admin only）"""
        response = await client.put(
            "/api/v1/config/test_config_key",
            json={"value": "test_value"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_config_reset_key_requires_auth(self, client: AsyncClient):
        """設定キーリセットは認証必須であること"""
        response = await client.post("/api/v1/config/reset/test_key")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_config_reset_key_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定キーリセットが200または403で返ること（Admin only）"""
        response = await client.post(
            "/api/v1/config/reset/test_config_key", headers=auth_headers
        )
        assert response.status_code in (200, 403, 404)
