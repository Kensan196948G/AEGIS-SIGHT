"""Unit tests for app/core/validators.py — pure validation functions."""

import pytest

from app.core.validators import (
    _validate_cron_field,
    validate_cron_expression,
    validate_email,
    validate_hostname,
    validate_ip_address,
    validate_mac_address,
)

# ---------------------------------------------------------------------------
# validate_ip_address
# ---------------------------------------------------------------------------


class TestValidateIpAddressValid:
    def test_ipv4_basic(self) -> None:
        assert validate_ip_address("192.168.1.1") == "192.168.1.1"

    def test_ipv4_with_leading_whitespace(self) -> None:
        assert validate_ip_address("  10.0.0.1  ") == "10.0.0.1"

    def test_ipv4_loopback(self) -> None:
        assert validate_ip_address("127.0.0.1") == "127.0.0.1"

    def test_ipv4_broadcast(self) -> None:
        assert validate_ip_address("255.255.255.255") == "255.255.255.255"

    def test_ipv6_full(self) -> None:
        assert validate_ip_address("2001:0db8:0000:0000:0000:0000:0000:0001") == "2001:db8::1"

    def test_ipv6_compressed(self) -> None:
        assert validate_ip_address("::1") == "::1"

    def test_ipv6_returns_compressed(self) -> None:
        # ipaddress compresses 0000 runs
        result = validate_ip_address("fe80::1")
        assert result == "fe80::1"


class TestValidateIpAddressInvalid:
    def test_empty_string_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_ip_address("")

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_ip_address("   ")

    def test_invalid_octet_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_ip_address("999.1.1.1")

    def test_hostname_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_ip_address("example.com")

    def test_partial_ipv4_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_ip_address("192.168.1")


# ---------------------------------------------------------------------------
# validate_mac_address
# ---------------------------------------------------------------------------


class TestValidateMacAddressValid:
    def test_colon_separated(self) -> None:
        assert validate_mac_address("aa:bb:cc:dd:ee:ff") == "AA:BB:CC:DD:EE:FF"

    def test_dash_separated(self) -> None:
        assert validate_mac_address("AA-BB-CC-DD-EE-FF") == "AA:BB:CC:DD:EE:FF"

    def test_raw_hex_12chars(self) -> None:
        assert validate_mac_address("aabbccddeeff") == "AA:BB:CC:DD:EE:FF"

    def test_cisco_dot_format(self) -> None:
        assert validate_mac_address("aabb.ccdd.eeff") == "AA:BB:CC:DD:EE:FF"

    def test_mixed_case_normalised(self) -> None:
        assert validate_mac_address("Aa:Bb:Cc:Dd:Ee:Ff") == "AA:BB:CC:DD:EE:FF"

    def test_whitespace_stripped(self) -> None:
        assert validate_mac_address("  aa:bb:cc:dd:ee:ff  ") == "AA:BB:CC:DD:EE:FF"


class TestValidateMacAddressInvalid:
    def test_empty_string_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_mac_address("")

    def test_too_short_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_mac_address("aa:bb:cc")

    def test_invalid_chars_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_mac_address("gg:bb:cc:dd:ee:ff")

    def test_wrong_separator_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_mac_address("aa/bb/cc/dd/ee/ff")


# ---------------------------------------------------------------------------
# validate_hostname
# ---------------------------------------------------------------------------


class TestValidateHostnameValid:
    def test_simple_hostname(self) -> None:
        assert validate_hostname("server01") == "server01"

    def test_fqdn(self) -> None:
        assert validate_hostname("server-01.example.com") == "server-01.example.com"

    def test_uppercase_normalised_to_lower(self) -> None:
        assert validate_hostname("SERVER.EXAMPLE.COM") == "server.example.com"

    def test_leading_whitespace_stripped(self) -> None:
        assert validate_hostname("  host.local  ") == "host.local"

    def test_single_label(self) -> None:
        assert validate_hostname("localhost") == "localhost"


