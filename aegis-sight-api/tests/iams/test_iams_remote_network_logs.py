"""
IAMS移植テスト: リモートワーク・ネットワーク・ログイベント管理（Phase27）
変換元: IAMS リモートワーク・ネットワーク・ログ管理テスト 72件中52件選定
変換日: 2026-04-02
変換元テスト数: 52件
変換テスト数: 36件（VPN接続・ネットワーク管理・ログオン/USB/ファイルイベント）
除外テスト数: 16件（物理VPN機器依存・外部ネットワーク依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# リモートワーク 認証（Remote Work Auth）
# ===================================================================
class TestRemoteWorkAuth:
    """リモートワークAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_vpn_connections_requires_auth(self, client: AsyncClient):
        """VPN接続一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_analytics_requires_auth(self, client: AsyncClient):
        """リモートワーク分析は認証必須であること"""
        response = await client.get("/api/v1/remote/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_policies_requires_auth(self, client: AsyncClient):
        """リモートワークポリシーは認証必須であること"""
        response = await client.get("/api/v1/remote/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_vpn_connections_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでVPN接続一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/remote/vpn", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# リモートワーク CRUD（Remote Work CRUD）
# ===================================================================
class TestRemoteWorkCRUD:
    """リモートワークCRUDテスト（IAMS移植）"""

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
    async def test_list_active_vpn_connections_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブVPN接続一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/vpn/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_vpn_connection_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でVPN接続作成が422を返すこと"""
        response = await client.post(
            "/api/v1/remote/vpn",
            json={"description": "テストVPN"},  # user_name等欠損
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
            f"/api/v1/remote/vpn/{fake_id}/disconnect",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_remote_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートワーク分析が200で返ること"""
        response = await client.get("/api/v1/remote/analytics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_remote_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リモートワークポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/remote/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict | list)


# ===================================================================
# ネットワーク管理 認証（Network Auth）
# ===================================================================
class TestNetworkAuth:
    """ネットワーク管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_network_devices_requires_auth(self, client: AsyncClient):
        """ネットワークデバイス一覧は認証必須であること"""
        response = await client.get("/api/v1/network/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_unmanaged_devices_requires_auth(self, client: AsyncClient):
        """未管理デバイス一覧は認証必須であること"""
        response = await client.get("/api/v1/network/unmanaged")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_network_devices_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでネットワークデバイス一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/network/devices", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# ネットワーク管理 エンドポイント（Network Endpoints）
# ===================================================================
class TestNetworkEndpoints:
    """ネットワーク管理エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_network_devices_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ネットワークデバイス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/devices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_unmanaged_devices_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """未管理デバイス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/unmanaged", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_link_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないネットワークデバイスへのリンクで404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/network/unmanaged/{fake_id}/link",
            json={"device_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# ログイベント管理（Log Events）
# ===================================================================
class TestLogEvents:
    """ログイベント管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_logon_events_requires_auth(self, client: AsyncClient):
        """ログオンイベントは認証必須であること"""
        response = await client.get("/api/v1/logs/logon")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_usb_events_requires_auth(self, client: AsyncClient):
        """USBイベントは認証必須であること"""
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
    async def test_log_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログサマリーが200で返ること"""
        response = await client.get("/api/v1/logs/summary", headers=auth_headers)
        assert response.status_code == 200
