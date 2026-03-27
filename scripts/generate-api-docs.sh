#!/usr/bin/env bash
# =============================================================================
# AEGIS-SIGHT API Reference Generator
#
# FastAPI の OpenAPI スキーマを取得し、Markdown 形式の API リファレンスに変換します。
#
# Usage:
#   ./scripts/generate-api-docs.sh                    # ローカルサーバーから取得
#   ./scripts/generate-api-docs.sh --from-file openapi.json  # ファイルから読み込み
#   ./scripts/generate-api-docs.sh --export-only      # JSON エクスポートのみ
#
# Output:
#   docs/99_APIリファレンス（API-Reference）/
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/docs/99_APIリファレンス（API-Reference）"
OPENAPI_JSON="$PROJECT_ROOT/openapi.json"
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"

# ---------- Color helpers ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------- Parse arguments ----------
FROM_FILE=""
EXPORT_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --from-file)
            FROM_FILE="$2"
            shift 2
            ;;
        --export-only)
            EXPORT_ONLY=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ---------- Step 1: Get OpenAPI JSON ----------
info "Step 1: Obtaining OpenAPI specification..."

if [[ -n "$FROM_FILE" ]]; then
    if [[ ! -f "$FROM_FILE" ]]; then
        error "File not found: $FROM_FILE"
        exit 1
    fi
    cp "$FROM_FILE" "$OPENAPI_JSON"
    ok "Loaded from file: $FROM_FILE"
else
    # Try fetching from running server
    if curl -sf "${API_BASE_URL}/openapi.json" -o "$OPENAPI_JSON" 2>/dev/null; then
        ok "Fetched from ${API_BASE_URL}/openapi.json"
    else
        # Fall back to Python export script
        info "Server not running. Using export_openapi.py..."
        if [[ -f "$PROJECT_ROOT/aegis-sight-api/scripts/export_openapi.py" ]]; then
            cd "$PROJECT_ROOT/aegis-sight-api"
            python scripts/export_openapi.py --output "$OPENAPI_JSON" 2>/dev/null || {
                error "Failed to export OpenAPI spec. Ensure dependencies are installed."
                error "Try: cd aegis-sight-api && pip install -r requirements.txt"
                exit 1
            }
            cd "$PROJECT_ROOT"
            ok "Exported via export_openapi.py"
        else
            error "Cannot obtain OpenAPI spec. Start the server or provide --from-file."
            exit 1
        fi
    fi
fi

if [[ "$EXPORT_ONLY" == true ]]; then
    ok "OpenAPI JSON exported to: $OPENAPI_JSON"
    exit 0
fi

# ---------- Step 2: Create output directory ----------
info "Step 2: Preparing output directory..."
mkdir -p "$OUTPUT_DIR"

# ---------- Step 3: Generate Markdown ----------
info "Step 3: Generating Markdown API reference..."

# Use Python to parse and convert
python3 - "$OPENAPI_JSON" "$OUTPUT_DIR" <<'PYTHON_SCRIPT'
import json
import sys
from pathlib import Path
from collections import defaultdict

openapi_path = Path(sys.argv[1])
output_dir = Path(sys.argv[2])

with open(openapi_path, "r", encoding="utf-8") as f:
    spec = json.load(f)

info = spec.get("info", {})
title = info.get("title", "AEGIS-SIGHT API")
version = info.get("version", "unknown")
description = info.get("description", "")

# Group endpoints by tag
tagged_paths = defaultdict(list)
paths = spec.get("paths", {})

for path, methods in paths.items():
    for method, details in methods.items():
        if method in ("get", "post", "put", "patch", "delete", "options", "head"):
            tags = details.get("tags", ["Other"])
            for tag in tags:
                tagged_paths[tag].append({
                    "method": method.upper(),
                    "path": path,
                    "summary": details.get("summary", ""),
                    "description": details.get("description", ""),
                    "parameters": details.get("parameters", []),
                    "request_body": details.get("requestBody", {}),
                    "responses": details.get("responses", {}),
                    "security": details.get("security", []),
                    "deprecated": details.get("deprecated", False),
                })

# Tag metadata
tag_descriptions = {}
for tag_meta in spec.get("tags", []):
    tag_descriptions[tag_meta["name"]] = tag_meta.get("description", "")

# --- Generate index page ---
index_lines = [
    f"# {title} - API Reference",
    f"",
    f"**Version:** {version}",
    f"",
    f"{description}",
    f"",
    f"**Base URL:** `http://localhost:8000`",
    f"",
    f"---",
    f"",
    f"## Endpoints",
    f"",
    f"| Tag | Endpoints | Description |",
    f"|-----|-----------|-------------|",
]

for tag in sorted(tagged_paths.keys()):
    count = len(tagged_paths[tag])
    desc = tag_descriptions.get(tag, "")
    # Strip markdown formatting for table
    short_desc = desc.replace("**", "").replace("`", "")[:80]
    index_lines.append(f"| [{tag}](./{tag}.md) | {count} | {short_desc} |")

