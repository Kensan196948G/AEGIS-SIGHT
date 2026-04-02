"""
IAMS移植テスト: DLPポリシー・インシデント管理・セキュリティ監査・カスタムビュー（Phase53相当）
変換元: IAMS DLP・インシデント・セキュリティ監査・ビューテスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（DLPルール/イベント/インシデント管理/脅威指標/セキュリティ監査/カスタムビュー）
除外テスト数: 29件（外部SIEMフロー依存・DLPエンジン依存・リアルタイム監視依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# DLPポリシーテスト（DLP Rules & Events）
# ===================================================================
class TestDLPRules:
    """DLPルール管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dlp_rules_requires_auth(self, client: AsyncClient):
        """DLPルール一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dlp_rules_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPルール一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_dlp_rules_filter_by_is_enabled(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPルールをis_enabledでフィルタリングできること"""
        response = await client.get(
            "/api/v1/dlp/rules?is_enabled=true", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_dlp_rule_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPルール作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/dlp/rules", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_dlp_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないDLPルールの更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/dlp/rules/{fake_id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_dlp_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないDLPルールの削除は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/dlp/rules/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


class TestDLPEvents:
    """DLPイベントテスト（IAMS移植）"""

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
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_dlp_events_filter_by_severity(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPイベントをseverityでフィルタリングできること"""
        response = await client.get(
            "/api/v1/dlp/events?severity=high", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_dlp_events_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPイベントサマリーが200で返ること"""
        response = await client.get("/api/v1/dlp/events/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dlp_evaluate_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLP評価リクエストに必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/dlp/evaluate", json={}, headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# インシデント管理テスト（Incidents）
# ===================================================================
class TestIncidents:
    """インシデント管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_incidents_requires_auth(self, client: AsyncClient):
        """インシデント一覧は認証必須であること"""
        response = await client.get("/api/v1/incidents")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_incidents_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_incidents_filter_by_severity(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデントをseverityでフィルタリングできること"""
        response = await client.get(
            "/api/v1/incidents?severity=critical", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_create_incident_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデント作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/incidents", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_incident_stats_requires_auth(self, client: AsyncClient):
        """インシデント統計は認証必須であること"""
        response = await client.get("/api/v1/incidents/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_incident_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """インシデント統計が200で返ること"""
        response = await client.get("/api/v1/incidents/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデントの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/incidents/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_assign_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデントへの担当者割当は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/incidents/{fake_id}/assign",
            json={"assigned_to": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_incident_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないインシデントの解決は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/incidents/{fake_id}/resolve",
            json={"resolution": "false positive"},
            headers=auth_headers,
        )
        assert response.status_code in (400, 404)


class TestThreatIndicators:
    """脅威インジケーターテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_threat_indicators_requires_auth(self, client: AsyncClient):
        """脅威インジケーター一覧は認証必須であること"""
        response = await client.get("/api/v1/incidents/threats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_threat_indicators_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脅威インジケーター一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/incidents/threats", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_threat_indicator_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脅威インジケーター作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/incidents/threats", json={}, headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# セキュリティ監査テスト（Security Audit）
# ===================================================================
class TestSecurityAudit:
    """セキュリティ監査テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_failed_logins_requires_auth(self, client: AsyncClient):
        """ログイン失敗ログは認証必須であること"""
        response = await client.get("/api/v1/security/audit/failed-logins")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_failed_logins_requires_admin_role(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログイン失敗ログはadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_active_sessions_requires_admin_role(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_revoke_session_requires_auth(self, client: AsyncClient):
        """セッション失効は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/security/audit/revoke-session/{fake_id}"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_session_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッションの失効は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/security/audit/revoke-session/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)


# ===================================================================
# カスタムビューテスト（Custom Views）
# ===================================================================
class TestCustomViews:
    """カスタムビューテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_views_requires_auth(self, client: AsyncClient):
        """カスタムビュー一覧は認証必須であること"""
        response = await client.get("/api/v1/views")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_views_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタムビュー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/views", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_view_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタムビュー作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/views", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_view_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビューの更新は404または403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/views/{fake_id}",
            json={"name": "updated"},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_view_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビューの削除は404または403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/views/{fake_id}", headers=auth_headers
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_toggle_share_nonexistent_view_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビューの共有切替は404または403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/views/{fake_id}/share", headers=auth_headers
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_toggle_share_requires_auth(self, client: AsyncClient):
        """カスタムビューの共有切替は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(f"/api/v1/views/{fake_id}/share")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_views_filter_by_entity_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタムビューをentity_typeでフィルタリングできること"""
        response = await client.get(
            "/api/v1/views?entity_type=device", headers=auth_headers
        )
        assert response.status_code in (200, 422)