class TestValidateHostnameInvalid:
    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_hostname("")

    def test_leading_hyphen_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_hostname("-invalid.com")

    def test_exceeds_253_chars_raises(self) -> None:
        long_hostname = "a" * 254
        with pytest.raises(ValueError):
            validate_hostname(long_hostname)

    def test_label_with_underscore_raises(self) -> None:
        # RFC 1123 does not allow underscores
        with pytest.raises(ValueError):
            validate_hostname("host_name.com")


# ---------------------------------------------------------------------------
# validate_email
# ---------------------------------------------------------------------------


class TestValidateEmailValid:
    def test_simple_email(self) -> None:
        assert validate_email("user@example.com") == "user@example.com"

    def test_email_with_plus(self) -> None:
        assert validate_email("user+tag@example.com") == "user+tag@example.com"

    def test_email_with_dots(self) -> None:
        assert validate_email("first.last@sub.example.com") == "first.last@sub.example.com"

    def test_whitespace_stripped(self) -> None:
        assert validate_email("  user@example.com  ") == "user@example.com"


class TestValidateEmailInvalid:
    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_email("")

    def test_missing_at_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_email("userexample.com")

    def test_missing_domain_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_email("user@")

    def test_exceeds_254_chars_raises(self) -> None:
        # 251 + 4 = 255 chars — one over the 254-char limit
        long_email = "a" * 251 + "@x.c"
        with pytest.raises(ValueError):
            validate_email(long_email)


# ---------------------------------------------------------------------------
# _validate_cron_field
# ---------------------------------------------------------------------------


class TestValidateCronFieldValid:
    def test_wildcard(self) -> None:
        assert _validate_cron_field("*", 0, 59) is True

    def test_exact_value(self) -> None:
        assert _validate_cron_field("30", 0, 59) is True

    def test_step_expression(self) -> None:
        assert _validate_cron_field("*/5", 0, 59) is True

    def test_range(self) -> None:
        assert _validate_cron_field("1-15", 0, 59) is True

    def test_comma_list(self) -> None:
        assert _validate_cron_field("1,15,30", 0, 59) is True

    def test_boundary_min(self) -> None:
        assert _validate_cron_field("0", 0, 59) is True

    def test_boundary_max(self) -> None:
        assert _validate_cron_field("59", 0, 59) is True


class TestValidateCronFieldInvalid:
    def test_out_of_range_returns_false(self) -> None:
        assert _validate_cron_field("60", 0, 59) is False

    def test_step_zero_returns_false(self) -> None:
        assert _validate_cron_field("*/0", 0, 59) is False

    def test_invalid_token_returns_false(self) -> None:
        assert _validate_cron_field("abc", 0, 59) is False


# ---------------------------------------------------------------------------
# validate_cron_expression
# ---------------------------------------------------------------------------


class TestValidateCronExpressionValid:
    def test_all_wildcards(self) -> None:
        assert validate_cron_expression("* * * * *") == "* * * * *"

    def test_specific_time(self) -> None:
        assert validate_cron_expression("30 8 * * 1") == "30 8 * * 1"

    def test_step_expressions(self) -> None:
        assert validate_cron_expression("*/5 * * * *") == "*/5 * * * *"

    def test_leading_whitespace_stripped(self) -> None:
        assert validate_cron_expression("  0 12 * * *  ") == "0 12 * * *"

    def test_day_of_week_sunday_as_7(self) -> None:
        # day of week range is 0-7; 7 = Sunday as well
        assert validate_cron_expression("0 0 * * 7") == "0 0 * * 7"


class TestValidateCronExpressionInvalid:
    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_cron_expression("")

    def test_too_few_fields_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_cron_expression("* * * *")

    def test_too_many_fields_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_cron_expression("* * * * * *")

    def test_invalid_minute_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_cron_expression("60 * * * *")

    def test_invalid_hour_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_cron_expression("0 24 * * *")

    def test_step_zero_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_cron_expression("*/0 * * * *")
