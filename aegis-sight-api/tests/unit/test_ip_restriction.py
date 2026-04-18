"""Unit tests for app/core/ip_restriction.py — pure method testing."""


from app.core.ip_restriction import IPRestrictionConfig, IPRestrictionMiddleware

# Default prefix used in most tests
_DEFAULT_PREFIX = "/api/v1/admin/"


def _make_middleware(
    allowed_ranges: list[str] | None = None,
    restricted_prefixes: list[str] | None = None,
) -> IPRestrictionMiddleware:
    cfg = IPRestrictionConfig(
        allowed_ip_ranges=allowed_ranges if allowed_ranges is not None else [],
        restricted_path_prefixes=(
            restricted_prefixes
            if restricted_prefixes is not None
            else [_DEFAULT_PREFIX]
        ),
    )
    return IPRestrictionMiddleware(app=None, config=cfg)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# _is_restricted_path
# ---------------------------------------------------------------------------


class TestIsRestrictedPath:
    def test_exact_prefix_match(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/api/v1/admin/") is True

    def test_sub_path_is_restricted(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/api/v1/admin/users") is True

    def test_deeply_nested_restricted(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/api/v1/admin/users/123/roles") is True

    def test_public_path_not_restricted(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/api/v1/health") is False

    def test_root_path_not_restricted(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/") is False

    def test_partial_prefix_not_restricted(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/api/v1/admin") is False

    def test_case_sensitive_no_match(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("/API/V1/ADMIN/") is False

    def test_multiple_prefixes_first_matches(self) -> None:
        mw = _make_middleware(restricted_prefixes=["/admin/", "/management/"])
        assert mw._is_restricted_path("/admin/dashboard") is True

    def test_multiple_prefixes_second_matches(self) -> None:
        mw = _make_middleware(restricted_prefixes=["/admin/", "/management/"])
        assert mw._is_restricted_path("/management/stats") is True

    def test_multiple_prefixes_none_matches(self) -> None:
        mw = _make_middleware(restricted_prefixes=["/admin/", "/management/"])
        assert mw._is_restricted_path("/public/data") is False

    def test_empty_prefixes_never_restricted(self) -> None:
        mw = _make_middleware(restricted_prefixes=[])
        assert mw._is_restricted_path("/api/v1/admin/users") is False

    def test_empty_path_not_restricted(self) -> None:
        mw = _make_middleware()
        assert mw._is_restricted_path("") is False


# ---------------------------------------------------------------------------
# _is_allowed — no networks (allow all)
# ---------------------------------------------------------------------------


class TestIsAllowedNoNetworks:
    def test_ipv4_allowed_when_no_ranges(self) -> None:
        mw = _make_middleware(allowed_ranges=[])
        assert mw._is_allowed("192.168.1.100") is True

    def test_ipv6_allowed_when_no_ranges(self) -> None:
        mw = _make_middleware(allowed_ranges=[])
        assert mw._is_allowed("::1") is True

    def test_any_ip_allowed_when_no_ranges(self) -> None:
        mw = _make_middleware(allowed_ranges=[])
        assert mw._is_allowed("10.0.0.1") is True


# ---------------------------------------------------------------------------
# _is_allowed — single IPv4 CIDR
# ---------------------------------------------------------------------------


class TestIsAllowedSingleCidr:
    def test_ip_in_range_allowed(self) -> None:
        mw = _make_middleware(allowed_ranges=["192.168.1.0/24"])
        assert mw._is_allowed("192.168.1.50") is True

    def test_ip_out_of_range_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["192.168.1.0/24"])
        assert mw._is_allowed("192.168.2.1") is False

    def test_network_address_allowed(self) -> None:
        mw = _make_middleware(allowed_ranges=["10.0.0.0/8"])
        assert mw._is_allowed("10.0.0.0") is True

    def test_broadcast_address_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["192.168.1.0/24"])
        assert mw._is_allowed("192.168.1.255") is True

    def test_exact_host_range(self) -> None:
        mw = _make_middleware(allowed_ranges=["10.10.10.10/32"])
        assert mw._is_allowed("10.10.10.10") is True

    def test_exact_host_range_other_ip_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["10.10.10.10/32"])
        assert mw._is_allowed("10.10.10.11") is False


# ---------------------------------------------------------------------------
# _is_allowed — multiple CIDR ranges
# ---------------------------------------------------------------------------


class TestIsAllowedMultipleCidrs:
    def test_ip_in_first_range_allowed(self) -> None:
        mw = _make_middleware(allowed_ranges=["10.0.0.0/8", "172.16.0.0/12"])
        assert mw._is_allowed("10.1.2.3") is True

    def test_ip_in_second_range_allowed(self) -> None:
        mw = _make_middleware(allowed_ranges=["10.0.0.0/8", "172.16.0.0/12"])
        assert mw._is_allowed("172.16.5.1") is True

    def test_ip_in_no_range_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["10.0.0.0/8", "172.16.0.0/12"])
        assert mw._is_allowed("192.168.0.1") is False


# ---------------------------------------------------------------------------
# _is_allowed — IPv6
# ---------------------------------------------------------------------------


class TestIsAllowedIpv6:
    def test_loopback_ipv6_allowed(self) -> None:
        mw = _make_middleware(allowed_ranges=["::1/128"])
        assert mw._is_allowed("::1") is True

    def test_ipv6_in_range_allowed(self) -> None:
        mw = _make_middleware(allowed_ranges=["2001:db8::/32"])
        assert mw._is_allowed("2001:db8::1") is True

    def test_ipv6_out_of_range_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["2001:db8::/32"])
        assert mw._is_allowed("fe80::1") is False


# ---------------------------------------------------------------------------
# _is_allowed — invalid IP
# ---------------------------------------------------------------------------


class TestIsAllowedInvalidIp:
    def test_invalid_ip_string_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["192.168.1.0/24"])
        assert mw._is_allowed("not-an-ip") is False

    def test_empty_string_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["192.168.1.0/24"])
        assert mw._is_allowed("") is False

    def test_hostname_denied(self) -> None:
        mw = _make_middleware(allowed_ranges=["192.168.1.0/24"])
        assert mw._is_allowed("localhost") is False


# ---------------------------------------------------------------------------
# IPRestrictionConfig defaults
# ---------------------------------------------------------------------------


class TestIPRestrictionConfigDefaults:
    def test_default_allowed_ranges_is_empty(self) -> None:
        cfg = IPRestrictionConfig()
        assert cfg.allowed_ip_ranges == []

    def test_default_restricted_prefixes(self) -> None:
        cfg = IPRestrictionConfig()
        assert "/api/v1/admin/" in cfg.restricted_path_prefixes

    def test_middleware_no_config_uses_defaults(self) -> None:
        mw = IPRestrictionMiddleware(app=None, config=None)  # type: ignore[arg-type]
        assert mw._is_restricted_path("/api/v1/admin/test") is True
        assert mw._is_allowed("1.2.3.4") is True  # no ranges => allow all
