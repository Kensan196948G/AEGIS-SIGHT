"""
CSV import validation service.

Validates structure, data types, and business rules for device and license
CSV uploads before they are committed to the database.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from typing import BinaryIO, ClassVar

from app.models.device import DeviceStatus
from app.models.license import LicenseType


@dataclass
class ValidationReport:
    """Aggregated validation result for a CSV import."""

    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    valid_rows: int = 0
    invalid_rows: int = 0

    @property
    def is_valid(self) -> bool:
        return self.invalid_rows == 0 and len(self.errors) == 0

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "valid_rows": self.valid_rows,
            "invalid_rows": self.invalid_rows,
            "total_rows": self.valid_rows + self.invalid_rows,
        }


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

# MAC address pattern: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
_MAC_RE = re.compile(r"^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$")

# IPv4 basic pattern
_IPV4_RE = re.compile(
    r"^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$"
)


class ImportValidator:
    """Stateless CSV import validator."""

    # ------------------------------------------------------------------
    # Device CSV
    # ------------------------------------------------------------------
    DEVICE_REQUIRED_COLUMNS: ClassVar[set[str]] = {"hostname"}
    DEVICE_OPTIONAL_COLUMNS: ClassVar[set[str]] = {
        "os_version",
        "ip_address",
        "mac_address",
        "domain",
        "status",
    }
    DEVICE_ALL_COLUMNS = DEVICE_REQUIRED_COLUMNS | DEVICE_OPTIONAL_COLUMNS

    @classmethod
    def validate_device_csv(cls, file: BinaryIO | io.StringIO) -> ValidationReport:
        """
        Validate a device CSV file.

        Checks:
          - Required columns present
          - No unknown columns (warning)
          - hostname non-empty and unique within file
          - status is a valid DeviceStatus value
          - ip_address is valid IPv4 if provided
          - mac_address is valid MAC format if provided
        """
        report = ValidationReport()
        reader, header = cls._read_csv(file, report)
        if reader is None:
            return report

        # Column checks
        header_set = set(header)
        missing = cls.DEVICE_REQUIRED_COLUMNS - header_set
        if missing:
            report.errors.append(
                f"Missing required columns: {', '.join(sorted(missing))}"
            )
            return report

        unknown = header_set - cls.DEVICE_ALL_COLUMNS
        if unknown:
            report.warnings.append(
                f"Unknown columns will be ignored: {', '.join(sorted(unknown))}"
            )

        seen_hostnames: set[str] = set()
        valid_statuses = {s.value for s in DeviceStatus}

        for row_num, row in enumerate(reader, start=2):
            row_valid = True

            # hostname
            hostname = row.get("hostname", "").strip()
            if not hostname:
                report.errors.append(f"Row {row_num}: hostname is required")
                row_valid = False
            elif hostname in seen_hostnames:
                report.errors.append(
                    f"Row {row_num}: duplicate hostname '{hostname}'"
                )
                row_valid = False
            else:
                seen_hostnames.add(hostname)

            # status
            status = row.get("status", "").strip()
            if status and status not in valid_statuses:
                report.errors.append(
                    f"Row {row_num}: invalid status '{status}' "
                    f"(valid: {', '.join(sorted(valid_statuses))})"
                )
                row_valid = False

            # ip_address
            ip = row.get("ip_address", "").strip()
            if ip and not _IPV4_RE.match(ip):
                report.errors.append(
                    f"Row {row_num}: invalid IP address '{ip}'"
                )
                row_valid = False

            # mac_address
            mac = row.get("mac_address", "").strip()
            if mac and not _MAC_RE.match(mac):
                report.errors.append(
                    f"Row {row_num}: invalid MAC address '{mac}'"
                )
                row_valid = False

            if row_valid:
                report.valid_rows += 1
            else:
                report.invalid_rows += 1

        if report.valid_rows == 0 and report.invalid_rows == 0:
            report.warnings.append("CSV file contains no data rows")

        return report

    # ------------------------------------------------------------------
    # License CSV
    # ------------------------------------------------------------------
    LICENSE_REQUIRED_COLUMNS: ClassVar[set[str]] = {"software_name", "vendor", "license_type"}
    LICENSE_OPTIONAL_COLUMNS: ClassVar[set[str]] = {
        "license_key",
        "purchased_count",
        "installed_count",
        "m365_assigned",
        "cost_per_unit",
        "currency",
        "purchase_date",
        "expiry_date",
        "vendor_contract_id",
        "notes",
    }
    LICENSE_ALL_COLUMNS = LICENSE_REQUIRED_COLUMNS | LICENSE_OPTIONAL_COLUMNS

    @classmethod
    def validate_license_csv(cls, file: BinaryIO | io.StringIO) -> ValidationReport:
        """
        Validate a license CSV file.

        Checks:
          - Required columns present
          - license_type is a valid LicenseType value
          - purchased_count / installed_count are non-negative integers
          - cost_per_unit is a valid decimal if provided
        """
        report = ValidationReport()
        reader, header = cls._read_csv(file, report)
        if reader is None:
            return report

        header_set = set(header)
        missing = cls.LICENSE_REQUIRED_COLUMNS - header_set
        if missing:
            report.errors.append(
                f"Missing required columns: {', '.join(sorted(missing))}"
            )
            return report

        unknown = header_set - cls.LICENSE_ALL_COLUMNS
        if unknown:
            report.warnings.append(
                f"Unknown columns will be ignored: {', '.join(sorted(unknown))}"
            )

        valid_types = {t.value for t in LicenseType}

        for row_num, row in enumerate(reader, start=2):
            row_valid = True

            # software_name
            if not row.get("software_name", "").strip():
                report.errors.append(f"Row {row_num}: software_name is required")
                row_valid = False

            # vendor
            if not row.get("vendor", "").strip():
                report.errors.append(f"Row {row_num}: vendor is required")
                row_valid = False

            # license_type
            lt = row.get("license_type", "").strip()
            if not lt:
                report.errors.append(f"Row {row_num}: license_type is required")
                row_valid = False
            elif lt not in valid_types:
                report.errors.append(
                    f"Row {row_num}: invalid license_type '{lt}' "
                    f"(valid: {', '.join(sorted(valid_types))})"
                )
                row_valid = False

            # Integer fields
            for field_name in ("purchased_count", "installed_count", "m365_assigned"):
                val = row.get(field_name, "").strip()
                if val:
                    try:
                        n = int(val)
                        if n < 0:
                            report.errors.append(
                                f"Row {row_num}: {field_name} must be non-negative"
                            )
                            row_valid = False
                    except ValueError:
                        report.errors.append(
                            f"Row {row_num}: {field_name} must be an integer"
                        )
                        row_valid = False

            # cost_per_unit
            cost = row.get("cost_per_unit", "").strip()
            if cost:
                try:
                    float(cost)
                except ValueError:
                    report.errors.append(
                        f"Row {row_num}: cost_per_unit must be a number"
                    )
                    row_valid = False

            if row_valid:
                report.valid_rows += 1
            else:
                report.invalid_rows += 1

        if report.valid_rows == 0 and report.invalid_rows == 0:
            report.warnings.append("CSV file contains no data rows")

        return report

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _read_csv(
        file: BinaryIO | io.StringIO, report: ValidationReport
    ) -> tuple[csv.DictReader | None, list[str]]:
        """
        Read a CSV and return (DictReader, header).

        If the file cannot be parsed, errors are appended to the report
        and (None, []) is returned.
        """
        try:
            if hasattr(file, "mode") or isinstance(file, (bytes, bytearray)):
                # Binary file-like object
                content = (
                    file.read().decode("utf-8-sig")
                    if isinstance(file, (bytes, bytearray))
                    else file.read().decode("utf-8-sig")
                )
            else:
                content = file.read()
                if isinstance(content, bytes):
                    content = content.decode("utf-8-sig")

            text_io = io.StringIO(content)
            reader = csv.DictReader(text_io)
            header = reader.fieldnames or []

            if not header:
                report.errors.append("CSV file has no header row")
                return None, []

            return reader, list(header)
        except UnicodeDecodeError:
            report.errors.append("CSV file is not valid UTF-8")
            return None, []
        except csv.Error as e:
            report.errors.append(f"CSV parsing error: {e}")
            return None, []
