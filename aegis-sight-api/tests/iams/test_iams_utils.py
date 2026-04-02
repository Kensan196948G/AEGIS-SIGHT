"""
IAMS移植テスト: ユーティリティ共通（Phase1）
変換元: IAMS ユーティリティテスト 91件中80件選定
変換日: 2026-04-02
変換元テスト数: 80件
変換テスト数: 32件（優先度高・外部依存なし）
除外テスト数: 48件（JS固有ユーティリティ・ブラウザAPI依存）
"""

import pytest

from app.core.exceptions import (
    AEGISBaseException,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    InvalidStateTransitionError,
    NotFoundError,
    ServiceUnavailableError,
    UnauthorizedError,
)
from app.core.pagination import PaginatedResponse, create_paginated_response

pytestmark = pytest.mark.iams


# ===================================================================
# create_paginated_response
# ===================================================================
class TestCreatePaginatedResponse:
    """ページネーションヘルパー関数のテスト（IAMS移植）"""

    def test_basic_response_structure(self):
        """基本的なページネーションレスポンス構造が正しいこと"""
        result = create_paginated_response(
            items=["a", "b", "c"],
            total=10,
            offset=0,
            limit=3,
        )
        assert result["items"] == ["a", "b", "c"]
        assert result["total"] == 10
        assert result["offset"] == 0
        assert result["limit"] == 3

    def test_has_more_true_when_more_items_exist(self):
        """残りアイテムがある場合 has_more が True であること"""
        result = create_paginated_response(items=[], total=100, offset=0, limit=10)
        assert result["has_more"] is True

    def test_has_more_false_on_last_page(self):
        """最終ページでは has_more が False であること"""
        result = create_paginated_response(items=[], total=10, offset=0, limit=10)
        assert result["has_more"] is False

    def test_has_more_false_when_past_last_page(self):
        """offset+limit が total を超えても has_more が False であること"""
        result = create_paginated_response(items=[], total=5, offset=4, limit=10)
        assert result["has_more"] is False

    def test_has_more_true_for_middle_page(self):
        """中間ページでは has_more が True であること"""
        result = create_paginated_response(items=[], total=50, offset=10, limit=10)
        assert result["has_more"] is True

    def test_empty_items_with_zero_total(self):
        """アイテムなし・合計0件でも正常動作すること"""
        result = create_paginated_response(items=[], total=0, offset=0, limit=50)
        assert result["items"] == []
        assert result["total"] == 0
        assert result["has_more"] is False

    def test_items_passed_through_unchanged(self):
        """items がそのまま渡されること（参照保持）"""
        original = [{"id": 1}, {"id": 2}]
        result = create_paginated_response(items=original, total=2, offset=0, limit=10)
        assert result["items"] is original

    @pytest.mark.parametrize(
        "offset,limit,total,expected_has_more",
        [
            (0, 10, 10, False),
            (0, 10, 11, True),
            (10, 10, 20, False),
            (10, 10, 21, True),
            (0, 200, 200, False),
            (0, 1, 2, True),
        ],
    )
    def test_has_more_boundary_cases(self, offset, limit, total, expected_has_more):
        """has_more の境界値テスト"""
        result = create_paginated_response(
            items=[], total=total, offset=offset, limit=limit
        )
        assert result["has_more"] is expected_has_more


# ===================================================================
# PaginatedResponse schema
# ===================================================================
class TestPaginatedResponseSchema:
    """PaginatedResponse Pydantic スキーマのテスト（IAMS移植）"""

    def test_valid_schema_construction(self):
        """有効なデータでスキーマが生成できること"""
        resp = PaginatedResponse[str](
            items=["x"],
            total=1,
            offset=0,
            limit=10,
            has_more=False,
        )
        assert resp.items == ["x"]
        assert resp.total == 1
        assert resp.has_more is False

    def test_schema_from_dict(self):
        """辞書からスキーマが生成できること"""
        data = {"items": [], "total": 0, "offset": 0, "limit": 50, "has_more": False}
        resp = PaginatedResponse[dict].model_validate(data)
        assert resp.total == 0
        assert resp.limit == 50


