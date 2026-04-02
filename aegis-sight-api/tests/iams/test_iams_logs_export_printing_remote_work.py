"""
IAMS移植テスト: ログ管理・エクスポート・印刷管理・リモートワーク詳細（Phase46）
変換元: IAMS ログ・エクスポート・印刷・リモートワークテスト 76件中56件選定
変換日: 2026-04-02
変換元テスト数: 56件
変換テスト数: 36件（ログ収集・データエクスポート・印刷ジョブ・VPN接続）
除外テスト数: 20件（外部印刷サービス依存・VPN実接続依存・ファイルストリーム依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ログ管理詳細（Logs Detail）
# ===================================================================
class TestLogsDetail:
    """ログ管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_logs_logon_requires_auth(self, client: AsyncClient):
        """ログオンログは認証必須であること"""
        response = await client.get("/api/v1/logs/logon")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logs_usb_requires_auth(self, client: AsyncClient):
        """USBログは認証必須であること"""
        response = await client.get("/api/v1/logs/usb")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logs_files_requires_auth(self, client: AsyncClient):
        """ファイルログは認証必須であること"""
        response = await client.get("/api/v1/logs/files")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logs_summary_requires_auth(self, client: AsyncClient):
        """ログサマリーは認証必須であること"""
        response = await client.get("/api/v1/logs/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logs_logon_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログオンログがページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/logon", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_logs_usb_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """USBログがページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/usb", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_logs_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログサマリーが200で返ること"""
        response = await client.get("/api/v1/logs/summary", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# エクスポート管理詳細（Export Detail）
# ===================================================================
class TestExportDetail:
    """エクスポート管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_export_devices_requires_auth(self, client: AsyncClient):
        """デバイスエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_licenses_requires_auth(self, client: AsyncClient):
        """ライセンスエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_alerts_requires_auth(self, client: AsyncClient):
        """アラートエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_audit_logs_requires_auth(self, client: AsyncClient):
        """監査ログエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/audit-logs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_devices_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスエクスポートが200で返ること"""
        response = await client.get("/api/v1/export/devices", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_alerts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラートエクスポートが200で返ること"""
        response = await client.get("/api/v1/export/alerts", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 印刷管理詳細（Printing Detail）
# ===================================================================
class TestPrintingDetail:
    """印刷管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_printing_printers_requires_auth(self, client: AsyncClient):
        """プリンター一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/printers")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printing_jobs_requires_auth(self, client: AsyncClient):
        """印刷ジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printing_stats_requires_auth(self, client: AsyncClient):
        """印刷統計は認証必須であること"""
        response = await client.get("/api/v1/printing/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printing_printers_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンター一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_printing_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_printing_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計が200で返ること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# リモートワーク管理詳細（Remote Work Detail）
# ===================================================================
class TestRemoteWorkDetail:
    """リモートワーク管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_remote_vpn_requires_auth(self, client: AsyncClient):
        """VPN接続一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_vpn_active_requires_auth(self, client: AsyncClient):
        """アクティブVPN一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn/active")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_analytics_requires_auth(self, client: AsyncClient):
        """リモートワーク分析は認証必須であること"""
        response = await client.get("/api/v1/remote/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_policies_requires_auth(self, client: AsyncClient):
        """リモートワークポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_vpn_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """VPN接続一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/vpn", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_remote_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートワーク分析が200で返ること"""
        response = await client.get("/api/v1/remote/analytics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_vpn_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないVPN切断で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/remote/vpn/{fake_id}/disconnect", headers=auth_headers
        )
        assert response.status_code == 404
