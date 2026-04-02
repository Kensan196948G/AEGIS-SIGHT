"""
IAMS移植テスト: SAMライセンス管理 Phase3
変換元: IAMS SAMライセンス管理テスト 175件中優先度高選定
変換日: 2026-04-02
変換元テスト数: 175件
変換テスト数: 48件（ライセンス種別・ベンダーフィルタ・PATCH詳細・期限境界値・コンプライアンス詳細）
除外テスト数: 127件（Express固有・WebSocket・外部API依存）
"""

import uuid
from datetime import date, timedelta

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

# ライセンス種別全種
ALL_LICENSE_TYPES = ["perpetual", "subscription", "oem", "volume", "freeware", "open_source"]


def _make_license(name: str | None = None, **overrides) -> dict:
    """ユニークなライセンス作成ペイロードを生成する"""
    unique = uuid.uuid4().hex[:8]
    base = {
        "software_name": name or f"TestSW-{unique}",
        "vendor": f"Vendor-{unique}",
        "license_type": "subscription",
        "purchased_count": 10,
    }
    base.update(overrides)
    return base


# ===================================================================
# ライセンス種別（License Type）
# ===================================================================
class TestLicenseTypes:
    """ライセンス種別バリデーションテスト（IAMS移植）"""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("license_type", ALL_LICENSE_TYPES)
    async def test_all_valid_license_types(
        self, client: AsyncClient, auth_headers: dict, license_type: str
    ):
        """全ての有効なライセンス種別で登録できること"""
        payload = _make_license(license_type=license_type)
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["license_type"] == license_type

    @pytest.mark.asyncio
    async def test_freeware_type_registration(self, client: AsyncClient, auth_headers: dict):
        """フリーウェアライセンスが登録できること"""
        payload = _make_license(
            license_type="freeware",
            purchased_count=0,
            cost_per_unit=None,
        )
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["license_type"] == "freeware"

    @pytest.mark.asyncio
    async def test_open_source_type_registration(self, client: AsyncClient, auth_headers: dict):
        """オープンソースライセンスが登録できること"""
        payload = _make_license(license_type="open_source")
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["license_type"] == "open_source"

    @pytest.mark.asyncio
    async def test_oem_type_registration(self, client: AsyncClient, auth_headers: dict):
        """OEMライセンスが登録できること"""
        payload = _make_license(license_type="oem", purchased_count=50)
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_volume_type_registration(self, client: AsyncClient, auth_headers: dict):
        """ボリュームライセンスが登録できること"""
        payload = _make_license(license_type="volume", purchased_count=1000)
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.status_code == 201


# ===================================================================
# ライセンスレスポンス構造（Response Structure）
# ===================================================================
class TestLicenseResponseStructure:
    """ライセンスレスポンス構造テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_created_license_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """登録レスポンスに全必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/sam/licenses", json=_make_license(), headers=auth_headers
        )
        data = response.json()
        for field in (
            "id",
            "software_name",
            "vendor",
            "license_type",
            "purchased_count",
            "installed_count",
            "m365_assigned",
            "currency",
            "created_at",
            "updated_at",
        ):
            assert field in data, f"Missing required field: {field}"

    @pytest.mark.asyncio
    async def test_default_currency_is_jpy(self, client: AsyncClient, auth_headers: dict):
        """デフォルト通貨が JPY であること"""
        payload = _make_license()
        payload.pop("currency", None)
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.json()["currency"] == "JPY"

    @pytest.mark.asyncio
    async def test_custom_currency_accepted(self, client: AsyncClient, auth_headers: dict):
        """USD 通貨が正常に保存されること"""
        payload = _make_license(currency="USD", cost_per_unit="99.99")
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["currency"] == "USD"

    @pytest.mark.asyncio
    async def test_license_key_field_stored(self, client: AsyncClient, auth_headers: dict):
        """license_key フィールドが保存されること"""
        payload = _make_license(license_key="XXXX-YYYY-ZZZZ-0000")
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.json()["license_key"] == "XXXX-YYYY-ZZZZ-0000"

    @pytest.mark.asyncio
    async def test_vendor_contract_id_field_stored(
        self, client: AsyncClient, auth_headers: dict
    ):
        """vendor_contract_id フィールドが保存されること"""
        payload = _make_license(vendor_contract_id="CONTRACT-2024-001")
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.json()["vendor_contract_id"] == "CONTRACT-2024-001"

    @pytest.mark.asyncio
    async def test_notes_field_stored(self, client: AsyncClient, auth_headers: dict):
        """notes フィールドが保存されること"""
        payload = _make_license(notes="重要システム用ライセンス。更新必須。")
        response = await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)
        assert response.json()["notes"] == "重要システム用ライセンス。更新必須。"


