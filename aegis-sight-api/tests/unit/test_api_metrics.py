"""Unit tests for _normalize_endpoint() — pure path normalization logic."""

from app.core.api_metrics import _normalize_endpoint

# ---------------------------------------------------------------------------
# Root and empty paths
# ---------------------------------------------------------------------------


class TestNormalizeEndpointRootPaths:
    def test_root_slash(self) -> None:
        assert _normalize_endpoint("/") == "/"

    def test_empty_string(self) -> None:
        assert _normalize_endpoint("") == "/"

    def test_bare_slash_segment(self) -> None:
        assert _normalize_endpoint("//") == "/"


# ---------------------------------------------------------------------------
# Plain (non-ID) paths — should pass through unchanged
# ---------------------------------------------------------------------------


class TestNormalizeEndpointPlainPaths:
    def test_single_segment(self) -> None:
        assert _normalize_endpoint("/health") == "/health"

    def test_two_segments(self) -> None:
        assert _normalize_endpoint("/api/devices") == "/api/devices"

    def test_three_segments(self) -> None:
        assert _normalize_endpoint("/api/v1/devices") == "/api/v1/devices"

    def test_no_leading_slash(self) -> None:
        # strip("/") handles both with and without leading slash
        assert _normalize_endpoint("api/devices") == "/api/devices"

    def test_trailing_slash_stripped(self) -> None:
        assert _normalize_endpoint("/api/devices/") == "/api/devices"


# ---------------------------------------------------------------------------
# Numeric ID segments → {id}
# ---------------------------------------------------------------------------


class TestNormalizeEndpointNumericIds:
    def test_single_numeric_segment(self) -> None:
        assert _normalize_endpoint("/devices/42") == "/devices/{id}"

    def test_multiple_numeric_segments(self) -> None:
        assert _normalize_endpoint("/a/1/b/2") == "/a/{id}/b/{id}"

    def test_numeric_at_start(self) -> None:
        assert _normalize_endpoint("/123/settings") == "/{id}/settings"

    def test_large_number(self) -> None:
        assert _normalize_endpoint("/devices/99999999") == "/devices/{id}"

    def test_zero(self) -> None:
        assert _normalize_endpoint("/items/0") == "/items/{id}"


# ---------------------------------------------------------------------------
# UUID-like segments (len >= 32, all hex + dashes) → {id}
# ---------------------------------------------------------------------------


class TestNormalizeEndpointUuidSegments:
    UUID = "550e8400-e29b-41d4-a716-446655440000"  # 36 chars

    def test_standard_uuid(self) -> None:
        assert _normalize_endpoint(f"/devices/{self.UUID}") == "/devices/{id}"

    def test_uuid_in_middle(self) -> None:
        assert _normalize_endpoint(f"/api/{self.UUID}/data") == "/api/{id}/data"

    def test_uuid_at_root(self) -> None:
        assert _normalize_endpoint(f"/{self.UUID}") == "/{id}"

    def test_hex_string_32_chars(self) -> None:
        # 32-char lowercase hex string (MD5-like) → {id}
        hex32 = "a" * 32
        assert _normalize_endpoint(f"/checksums/{hex32}") == "/checksums/{id}"

    def test_hex_string_exactly_31_chars_not_replaced(self) -> None:
        # 31 chars is below the threshold — should NOT be replaced
        hex31 = "a" * 31
        assert _normalize_endpoint(f"/checksums/{hex31}") == f"/checksums/{hex31}"

    def test_uppercase_uuid(self) -> None:
        # lower() applied before check → uppercase works
        uuid_upper = self.UUID.upper()
        assert _normalize_endpoint(f"/devices/{uuid_upper}") == "/devices/{id}"

    def test_mixed_case_uuid(self) -> None:
        uuid_mixed = "550E8400-e29b-41D4-A716-446655440000"
        assert _normalize_endpoint(f"/logs/{uuid_mixed}") == "/logs/{id}"


# ---------------------------------------------------------------------------
# Non-hex long strings — should NOT be replaced even if len >= 32
# ---------------------------------------------------------------------------


class TestNormalizeEndpointLongNonHex:
    def test_long_slug_not_replaced(self) -> None:
        # Contains 'g' which is not hex
        slug = "my-very-long-slug-name-for-resource-xyz"
        assert _normalize_endpoint(f"/articles/{slug}") == f"/articles/{slug}"

    def test_long_path_with_non_hex_char(self) -> None:
        non_hex = "z" * 32  # 'z' is not a hex character
        assert _normalize_endpoint(f"/items/{non_hex}") == f"/items/{non_hex}"


# ---------------------------------------------------------------------------
# Mixed paths — numeric + UUID + plain
# ---------------------------------------------------------------------------


class TestNormalizeEndpointMixedPaths:
    UUID = "550e8400-e29b-41d4-a716-446655440000"

    def test_numeric_and_uuid(self) -> None:
        assert _normalize_endpoint(f"/a/1/{self.UUID}/b") == "/a/{id}/{id}/b"

    def test_api_versioned_path(self) -> None:
        assert _normalize_endpoint("/api/v1/devices/42/config") == "/api/v1/devices/{id}/config"

    def test_deep_nested_numeric(self) -> None:
        assert _normalize_endpoint("/orgs/5/teams/12/members/99") == "/orgs/{id}/teams/{id}/members/{id}"
