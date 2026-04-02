"""
IAMS移植テスト: IPアドレス管理・タグ管理（Phase15）
変換元: IAMS ネットワーク管理・タグ管理テスト 103件中78件選定
変換日: 2026-04-02
変換元テスト数: 78件
変換テスト数: 38件（IPレンジCRUD・IP割り当て・トポロジー・タグCRUD・タグ割り当て）
除外テスト数: 40件（ネットワークスキャン依存・DHCPサーバー連携依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_TAG_CATEGORIES = ["device", "license", "procurement", "general"]
ALL_ASSIGNMENT_TYPES = ["static", "dhcp", "reserved"]
ALL_ASSIGNMENT_STATUSES = ["active", "inactive", "reserved"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestIPManagementAuth:
    """IPアドレス管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_ip_ranges_requires_auth(self, client: AsyncClient):
        """IPレンジ一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-ranges")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_assignments_requires_auth(self, client: AsyncClient):
        """IP割り当て一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_topology_requires_auth(self, client: AsyncClient):
        """ネットワークトポロジーは認証必須であること"""
        response = await client.get("/api/v1/network/topology")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_ranges_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでIPレンジ一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/network/ip-ranges", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_readonly_can_access_ip_ranges(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールでもIPレンジ一覧にアクセスできること"""
        response = await client.get("/api/v1/network/ip-ranges", headers=readonly_headers)
        assert response.status_code == 200


# ===================================================================
# IPレンジ CRUD（IP Range CRUD）
# ===================================================================
class TestIPRangeCRUD:
    """IPレンジCRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_ip_ranges_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/ip-ranges", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_ip_range_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/network/ip-ranges",
            json={"name": "テストレンジ"},  # network_address 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_ip_range_invalid_cidr_returns_400(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なCIDR表記で400が返ること"""
        response = await client.post(
            "/api/v1/network/ip-ranges",
            json={
                "name": "不正CIDRテスト",
                "network_address": "not-a-cidr",
            },
            headers=auth_headers,
        )
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_create_ip_range_valid_cidr_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なCIDRでIPレンジを作成できること"""
        # ユニークなCIDRを生成してテスト
        unique_octet = str(uuid.uuid4().int % 200 + 10)
        response = await client.post(
            "/api/v1/network/ip-ranges",
            json={
                "name": f"IAMS移植テスト-レンジ-{unique_octet}",
                "network_address": f"10.{unique_octet}.0.0/24",
                "vlan_id": 100,
                "dhcp_enabled": True,
                "location": "東京データセンター",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )

    @pytest.mark.asyncio
    async def test_create_ip_range_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したIPレンジのレスポンスに必須フィールドが含まれること"""
        unique_octet = str(uuid.uuid4().int % 200 + 10)
        response = await client.post(
            "/api/v1/network/ip-ranges",
            json={
                "name": f"IAMS移植テスト-フィールド確認-{unique_octet}",
                "network_address": f"172.16.{unique_octet}.0/24",
                "dhcp_enabled": False,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name", "network_address"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_ip_range_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# IP割り当て（IP Assignments）
# ===================================================================
class TestIPAssignments:
    """IP割り当てテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_ip_assignments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IP割り当て一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/ip-assignments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_ip_assignment_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/network/ip-assignments",
            json={"ip_address": "192.168.1.10"},  # range_id, type, status 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_ip_conflicts_endpoint_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IP競合エンドポイントがページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"


# ===================================================================
# ネットワークトポロジー（Network Topology）
# ===================================================================
class TestNetworkTopology:
    """ネットワークトポロジーテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_topology_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """トポロジーエンドポイントが200で返ること"""
        response = await client.get("/api/v1/network/topology", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_topology_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """トポロジーレスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/network/topology", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data, "Missing field: nodes"
        assert "edges" in data, "Missing field: edges"
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)


# ===================================================================
# タグ管理 認証（Tags Auth）
# ===================================================================
class TestTagsAuth:
    """タグ管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_tags_list_requires_auth(self, client: AsyncClient):
        """タグ一覧は認証必須であること"""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_tags_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでタグ一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# タグ CRUD（Tags CRUD）
# ===================================================================
class TestTagsCRUD:
    """タグCRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_tags_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_tag_missing_name_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/tags",
            json={"category": "device"},  # name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("category", ALL_TAG_CATEGORIES)
    async def test_create_tag_all_categories(
        self, client: AsyncClient, auth_headers: dict, category: str
    ):
        """全カテゴリでタグを作成できること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/tags",
            json={
                "name": f"IAMS移植テスト-{category}-{unique_suffix}",
                "category": category,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"category={category}: 予期しないステータス {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_tag_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したタグのレスポンスに必須フィールドが含まれること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/tags",
            json={
                "name": f"IAMS移植テスト-フィールド確認-{unique_suffix}",
                "category": "general",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name", "category"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_delete_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/tags/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_filter_tags_by_category(
        self, client: AsyncClient, auth_headers: dict
    ):
        """categoryフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/tags?category=device", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["category"] == "device"

    @pytest.mark.asyncio
    async def test_invalid_category_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なcategoryで422が返ること"""
        response = await client.get(
            "/api/v1/tags?category=invalid_cat", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# タグ割り当て（Tag Assignments）
# ===================================================================
class TestTagAssignments:
    """タグ割り当てテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_assign_tag_to_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグへの割り当てで404が返ること"""
        fake_tag_id = str(uuid.uuid4())
        response = await client.post(
            "/api/v1/tags/assign",
            json={
                "tag_id": fake_tag_id,
                "entity_type": "device",
                "entity_id": str(uuid.uuid4()),
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_tag_entities_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグのエンティティ一覧で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/tags/{fake_id}/entities", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unassign_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグ割り当ての解除で404が返ること"""
        response = await client.request(
            "DELETE",
            "/api/v1/tags/assign",
            json={
                "tag_id": str(uuid.uuid4()),
                "entity_type": "device",
                "entity_id": str(uuid.uuid4()),
            },
            headers=auth_headers,
        )
        assert response.status_code == 404
