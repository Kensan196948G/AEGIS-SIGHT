"""Unit tests for app/core/security_headers.py — pure config testing."""

import pytest

from app.core.security_headers import SecurityHeadersConfig, SecurityHeadersMiddleware


# ---------------------------------------------------------------------------
# SecurityHeadersConfig — default values
# ---------------------------------------------------------------------------


class TestSecurityHeadersConfigDefaults:
    def test_content_security_policy_contains_default_src_self(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "default-src 'self'" in cfg.content_security_policy

    def test_content_security_policy_denies_frame_ancestors(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "frame-ancestors 'none'" in cfg.content_security_policy

    def test_content_security_policy_script_src_self(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "script-src 'self'" in cfg.content_security_policy

    def test_x_content_type_options_is_nosniff(self) -> None:
        cfg = SecurityHeadersConfig()
        assert cfg.x_content_type_options == "nosniff"

    def test_x_frame_options_is_deny(self) -> None:
        cfg = SecurityHeadersConfig()
        assert cfg.x_frame_options == "DENY"

    def test_x_xss_protection_mode_block(self) -> None:
        cfg = SecurityHeadersConfig()
        assert cfg.x_xss_protection == "1; mode=block"

    def test_hsts_includes_max_age(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "max-age=31536000" in cfg.strict_transport_security

    def test_hsts_includes_subdomains(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "includeSubDomains" in cfg.strict_transport_security

    def test_referrer_policy_strict(self) -> None:
        cfg = SecurityHeadersConfig()
        assert cfg.referrer_policy == "strict-origin-when-cross-origin"

    def test_permissions_policy_disables_camera(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "camera=()" in cfg.permissions_policy

    def test_permissions_policy_disables_microphone(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "microphone=()" in cfg.permissions_policy

    def test_permissions_policy_disables_geolocation(self) -> None:
        cfg = SecurityHeadersConfig()
        assert "geolocation=()" in cfg.permissions_policy

    def test_extra_headers_empty_by_default(self) -> None:
        cfg = SecurityHeadersConfig()
        assert cfg.extra_headers == {}

    def test_grafana_iframe_paths_empty_by_default(self) -> None:
        cfg = SecurityHeadersConfig()
        assert cfg.grafana_iframe_paths == []


# ---------------------------------------------------------------------------
# SecurityHeadersConfig — custom overrides
# ---------------------------------------------------------------------------


class TestSecurityHeadersConfigCustom:
    def test_x_frame_options_override(self) -> None:
        cfg = SecurityHeadersConfig(x_frame_options="SAMEORIGIN")
        assert cfg.x_frame_options == "SAMEORIGIN"

    def test_extra_headers_set(self) -> None:
        cfg = SecurityHeadersConfig(extra_headers={"X-Custom": "value"})
        assert cfg.extra_headers == {"X-Custom": "value"}

    def test_grafana_iframe_paths_set(self) -> None:
        cfg = SecurityHeadersConfig(grafana_iframe_paths=["/grafana/"])
        assert "/grafana/" in cfg.grafana_iframe_paths

    def test_custom_csp(self) -> None:
        custom_csp = "default-src 'none'"
        cfg = SecurityHeadersConfig(content_security_policy=custom_csp)
        assert cfg.content_security_policy == custom_csp

    def test_multiple_extra_headers(self) -> None:
        headers = {"X-A": "1", "X-B": "2"}
        cfg = SecurityHeadersConfig(extra_headers=headers)
        assert len(cfg.extra_headers) == 2

    def test_grafana_paths_multiple(self) -> None:
        paths = ["/grafana/", "/metrics/"]
        cfg = SecurityHeadersConfig(grafana_iframe_paths=paths)
        assert len(cfg.grafana_iframe_paths) == 2


# ---------------------------------------------------------------------------
# SecurityHeadersMiddleware — config instantiation
# ---------------------------------------------------------------------------


class TestSecurityHeadersMiddlewareInit:
    def test_default_config_when_none_passed(self) -> None:
        mw = SecurityHeadersMiddleware(app=None, config=None)  # type: ignore[arg-type]
        assert mw.config.x_frame_options == "DENY"

    def test_custom_config_is_stored(self) -> None:
        cfg = SecurityHeadersConfig(x_frame_options="SAMEORIGIN")
        mw = SecurityHeadersMiddleware(app=None, config=cfg)  # type: ignore[arg-type]
        assert mw.config.x_frame_options == "SAMEORIGIN"

    def test_config_attribute_accessible(self) -> None:
        mw = SecurityHeadersMiddleware(app=None)  # type: ignore[arg-type]
        assert isinstance(mw.config, SecurityHeadersConfig)
