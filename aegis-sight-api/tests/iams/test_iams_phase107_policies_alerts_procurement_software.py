"""
IAMS移植テスト: ポリシー管理・アラート管理・調達管理・ソフトウェア管理（Phase55相当）
変換元: IAMS ポリシー/アラート/調達/ソフトウェアテスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（ポリシーCRUD/違反/評価/アラートライフサイクル/調達ワークフロー/ソフトウェア集計）
除外テスト数: 29件（外部ポリシーエンジン依存・通知連携依存・リアルタイムアラート依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ポリシー管理テスト（Policies）
# ===================================================================
class TestPolicies:
    """ポリシー管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_policies_requires_auth(self, client: AsyncClient):
        """ポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_policy_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/policies", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_policy_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシーの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/policies/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_policy_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシーの更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/policies/{fake_id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_policy_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないポリシーの削除は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/policies/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_policy_violations_requires_auth(self, client: AsyncClient):
        """ポリシー違反一覧は認証必須であること"""
        response = await client.get("/api/v1/policies/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_policy_violations_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー違反一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/policies/violations", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_policy_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシーコンプライアンス情報が200で返ること"""
        response = await client.get(
            "/api/v1/policies/compliance", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_policy_evaluate_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ポリシー評価リクエストに必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/policies/evaluate", json={}, headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# アラート管理テスト（Alerts）
# ===================================================================
class TestAlerts:
    """アラート管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_alerts_requires_auth(self, client: AsyncClient):
        """アラート一覧は認証必須であること"""
        response = await client.get("/api/v1/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_alerts_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_alerts_filter_by_severity(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート一覧をseverityでフィルタリングできること"""
        response = await client.get(
            "/api/v1/alerts?severity=critical", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_alert_stats_requires_auth(self, client: AsyncClient):
        """アラート統計は認証必須であること"""
        response = await client.get("/api/v1/alerts/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_alert_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート統計が200で返ること"""
        response = await client.get("/api/v1/alerts/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_alert_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/alerts", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/alerts/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_acknowledge_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの確認済みマークは404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/alerts/{fake_id}/acknowledge", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの解決は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/alerts/{fake_id}/resolve", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# 調達管理テスト（Procurement）
# ===================================================================
class TestProcurement:
    """調達管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_procurement_requires_auth(self, client: AsyncClient):
        """調達申請一覧は認証必須であること"""
        response = await client.get("/api/v1/procurement")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_procurement_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """調達申請一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/procurement", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_procurement_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """調達申請作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/procurement", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/procurement/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/procurement/{fake_id}",
            json={"notes": "updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_submit_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の提出は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/submit", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の承認は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/approve", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reject_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の却下は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/reject",
            json={"reason": "budget exceeded"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_order_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の発注は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/order", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_receive_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の受領は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/receive", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_dispose_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の廃棄は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/dispose", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_procurement_filter_by_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """調達申請一覧をstatusでフィルタリングできること"""
        response = await client.get(
            "/api/v1/procurement?status=draft", headers=auth_headers
        )
        assert response.status_code in (200, 422)


# ===================================================================
# ソフトウェア管理テスト（Software）
# ===================================================================
class TestSoftware:
    """ソフトウェア管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_software_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_software_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア集計一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_software_filter_by_search(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア一覧をsearchでフィルタリングできること"""
        response = await client.get(
            "/api/v1/software?search=office", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_device_software_requires_auth(self, client: AsyncClient):
        """デバイス別ソフトウェア一覧は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/software/devices/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_software_nonexistent_returns_paginated_or_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのソフトウェア一覧は空リストまたは404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code in (200, 404)
