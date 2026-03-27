#!/usr/bin/env bash
# ===========================================================================
# AEGIS-SIGHT -- OpenAPI -> TypeScript type generation
# ===========================================================================
#
# Fetches the OpenAPI JSON schema from the running API server and generates
# TypeScript types into aegis-sight-web/lib/api-types/.
#
# Usage:
#   ./scripts/generate-api-types.sh
#   BASE_URL=http://host:8000 ./scripts/generate-api-types.sh
#
# Requirements:
#   - Node.js >= 18
#   - npx (bundled with npm)
#   - Running AEGIS-SIGHT API (or a local openapi.json file)
# ===========================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:8000}"
OUTPUT_DIR="${PROJECT_ROOT}/aegis-sight-web/lib/api-types"
OPENAPI_JSON="${OUTPUT_DIR}/openapi.json"

echo "=== AEGIS-SIGHT API Type Generator ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Ensure output directory exists
# ---------------------------------------------------------------------------
mkdir -p "${OUTPUT_DIR}"

# ---------------------------------------------------------------------------
# 2. Fetch OpenAPI JSON
# ---------------------------------------------------------------------------
echo "[1/4] Fetching OpenAPI schema from ${BASE_URL}/openapi.json ..."

HTTP_CODE=$(curl -s -o "${OPENAPI_JSON}" -w "%{http_code}" "${BASE_URL}/openapi.json")

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Failed to fetch OpenAPI schema (HTTP ${HTTP_CODE})" >&2
  echo "       Make sure the API server is running at ${BASE_URL}" >&2
  rm -f "${OPENAPI_JSON}"
  exit 1
fi

# Extract version from the schema
API_VERSION=$(python3 -c "
import json, sys
with open('${OPENAPI_JSON}') as f:
    schema = json.load(f)
print(schema.get('info', {}).get('version', 'unknown'))
" 2>/dev/null || echo "unknown")
echo "       API version: ${API_VERSION}"

# ---------------------------------------------------------------------------
# 3. Generate TypeScript types
# ---------------------------------------------------------------------------
echo "[2/4] Generating TypeScript types ..."

cd "${PROJECT_ROOT}/aegis-sight-web"

npx openapi-typescript-codegen \
  --input "${OPENAPI_JSON}" \
  --output "${OUTPUT_DIR}" \
  --exportCore false \
  --exportServices false \
  --exportModels true \
  --useUnionTypes \
  2>&1 | sed 's/^/       /'

# ---------------------------------------------------------------------------
# 4. Add generation metadata
# ---------------------------------------------------------------------------
echo "[3/4] Writing generation metadata ..."

cat > "${OUTPUT_DIR}/_generated.ts" <<EOF
/**
 * AUTO-GENERATED -- DO NOT EDIT
 *
 * Generated from: ${BASE_URL}/openapi.json
 * API version:    ${API_VERSION}
 * Generated at:   $(date -Iseconds)
 * Generator:      openapi-typescript-codegen
 *
 * Regenerate with:
 *   ./scripts/generate-api-types.sh
 */

export const API_TYPES_META = {
  apiVersion: "${API_VERSION}",
  generatedAt: "$(date -Iseconds)",
  sourceUrl: "${BASE_URL}/openapi.json",
} as const;
EOF

# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------
echo "[4/4] Done."
echo ""
FILE_COUNT=$(find "${OUTPUT_DIR}" -name "*.ts" | wc -l)
echo "Generated ${FILE_COUNT} TypeScript file(s) in:"
echo "  ${OUTPUT_DIR}"
echo ""
echo "API version: ${API_VERSION}"
echo "Source:      ${BASE_URL}/openapi.json"
