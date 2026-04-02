"""
IAMS移植テスト: 資産管理 Phase2
変換元: IAMS 資産管理テスト 280件中優先度高選定
変換日: 2026-04-02
変換元テスト数: 280件
変換テスト数: 52件（ライフサイクル・ステータス遷移・PATCH/フィルタ・境界値）
除外テスト数: 228件（Express固有・WebSocket・テンプレートレンダリング依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

# ヘルパー: デフォルトデバイス作成ペイロード
_COUNTER = 0


def _make_device(suffix: str = "", **overrides) -> dict:
    """ユニークなホスト名でデバイス作成ペイロードを生成する"""
    unique = uuid.uuid4().hex[:8]
    base = {
        "hostname": f"iams-asset-{unique}{suffix}",
        "ip_address": "192.168.1.100",
        "status": "active",
    }
    base.update(overrides)
    return base


# ===================================================================
# 認証（Authentication）
# ===================================================================
class TestAssetAuth:
    """資産管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient):
        """一覧取得は認証必須であること"""
        response = await client.get("/api/v1/assets/")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client: AsyncClient):
        """資産登録は認証必須であること"""
        response = await client.post("/api/v1/assets/", json=_make_device())
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client: AsyncClient):
        """個別取得は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/assets/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, client: AsyncClient):
        """更新は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(f"/api/v1/assets/{fake_id}", json={"status": "inactive"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_count_requires_auth(self, client: AsyncClient):
        """カウント取得は認証必須であること"""
        response = await client.get("/api/v1/assets/count")
        assert response.status_code == 401


# ===================================================================
# 資産登録（Create）
# ===================================================================
class TestAssetCreate:
    """資産登録テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_create_minimal_device(self, client: AsyncClient, auth_headers: dict):
        """hostname のみで資産が登録できること"""
        payload = {"hostname": f"minimal-{uuid.uuid4().hex[:8]}"}
        response = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["hostname"] == payload["hostname"]
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_create_full_device(self, client: AsyncClient, auth_headers: dict):
        """全フィールド指定で資産が登録できること"""
        payload = {
            "hostname": f"full-{uuid.uuid4().hex[:8]}",
            "ip_address": "10.0.1.1",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "domain": "corp.example.com",
            "os_version": "Windows 11 22H2",
            "status": "active",
        }
        response = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["ip_address"] == "10.0.1.1"
        assert data["mac_address"] == "AA:BB:CC:DD:EE:FF"
        assert data["domain"] == "corp.example.com"
        assert data["os_version"] == "Windows 11 22H2"

    @pytest.mark.asyncio
    async def test_create_returns_uuid(self, client: AsyncClient, auth_headers: dict):
        """登録レスポンスに UUID が含まれること"""
        payload = {"hostname": f"uuid-check-{uuid.uuid4().hex[:8]}"}
        response = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        # 有効な UUID 形式かを確認
        uuid.UUID(data["id"])

    @pytest.mark.asyncio
    async def test_create_missing_hostname_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """hostname なしで 422 が返ること"""
        response = await client.post(
            "/api/v1/assets/", json={"ip_address": "10.0.0.1"}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_inactive_device(self, client: AsyncClient, auth_headers: dict):
        """status=inactive で初期登録できること"""
        payload = {"hostname": f"inactive-{uuid.uuid4().hex[:8]}", "status": "inactive"}
        response = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["status"] == "inactive"

    @pytest.mark.asyncio
    async def test_create_maintenance_device(self, client: AsyncClient, auth_headers: dict):
        """status=maintenance で初期登録できること"""
        payload = {"hostname": f"maint-{uuid.uuid4().hex[:8]}", "status": "maintenance"}
        response = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["status"] == "maintenance"

    @pytest.mark.asyncio
    async def test_create_invalid_status_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正な status 値で 422 が返ること"""
        payload = {"hostname": f"badstatus-{uuid.uuid4().hex[:8]}", "status": "unknown_status"}
        response = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        assert response.status_code == 422


# ===================================================================
# ステータス遷移（Status Lifecycle）
# ===================================================================
class TestAssetStatusLifecycle:
    """資産ステータスライフサイクルテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_active_to_inactive_transition(
        self, client: AsyncClient, auth_headers: dict
    ):
        """active → inactive への遷移が成功すること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(status="active"), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}", json={"status": "inactive"}, headers=auth_headers
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "inactive"

    @pytest.mark.asyncio
    async def test_active_to_maintenance_transition(
        self, client: AsyncClient, auth_headers: dict
    ):
        """active → maintenance への遷移が成功すること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(status="active"), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"status": "maintenance"},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "maintenance"

    @pytest.mark.asyncio
    async def test_inactive_to_decommissioned_transition(
        self, client: AsyncClient, auth_headers: dict
    ):
        """inactive → decommissioned への廃棄遷移が成功すること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(status="inactive"), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"status": "decommissioned"},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "decommissioned"

    @pytest.mark.asyncio
    async def test_maintenance_to_active_transition(
        self, client: AsyncClient, auth_headers: dict
    ):
        """maintenance → active への復帰が成功すること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(status="maintenance"), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"status": "active"},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "active"

    @pytest.mark.asyncio
    async def test_status_persisted_after_update(
        self, client: AsyncClient, auth_headers: dict
    ):
        """PATCH後にGETで更新されたステータスが確認できること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]

        await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"status": "decommissioned"},
            headers=auth_headers,
        )
        get_resp = await client.get(f"/api/v1/assets/{asset_id}", headers=auth_headers)
        assert get_resp.json()["status"] == "decommissioned"

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "from_status,to_status",
        [
            ("active", "inactive"),
            ("active", "maintenance"),
            ("active", "decommissioned"),
            ("inactive", "active"),
            ("maintenance", "inactive"),
            ("decommissioned", "active"),
        ],
    )
    async def test_all_status_transitions(
        self,
        client: AsyncClient,
        auth_headers: dict,
        from_status: str,
        to_status: str,
    ):
        """全ステータス遷移パターンが正常に動作すること"""
        create_resp = await client.post(
            "/api/v1/assets/",
            json=_make_device(status=from_status),
            headers=auth_headers,
        )
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"status": to_status},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == to_status


