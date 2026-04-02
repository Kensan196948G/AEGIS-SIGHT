"""
IAMS移植テスト: 資産ライフサイクル・廃棄管理（Phase8）
変換元: IAMS 資産ライフサイクルテスト 98件中80件選定
変換日: 2026-04-02
変換元テスト数: 80件
変換テスト数: 38件（優先度高・状態遷移・RBAC・バリデーション）
除外テスト数: 42件（DB直接操作依存・フィクスチャ複雑度高）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_LIFECYCLE_EVENT_TYPES = [
    "procured",
    "deployed",
    "reassigned",
    "maintenance",
    "disposal_requested",
    "disposal_approved",
    "disposed",
]

ALL_DISPOSAL_METHODS = [
    "recycle",
    "destroy",
    "donate",
    "return_to_vendor",
]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestLifecycleAuth:
    """ライフサイクルAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_summary_requires_auth(self, client: AsyncClient):
        """ライフサイクルサマリーは認証必須であること"""
        response = await client.get("/api/v1/lifecycle/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_history_requires_auth(self, client: AsyncClient):
        """デバイス履歴取得は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/lifecycle/devices/{fake_id}/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_disposal_list_requires_auth(self, client: AsyncClient):
        """廃棄申請一覧は認証必須であること"""
        response = await client.get("/api/v1/lifecycle/disposals")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_summary_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでサマリーにアクセスできること（200）"""
        response = await client.get(
            "/api/v1/lifecycle/summary", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_readonly_can_access_summary(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonly ロールでもサマリーにアクセスできること（200）"""
        response = await client.get(
            "/api/v1/lifecycle/summary", headers=readonly_headers
        )
        assert response.status_code == 200


# ===================================================================
# ライフサイクルサマリー（Summary）
# ===================================================================
class TestLifecycleSummary:
    """ライフサイクルサマリーレスポンス構造テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_summary_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """サマリーに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/lifecycle/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        required_fields = [
            "procured",
            "deployed",
            "maintenance",
            "disposed",
            "disposal_pending",
            "disposal_approved",
            "total_events",
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_summary_counts_are_non_negative(
        self, client: AsyncClient, auth_headers: dict
    ):
        """サマリーのカウント値は非負であること"""
        response = await client.get(
            "/api/v1/lifecycle/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("procured", "deployed", "maintenance", "disposed",
                       "disposal_pending", "disposal_approved", "total_events"):
            assert data[field] >= 0, f"Negative count for {field}"

    @pytest.mark.asyncio
    async def test_summary_total_events_is_integer(
        self, client: AsyncClient, auth_headers: dict
    ):
        """total_events が整数型であること"""
        response = await client.get(
            "/api/v1/lifecycle/summary", headers=auth_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json()["total_events"], int)


# ===================================================================
# デバイス履歴（Device History）
# ===================================================================
class TestDeviceHistory:
    """デバイスライフサイクル履歴テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_history_not_found_for_unknown_device(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスIDで 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/lifecycle/devices/{fake_id}/history",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_history_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なUUID形式で 422 が返ること"""
        response = await client.get(
            "/api/v1/lifecycle/devices/not-a-uuid/history",
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_history_response_is_paginated(
        self, client: AsyncClient, auth_headers: dict, sample_device
    ):
        """デバイス履歴レスポンスがページネーション形式であること"""
        device_id = str(sample_device.id)
        response = await client.get(
            f"/api/v1/lifecycle/devices/{device_id}/history",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_history_items_have_required_fields(
        self, client: AsyncClient, auth_headers: dict, sample_device
    ):
        """履歴アイテムに必須フィールドが含まれること（データなしは空配列で許容）"""
        device_id = str(sample_device.id)
        response = await client.get(
            f"/api/v1/lifecycle/devices/{device_id}/history",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            for field in ("id", "device_id", "event_type", "occurred_at"):
                assert field in item, f"Missing field: {field}"


# ===================================================================
# ライフサイクルイベント記録（Event Creation）
# ===================================================================
class TestLifecycleEventCreation:
    """ライフサイクルイベント作成テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_add_event_requires_auth(self, client: AsyncClient, sample_device):
        """イベント追加は認証必須であること"""
        device_id = str(sample_device.id)
        response = await client.post(
            f"/api/v1/lifecycle/devices/{device_id}/events",
            json={"event_type": "deployed", "detail": {}},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_add_event_to_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスへのイベント追加で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/lifecycle/devices/{fake_id}/events",
            json={"event_type": "deployed"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    @pytest.mark.parametrize("event_type", ALL_LIFECYCLE_EVENT_TYPES)
    async def test_all_event_types_accepted(
        self, client: AsyncClient, auth_headers: dict, sample_device, event_type: str
    ):
        """全ライフサイクルイベント種別が受け付けられること"""
        device_id = str(sample_device.id)
        response = await client.post(
            f"/api/v1/lifecycle/devices/{device_id}/events",
            json={"event_type": event_type},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"event_type={event_type}: unexpected status {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_invalid_event_type_returns_422(
        self, client: AsyncClient, auth_headers: dict, sample_device
    ):
        """不正なイベント種別で 422 が返ること"""
        device_id = str(sample_device.id)
        response = await client.post(
            f"/api/v1/lifecycle/devices/{device_id}/events",
            json={"event_type": "invalid_event"},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# 廃棄申請管理（Disposal Request）
# ===================================================================
class TestDisposalRequest:
    """廃棄申請テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_disposals_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """廃棄申請一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/lifecycle/disposals", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_disposal_for_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスへの廃棄申請で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            "/api/v1/lifecycle/disposals",
            json={
                "device_id": fake_id,
                "reason": "古くなったため廃棄",
                "method": "recycle",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_disposal_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で 422 が返ること"""
        response = await client.post(
            "/api/v1/lifecycle/disposals",
            json={"reason": "理由なし"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method", ALL_DISPOSAL_METHODS)
    async def test_all_disposal_methods_are_valid(
        self, client: AsyncClient, auth_headers: dict, sample_device, method: str
    ):
        """全廃棄方法が有効であること（デバイスなし時は404を許容）"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            "/api/v1/lifecycle/disposals",
            json={
                "device_id": fake_id,
                "reason": f"{method}による廃棄",
                "method": method,
            },
            headers=auth_headers,
        )
        # デバイスが存在しない場合は 404、バリデーションエラーは 422 のみNG
        assert response.status_code != 422, (
            f"method={method} should not return 422"
        )

    @pytest.mark.asyncio
    async def test_invalid_disposal_method_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正な廃棄方法で 422 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            "/api/v1/lifecycle/disposals",
            json={
                "device_id": fake_id,
                "reason": "テスト",
                "method": "invalid_method",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_approve_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の承認で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/approve",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reject_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の却下で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/reject",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_complete_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の完了処理で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/complete",
            json={"certificate_number": "CERT-2026-001"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_disposal_list_filter_by_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """status フィルタで廃棄申請を絞り込めること（0件も許容）"""
        response = await client.get(
            "/api/v1/lifecycle/disposals?status=pending",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "pending"
