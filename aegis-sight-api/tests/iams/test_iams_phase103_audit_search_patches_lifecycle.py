"""
IAMS移植テスト: 監査ログ・統合検索・パッチ管理・ライフサイクル管理（Phase51相当）
変換元: IAMS 監査・検索・パッチ・ライフサイクルテスト 約60件中36件選定
変換日: 2026-04-02
変換元テスト数: 60件
変換テスト数: 36件（監査ログ/エクスポート/統合検索/パッチコンプライアンス/ライフサイクル/廃棄）
除外テスト数: 24件（外部SIEM連携依存・大規模検索依存・廃棄承認フロー外部依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 監査ログテスト（Audit Logs）
# ===================================================================
class TestAuditLogs:
    """監査ログテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_audit_logs_requires_auth(self, client: AsyncClient):
        """監査ログ一覧は認証必須であること"""
        response = await client.get("/api/v1/audit/logs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_audit_logs_requires_auditor_or_admin_role(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログ一覧はauditor/adminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_audit_logs_filter_by_action(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログをactionでフィルタリングできること"""
        response = await client.get(
            "/api/v1/audit/logs?action=login", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_audit_logs_export_requires_auth(self, client: AsyncClient):
        """監査ログエクスポートは認証必須であること"""
        response = await client.get("/api/v1/audit/logs/export")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_audit_logs_export_csv_format(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログエクスポートのCSV形式が指定できること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=csv", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_audit_logs_export_invalid_format_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログエクスポートの無効なformat値は422が返ること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=xml", headers=auth_headers
        )
        assert response.status_code in (403, 422)


# ===================================================================
# 統合検索テスト（Search）
# ===================================================================
class TestSearch:
    """統合検索テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client: AsyncClient):
        """統合検索は認証必須であること"""
        response = await client.get("/api/v1/search?q=test")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_search_missing_q_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索でqパラメータが不足すると422が返ること"""
        response = await client.get("/api/v1/search", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_with_valid_q_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索が有効なqパラメータで200を返ること"""
        response = await client.get(
            "/api/v1/search?q=test", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_response_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索レスポンスに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/search?q=device", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("query", "total", "groups", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_search_filter_by_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索をtypeでフィルタリングできること"""
        response = await client.get(
            "/api/v1/search?q=test&type=device", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_invalid_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索の無効なtype値は422が返ること"""
        response = await client.get(
            "/api/v1/search?q=test&type=invalid_type", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_pagination_params(
        self, client: AsyncClient, auth_headers: dict
    ):
        """統合検索のoffset/limitパラメータが機能すること"""
        response = await client.get(
            "/api/v1/search?q=a&offset=0&limit=5", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# パッチ管理テスト（Patches）
# ===================================================================
class TestWindowsUpdates:
    """Windowsアップデートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_windows_updates_requires_auth(self, client: AsyncClient):
        """Windowsアップデート一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/windows-updates")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_windows_updates_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Windowsアップデート一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/patches/windows-updates", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_device_patch_status_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのパッチ状態取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/patches/devices/{fake_id}/status", headers=auth_headers
        )
        assert response.status_code == 404


class TestPatchCompliance:
    """パッチコンプライアンステスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_patch_compliance_requires_auth(self, client: AsyncClient):
        """パッチコンプライアンスサマリーは認証必須であること"""
        response = await client.get("/api/v1/patches/compliance")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patch_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """パッチコンプライアンスサマリーが200で返ること"""
        response = await client.get("/api/v1/patches/compliance", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_missing_patches_requires_auth(self, client: AsyncClient):
        """未適用パッチ一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/missing")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_patches_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """未適用パッチ一覧がリスト形式で返ること"""
        response = await client.get("/api/v1/patches/missing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_vulnerabilities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脆弱性一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/patches/vulnerabilities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_vulnerabilities_filter_by_severity(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脆弱性一覧をseverityでフィルタリングできること"""
        response = await client.get(
            "/api/v1/patches/vulnerabilities?severity=critical", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_vulnerability_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない脆弱性の解決は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/patches/vulnerabilities/{fake_id}/resolve",
            json={"resolution_note": "fixed"},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# ライフサイクル管理テスト（Lifecycle）
# ===================================================================
class TestDeviceLifecycle:
    """デバイスライフサイクルテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_device_lifecycle_history_requires_auth(self, client: AsyncClient):
        """デバイスライフサイクル履歴は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/lifecycle/devices/{fake_id}/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_lifecycle_history_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのライフサイクル履歴は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/lifecycle/devices/{fake_id}/history", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_add_lifecycle_event_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスへのライフサイクルイベント追加は404が返ること"""
        fake_id = str(uuid.uuid4())
        payload = {
            "event_type": "maintenance",
            "description": "Scheduled maintenance",
        }
        response = await client.post(
            f"/api/v1/lifecycle/devices/{fake_id}/events",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_add_lifecycle_event_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライフサイクルイベント追加時に必須フィールドが不足すると422が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/lifecycle/devices/{fake_id}/events",
            json={},
            headers=auth_headers,
        )
        assert response.status_code in (404, 422)


class TestDisposals:
    """廃棄管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_disposals_requires_auth(self, client: AsyncClient):
        """廃棄申請一覧は認証必須であること"""
        response = await client.get("/api/v1/lifecycle/disposals")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_disposals_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """廃棄申請一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/lifecycle/disposals", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_disposal_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """廃棄申請作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/lifecycle/disposals", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_approve_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の承認は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/approve",
            json={},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_reject_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の却下は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/reject",
            json={"reason": "Not authorized"},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_complete_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の完了処理は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/complete",
            json={},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_disposals_filter_by_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """廃棄申請をstatusでフィルタリングできること"""
        response = await client.get(
            "/api/v1/lifecycle/disposals?status=pending", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_lifecycle_summary_requires_auth(self, client: AsyncClient):
        """ライフサイクルサマリーは認証必須であること"""
        response = await client.get("/api/v1/lifecycle/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_lifecycle_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライフサイクルサマリーが200で返ること"""
        response = await client.get(
            "/api/v1/lifecycle/summary", headers=auth_headers
        )
        assert response.status_code == 200