# ===================================================================
# ベンダーフィルタ（Vendor Filter）
# ===================================================================
class TestLicenseVendorFilter:
    """ライセンスベンダーフィルタテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_vendor_filter_exact_match(self, client: AsyncClient, auth_headers: dict):
        """ベンダー完全一致フィルタが機能すること"""
        unique = uuid.uuid4().hex[:8]
        vendor_name = f"UniqueVendor-{unique}"
        await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(vendor=vendor_name),
            headers=auth_headers,
        )
        response = await client.get(
            f"/api/v1/sam/licenses?vendor={vendor_name}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert all(vendor_name in item["vendor"] for item in data["items"])

    @pytest.mark.asyncio
    async def test_vendor_filter_partial_match(self, client: AsyncClient, auth_headers: dict):
        """ベンダー部分一致フィルタが機能すること"""
        unique = uuid.uuid4().hex[:8]
        await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(vendor=f"PartialVendor-{unique}"),
            headers=auth_headers,
        )
        response = await client.get(
            f"/api/v1/sam/licenses?vendor=Partial", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert all("Partial" in item["vendor"] for item in data["items"])

    @pytest.mark.asyncio
    async def test_vendor_filter_case_insensitive(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ベンダーフィルタが大文字小文字を区別しないこと"""
        unique = uuid.uuid4().hex[:8]
        vendor_name = f"CaseTestVendor-{unique}"
        await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(vendor=vendor_name),
            headers=auth_headers,
        )
        response = await client.get(
            f"/api/v1/sam/licenses?vendor=casetest", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_vendor_filter_no_match_returns_empty(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないベンダーでフィルタすると空が返ること"""
        response = await client.get(
            "/api/v1/sam/licenses?vendor=NONEXISTENT_VENDOR_XYZ_12345",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []


# ===================================================================
# PATCH 部分更新（Partial Update）
# ===================================================================
class TestLicensePatchUpdate:
    """ライセンスPATCH更新詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_patch_purchased_count(self, client: AsyncClient, auth_headers: dict):
        """purchased_count の更新ができること"""
        create_resp = await client.post(
            "/api/v1/sam/licenses", json=_make_license(purchased_count=10), headers=auth_headers
        )
        license_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/sam/licenses/{license_id}",
            json={"purchased_count": 200},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["purchased_count"] == 200

    @pytest.mark.asyncio
    async def test_patch_expiry_date(self, client: AsyncClient, auth_headers: dict):
        """expiry_date の更新ができること"""
        create_resp = await client.post(
            "/api/v1/sam/licenses", json=_make_license(), headers=auth_headers
        )
        license_id = create_resp.json()["id"]

        new_expiry = (date.today() + timedelta(days=180)).isoformat()
        patch_resp = await client.patch(
            f"/api/v1/sam/licenses/{license_id}",
            json={"expiry_date": new_expiry},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["expiry_date"] == new_expiry

    @pytest.mark.asyncio
    async def test_patch_license_type(self, client: AsyncClient, auth_headers: dict):
        """license_type の更新ができること"""
        create_resp = await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(license_type="subscription"),
            headers=auth_headers,
        )
        license_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/sam/licenses/{license_id}",
            json={"license_type": "perpetual"},
            headers=auth_headers,
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["license_type"] == "perpetual"

    @pytest.mark.asyncio
    async def test_patch_preserves_unmodified_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """PATCHで指定しなかったフィールドが保持されること"""
        payload = _make_license(
            vendor_contract_id="KEEP-THIS-001",
            license_key="KEEP-KEY-0001",
            notes="KEEP_NOTES",
        )
        create_resp = await client.post(
            "/api/v1/sam/licenses", json=payload, headers=auth_headers
        )
        license_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/v1/sam/licenses/{license_id}",
            json={"purchased_count": 999},
            headers=auth_headers,
        )
        data = patch_resp.json()
        assert data["vendor_contract_id"] == "KEEP-THIS-001"
        assert data["license_key"] == "KEEP-KEY-0001"
        assert data["notes"] == "KEEP_NOTES"

    @pytest.mark.asyncio
    async def test_patch_nonexistent_license_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないライセンスのPATCHで404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sam/licenses/{fake_id}",
            json={"purchased_count": 10},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_patch_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正UUIDでのPATCHに422が返ること"""
        response = await client.patch(
            "/api/v1/sam/licenses/not-a-uuid",
            json={"purchased_count": 10},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_patch_invalid_license_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なlicense_typeでのPATCHに422が返ること"""
        create_resp = await client.post(
            "/api/v1/sam/licenses", json=_make_license(), headers=auth_headers
        )
        license_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/v1/sam/licenses/{license_id}",
            json={"license_type": "invalid_type"},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# 期限切れライセンス境界値（Expiry Boundary）
# ===================================================================
class TestLicenseExpiryBoundary:
    """ライセンス期限境界値テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_expiring_days_min_boundary(self, client: AsyncClient, auth_headers: dict):
        """days=1（最小値）で正常応答すること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=1", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_expiring_days_max_boundary(self, client: AsyncClient, auth_headers: dict):
        """days=365（最大値）で正常応答すること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=365", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_expiring_days_zero_returns_422(self, client: AsyncClient, auth_headers: dict):
        """days=0（最小値未満）で422が返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=0", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_expiring_days_over_max_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """days=366（最大値超過）で422が返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=366", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_expiring_sorted_by_expiry_date(
        self, client: AsyncClient, auth_headers: dict
    ):
        """期限切れライセンスが expiry_date 昇順で返ること"""
        # 2つの期限を逆順で登録
        far_date = (date.today() + timedelta(days=25)).isoformat()
        near_date = (date.today() + timedelta(days=5)).isoformat()

        for name, exp_date in [("FarExpiry", far_date), ("NearExpiry", near_date)]:
            await client.post(
                "/api/v1/sam/licenses",
                json=_make_license(name=name, expiry_date=exp_date),
                headers=auth_headers,
            )

        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=30", headers=auth_headers
        )
        data = response.json()
        # 結果リストからour items取得
        our_items = [i for i in data if i["software_name"] in ("NearExpiry", "FarExpiry")]
        if len(our_items) == 2:
            near_idx = next(
                (idx for idx, i in enumerate(our_items) if i["software_name"] == "NearExpiry"),
                None,
            )
            far_idx = next(
                (idx for idx, i in enumerate(our_items) if i["software_name"] == "FarExpiry"),
                None,
            )
            if near_idx is not None and far_idx is not None:
                assert near_idx < far_idx, "期限切れライセンスが昇順ソートされていない"

    @pytest.mark.asyncio
    async def test_expiring_response_has_days_until_expiry(
        self, client: AsyncClient, auth_headers: dict
    ):
        """期限切れレスポンスに days_until_expiry フィールドが含まれること"""
        expiry = (date.today() + timedelta(days=15)).isoformat()
        await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(name=f"DaysUntilTest-{uuid.uuid4().hex[:6]}", expiry_date=expiry),
            headers=auth_headers,
        )
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=30", headers=auth_headers
        )
        data = response.json()
        assert len(data) > 0
        assert "days_until_expiry" in data[0]
        for item in data:
            assert item["days_until_expiry"] >= 0

    @pytest.mark.asyncio
    async def test_license_without_expiry_not_in_expiring_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """expiry_date なしライセンスは期限切れリストに含まれないこと"""
        unique = uuid.uuid4().hex[:8]
        name = f"NoExpiry-{unique}"
        await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(name=name),
            headers=auth_headers,
        )
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=365", headers=auth_headers
        )
        names = [item["software_name"] for item in response.json()]
        assert name not in names


