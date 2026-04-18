"""Unit tests for app/services/import_validator.py — CSV validation logic."""

import io

from app.services.import_validator import ImportValidator, ValidationReport

# ---------------------------------------------------------------------------
# ValidationReport
# ---------------------------------------------------------------------------


class TestValidationReport:
    def test_empty_report_is_valid(self) -> None:
        report = ValidationReport()
        assert report.is_valid is True

    def test_report_with_errors_is_invalid(self) -> None:
        report = ValidationReport(errors=["some error"])
        assert report.is_valid is False

    def test_report_with_invalid_rows_is_invalid(self) -> None:
        report = ValidationReport(invalid_rows=1)
        assert report.is_valid is False

    def test_report_with_warnings_only_is_valid(self) -> None:
        report = ValidationReport(warnings=["just a warning"])
        assert report.is_valid is True

    def test_to_dict_keys(self) -> None:
        report = ValidationReport()
        d = report.to_dict()
        assert set(d.keys()) == {"is_valid", "errors", "warnings", "valid_rows", "invalid_rows", "total_rows"}

    def test_to_dict_total_rows(self) -> None:
        report = ValidationReport(valid_rows=3, invalid_rows=2)
        assert report.to_dict()["total_rows"] == 5

    def test_to_dict_is_valid_false(self) -> None:
        report = ValidationReport(errors=["err"])
        assert report.to_dict()["is_valid"] is False


# ---------------------------------------------------------------------------
# ImportValidator.validate_device_csv — happy path
# ---------------------------------------------------------------------------


def _device_csv(*rows: str) -> io.StringIO:
    return io.StringIO("\n".join(rows))


class TestValidateDeviceCsvValid:
    def test_minimal_valid_row(self) -> None:
        csv = _device_csv("hostname", "server01")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid
        assert report.valid_rows == 1
        assert report.invalid_rows == 0

    def test_multiple_valid_rows(self) -> None:
        csv = _device_csv("hostname", "server01", "server02", "server03")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid
        assert report.valid_rows == 3

    def test_valid_status_active(self) -> None:
        csv = _device_csv("hostname,status", "server01,active")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid

    def test_valid_ip_address(self) -> None:
        csv = _device_csv("hostname,ip_address", "server01,192.168.1.1")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid

    def test_valid_mac_address_colon(self) -> None:
        csv = _device_csv("hostname,mac_address", "server01,AA:BB:CC:DD:EE:FF")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid

    def test_valid_mac_address_dash(self) -> None:
        csv = _device_csv("hostname,mac_address", "server01,AA-BB-CC-DD-EE-FF")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid

    def test_unknown_column_generates_warning(self) -> None:
        csv = _device_csv("hostname,unknown_col", "server01,value")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid
        assert any("unknown" in w.lower() for w in report.warnings)

    def test_empty_file_generates_warning(self) -> None:
        csv = _device_csv("hostname")
        report = ImportValidator.validate_device_csv(csv)
        assert report.is_valid
        assert any("no data" in w.lower() for w in report.warnings)


# ---------------------------------------------------------------------------
# ImportValidator.validate_device_csv — error cases
# ---------------------------------------------------------------------------


class TestValidateDeviceCsvInvalid:
    def test_missing_hostname_column(self) -> None:
        csv = _device_csv("ip_address", "192.168.1.1")
        report = ImportValidator.validate_device_csv(csv)
        assert not report.is_valid
        assert any("hostname" in e.lower() for e in report.errors)

    def test_empty_hostname_value(self) -> None:
        # An empty row is skipped by the CSV parser → "no data rows" warning
        csv = _device_csv("hostname", " ")
        report = ImportValidator.validate_device_csv(csv)
        assert not report.is_valid

    def test_duplicate_hostname(self) -> None:
        csv = _device_csv("hostname", "server01", "server01")
        report = ImportValidator.validate_device_csv(csv)
        assert not report.is_valid
        assert any("duplicate" in e.lower() for e in report.errors)

    def test_invalid_status(self) -> None:
        csv = _device_csv("hostname,status", "server01,unknown_status")
        report = ImportValidator.validate_device_csv(csv)
        assert not report.is_valid
        assert any("status" in e.lower() for e in report.errors)

    def test_invalid_ip_address(self) -> None:
        csv = _device_csv("hostname,ip_address", "server01,999.999.999.999")
        report = ImportValidator.validate_device_csv(csv)
        assert not report.is_valid

    def test_invalid_mac_address(self) -> None:
        csv = _device_csv("hostname,mac_address", "server01,GGGG:HHHH:IIII")
        report = ImportValidator.validate_device_csv(csv)
        assert not report.is_valid


# ---------------------------------------------------------------------------
# ImportValidator.validate_license_csv — happy path
# ---------------------------------------------------------------------------


def _license_csv(*rows: str) -> io.StringIO:
    return io.StringIO("\n".join(rows))


class TestValidateLicenseCsvValid:
    def test_minimal_valid_row(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type",
            "Office,Microsoft,subscription",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert report.is_valid
        assert report.valid_rows == 1

    def test_perpetual_license_type(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type",
            "Photoshop,Adobe,perpetual",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert report.is_valid

    def test_valid_purchased_count(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type,purchased_count",
            "Office,Microsoft,subscription,10",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert report.is_valid

    def test_valid_cost_per_unit(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type,cost_per_unit",
            "Office,Microsoft,subscription,9.99",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert report.is_valid

    def test_empty_csv_generates_warning(self) -> None:
        csv = _license_csv("software_name,vendor,license_type")
        report = ImportValidator.validate_license_csv(csv)
        assert report.is_valid
        assert any("no data" in w.lower() for w in report.warnings)


# ---------------------------------------------------------------------------
# ImportValidator.validate_license_csv — error cases
# ---------------------------------------------------------------------------


class TestValidateLicenseCsvInvalid:
    def test_missing_required_column(self) -> None:
        csv = _license_csv("software_name,vendor", "Office,Microsoft")
        report = ImportValidator.validate_license_csv(csv)
        assert not report.is_valid
        assert any("missing" in e.lower() for e in report.errors)

    def test_invalid_license_type(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type",
            "Office,Microsoft,unknown_type",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert not report.is_valid

    def test_negative_purchased_count(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type,purchased_count",
            "Office,Microsoft,subscription,-1",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert not report.is_valid

    def test_non_integer_purchased_count(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type,purchased_count",
            "Office,Microsoft,subscription,abc",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert not report.is_valid

    def test_non_numeric_cost(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type,cost_per_unit",
            "Office,Microsoft,subscription,not_a_number",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert not report.is_valid

    def test_empty_software_name(self) -> None:
        csv = _license_csv(
            "software_name,vendor,license_type",
            ",Microsoft,subscription",
        )
        report = ImportValidator.validate_license_csv(csv)
        assert not report.is_valid