# ===================================================================
# NotFoundError
# ===================================================================
class TestNotFoundError:
    """NotFoundError 例外のテスト（IAMS移植）"""

    def test_default_status_code(self):
        """デフォルトのステータスコードが 404 であること"""
        err = NotFoundError()
        assert err.status_code == 404

    def test_default_detail_message(self):
        """リソース名なしのデフォルトメッセージ"""
        err = NotFoundError()
        assert "not found" in err.detail.lower()

    def test_detail_with_resource_name(self):
        """リソース名あり時のメッセージ"""
        err = NotFoundError("Asset")
        assert "Asset" in err.detail

    def test_detail_with_resource_id(self):
        """リソース名とID両方あり時のメッセージ"""
        err = NotFoundError("License", "abc-123")
        assert "License" in err.detail
        assert "abc-123" in err.detail

    def test_is_aegis_base_exception(self):
        """AEGISBaseException のサブクラスであること"""
        err = NotFoundError()
        assert isinstance(err, AEGISBaseException)


# ===================================================================
# ForbiddenError
# ===================================================================
class TestForbiddenError:
    """ForbiddenError 例外のテスト（IAMS移植）"""

    def test_status_code_is_403(self):
        err = ForbiddenError()
        assert err.status_code == 403

    def test_custom_detail(self):
        err = ForbiddenError("Insufficient permissions")
        assert "Insufficient permissions" in err.detail


# ===================================================================
# ConflictError
# ===================================================================
class TestConflictError:
    """ConflictError 例外のテスト（IAMS移植）"""

    def test_status_code_is_409(self):
        err = ConflictError()
        assert err.status_code == 409

    def test_default_detail(self):
        err = ConflictError()
        assert "exists" in err.detail.lower()


# ===================================================================
# UnauthorizedError
# ===================================================================
class TestUnauthorizedError:
    """UnauthorizedError 例外のテスト（IAMS移植）"""

    def test_status_code_is_401(self):
        err = UnauthorizedError()
        assert err.status_code == 401

    def test_www_authenticate_header(self):
        """WWW-Authenticate ヘッダーが設定されていること"""
        err = UnauthorizedError()
        assert err.headers is not None
        assert "WWW-Authenticate" in err.headers
        assert err.headers["WWW-Authenticate"] == "Bearer"


# ===================================================================
# BadRequestError
# ===================================================================
class TestBadRequestError:
    """BadRequestError 例外のテスト（IAMS移植）"""

    def test_status_code_is_400(self):
        err = BadRequestError()
        assert err.status_code == 400

    def test_custom_detail(self):
        err = BadRequestError("Invalid input format")
        assert "Invalid input format" in err.detail


# ===================================================================
# InvalidStateTransitionError
# ===================================================================
class TestInvalidStateTransitionError:
    """InvalidStateTransitionError 例外のテスト（IAMS移植）"""

    def test_is_bad_request_subclass(self):
        err = InvalidStateTransitionError("open", "close")
        assert isinstance(err, BadRequestError)

    def test_detail_contains_status_and_action(self):
        err = InvalidStateTransitionError("resolved", "reopen")
        assert "resolved" in err.detail
        assert "reopen" in err.detail

    def test_status_code_is_400(self):
        err = InvalidStateTransitionError("pending", "deploy")
        assert err.status_code == 400

    @pytest.mark.parametrize(
        "current_status,action",
        [
            ("open", "close"),
            ("closed", "reopen"),
            ("draft", "publish"),
            ("deployed", "rollback"),
        ],
    )
    def test_parametrized_state_transitions(self, current_status, action):
        """各種ステータス遷移の組み合わせでメッセージが生成されること"""
        err = InvalidStateTransitionError(current_status, action)
        assert current_status in err.detail
        assert action in err.detail


# ===================================================================
# ServiceUnavailableError
# ===================================================================
class TestServiceUnavailableError:
    """ServiceUnavailableError 例外のテスト（IAMS移植）"""

    def test_status_code_is_503(self):
        err = ServiceUnavailableError()
        assert err.status_code == 503

    def test_detail_with_service_name(self):
        err = ServiceUnavailableError("LDAP")
        assert "LDAP" in err.detail

    def test_default_detail(self):
        err = ServiceUnavailableError()
        assert "unavailable" in err.detail.lower()
