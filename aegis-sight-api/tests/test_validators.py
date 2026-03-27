"""Tests for data validation helpers."""

from __future__ import annotations

import pytest

from app.core.validators import (
    validate_cron_expression,
    validate_email,
    validate_hostname,
    validate_ip_address,
    validate_mac_address,
)


# ===================================================================
# validate_ip_address
# ===================================================================
class TestValidateIPAddress:
    # -- valid --
    @pytest.mark.parametrize(
        "addr,expected",
        [
            ("192.168.1.1", "192.168.1.1"),
            ("10.0.0.0", "10.0.0.0"),
            ("255.255.255.255", "255.255.255.255"),
            ("0.0.0.0", "0.0.0.0"),
            ("::1", "::1"),
            ("fe80::1", "fe80::1"),
            ("2001:0db8:85a3:0000:0000:8a2e:0370:7334", "2001:db8:85a3::8a2e:370:7334"),
            ("  192.168.1.1  ", "192.168.1.1"),  # whitespace trimmed
        ],
    )
    def test_valid(self, addr: str, expected: str):
        assert validate_ip_address(addr) == expected

    # -- invalid --
    @pytest.mark.parametrize(
        "addr",
        [
            "256.1.1.1",
            "192.168.1",
            "abc",
            "",
            "192.168.1.1.1",
            "not-an-ip",
        ],
    )
    def test_invalid(self, addr: str):
        with pytest.raises(ValueError):
            validate_ip_address(addr)

    def test_non_string_raises(self):
        with pytest.raises((ValueError, TypeError)):
            validate_ip_address(123)  # type: ignore[arg-type]


# ===================================================================
# validate_mac_address
# ===================================================================
class TestValidateMACAddress:
    @pytest.mark.parametrize(
        "mac,expected",
        [
            ("AA:BB:CC:DD:EE:FF", "AA:BB:CC:DD:EE:FF"),
            ("aa:bb:cc:dd:ee:ff", "AA:BB:CC:DD:EE:FF"),
            ("AA-BB-CC-DD-EE-FF", "AA:BB:CC:DD:EE:FF"),
            ("AABBCCDDEEFF", "AA:BB:CC:DD:EE:FF"),
            ("aabb.ccdd.eeff", "AA:BB:CC:DD:EE:FF"),  # Cisco format
        ],
    )
    def test_valid(self, mac: str, expected: str):
        assert validate_mac_address(mac) == expected

    @pytest.mark.parametrize(
        "mac",
        [
            "ZZ:BB:CC:DD:EE:FF",
            "AA:BB:CC:DD:EE",
            "AA:BB:CC:DD:EE:FF:00",
            "",
            "not-a-mac",
        ],
    )
    def test_invalid(self, mac: str):
        with pytest.raises(ValueError):
            validate_mac_address(mac)


# ===================================================================
# validate_hostname
# ===================================================================
class TestValidateHostname:
    @pytest.mark.parametrize(
        "hostname,expected",
        [
            ("server-01", "server-01"),
            ("server-01.example.com", "server-01.example.com"),
            ("A", "a"),
            ("my-host.local", "my-host.local"),
        ],
    )
    def test_valid(self, hostname: str, expected: str):
        assert validate_hostname(hostname) == expected

    @pytest.mark.parametrize(
        "hostname",
        [
            "-invalid",
            "invalid-",
            "",
            "a" * 254,
            "host..name",
            "host name",
        ],
    )
    def test_invalid(self, hostname: str):
        with pytest.raises(ValueError):
            validate_hostname(hostname)


# ===================================================================
# validate_email
# ===================================================================
class TestValidateEmail:
    @pytest.mark.parametrize(
        "email",
        [
            "user@example.com",
            "first.last@example.co.jp",
            "user+tag@domain.com",
            "a@b.c",
        ],
    )
    def test_valid(self, email: str):
        assert validate_email(email) == email

    @pytest.mark.parametrize(
        "email",
        [
            "@example.com",
            "user@",
            "user@.com",
            "",
            "plain-text",
            "a" * 255 + "@example.com",
        ],
    )
    def test_invalid(self, email: str):
        with pytest.raises(ValueError):
            validate_email(email)


# ===================================================================
# validate_cron_expression
# ===================================================================
class TestValidateCronExpression:
    @pytest.mark.parametrize(
        "expr",
        [
            "* * * * *",
            "0 0 * * *",
            "*/5 * * * *",
            "0 9 1 * 1",
            "30 4 1,15 * 5",
            "0-30 * * * *",
            "0 0 1 1 0",
        ],
    )
    def test_valid(self, expr: str):
        assert validate_cron_expression(expr) == expr

    @pytest.mark.parametrize(
        "expr",
        [
            "",
            "* * *",
            "* * * * * *",
            "60 * * * *",
            "* 25 * * *",
            "* * 0 * *",
            "* * * 13 *",
            "not a cron",
        ],
    )
    def test_invalid(self, expr: str):
        with pytest.raises(ValueError):
            validate_cron_expression(expr)

    def test_whitespace_stripped(self):
        assert validate_cron_expression("  * * * * *  ") == "* * * * *"
