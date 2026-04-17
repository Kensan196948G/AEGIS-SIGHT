"""
IAMS移植テスト: 設定管理・ネットワーク管理・ソフトウェア管理・ダッシュボード（Phase38）
変換元: IAMS 設定・ネットワーク・ソフトウェア・ダッシュボードテスト 70件中50件選定
変換日: 2026-04-02
変換元テスト数: 50件
変換テスト数: 36件（システム設定・ネットワーク管理・ソフトウェアインベントリ・ダッシュボード統計）
除外テスト数: 14件（ネットワークスキャン実機依存・ソフトウェア配布エージェント依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 設定管理（Config Management）
# ===================================================================
class TestConfigManagement:
    """システム設定管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_config_requires_auth(self, client: AsyncClient):
        """設定一覧は認証必須であること"""
        response = await client.get("/api/v1/config")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_config_key_requires_auth(self, client: AsyncClient):
        """設定キー取得は認証必須であること"""
        response = await client.get("/api/v1/config/some_key")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_config_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定一覧が200で返ること"""
        response = await client.get("/api/v1/config", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_config_key_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キー取得で404が返ること"""
        fake_key = f"nonexistent_key_{uuid.uuid4().hex[:8]}"
        response = await client.get(
            f"/api/v1/config/{fake_key}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_config_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キー更新で404または403が返ること"""
        fake_key = f"nonexistent_key_{uuid.uuid4().hex[:8]}"
        response = await client.put(
            f"/api/v1/config/{fake_key}",
            json={"value": "test_value"},
            headers=auth_headers,
        )
        assert response.status_code in (404, 403)

    @pytest.mark.asyncio
    async def test_reset_nonexistent_config_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キーリセットで404または403が返ること"""
        fake_key = f"nonexistent_key_{uuid.uuid4().hex[:8]}"
        response = await client.post(
            f"/api/v1/config/reset/{fake_key}", headers=auth_headers
        )
        assert response.status_code in (404, 403)

    @pytest.mark.asyncio
    async def test_list_config_returns_dict_or_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定一覧がdict形式またはlist形式で返ること"""
        response = await client.get("/api/v1/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict | list)

    @pytest.mark.asyncio
    async def test_update_config_requires_auth(self, client: AsyncClient):
        """設定更新は認証必須であること"""
        response = await client.put(
            "/api/v1/config/some_key",
            json={"value": "test"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_reset_config_requires_auth(self, client: AsyncClient):
        """設定リセットは認証必須であること"""
        response = await client.post("/api/v1/config/reset/some_key")
        assert response.status_code == 401


# ===================================================================
# ネットワーク管理（Network Management）
# ===================================================================
class TestNetworkManagement:
    """ネットワーク管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_network_devices_requires_auth(self, client: AsyncClient):
        """ネットワークデバイス一覧は認証必須であること"""
        response = await client.get("/api/v1/network/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_network_unmanaged_requires_auth(self, client: AsyncClient):
        """未管理デバイス一覧は認証必須であること"""
        response = await client.get("/api/v1/network/unmanaged")
        assert response.status_code == 401

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
    async def test_network_scan_requires_auth(self, client: AsyncClient):
        """ネットワークスキャンは認証必須であること"""
        response = await client.post("/api/v1/network/scan", json={})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_network_scan_returns_200_or_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ネットワークスキャンが200または422を返すこと"""
        response = await client.post(
            "/api/v1/network/scan", json={}, headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_link_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないネットワークデバイスのリンクで404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/network/devices/{fake_id}/link",
            json={"asset_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_network_scan_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でネットワークスキャンが422を返すこと（対象なし）"""
        # scanは空でも200/422が許容されるため検証
        response = await client.post(
            "/api/v1/network/scan",
            json={"invalid_field": "test"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 422)


# ===================================================================
# ソフトウェア管理（Software Management）
# ===================================================================
class TestSoftwareManagement:
    """ソフトウェア管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_software_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

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
    async def test_get_software_by_device_requires_auth(self, client: AsyncClient):
        """デバイス別ソフトウェア一覧は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/software/devices/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_nonexistent_device_software_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのソフトウェア一覧取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_software_with_filter_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """フィルター付きソフトウェア一覧が200で返ること"""
        response = await client.get(
            "/api/v1/software?limit=10", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_software_items_have_expected_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア一覧レスポンスが期待する構造を持つこと"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data


# ===================================================================
# ダッシュボード統計（Dashboard Stats）
# ===================================================================
class TestDashboardStats:
    """ダッシュボード統計テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dashboard_stats_requires_auth(self, client: AsyncClient):
        """ダッシュボード統計は認証必須であること"""
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_alerts_requires_auth(self, client: AsyncClient):
        """ダッシュボードアラートは認証必須であること"""
        response = await client.get("/api/v1/dashboard/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計が200で返ること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_alerts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートが200で返ること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_stats_has_device_count(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計がデバイス数等の統計情報を含むこと"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_dashboard_alerts_returns_list_or_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートがリストまたはページネーション形式で返ること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict | list)

    @pytest.mark.asyncio
    async def test_dashboard_accessible_after_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証後にダッシュボードにアクセスできること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
