"""Unit tests for pagination utilities — create_paginated_response pure logic."""

from app.core.pagination import PaginatedResponse, create_paginated_response

# ---------------------------------------------------------------------------
# create_paginated_response — structure
# ---------------------------------------------------------------------------


class TestCreatePaginatedResponseStructure:
    def test_returns_dict_with_required_keys(self) -> None:
        result = create_paginated_response([], 0, 0, 50)
        assert set(result.keys()) == {"items", "total", "offset", "limit", "has_more"}

    def test_items_passed_through(self) -> None:
        items = [{"id": 1}, {"id": 2}]
        result = create_paginated_response(items, 10, 0, 50)
        assert result["items"] is items

    def test_total_passed_through(self) -> None:
        result = create_paginated_response([], 42, 0, 50)
        assert result["total"] == 42

    def test_offset_passed_through(self) -> None:
        result = create_paginated_response([], 100, 25, 50)
        assert result["offset"] == 25

    def test_limit_passed_through(self) -> None:
        result = create_paginated_response([], 100, 0, 20)
        assert result["limit"] == 20


# ---------------------------------------------------------------------------
# create_paginated_response — has_more boundary values
# ---------------------------------------------------------------------------


class TestCreatePaginatedResponseHasMore:
    def test_more_pages_available(self) -> None:
        # offset=0, limit=10, total=11 → has_more=True
        result = create_paginated_response([], 11, 0, 10)
        assert result["has_more"] is True

    def test_exact_last_page(self) -> None:
        # offset=0, limit=10, total=10 → (0+10) < 10 is False
        result = create_paginated_response([], 10, 0, 10)
        assert result["has_more"] is False

    def test_one_past_last(self) -> None:
        # offset=10, limit=10, total=10 → has_more=False
        result = create_paginated_response([], 10, 10, 10)
        assert result["has_more"] is False

    def test_middle_page(self) -> None:
        # offset=10, limit=10, total=50 → (10+10)=20 < 50 → True
        result = create_paginated_response([], 50, 10, 10)
        assert result["has_more"] is True

    def test_last_partial_page(self) -> None:
        # offset=45, limit=10, total=50 → (45+10)=55 < 50 → False
        result = create_paginated_response([], 50, 45, 10)
        assert result["has_more"] is False

    def test_empty_collection(self) -> None:
        result = create_paginated_response([], 0, 0, 50)
        assert result["has_more"] is False

    def test_single_item_fits_in_page(self) -> None:
        result = create_paginated_response([{"id": 1}], 1, 0, 50)
        assert result["has_more"] is False

    def test_total_one_more_than_window(self) -> None:
        # offset=0, limit=50, total=51 → (0+50)=50 < 51 → True
        result = create_paginated_response([], 51, 0, 50)
        assert result["has_more"] is True

    def test_large_offset_beyond_total(self) -> None:
        # offset=100, limit=50, total=80 → (100+50)=150 < 80 → False
        result = create_paginated_response([], 80, 100, 50)
        assert result["has_more"] is False


# ---------------------------------------------------------------------------
# PaginatedResponse Pydantic model
# ---------------------------------------------------------------------------


class TestPaginatedResponseModel:
    def test_construct_basic(self) -> None:
        resp = PaginatedResponse(items=[], total=0, offset=0, limit=50, has_more=False)
        assert resp.total == 0
        assert resp.has_more is False

    def test_items_stored(self) -> None:
        resp = PaginatedResponse(items=[1, 2, 3], total=3, offset=0, limit=50, has_more=False)
        assert resp.items == [1, 2, 3]

    def test_has_more_true(self) -> None:
        resp = PaginatedResponse(items=[], total=100, offset=0, limit=50, has_more=True)
        assert resp.has_more is True

    def test_model_fields(self) -> None:
        fields = set(PaginatedResponse.model_fields.keys())
        assert fields == {"items", "total", "offset", "limit", "has_more"}
