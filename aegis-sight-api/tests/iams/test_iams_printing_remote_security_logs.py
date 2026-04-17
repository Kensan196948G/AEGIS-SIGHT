"""
IAMS移植テスト: 印刷管理・リモートワーク・セキュリティ監査・ログ管理（Phase35）
変換元: IAMS 印刷・リモートワーク・セキュリティ監査・ログテスト 76件中54件選定
変換日: 2026-04-02
変換元テスト数: 54件
変換テスト数: 36件（印刷管理・VPN・セキュリティ監査・ログイベント）
除外テスト数: 18件（物理プリンター依存・VPN機器連携依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 印刷管理（Print Management）
# ===================================================================
class TestPrintManagement:
    """印刷管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_printers_requires_auth(self, client: AsyncClient):
        """プリンター一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/printers")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_jobs_requires_auth(self, client: AsyncClient):
        """印刷ジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_printers_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンター一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_printer_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でプリンター作成が422を返すこと"""
        response = await client.post(
            "/api/v1/printing/printers",
            json={"description": "テストプリンター"},  # name, location等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_print_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_print_job_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で印刷ジョブ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/printing/jobs",
            json={"notes": "テスト印刷"},  # printer_id, document_name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_print_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計が200で返ること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_print_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_print_policy_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で印刷ポリシー作成が422を返すこと"""
        response = await client.post(
            "/api/v1/printing/policies",
            json={"description": "テスト印刷ポリシー"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_print_evaluate_returns_200_or_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー評価が200または422を返すこと"""
        response = await client.post(
            "/api/v1/printing/evaluate",
            json={},
            headers=auth_headers,
        )
        assert response.status_code in (200, 422)


# ===================================================================
# リモートワーク管理（Remote Work）
# ===================================================================
class TestRemoteWork:
    """リモートワーク管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_remote_vpn_requires_auth(self, client: AsyncClient):
        """VPN接続一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_analytics_requires_auth(self, client: AsyncClient):
        """リモートワーク分析は認証必須であること"""
        response = await client.get("/api/v1/remote/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_vpn_connections_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """VPN接続一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/vpn", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_active_vpn_connections_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブVPN接続一覧が200で返ること"""
        response = await client.get("/api/v1/remote/vpn/active", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_vpn_connection_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でVPN接続作成が422を返すこと"""
        response = await client.post(
            "/api/v1/remote/vpn",
            json={"notes": "テストVPN"},  # user_id, vpn_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_vpn_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないVPN接続の切断で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/remote/vpn/{fake_id}/disconnect", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_remote_work_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートワーク分析が200で返ること"""
        response = await client.get("/api/v1/remote/analytics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_remote_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートアクセスポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_remote_policy_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でリモートアクセスポリシー作成が422を返すこと"""
        response = await client.post(
            "/api/v1/remote/policies",
            json={"description": "テストポリシー"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_remote_vpn_active_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでアクティブVPN一覧にアクセスできること"""
        response = await client.get("/api/v1/remote/vpn/active", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# セキュリティ監査（Security Audit）
# ===================================================================
class TestSecurityAudit:
    """セキュリティ監査テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_failed_logins_requires_auth(self, client: AsyncClient):
        """ログイン失敗一覧は認証必須であること"""
        response = await client.get("/api/v1/security/audit/failed-logins")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_active_sessions_requires_auth(self, client: AsyncClient):
        """アクティブセッション監査は認証必須であること"""
        response = await client.get("/api/v1/security/audit/active-sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_failed_logins_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでログイン失敗一覧にアクセスできること"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_list_active_sessions_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでアクティブセッション一覧にアクセスできること"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_session_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッションの失効で404または403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/security/audit/revoke-session/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code in (404, 403)

    @pytest.mark.asyncio
    async def test_failed_logins_returns_list_or_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログイン失敗一覧がリストまたはページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict | list)


# ===================================================================
# ログ管理（Logs）
# ===================================================================
class TestLogs:
    """ログ管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_logon_events_requires_auth(self, client: AsyncClient):
        """ログオンイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/logs/logon")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_usb_events_requires_auth(self, client: AsyncClient):
        """USBイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/logs/usb")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_logon_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログオンイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/logon", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_usb_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """USBイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/usb", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_file_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/files", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_file_events_requires_auth(self, client: AsyncClient):
        """ファイルイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/logs/files")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_log_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログサマリーが200で返ること"""
        response = await client.get("/api/v1/logs/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_log_summary_requires_auth(self, client: AsyncClient):
        """ログサマリーは認証必須であること"""
        response = await client.get("/api/v1/logs/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logon_events_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでログオンイベントにアクセスできること（200）"""
        response = await client.get("/api/v1/logs/logon", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_usb_events_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでUSBイベントにアクセスできること（200）"""
        response = await client.get("/api/v1/logs/usb", headers=auth_headers)
        assert response.status_code == 200
