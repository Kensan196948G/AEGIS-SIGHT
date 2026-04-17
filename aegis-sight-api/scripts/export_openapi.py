#!/usr/bin/env python3
"""
Export the OpenAPI specification from the AEGIS-SIGHT FastAPI application.

Usage:
    python scripts/export_openapi.py              # writes openapi.json
    python scripts/export_openapi.py --output /tmp/spec.json
    python scripts/export_openapi.py --version     # print API version and exit

This script is designed for CI pipelines: generate the spec as a build artifact
so that downstream consumers (frontend codegen, contract tests, etc.) always
have the canonical schema.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure the project root is on sys.path so ``app`` is importable even when
# the script is executed directly (e.g., ``python scripts/export_openapi.py``).
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app


def get_openapi_spec() -> dict:
    """Return the OpenAPI schema dict from the FastAPI application."""
    return app.openapi()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export the AEGIS-SIGHT OpenAPI specification."
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default="openapi.json",
        help="Output file path (default: openapi.json)",
    )
    parser.add_argument(
        "--version",
        action="store_true",
        help="Print the API version from the spec and exit.",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level (default: 2)",
    )
    args = parser.parse_args()

    spec = get_openapi_spec()

    if args.version:
        print(spec.get("info", {}).get("version", "unknown"))
        sys.exit(0)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=args.indent, ensure_ascii=False)

    version = spec.get("info", {}).get("version", "unknown")
    print(f"OpenAPI spec v{version} exported to {output_path}")


if __name__ == "__main__":
    main()
