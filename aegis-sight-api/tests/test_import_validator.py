"""Tests for ImportValidator service."""

from __future__ import annotations

import io

from app.services.import_validator import ImportValidator, ValidationReport

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_csv(*rows: str) -> io.StringIO:
    """Build a StringIO from header + data rows."""
    return io.StringIO("\n".join(rows))


def _make_binary_csv(*rows: str, bom: bool = False) -> io.BytesIO:
    """Build a BytesIO (optionally with UTF-8 BOM)."""
    content = "\n".join(rows).encode("utf-8")
    if bom:
        content = b"\xef\xbb\xbf" + content
    return io.BytesIO(content)


# ---------------------------------------------------------------------------
# ValidationReport unit tests
# ---------------------------------------------------------------------------

class TestValidationReport:
    def test_is_valid_when_no_errors_and_no_invalid_rows(self):
        r = ValidationReport(valid_rows=3)
        assert r.is_valid is True

    def test_is_invalid_when_errors_present(self):
        r = ValidationReport(errors=["bad"], valid_rows=1)
        assert r.is_valid is False

    def test_is_invalid_when_invalid_rows(self):
        r = ValidationReport(invalid_rows=1)
        assert r.is_valid is False

    def test_to_dict_total_rows(self):
        r = ValidationReport(valid_rows=2, invalid_rows=1)
        d = r.to_dict()
        assert d["total_rows"] == 3
        assert d["valid_rows"] == 2
        assert d["invalid_rows"] == 1

    def test_to_dict_is_valid_key(self):
        r = ValidationReport(valid_rows=1)
        assert r.to_dict()["is_valid"] is True


# ---------------------------------------------------------------------------
# _read_csv helper
# ---------------------------------------------------------------------------

class TestReadCsv:
    def test_stringio_input(self):
        f = _make_csv("hostname,status", "srv01,active")
        report = ValidationReport()
        reader, header = ImportValidator._read_csv(f, report)
        assert reader is not None
        assert header == ["hostname", "status"]
        assert report.errors == []

    def test_binary_input(self):
        f = _make_binary_csv("hostname,status", "srv01,active")
        report = ValidationReport()
        reader, header = ImportValidator._read_csv(f, report)
        assert reader is not None
        assert "hostname" in header

    def test_utf8_bom_stripped(self):
        f = _make_binary_csv("hostname,status", "srv01,active", bom=True)
        report = ValidationReport()
        reader, header = ImportValidator._read_csv(f, report)
        assert reader is not None
        # BOM must not appear in header
        assert header[0] == "hostname"

    def test_empty_csv_returns_error(self):
        f = _make_csv("")
        report = ValidationReport()
        reader, _header = ImportValidator._read_csv(f, report)
        assert reader is None
        assert any("no header" in e.lower() for e in report.errors)

    def test_unicode_decode_error(self):
        # Inject raw invalid bytes (Latin-1 encoded text, not valid UTF-8)
        f = io.BytesIO(b"hostname\r\n\xff\xfe")
        report = ValidationReport()
        reader, _header = ImportValidator._read_csv(f, report)
        assert reader is None
        assert any("utf-8" in e.lower() or "unicode" in e.lower() for e in report.errors)


# ---------------------------------------------------------------------------
# validate_device_csv
# ---------------------------------------------------------------------------

class TestValidateDeviceCsv:
    # --- happy paths ---

    def test_minimal_valid(self):
        f = _make_csv("hostname", "server01")
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid
        assert r.valid_rows == 1
        assert r.invalid_rows == 0

    def test_all_columns_valid(self):
        f = _make_csv(
            "hostname,status,ip_address,mac_address,os_version,domain",
            "web01,active,192.168.1.10,AA:BB:CC:DD:EE:FF,Windows 10,corp.local",
        )
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid
        assert r.valid_rows == 1

    def test_multiple_valid_rows(self):
        f = _make_csv(
            "hostname,status",
            "host1,active",
            "host2,inactive",
            "host3,maintenance",
        )
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid
        assert r.valid_rows == 3

    def test_all_device_statuses_accepted(self):
        f = _make_csv(
            "hostname,status",
            "h1,active",
            "h2,inactive",
            "h3,decommissioned",
            "h4,maintenance",
        )
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid
        assert r.valid_rows == 4

    def test_status_optional_empty(self):
        f = _make_csv("hostname,status", "srv01,")
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid

    # --- column errors ---

    def test_missing_hostname_column(self):
        f = _make_csv("status,ip_address", "active,10.0.0.1")
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert any("hostname" in e.lower() for e in r.errors)

    def test_unknown_columns_produce_warning(self):
        f = _make_csv("hostname,extra_col", "srv01,value")
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid
        assert any("extra_col" in w for w in r.warnings)

    # --- row-level errors ---

    def test_empty_hostname_row(self):
        f = _make_csv("hostname", "")
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert r.invalid_rows == 1
        assert any("hostname is required" in e for e in r.errors)

    def test_duplicate_hostname(self):
        f = _make_csv("hostname", "web01", "web01")
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert any("duplicate" in e.lower() for e in r.errors)

    def test_invalid_status(self):
        f = _make_csv("hostname,status", "srv01,UNKNOWN_STATUS")
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert any("invalid status" in e for e in r.errors)

    def test_invalid_ip_address(self):
        f = _make_csv("hostname,ip_address", "srv01,999.999.999.999")
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert any("invalid ip" in e.lower() for e in r.errors)

    def test_valid_ip_address_formats(self):
        f = _make_csv(
            "hostname,ip_address",
            "h1,10.0.0.1",
            "h2,172.16.254.1",
            "h3,255.255.255.0",
        )
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid

    def test_invalid_mac_address(self):
        f = _make_csv("hostname,mac_address", "srv01,ZZ:ZZ:ZZ:ZZ:ZZ:ZZ")
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert any("invalid mac" in e.lower() for e in r.errors)

    def test_mac_with_dash_separator(self):
        f = _make_csv("hostname,mac_address", "srv01,AA-BB-CC-DD-EE-FF")
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid

    def test_empty_data_warns(self):
        f = _make_csv("hostname,status")
        r = ImportValidator.validate_device_csv(f)
        assert r.is_valid  # no errors
        assert any("no data" in w.lower() for w in r.warnings)

    def test_mixed_valid_invalid_rows(self):
        f = _make_csv(
            "hostname,ip_address",
            "valid-host,192.168.1.1",
            ",bad-ip",  # empty hostname + bad ip → invalid
        )
        r = ImportValidator.validate_device_csv(f)
        assert not r.is_valid
        assert r.valid_rows == 1
        assert r.invalid_rows == 1