index_lines.extend([
    f"",
    f"---",
    f"",
    f"## Authentication",
    f"",
    f"API は JWT Bearer トークン認証を使用します。",
    f"",
    f"```",
    f"Authorization: Bearer <token>",
    f"```",
    f"",
    f"トークンは `POST /api/v1/auth/token` で取得します。",
    f"",
    f"---",
    f"",
    f"*Generated from OpenAPI spec v{version}*",
])

index_path = output_dir / "README.md"
with open(index_path, "w", encoding="utf-8") as f:
    f.write("\n".join(index_lines))

print(f"  Created: {index_path}")

# --- Generate per-tag pages ---
for tag, endpoints in sorted(tagged_paths.items()):
    lines = [
        f"# {tag}",
        f"",
    ]

    if tag in tag_descriptions:
        lines.extend([tag_descriptions[tag], "", "---", ""])

    for ep in endpoints:
        deprecated = " (DEPRECATED)" if ep["deprecated"] else ""
        lines.extend([
            f"## `{ep['method']}` {ep['path']}{deprecated}",
            f"",
        ])

        if ep["summary"]:
            lines.extend([f"**{ep['summary']}**", ""])

        if ep["description"]:
            lines.extend([ep["description"], ""])

        # Security
        if ep["security"]:
            schemes = []
            for sec in ep["security"]:
                schemes.extend(sec.keys())
            lines.extend([f"**Authentication:** {', '.join(schemes)}", ""])

        # Parameters
        if ep["parameters"]:
            lines.extend([
                "### Parameters",
                "",
                "| Name | In | Type | Required | Description |",
                "|------|----|------|----------|-------------|",
            ])
            for param in ep["parameters"]:
                name = param.get("name", "")
                location = param.get("in", "")
                schema = param.get("schema", {})
                ptype = schema.get("type", "string")
                required = "Yes" if param.get("required", False) else "No"
                desc = param.get("description", "")
                lines.append(f"| `{name}` | {location} | {ptype} | {required} | {desc} |")
            lines.append("")

        # Request body
        if ep["request_body"]:
            lines.extend(["### Request Body", ""])
            content = ep["request_body"].get("content", {})
            for content_type, media in content.items():
                lines.append(f"**Content-Type:** `{content_type}`")
                schema = media.get("schema", {})
                if "$ref" in schema:
                    ref_name = schema["$ref"].split("/")[-1]
                    lines.append(f"\nSchema: `{ref_name}`")
                lines.append("")

        # Responses
        if ep["responses"]:
            lines.extend(["### Responses", ""])
            for code, resp in ep["responses"].items():
                desc = resp.get("description", "")
                lines.append(f"- **{code}**: {desc}")
            lines.append("")

        lines.extend(["---", ""])

    # Write tag file
    safe_tag = tag.replace("/", "_").replace(" ", "_")
    tag_path = output_dir / f"{safe_tag}.md"
    with open(tag_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"  Created: {tag_path}")

# --- Generate schemas page ---
schemas = spec.get("components", {}).get("schemas", {})
if schemas:
    schema_lines = [
        "# Schemas (Data Models)",
        "",
        "API で使用されるデータモデルの定義です。",
        "",
        "---",
        "",
    ]

    for name, schema in sorted(schemas.items()):
        schema_lines.extend([
            f"## {name}",
            "",
        ])

        desc = schema.get("description", "")
        if desc:
            schema_lines.extend([desc, ""])

        stype = schema.get("type", "object")
        if stype == "object" and "properties" in schema:
            required_fields = schema.get("required", [])
            schema_lines.extend([
                "| Property | Type | Required | Description |",
                "|----------|------|----------|-------------|",
            ])
            for prop_name, prop in schema["properties"].items():
                ptype = prop.get("type", prop.get("$ref", "").split("/")[-1] or "any")
                req = "Yes" if prop_name in required_fields else "No"
                pdesc = prop.get("description", prop.get("title", ""))
                schema_lines.append(f"| `{prop_name}` | {ptype} | {req} | {pdesc} |")
            schema_lines.append("")
        elif stype == "enum" or "enum" in schema:
            vals = schema.get("enum", [])
            schema_lines.append(f"**Values:** {', '.join(f'`{v}`' for v in vals)}")
            schema_lines.append("")

        schema_lines.extend(["---", ""])

    schemas_path = output_dir / "schemas.md"
    with open(schemas_path, "w", encoding="utf-8") as f:
        f.write("\n".join(schema_lines))
    print(f"  Created: {schemas_path}")

print(f"\nTotal tags: {len(tagged_paths)}")
print(f"Total endpoints: {sum(len(v) for v in tagged_paths.values())}")
PYTHON_SCRIPT

ok "API reference generated in: $OUTPUT_DIR"

# ---------- Cleanup ----------
if [[ -f "$OPENAPI_JSON" && -z "$FROM_FILE" ]]; then
    info "Keeping openapi.json at project root for reference."
fi

echo ""
echo "============================================="
echo -e "${GREEN}  API Reference generation complete!${NC}"
echo "============================================="
echo ""
echo "  Output:  $OUTPUT_DIR"
echo "  Files:   $(ls "$OUTPUT_DIR" | wc -l) files"
echo ""
