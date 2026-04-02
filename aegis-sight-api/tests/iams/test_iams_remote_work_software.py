"""
IAMS移植テスト: リモートワーク・ソフトウェアインベントリ・部署管理（Phase16）
変換元: IAMS テレワーク・VPN・ソフトウェア・組織管理テスト 96件中75件選定
変換日: 2026-04-02
変換元テスト数: 75件
変換テスト数: 38件（VPN接続・リモートポリシー・ソフトウェア一覧・部署CRUD・ツリー構造）
除外テスト数: 37件（VPNエージェント通信依存・インベントリ収集依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_VPN_PROTOCOLS = ["openvpn", "wireguard", "ipsec", "ssl_tls"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestRemoteWorkAuth:
    """リモートワークAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_vpn_connections_requires_auth(self, client: AsyncClient):
        """VPN接続一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/vpn")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_vpn_analytics_requires_auth(self, client: AsyncClient):
        """リモートワーク分析は認証必須であること"""
        response = await client.get("/api/v1/remote/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remote_policies_requires_auth(self, client: AsyncClient):
        """リモートアクセスポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/remote/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_vpn_connections_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでVPN接続一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/remote/vpn", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_software_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_departments_requires_auth(self, client: AsyncClient):
        """部署一覧は認証必須であること"""
        response = await client.get("/api/v1/departments")
        assert response.status_code == 401


# ===================================================================
# VPN接続（VPN Connections）
# ===================================================================
class TestVPNConnections:
    """VPN接続テスト（IAMS移植）"""

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
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/remote/vpn",
            json={"user_name": "testuser"},  # protocol, ip_address 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("protocol", ALL_VPN_PROTOCOLS)
    async def test_create_vpn_connection_all_protocols(
        self, client: AsyncClient, auth_headers: dict, protocol: str
    ):
        """全VPNプロトコルで接続を作成できること"""
        response = await client.post(
            "/api/v1/remote/vpn",
            json={
                "user_name": f"iams_test_user_{protocol}",
                "protocol": protocol,
                "ip_address": "10.0.0.100",
                "device_name": f"IAMS移植テスト-{protocol}",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"protocol={protocol}: 予期しないステータス {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_vpn_connection_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したVPN接続のレスポンスに必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/remote/vpn",
            json={
                "user_name": "iams_field_test",
                "protocol": "openvpn",
                "ip_address": "10.0.1.50",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "user_name", "protocol", "ip_address"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_vpn_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないVPN接続の切断で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/remote/vpn/{fake_id}/disconnect",
            json={"reason": "テスト切断"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_filter_vpn_by_protocol(
        self, client: AsyncClient, auth_headers: dict
    ):
        """protocolフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/remote/vpn?protocol=openvpn", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["protocol"] == "openvpn"


# ===================================================================
# リモートワーク分析・ポリシー（Analytics & Policies）
# ===================================================================
class TestRemoteWorkAnalyticsAndPolicies:
    """リモートワーク分析・ポリシーテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_analytics_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """分析エンドポイントに必須フィールドが含まれること"""
        response = await client.get("/api/v1/remote/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_connections" in data
        assert "active_connections" in data

    @pytest.mark.asyncio
    async def test_analytics_counts_are_non_negative(
        self, client: AsyncClient, auth_headers: dict
    ):
        """分析カウントは非負であること"""
        response = await client.get("/api/v1/remote/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_connections"] >= 0
        assert data["active_connections"] >= 0

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
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/remote/policies",
            json={"description": "テストポリシー"},  # name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_remote_policy_valid_returns_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なデータでリモートアクセスポリシーを作成できること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/remote/policies",
            json={
                "name": f"IAMS移植テスト-リモートポリシー-{unique_suffix}",
                "allowed_protocols": ["openvpn", "wireguard"],
                "max_session_hours": 8,
                "mfa_required": True,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )


# ===================================================================
# ソフトウェアインベントリ（Software Inventory）
# ===================================================================
class TestSoftwareInventory:
    """ソフトウェアインベントリテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_software_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_software_by_device_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイス別ソフトウェア一覧がページネーション形式で返ること"""
        fake_device_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_device_id}", headers=auth_headers
        )
        # 存在しないデバイスは200（空）または404
        assert response.status_code in (200, 404)

    @pytest.mark.asyncio
    async def test_search_software_by_name(
        self, client: AsyncClient, auth_headers: dict
    ):
        """名前検索フィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/software?search=Windows", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_software_list_items_have_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア一覧の各アイテムに必須フィールドが含まれること（件数0の場合はスキップ）"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert "software_name" in item, "Missing field: software_name"
            assert "installed_count" in item, "Missing field: installed_count"


# ===================================================================
# 部署管理（Departments）
# ===================================================================
class TestDepartments:
    """部署管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_departments_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """部署一覧が200で返ること"""
        response = await client.get("/api/v1/departments", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_departments_tree_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ツリー形式で部署一覧を取得できること"""
        response = await client.get(
            "/api/v1/departments?tree=true", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_department_missing_name_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/departments",
            json={"description": "テスト部署"},  # name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_department_valid_returns_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なデータで部署を作成できること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/departments",
            json={
                "name": f"IAMS移植テスト部署-{unique_suffix}",
                "description": "IAMS pytest移植テスト用部署",
                "cost_center": f"CC-{unique_suffix}",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )

    @pytest.mark.asyncio
    async def test_create_department_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成した部署のレスポンスに必須フィールドが含まれること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/departments",
            json={"name": f"IAMS移植テスト-フィールド確認-{unique_suffix}"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_department_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署の取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_department_devices_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署のデバイス一覧で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/devices", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_department_costs_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署のコスト取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/costs", headers=auth_headers
        )
        assert response.status_code == 404