# ---------------------------------------------------------------------------
# validate_license_csv
# ---------------------------------------------------------------------------

class TestValidateLicenseCsv:
    # --- happy paths ---

    def test_minimal_valid(self):
        f = _make_csv(
            "software_name,vendor,license_type",
            "Office 365,Microsoft,subscription",
        )
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid
        assert r.valid_rows == 1

    def test_all_license_types_accepted(self):
        types = ["perpetual", "subscription", "oem", "volume", "freeware", "open_source"]
        rows = [f"SW{i},Vendor,{lt}" for i, lt in enumerate(types)]
        f = _make_csv("software_name,vendor,license_type", *rows)
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid
        assert r.valid_rows == len(types)

    def test_full_columns_valid(self):
        f = _make_csv(
            "software_name,vendor,license_type,purchased_count,installed_count,cost_per_unit",
            "Office,Microsoft,subscription,100,90,12.5",
        )
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid

    def test_zero_counts_valid(self):
        f = _make_csv(
            "software_name,vendor,license_type,purchased_count",
            "SW,Vendor,perpetual,0",
        )
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid

    # --- column errors ---

    def test_missing_software_name_column(self):
        f = _make_csv("vendor,license_type", "MS,subscription")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("software_name" in e for e in r.errors)

    def test_missing_vendor_column(self):
        f = _make_csv("software_name,license_type", "SW,perpetual")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("vendor" in e for e in r.errors)

    def test_missing_license_type_column(self):
        f = _make_csv("software_name,vendor", "SW,Vendor")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("license_type" in e for e in r.errors)

    # --- row-level errors ---

    def test_empty_software_name(self):
        f = _make_csv("software_name,vendor,license_type", ",Vendor,perpetual")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("software_name is required" in e for e in r.errors)

    def test_empty_vendor(self):
        f = _make_csv("software_name,vendor,license_type", "SW,,perpetual")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("vendor is required" in e for e in r.errors)

    def test_empty_license_type(self):
        f = _make_csv("software_name,vendor,license_type", "SW,Vendor,")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("license_type is required" in e for e in r.errors)

    def test_invalid_license_type(self):
        f = _make_csv("software_name,vendor,license_type", "SW,Vendor,INVALID")
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("invalid license_type" in e for e in r.errors)

    def test_negative_purchased_count(self):
        f = _make_csv(
            "software_name,vendor,license_type,purchased_count",
            "SW,Vendor,perpetual,-5",
        )
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("purchased_count" in e and "non-negative" in e for e in r.errors)

    def test_non_integer_installed_count(self):
        f = _make_csv(
            "software_name,vendor,license_type,installed_count",
            "SW,Vendor,perpetual,abc",
        )
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("installed_count" in e and "integer" in e for e in r.errors)

    def test_invalid_cost_per_unit(self):
        f = _make_csv(
            "software_name,vendor,license_type,cost_per_unit",
            "SW,Vendor,perpetual,not_a_number",
        )
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("cost_per_unit" in e for e in r.errors)

    def test_cost_per_unit_float_valid(self):
        f = _make_csv(
            "software_name,vendor,license_type,cost_per_unit",
            "SW,Vendor,subscription,9.99",
        )
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid

    def test_empty_data_warns(self):
        f = _make_csv("software_name,vendor,license_type")
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid
        assert any("no data" in w.lower() for w in r.warnings)

    def test_m365_assigned_non_negative(self):
        f = _make_csv(
            "software_name,vendor,license_type,m365_assigned",
            "SW,Vendor,subscription,-1",
        )
        r = ImportValidator.validate_license_csv(f)
        assert not r.is_valid
        assert any("m365_assigned" in e for e in r.errors)

    def test_unknown_columns_produce_warning(self):
        f = _make_csv(
            "software_name,vendor,license_type,mystery_col",
            "SW,Vendor,perpetual,val",
        )
        r = ImportValidator.validate_license_csv(f)
        assert r.is_valid
        assert any("mystery_col" in w for w in r.warnings)
