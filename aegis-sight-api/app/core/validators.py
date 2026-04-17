"""
Reusable validation helpers for AEGIS-SIGHT API.

Each function raises ``ValueError`` on invalid input, making them
directly usable as Pydantic ``field_validator`` / ``model_validator``
callbacks.

Usage with Pydantic::

    from pydantic import BaseModel, field_validator
    from app.core.validators import validate_ip_address, validate_mac_address

    class DeviceCreate(BaseModel):
        ip_address: str
        mac_address: str

        _val_ip = field_validator("ip_address")(validate_ip_address)
        _val_mac = field_validator("mac_address")(validate_mac_address)

Standalone usage::

    from app.core.validators import validate_hostname
    validate_hostname("server-01.example.com")  # returns normalised value
"""

from __future__ import annotations

import ipaddress
import re


# ---------------------------------------------------------------------------
# IP address (IPv4 / IPv6)
# ---------------------------------------------------------------------------
def validate_ip_address(value: str) -> str:
    """
    Validate and normalise an IPv4 or IPv6 address.

    Returns the compressed string representation.
    Raises ``ValueError`` for invalid input.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("IP address must be a non-empty string")
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError as exc:
        raise ValueError(f"Invalid IP address: {value}") from exc


# ---------------------------------------------------------------------------
# MAC address
# ---------------------------------------------------------------------------
_MAC_RE = re.compile(
    r"^([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}$"
    r"|^[0-9A-Fa-f]{12}$"
    r"|^([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$"
)


def validate_mac_address(value: str) -> str:
    """
    Validate a MAC address and normalise to ``XX:XX:XX:XX:XX:XX`` format.

    Accepts colon-separated, dash-separated, dot-separated (Cisco), and
    raw hex formats.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("MAC address must be a non-empty string")

    cleaned = value.strip()
    if not _MAC_RE.match(cleaned):
        raise ValueError(f"Invalid MAC address: {value}")

    # Normalise to colon-separated uppercase
    hex_only = re.sub(r"[:\-.]", "", cleaned).upper()
    return ":".join(hex_only[i : i + 2] for i in range(0, 12, 2))


# ---------------------------------------------------------------------------
# Hostname (RFC 952 / RFC 1123)
# ---------------------------------------------------------------------------
_HOSTNAME_RE = re.compile(
    r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$"
)


def validate_hostname(value: str) -> str:
    """
    Validate a hostname per RFC 1123.

    Returns the lowercased hostname.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Hostname must be a non-empty string")

    cleaned = value.strip().lower()
    if len(cleaned) > 253:
        raise ValueError("Hostname exceeds 253 characters")
    if not _HOSTNAME_RE.match(cleaned):
        raise ValueError(f"Invalid hostname: {value}")
    return cleaned


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)


def validate_email(value: str) -> str:
    """
    Validate an email address (basic RFC 5322 subset).

    Returns the original value stripped of leading/trailing whitespace.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Email must be a non-empty string")

    cleaned = value.strip()
    if len(cleaned) > 254:
        raise ValueError("Email exceeds 254 characters")
    if not _EMAIL_RE.match(cleaned):
        raise ValueError(f"Invalid email address: {value}")
    return cleaned


# ---------------------------------------------------------------------------
# Cron expression (5-field standard)
# ---------------------------------------------------------------------------
_CRON_FIELD_RANGES = [
    (0, 59),   # minute
    (0, 23),   # hour
    (1, 31),   # day of month
    (1, 12),   # month
    (0, 7),    # day of week (0 and 7 = Sunday)
]

_CRON_TOKEN_RE = re.compile(
    r"^(\*|\d+)(?:-(\d+))?(?:/(\d+))?$"
)


def _validate_cron_field(token: str, min_val: int, max_val: int) -> bool:
    """Validate a single cron field token (e.g. ``*/5``, ``1-15``, ``3``)."""
    for part in token.split(","):
        m = _CRON_TOKEN_RE.match(part.strip())
        if not m:
            return False
        base, end, step = m.group(1), m.group(2), m.group(3)

        if base != "*":
            if not (min_val <= int(base) <= max_val):
                return False
        if end is not None:
            if not (min_val <= int(end) <= max_val):
                return False
        if step is not None:
            if int(step) == 0:
                return False
    return True


def validate_cron_expression(value: str) -> str:
    """
    Validate a standard 5-field cron expression.

    Format: ``minute hour day_of_month month day_of_week``

    Returns the normalised (stripped) expression.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Cron expression must be a non-empty string")

    cleaned = value.strip()
    fields = cleaned.split()
    if len(fields) != 5:
        raise ValueError(
            f"Cron expression must have exactly 5 fields, got {len(fields)}: {value}"
        )

    for field, (min_val, max_val) in zip(fields, _CRON_FIELD_RANGES, strict=False):
        if not _validate_cron_field(field, min_val, max_val):
            raise ValueError(f"Invalid cron field '{field}' in expression: {value}")

    return cleaned
