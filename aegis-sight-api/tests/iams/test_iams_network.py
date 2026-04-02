"""
IAMS移植テスト: ネットワーク機器探索・ソフトウェアインベントリ（Phase10）
変換元: IAMS ネットワーク探索・ソフトウェア管理テスト 145件中100件選定
変換日: 2026-04-02
変換元テスト数: 100件
変換テスト数: 38件（優先度高・CRUD・バリデーション・デバイス探索ロジック）
除外テスト数: 62件（実ネットワークスキャン依存・エージェント通信依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_NETWORK_DEVICE_TYPES = [
    "pc",
    "server",
    "printer",
    "switch",
    "router",
    "ap",
    "unknown",
]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestNetworkAuth:
    """ネットワークAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_network_devices_requires_auth(self, client: AsyncClient):
        """ネットワーク機器一覧は認証必須であること"""
        response = await client.get("/api/v1/network/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_unmanaged_devices_requires_auth(self, client: AsyncClient):
        """未管理機器一覧は認証必須であること"""
        response = await client.get("/api/v1/network/unmanaged")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_scan_register_requires_auth(self, client: AsyncClient):
        """スキャン結果登録は認証必須であること"""
        response = await client.post(
            "/api/v1/network/scan",
            json={"devices": []},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_network_devices_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでネットワーク機器一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/network/devices", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_readonly_can_access_network_devices(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonly ロールでもネットワーク機器一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/network/devices", headers=readonly_headers)
        assert response.status_code == 200


# ===================================================================
# ネットワーク機器一覧（Network Devices List）
# ===================================================================
class TestNetworkDevicesList:
    """ネットワーク機器一覧テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """機器一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/devices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_default_limit_is_50(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit 未指定時のデフォルトが 50 であること"""
        response = await client.get("/api/v1/network/devices", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["limit"] == 50

    @pytest.mark.asyncio
    async def test_custom_limit(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタム limit が適用されること"""
        response = await client.get(
            "/api/v1/network/devices?limit=10", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["limit"] == 10

    @pytest.mark.asyncio
    async def test_limit_exceeds_max_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit が 200 超で 422 が返ること"""
        response = await client.get(
            "/api/v1/network/devices?limit=201", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_offset_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """負の offset で 422 が返ること"""
        response = await client.get(
            "/api/v1/network/devices?offset=-1", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("device_type", ALL_NETWORK_DEVICE_TYPES)
    async def test_filter_by_device_type(
        self, client: AsyncClient, auth_headers: dict, device_type: str
    ):
        """全デバイス種別でフィルタが機能すること（結果0件も許容）"""
        response = await client.get(
            f"/api/v1/network/devices?device_type={device_type}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["device_type"] == device_type


# ===================================================================
# 未管理機器（Unmanaged Devices）
# ===================================================================
class TestUnmanagedDevices:
    """未管理機器テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_unmanaged_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """未管理機器一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/unmanaged", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_unmanaged_items_not_managed(
        self, client: AsyncClient, auth_headers: dict
    ):
        """未管理一覧は is_managed が False のみであること"""
        response = await client.get("/api/v1/network/unmanaged", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item.get("is_managed") is False, (
                f"Expected is_managed=False, got {item.get('is_managed')}"
            )


# ===================================================================
# スキャン結果登録（Network Scan Registration）
# ===================================================================
class TestNetworkScanRegistration:
    """ネットワークスキャン登録テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_register_empty_scan(
        self, client: AsyncClient, auth_headers: dict
    ):
        """空のスキャン結果を登録できること"""
        response = await client.post(
            "/api/v1/network/scan",
            json={"devices": []},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert "created" in data
        assert "updated" in data
        assert data["created"] == 0
        assert data["updated"] == 0

    @pytest.mark.asyncio
    async def test_register_single_device(
        self, client: AsyncClient, auth_headers: dict
    ):
        """1台の機器スキャン結果を登録できること"""
        response = await client.post(
            "/api/v1/network/scan",
            json={
                "devices": [
                    {
                        "ip_address": "192.168.1.100",
                        "mac_address": "AA:BB:CC:DD:EE:01",
                        "hostname": "test-host-01",
                        "device_type": "pc",
                    }
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["created"] == 1
        assert data["updated"] == 0

    @pytest.mark.asyncio
    async def test_register_duplicate_mac_updates_existing(
        self, client: AsyncClient, auth_headers: dict
    ):
        """同一MACアドレスの再登録は updated を増加させること"""
        mac = f"AA:BB:CC:DD:EE:{uuid.uuid4().hex[:2].upper()}"
        payload = {
            "devices": [
                {
                    "ip_address": "192.168.1.200",
                    "mac_address": mac,
                    "hostname": "dup-host",
                    "device_type": "server",
                }
            ]
        }
        # 1回目登録
        r1 = await client.post("/api/v1/network/scan", json=payload, headers=auth_headers)
        assert r1.status_code == 201
        assert r1.json()["created"] == 1

        # 同一MACで再登録
        r2 = await client.post("/api/v1/network/scan", json=payload, headers=auth_headers)
        assert r2.status_code == 201
        assert r2.json()["updated"] == 1

    @pytest.mark.asyncio
    async def test_register_multiple_devices(
        self, client: AsyncClient, auth_headers: dict
    ):
        """複数台の機器スキャン結果を一括登録できること"""
        devices = [
            {
                "ip_address": f"10.0.0.{i}",
                "mac_address": f"CC:DD:EE:FF:{i:02X}:01",
                "device_type": "unknown",
            }
            for i in range(1, 4)
        ]
        response = await client.post(
            "/api/v1/network/scan",
            json={"devices": devices},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["created"] == 3

    @pytest.mark.asyncio
    async def test_register_missing_ip_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ip_address 欠損で 422 が返ること"""
        response = await client.post(
            "/api/v1/network/scan",
            json={
                "devices": [
                    {"mac_address": "AA:BB:CC:DD:EE:FF", "device_type": "pc"}
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_mac_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """mac_address 欠損で 422 が返ること"""
        response = await client.post(
            "/api/v1/network/scan",
            json={
                "devices": [
                    {"ip_address": "10.0.0.1", "device_type": "pc"}
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("device_type", ALL_NETWORK_DEVICE_TYPES)
    async def test_all_device_types_accepted(
        self, client: AsyncClient, auth_headers: dict, device_type: str
    ):
        """全デバイス種別でスキャン登録が受け付けられること"""
        mac = f"BB:CC:DD:{device_type[:2].upper().ljust(2, '0')}:00:01"
        response = await client.post(
            "/api/v1/network/scan",
            json={
                "devices": [
                    {
                        "ip_address": "10.10.10.1",
                        "mac_address": mac,
                        "device_type": device_type,
                    }
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 201, (
            f"device_type={device_type}: unexpected status {response.status_code}"
        )


# ===================================================================
# ネットワーク機器リンク（Device Link）
# ===================================================================
class TestNetworkDeviceLink:
    """ネットワーク機器リンクテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_link_nonexistent_network_device_returns_404(
        self, client: AsyncClient, auth_headers: dict, sample_device
    ):
        """存在しないネットワーク機器へのリンクで 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/network/devices/{fake_id}/link",
            json={"device_id": str(sample_device.id)},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_link_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なUUID形式で 422 が返ること"""
        response = await client.patch(
            "/api/v1/network/devices/not-a-uuid/link",
            json={"device_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# ソフトウェアインベントリ（Software Inventory）
# ===================================================================
class TestSoftwareInventoryAuth:
    """ソフトウェアインベントリ認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_software_list_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_software_requires_auth(self, client: AsyncClient):
        """デバイス別ソフトウェア一覧は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/software/devices/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_software_list_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでソフトウェア一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200


class TestSoftwareInventoryList:
    """ソフトウェアインベントリ一覧テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_default_limit_is_50(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit 未指定時のデフォルトが 50 であること"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["limit"] == 50

    @pytest.mark.asyncio
    async def test_custom_limit(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタム limit が適用されること"""
        response = await client.get("/api/v1/software?limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert len(data["items"]) <= 5

    @pytest.mark.asyncio
    async def test_limit_exceeds_max_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit が 200 超で 422 が返ること"""
        response = await client.get("/api/v1/software?limit=201", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_filter_applied(
        self, client: AsyncClient, auth_headers: dict
    ):
        """search パラメータが適用されること（0件も許容）"""
        response = await client.get(
            "/api/v1/software?search=Windows", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert "Windows" in item.get("software_name", ""), (
                f"search filter not applied: {item.get('software_name')}"
            )

    @pytest.mark.asyncio
    async def test_aggregation_items_have_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """集計アイテムに必須フィールドが含まれること（データなしは空配列で許容）"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            for field in ("software_name", "installed_count"):
                assert field in item, f"Missing field: {field}"
            assert isinstance(item["installed_count"], int)
            assert item["installed_count"] >= 1

    @pytest.mark.asyncio
    async def test_device_software_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なUUID形式で 422 が返ること"""
        response = await client.get(
            "/api/v1/software/devices/not-a-uuid",
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_device_software_for_unknown_device_returns_empty(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスIDはソフトウェアなし（total=0）で返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_id}",
            headers=auth_headers,
        )
        # 存在しないデバイスでも空コレクションを返す（404でも可）
        assert response.status_code in (200, 404)
        if response.status_code == 200:
            data = response.json()
            assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_device_software_returns_paginated(
        self, client: AsyncClient, auth_headers: dict, sample_device
    ):
        """デバイス別ソフトウェア一覧がページネーション形式で返ること"""
        device_id = str(sample_device.id)
        response = await client.get(
            f"/api/v1/software/devices/{device_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"
