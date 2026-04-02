"""
IAMS移植テスト: ユーザー管理（Phase4）
変換元: IAMS ユーザー管理テスト 120件中100件選定
変換日: 2026-04-02
変換元テスト数: 100件
変換テスト数: 45件（優先度高・RBAC・フィルタリング・部分更新・設定管理）
除外テスト数: 55件（Express固有ミドルウェア・セッション管理・JWT詳細）
"""

import pytest
from httpx import AsyncClient

from app.models.user import User

pytestmark = pytest.mark.iams


# ===================================================================
# RBAC: 認可制御（Authorization / Role-Based Access Control）
# ===================================================================
class TestUserRBAC:
    """ユーザー管理 RBAC テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_users_requires_admin_role(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonly ロールでユーザー一覧が 403 になること"""
        response = await client.get("/api/v1/users", headers=readonly_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_user_requires_admin_role(
        self, client: AsyncClient, readonly_headers: dict, admin_user: User
    ):
        """readonly ロールでユーザー更新が 403 になること"""
        response = await client.patch(
            f"/api/v1/users/{admin_user.id}",
            json={"full_name": "Unauthorized Update"},
            headers=readonly_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_deactivate_user_requires_admin_role(
        self, client: AsyncClient, readonly_headers: dict, readonly_user: User
    ):
        """readonly ロールでユーザー無効化が 403 になること"""
        response = await client.delete(
            f"/api/v1/users/{readonly_user.id}", headers=readonly_headers
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_user_accessible_without_admin(
        self, client: AsyncClient, readonly_headers: dict, admin_user: User
    ):
        """認証済みユーザーは他のユーザー詳細を取得できること（admin不要）"""
        response = await client.get(
            f"/api/v1/users/{admin_user.id}", headers=readonly_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_me_settings_accessible_to_all_roles(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """全ロールで /me/settings が取得できること"""
        response = await client.get(
            "/api/v1/users/me/settings", headers=readonly_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_users_requires_auth(self, client: AsyncClient):
        """ユーザー一覧は認証必須であること"""
        response = await client.get("/api/v1/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_user_requires_auth(
        self, client: AsyncClient, admin_user: User
    ):
        """ユーザー更新は認証必須であること"""
        response = await client.patch(
            f"/api/v1/users/{admin_user.id}",
            json={"full_name": "No Auth"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_deactivate_user_requires_auth(
        self, client: AsyncClient, readonly_user: User
    ):
        """ユーザー無効化は認証必須であること"""
        response = await client.delete(f"/api/v1/users/{readonly_user.id}")
        assert response.status_code == 401


# ===================================================================
# ユーザー一覧フィルタリング（Filtering）
# ===================================================================
class TestUserListFiltering:
    """ユーザー一覧フィルタリングテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_filter_by_role_admin(
        self, client: AsyncClient, admin_headers: dict
    ):
        """role=admin フィルターで管理者のみ返ること"""
        response = await client.get(
            "/api/v1/users?role=admin", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["role"] == "admin"

    @pytest.mark.asyncio
    async def test_filter_by_role_readonly(
        self, client: AsyncClient, admin_headers: dict
    ):
        """role=readonly フィルターで readonly ユーザーのみ返ること"""
        response = await client.get(
            "/api/v1/users?role=readonly", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["role"] == "readonly"

    @pytest.mark.asyncio
    async def test_filter_by_is_active_true(
        self, client: AsyncClient, admin_headers: dict
    ):
        """is_active=true でアクティブユーザーのみ返ること"""
        response = await client.get(
            "/api/v1/users?is_active=true", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_active"] is True

    @pytest.mark.asyncio
    async def test_filter_by_is_active_false(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """is_active=false で非アクティブユーザーのみ返ること（事前に無効化）"""
        # 事前にユーザーを無効化
        await client.delete(
            f"/api/v1/users/{readonly_user.id}", headers=admin_headers
        )
        response = await client.get(
            "/api/v1/users?is_active=false", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["is_active"] is False

    @pytest.mark.asyncio
    async def test_invalid_role_filter_returns_422(
        self, client: AsyncClient, admin_headers: dict
    ):
        """無効な role 値で 422 が返ること"""
        response = await client.get(
            "/api/v1/users?role=superuser", headers=admin_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_users_default_pagination(
        self, client: AsyncClient, admin_headers: dict
    ):
        """ユーザー一覧のデフォルト limit が 50 であること"""
        response = await client.get("/api/v1/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 50

    @pytest.mark.asyncio
    async def test_list_users_custom_limit(
        self, client: AsyncClient, admin_headers: dict
    ):
        """カスタム limit が適用されること"""
        response = await client.get(
            "/api/v1/users?limit=1", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 1
        assert len(data["items"]) <= 1


# ===================================================================
# ユーザー部分更新（Partial Update）
# ===================================================================
class TestUserPartialUpdate:
    """ユーザー PATCH 部分更新テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_update_full_name(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """full_name のみ更新できること"""
        response = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            json={"full_name": "IAMS Updated Name"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "IAMS Updated Name"

    @pytest.mark.asyncio
    async def test_update_role_to_operator(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """ロールを operator に変更できること"""
        response = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            json={"role": "operator"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "operator"

    @pytest.mark.asyncio
    async def test_update_role_to_auditor(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """ロールを auditor に変更できること"""
        response = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            json={"role": "auditor"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "auditor"

    @pytest.mark.asyncio
    async def test_update_preserves_unmodified_fields(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """更新対象外のフィールドが保持されること"""
        original = (
            await client.get(
                f"/api/v1/users/{readonly_user.id}", headers=admin_headers
            )
        ).json()
        response = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            json={"full_name": "Partial Only"},
            headers=admin_headers,
        )
        data = response.json()
        assert data["email"] == original["email"]
        assert data["role"] == original["role"]

    @pytest.mark.asyncio
    async def test_update_invalid_role_returns_422(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """無効なロール値で 422 が返ること"""
        response = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            json={"role": "god_mode"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_user_returns_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        """存在しないユーザー更新で 404 が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/users/{fake_id}",
            json={"full_name": "Ghost"},
            headers=admin_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_invalid_uuid_returns_422(
        self, client: AsyncClient, admin_headers: dict
    ):
        """不正 UUID で 422 が返ること"""
        response = await client.patch(
            "/api/v1/users/not-a-uuid",
            json={"full_name": "Invalid"},
            headers=admin_headers,
        )
        assert response.status_code == 422

    @pytest.mark.parametrize("role", ["admin", "operator", "auditor", "readonly"])
    @pytest.mark.asyncio
    async def test_all_role_values_are_valid(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User, role: str
    ):
        """全ロール値（admin/operator/auditor/readonly）が PATCH で受け付けられること"""
        response = await client.patch(
            f"/api/v1/users/{readonly_user.id}",
            json={"role": role},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["role"] == role


# ===================================================================
# ユーザー無効化（Soft-Delete）
# ===================================================================
class TestUserDeactivation:
    """ユーザー soft-delete テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_deactivate_sets_is_active_false(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """DELETE で is_active が False になること（soft-delete）"""
        response = await client.delete(
            f"/api/v1/users/{readonly_user.id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    @pytest.mark.asyncio
    async def test_deactivate_returns_user_object(
        self, client: AsyncClient, admin_headers: dict, readonly_user: User
    ):
        """DELETE で UserResponse 形式が返ること"""
        response = await client.delete(
            f"/api/v1/users/{readonly_user.id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("id", "email", "full_name", "role", "is_active", "created_at"):
            assert field in data

    @pytest.mark.asyncio
    async def test_deactivate_nonexistent_user_returns_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        """存在しないユーザーの無効化で 404 が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/users/{fake_id}", headers=admin_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_deactivate_invalid_uuid_returns_422(
        self, client: AsyncClient, admin_headers: dict
    ):
        """不正 UUID で 422 が返ること"""
        response = await client.delete(
            "/api/v1/users/not-a-uuid", headers=admin_headers
        )
        assert response.status_code == 422


# ===================================================================
# ユーザーレスポンス構造（Response Structure）
# ===================================================================
class TestUserResponseStructure:
    """ユーザー API レスポンス構造テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_user_response_required_fields(
        self, client: AsyncClient, admin_headers: dict, admin_user: User
    ):
        """ユーザーレスポンスに必須フィールドが含まれること"""
        response = await client.get(
            f"/api/v1/users/{admin_user.id}", headers=admin_headers
        )
        data = response.json()
        for field in ("id", "email", "full_name", "role", "is_active", "created_at"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_user_response_no_password_field(
        self, client: AsyncClient, admin_headers: dict, admin_user: User
    ):
        """レスポンスにパスワードフィールドが含まれないこと（セキュリティ）"""
        response = await client.get(
            f"/api/v1/users/{admin_user.id}", headers=admin_headers
        )
        data = response.json()
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_user_list_pagination_structure(
        self, client: AsyncClient, admin_headers: dict
    ):
        """ユーザー一覧がページネーション形式であること"""
        response = await client.get("/api/v1/users", headers=admin_headers)
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_user_id_is_uuid_format(
        self, client: AsyncClient, admin_headers: dict, admin_user: User
    ):
        """ユーザー ID が UUID 形式であること"""
        import re

        response = await client.get(
            f"/api/v1/users/{admin_user.id}", headers=admin_headers
        )
        data = response.json()
        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        )
        assert uuid_pattern.match(data["id"])

    @pytest.mark.asyncio
    async def test_get_user_invalid_uuid_returns_422(
        self, client: AsyncClient, admin_headers: dict
    ):
        """不正 UUID パスパラメータで 422 が返ること"""
        response = await client.get(
            "/api/v1/users/not-a-uuid", headers=admin_headers
        )
        assert response.status_code == 422


# ===================================================================
# 個人設定管理（Personal Settings Management）
# ===================================================================
class TestUserPersonalSettings:
    """ユーザー個人設定テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_settings_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定レスポンスに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/users/me/settings", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("email_notifications", "language", "theme"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_settings_default_language_is_ja(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デフォルト言語が ja であること"""
        response = await client.get(
            "/api/v1/users/me/settings", headers=auth_headers
        )
        data = response.json()
        assert data["language"] == "ja"

    @pytest.mark.asyncio
    async def test_settings_default_theme_is_system(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デフォルトテーマが system であること"""
        response = await client.get(
            "/api/v1/users/me/settings", headers=auth_headers
        )
        data = response.json()
        assert data["theme"] == "system"

    @pytest.mark.asyncio
    async def test_patch_settings_language(
        self, client: AsyncClient, auth_headers: dict
    ):
        """言語設定を更新できること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={"language": "en"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["language"] == "en"

    @pytest.mark.asyncio
    async def test_patch_settings_theme_dark(
        self, client: AsyncClient, auth_headers: dict
    ):
        """テーマを dark に更新できること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={"theme": "dark"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["theme"] == "dark"

    @pytest.mark.asyncio
    async def test_patch_settings_email_notifications_false(
        self, client: AsyncClient, auth_headers: dict
    ):
        """メール通知を無効化できること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={"email_notifications": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["email_notifications"] is False

    @pytest.mark.asyncio
    async def test_patch_settings_preserves_unmodified_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定の部分更新で未変更フィールドが保持されること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={"language": "en"},
            headers=auth_headers,
        )
        data = response.json()
        # デフォルト値が保持されていること
        assert data["email_notifications"] is True
        assert data["theme"] == "system"

    @pytest.mark.asyncio
    async def test_patch_settings_multiple_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """複数フィールドを同時更新できること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={"theme": "dark", "language": "en", "email_notifications": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        assert data["language"] == "en"
        assert data["email_notifications"] is False

    @pytest.mark.asyncio
    async def test_settings_unauthenticated_returns_401(self, client: AsyncClient):
        """未認証で設定取得が 401 になること"""
        response = await client.get("/api/v1/users/me/settings")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patch_settings_unauthenticated_returns_401(
        self, client: AsyncClient
    ):
        """未認証で設定更新が 401 になること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={"language": "en"},
        )
        assert response.status_code == 401
