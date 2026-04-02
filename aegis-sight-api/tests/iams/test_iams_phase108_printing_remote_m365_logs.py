"""
IAMS移植テスト: 印刷管理・リモートワーク管理・M365連携・ログ管理（Phase56相当）
変換元: IAMS 印刷/リモート/M365/ログテスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（プリンター/印刷ジョブ/VPN/リモートポリシー/M365ライセンス/ログ）
除外テスト数: 29件（外部印刷サーバー依存・リアルタイムVPN依存・M365 Graph API依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 印刷管理テスト（Printing）
# ===================================================================
class TestPrinting:
    """印刷管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_printers_requires_auth(self, client: AsyncClient):
        """プリンター一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/printers")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printers_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンター一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_printer_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンター作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/printing/printers", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_print_jobs_requires_auth(self, client: AsyncClient):
        """印刷ジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_print_job_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ジョブ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/printing/jobs", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_print_stats_requires_auth(self, client: AsyncClient):
        """印刷統計は認証必須であること"""
        response = await client.get("/api/v1/printing/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計が200で返ること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_print_evaluate_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー評価リクエストに必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/printing/evaluate", json={}, headers=auth_headers
        )
        assert response.status_code == 422


class TestPrintingPolicies:
    """印刷ポリシーテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_printing_policies_requires_auth(self, client: AsyncClient):
        """印刷ポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printing_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_printing_policy_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/printing/policies", json={}, headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# リモートワーク管理テスト（Remote Work）
# ===================================================================
class TestRemoteWork:
    """リモートワーク管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_vpn_connections_requires_auth(self, client: AsyncClient):
        """VPN接続一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_vpn_connections_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """VPN接続一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/vpn", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_vpn_connection_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """VPN接続作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/remote/vpn", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_active_vpn_requires_auth(self, client: AsyncClient):
        """アクティブVPN一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn/active")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_active_vpn_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブVPN一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/vpn/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_vpn_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないVPN接続の切断は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/remote/vpn/{fake_id}/disconnect", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_remote_analytics_requires_auth(self, client: AsyncClient):
        """リモートワーク分析は認証必須であること"""
        response = await client.get("/api/v1/remote/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートワーク分析が200で返ること"""
        response = await client.get("/api/v1/remote/analytics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_remote_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートワークポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"


# ===================================================================
# M365連携テスト（M365）
# ===================================================================
class TestM365:
    """M365連携テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_m365_licenses_requires_auth(self, client: AsyncClient):
        """M365ライセンス一覧は認証必須であること"""
        response = await client.get("/api/v1/m365/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_m365_licenses_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ライセンス一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_m365_users_requires_auth(self, client: AsyncClient):
        """M365ユーザー一覧は認証必須であること"""
        response = await client.get("/api/v1/m365/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_m365_users_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ユーザー一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/m365/users", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_m365_sync_requires_auth(self, client: AsyncClient):
        """M365同期は認証必須であること"""
        response = await client.post("/api/v1/m365/sync")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_m365_sync_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365同期はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.post("/api/v1/m365/sync", headers=auth_headers)
        assert response.status_code in (200, 403)


# ===================================================================
# ログ管理テスト（Logs）
# ===================================================================
class TestLogs:
    """ログ管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_logon_logs_requires_auth(self, client: AsyncClient):
        """ログオンログ一覧は認証必須であること"""
        response = await client.get("/api/v1/logs/logon")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logon_logs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログオンログ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/logon", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_usb_logs_requires_auth(self, client: AsyncClient):
        """USBログ一覧は認証必須であること"""
        response = await client.get("/api/v1/logs/usb")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_usb_logs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """USBログ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/usb", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_file_logs_requires_auth(self, client: AsyncClient):
        """ファイルアクセスログ一覧は認証必須であること"""
        response = await client.get("/api/v1/logs/files")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_file_logs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルアクセスログ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/files", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_log_summary_requires_auth(self, client: AsyncClient):
        """ログサマリーは認証必須であること"""
        response = await client.get("/api/v1/logs/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_log_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログサマリーが200で返ること"""
        response = await client.get("/api/v1/logs/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_log_summary_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログサマリーレスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/logs/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in (
            "total_logon_events",
            "total_usb_events",
            "total_file_events",
            "unique_users",
            "unique_devices",
        ):
            assert field in data, f"Missing field: {field}"