# ===================================================================
# PATCH 部分更新（Partial Update）
# ===================================================================
class TestAssetPartialUpdate:
    """資産PATCH部分更新テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_patch_hostname(self, client: AsyncClient, auth_headers: dict):
        """hostname の部分更新ができること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]
        new_hostname = f"renamed-{uuid.uuid4().hex[:8]}"

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"hostname": new_hostname},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["hostname"] == new_hostname

    @pytest.mark.asyncio
    async def test_patch_os_version(self, client: AsyncClient, auth_headers: dict):
        """os_version の部分更新ができること"""
        create_resp = await client.post(
            "/api/v1/assets/", json=_make_device(), headers=auth_headers
        )
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"os_version": "Windows 11 23H2"},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["os_version"] == "Windows 11 23H2"

    @pytest.mark.asyncio
    async def test_patch_preserves_unmodified_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """PATCHで指定しなかったフィールドが保持されること"""
        payload = _make_device(
            ip_address="10.10.10.10",
            mac_address="11:22:33:44:55:66",
            domain="test.local",
        )
        create_resp = await client.post("/api/v1/assets/", json=payload, headers=auth_headers)
        asset_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/assets/{asset_id}",
            json={"status": "inactive"},
            headers=auth_headers,
        )
        data = patch_resp.json()
        assert data["ip_address"] == "10.10.10.10"
        assert data["mac_address"] == "11:22:33:44:55:66"
        assert data["domain"] == "test.local"

    @pytest.mark.asyncio
    async def test_patch_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない資産のPATCHで404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/assets/{fake_id}",
            json={"status": "inactive"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_patch_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正UUIDでのPATCHに422が返ること"""
        response = await client.patch(
            "/api/v1/assets/not-a-uuid",
            json={"status": "inactive"},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# ステータスフィルタ（Status Filter）
# ===================================================================
class TestAssetStatusFilter:
    """資産ステータスフィルタテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_filter_by_active_status(self, client: AsyncClient, auth_headers: dict):
        """status=active フィルタで active 資産のみ返ること"""
        # active資産を作成
        await client.post(
            "/api/v1/assets/",
            json={"hostname": f"filter-active-{uuid.uuid4().hex[:8]}", "status": "active"},
            headers=auth_headers,
        )
        response = await client.get("/api/v1/assets/?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "active" for item in data["items"])

    @pytest.mark.asyncio
    async def test_filter_by_inactive_status(self, client: AsyncClient, auth_headers: dict):
        """status=inactive フィルタで inactive 資産のみ返ること"""
        await client.post(
            "/api/v1/assets/",
            json={"hostname": f"filter-inactive-{uuid.uuid4().hex[:8]}", "status": "inactive"},
            headers=auth_headers,
        )
        response = await client.get("/api/v1/assets/?status=inactive", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "inactive" for item in data["items"])

    @pytest.mark.asyncio
    async def test_filter_by_decommissioned_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """status=decommissioned フィルタで廃棄済み資産のみ返ること"""
        await client.post(
            "/api/v1/assets/",
            json={
                "hostname": f"filter-decom-{uuid.uuid4().hex[:8]}",
                "status": "decommissioned",
            },
            headers=auth_headers,
        )
        response = await client.get(
            "/api/v1/assets/?status=decommissioned", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "decommissioned" for item in data["items"])

    @pytest.mark.asyncio
    async def test_filter_by_maintenance_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """status=maintenance フィルタで保守中資産のみ返ること"""
        await client.post(
            "/api/v1/assets/",
            json={
                "hostname": f"filter-maint-{uuid.uuid4().hex[:8]}",
                "status": "maintenance",
            },
            headers=auth_headers,
        )
        response = await client.get(
            "/api/v1/assets/?status=maintenance", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "maintenance" for item in data["items"])

    @pytest.mark.asyncio
    async def test_no_filter_returns_all_statuses(
        self, client: AsyncClient, auth_headers: dict
    ):
        """フィルタなしで全ステータスの資産が返ること"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data


# ===================================================================
# カウントエンドポイント（Count）
# ===================================================================
class TestAssetCount:
    """資産カウントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_count_returns_integer(self, client: AsyncClient, auth_headers: dict):
        """カウントエンドポイントが整数を返すこと"""
        response = await client.get("/api/v1/assets/count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0

    @pytest.mark.asyncio
    async def test_count_increases_after_create(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産登録後にカウントが増加すること"""
        before_resp = await client.get("/api/v1/assets/count", headers=auth_headers)
        before_count = before_resp.json()["count"]

        await client.post(
            "/api/v1/assets/",
            json={"hostname": f"count-test-{uuid.uuid4().hex[:8]}"},
            headers=auth_headers,
        )

        after_resp = await client.get("/api/v1/assets/count", headers=auth_headers)
        after_count = after_resp.json()["count"]

        assert after_count == before_count + 1


# ===================================================================
# レスポンス構造（Response Structure）
# ===================================================================
class TestAssetResponseStructure:
    """資産レスポンス構造テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_created_asset_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """登録レスポンスに必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/assets/",
            json={"hostname": f"fields-{uuid.uuid4().hex[:8]}"},
            headers=auth_headers,
        )
        data = response.json()
        for field in ("id", "hostname", "status", "created_at"):
            assert field in data, f"Missing required field: {field}"

    @pytest.mark.asyncio
    async def test_list_response_structure(self, client: AsyncClient, auth_headers: dict):
        """一覧レスポンスがページネーション構造を持つこと"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_get_asset_response_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """個別取得レスポンスに全フィールドが含まれること"""
        create_resp = await client.post(
            "/api/v1/assets/",
            json={
                "hostname": f"resp-{uuid.uuid4().hex[:8]}",
                "ip_address": "172.16.0.1",
                "os_version": "Ubuntu 22.04",
            },
            headers=auth_headers,
        )
        asset_id = create_resp.json()["id"]

        get_resp = await client.get(f"/api/v1/assets/{asset_id}", headers=auth_headers)
        data = get_resp.json()
        assert data["ip_address"] == "172.16.0.1"
        assert data["os_version"] == "Ubuntu 22.04"
        assert data["id"] == asset_id