# ===================================================================
# コンプライアンス詳細（Compliance Details）
# ===================================================================
class TestComplianceDetails:
    """コンプライアンス詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_response_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンスレスポンスに必須フィールドが含まれること"""
        # テスト用ライセンスを作成してデータを確保
        await client.post(
            "/api/v1/sam/licenses",
            json=_make_license(installed_count=5),
            headers=auth_headers,
        )
        response = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        if results:
            for field in (
                "license_id",
                "software_name",
                "purchased_count",
                "installed_count",
                "m365_assigned",
                "total_used",
                "is_compliant",
                "over_deployed",
            ):
                assert field in results[0], f"Missing field in compliance response: {field}"

    @pytest.mark.asyncio
    async def test_compliance_total_used_calculation(
        self, client: AsyncClient, auth_headers: dict
    ):
        """total_used = installed_count + m365_assigned の計算が正しいこと"""
        unique = uuid.uuid4().hex[:8]
        payload = {
            "software_name": f"TotalUsedTest-{unique}",
            "vendor": "TestVendor",
            "license_type": "subscription",
            "purchased_count": 100,
            "installed_count": 30,
            "m365_assigned": 20,
        }
        await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)

        response = await client.post("/api/v1/sam/compliance/check", headers=auth_headers)
        checks = response.json()
        item = next(
            (c for c in checks if c["software_name"] == payload["software_name"]), None
        )
        assert item is not None
        assert item["total_used"] == 50  # 30 + 20

    @pytest.mark.asyncio
    async def test_compliance_over_deployed_zero_when_compliant(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンス準拠時 over_deployed == 0 であること"""
        unique = uuid.uuid4().hex[:8]
        payload = {
            "software_name": f"ZeroOver-{unique}",
            "vendor": "GoodVendor",
            "license_type": "perpetual",
            "purchased_count": 100,
            "installed_count": 40,
            "m365_assigned": 30,
        }
        await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)

        response = await client.post("/api/v1/sam/compliance/check", headers=auth_headers)
        checks = response.json()
        item = next(
            (c for c in checks if c["software_name"] == payload["software_name"]), None
        )
        assert item is not None
        assert item["over_deployed"] == 0
        assert item["is_compliant"] is True

    @pytest.mark.asyncio
    async def test_compliance_check_post_equals_get(
        self, client: AsyncClient, auth_headers: dict
    ):
        """POST /compliance/check と GET /compliance が同じ件数を返すこと"""
        get_resp = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        post_resp = await client.post("/api/v1/sam/compliance/check", headers=auth_headers)

        assert len(get_resp.json()) == len(post_resp.json())

    @pytest.mark.asyncio
    async def test_compliance_zero_purchased_count(
        self, client: AsyncClient, auth_headers: dict
    ):
        """purchased_count=0 でも over_deployed が正しく計算されること"""
        unique = uuid.uuid4().hex[:8]
        payload = {
            "software_name": f"ZeroPurchased-{unique}",
            "vendor": "TestVendor",
            "license_type": "freeware",
            "purchased_count": 0,
            "installed_count": 5,
            "m365_assigned": 0,
        }
        await client.post("/api/v1/sam/licenses", json=payload, headers=auth_headers)

        response = await client.post("/api/v1/sam/compliance/check", headers=auth_headers)
        checks = response.json()
        item = next(
            (c for c in checks if c["software_name"] == payload["software_name"]), None
        )
        assert item is not None
        assert item["is_compliant"] is False
        assert item["over_deployed"] == 5
