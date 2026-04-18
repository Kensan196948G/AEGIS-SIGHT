"""Unit tests for app/version.py."""

from __future__ import annotations

import re

from app.version import __api_version__, __build__, __version__, get_version_info


class TestVersionConstants:
    def test_version_is_string(self) -> None:
        assert isinstance(__version__, str)

    def test_api_version_is_string(self) -> None:
        assert isinstance(__api_version__, str)

    def test_build_is_string(self) -> None:
        assert isinstance(__build__, str)

    def test_version_follows_semver(self) -> None:
        assert re.match(r"^\d+\.\d+\.\d+", __version__), (
            f"__version__ '{__version__}' does not look like semver"
        )

    def test_api_version_follows_semver(self) -> None:
        assert re.match(r"^\d+\.\d+\.\d+", __api_version__), (
            f"__api_version__ '{__api_version__}' does not look like semver"
        )

    def test_version_not_empty(self) -> None:
        assert __version__ != ""

    def test_api_version_not_empty(self) -> None:
        assert __api_version__ != ""

    def test_build_default_is_dev(self) -> None:
        assert __build__ == "dev"


class TestGetVersionInfo:
    def test_returns_dict(self) -> None:
        info = get_version_info()
        assert isinstance(info, dict)

    def test_has_version_key(self) -> None:
        info = get_version_info()
        assert "version" in info

    def test_has_api_version_key(self) -> None:
        info = get_version_info()
        assert "api_version" in info

    def test_has_build_key(self) -> None:
        info = get_version_info()
        assert "build" in info

    def test_version_matches_constant(self) -> None:
        info = get_version_info()
        assert info["version"] == __version__

    def test_api_version_matches_constant(self) -> None:
        info = get_version_info()
        assert info["api_version"] == __api_version__

    def test_build_matches_constant(self) -> None:
        info = get_version_info()
        assert info["build"] == __build__

    def test_has_exactly_three_keys(self) -> None:
        info = get_version_info()
        assert len(info) == 3

    def test_all_values_are_strings(self) -> None:
        info = get_version_info()
        for key, value in info.items():
            assert isinstance(value, str), f"info['{key}'] is not a string"
