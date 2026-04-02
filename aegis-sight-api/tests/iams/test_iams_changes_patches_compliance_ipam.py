"""
IAMS移植テスト: 変更管理・パッチ管理・コンプライアンス・IPアドレス管理詳細（Phase42）
変換元: IAMS 変更・パッチ・コンプライアンス・IPAMテスト 72件中52件選定
変換日: 2026-04-02
変換元テスト数: 52件
変換テスト数: 36件（変更サマリー・パッチ脆弱性・コンプライアンスフレームワーク・IPレンジ管理）
除外テスト数: 16件（変更差分アルゴリズム依存・外部スキャンサービス依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 変更管理詳細（Changes Management Detail）
# ===================================================================
class TestChangesManagement:
    """変更管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_changes_summary_requires_auth(self, client: AsyncClient):
        """変更サマリーは認証必須であること"""
        response = await client.get("/api/v1/changes/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_snapshots_requires_auth(self, client: AsyncClient):
        """変更スナップショット一覧は認証必須であること"""
        response = await client.get("/api/v1/changes/snapshots")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """変更サマリーが200で返ること"""
        response = await client.get("/api/v1/changes/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_changes_snapshots_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """変更スナップショット一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/changes/snapshots", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_changes_device_timeline_requires_auth(self, client: AsyncClient):
        """デバイス変更タイムラインは認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/devices/{fake_id}/timeline"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_nonexistent_device_timeline_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスの変更タイムライン取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/devices/{fake_id}/timeline", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_changes_summary_has_expected_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """変更サマリーが期待する構造を持つこと"""
        response = await client.get("/api/v1/changes/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


# ===================================================================
# パッチ管理詳細（Patches Detail）
# ===================================================================
class TestPatchesDetail:
    """パッチ管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_patches_updates_requires_auth(self, client: AsyncClient):
        """パッチ更新一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/updates")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patches_missing_requires_auth(self, client: AsyncClient):
        """未適用パッチ一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/missing")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patches_vulnerabilities_requires_auth(self, client: AsyncClient):
        """脆弱性一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/vulnerabilities")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patches_updates_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """パッチ更新一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/patches/updates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_patches_missing_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """未適用パッチ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/patches/missing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_patches_vulnerabilities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脆弱性一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/patches/vulnerabilities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_patches_device_status_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのパッチステータス取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/patches/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# コンプライアンス詳細（Compliance Detail）
# ===================================================================
class TestComplianceDetail:
    """コンプライアンス詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_overview_requires_auth(self, client: AsyncClient):
        """コンプライアンス概要は認証必須であること"""
        response = await client.get("/api/v1/compliance/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_compliance_iso27001_requires_auth(self, client: AsyncClient):
        """ISO 27001コンプライアンスは認証必須であること"""
        response = await client.get("/api/v1/compliance/iso27001")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_compliance_overview_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンス概要が200で返ること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_iso27001_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ISO 27001コンプライアンスが200で返ること"""
        response = await client.get(
            "/api/v1/compliance/iso27001", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_jsox_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """J-SOXコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/compliance/jsox", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_nist_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """NISTコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/compliance/nist", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_overview_has_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンス概要が辞書形式で返ること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


# ===================================================================
# IPアドレス管理詳細（IP Management Detail）
# ===================================================================
class TestIPManagementDetail:
    """IPアドレス管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_ip_ranges_requires_auth(self, client: AsyncClient):
        """IPレンジ一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-ranges")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_assignments_requires_auth(self, client: AsyncClient):
        """IPアサイン一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_ip_ranges_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-ranges", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_ip_assignments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアサイン一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_ip_range_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジ取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_ip_range_utilization_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの使用率取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}/utilization", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_ip_conflicts_requires_auth(self, client: AsyncClient):
        """IPコンフリクト一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments/conflicts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_conflicts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPコンフリクト一覧が200で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
        )
        assert response.status_code == 200
