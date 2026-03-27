#!/usr/bin/env bash
# ===========================================================================
# AEGIS-SIGHT -- API endpoint response-time benchmark
# ===========================================================================
#
# Usage:
#   ./scripts/benchmark.sh                  # table output
#   ./scripts/benchmark.sh --json           # JSON output
#   BASE_URL=http://host:8000 ./scripts/benchmark.sh
#
# Measures curl response times for the most-used API endpoints.
# ===========================================================================
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
OUTPUT_FORMAT="table"
EMAIL="${BENCH_EMAIL:-admin@aegis-sight.local}"
PASSWORD="${BENCH_PASSWORD:-admin}"

for arg in "$@"; do
  case "$arg" in
    --json) OUTPUT_FORMAT="json" ;;
    --help|-h)
      echo "Usage: $0 [--json] [--help]"
      echo ""
      echo "Environment:"
      echo "  BASE_URL        API base URL (default: http://localhost:8000)"
      echo "  BENCH_EMAIL     Login email"
      echo "  BENCH_PASSWORD  Login password"
      exit 0
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Authenticate
# ---------------------------------------------------------------------------
echo "Authenticating against ${BASE_URL} ..." >&2
TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/api/v1/auth/token" \
  -d "username=${EMAIL}&password=${PASSWORD}" \
  -H "Content-Type: application/x-www-form-urlencoded")
HTTP_CODE=$(echo "$TOKEN_RESPONSE" | tail -1)
BODY=$(echo "$TOKEN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Authentication failed (HTTP ${HTTP_CODE})" >&2
  echo "$BODY" >&2
  exit 1
fi

TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || true)
if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not extract access_token from response" >&2
  exit 1
fi
echo "Authenticated successfully." >&2

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

# ---------------------------------------------------------------------------
# Benchmark helper
# ---------------------------------------------------------------------------
declare -a RESULTS=()

bench() {
  local name="$1"
  local method="$2"
  local url="$3"
  local extra_args=("${@:4}")

  local timing
  timing=$(curl -o /dev/null -s -w '%{time_total} %{http_code} %{size_download}' \
    -X "$method" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "${extra_args[@]}" \
    "${BASE_URL}${url}")

  local time_s http_code size_bytes
  time_s=$(echo "$timing" | awk '{print $1}')
  http_code=$(echo "$timing" | awk '{print $2}')
  size_bytes=$(echo "$timing" | awk '{print $3}')
  local time_ms
  time_ms=$(echo "$time_s" | awk '{printf "%.1f", $1 * 1000}')

  RESULTS+=("${name}|${method}|${url}|${http_code}|${time_ms}|${size_bytes}")
}

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
echo "Running benchmarks ..." >&2
echo "" >&2

bench "Version"            GET  "/api/v1/version"
bench "Dashboard Stats"    GET  "/api/v1/dashboard/stats"
bench "Asset List"         GET  "/api/v1/assets?offset=0&limit=50"
bench "Asset List (200)"   GET  "/api/v1/assets?offset=0&limit=200"
bench "License List"       GET  "/api/v1/sam/licenses?offset=0&limit=50"
bench "Compliance Check"   GET  "/api/v1/sam/compliance"
bench "Logon Events"       GET  "/api/v1/logs/logon?offset=0&limit=50"
bench "USB Events"         GET  "/api/v1/logs/usb?offset=0&limit=50"
bench "Security Overview"  GET  "/api/v1/security/overview"
bench "Alert List"         GET  "/api/v1/alerts?offset=0&limit=50"
bench "Software List"      GET  "/api/v1/software?offset=0&limit=50"
bench "Telemetry Ingest"   POST "/api/v1/telemetry" \
  -d '{"device":{"hostname":"BENCH-TEST-001","os_version":"Windows 11","ip_address":"10.0.0.1","mac_address":"00:11:22:33:44:55","domain":"bench.local"},"hardware":{"cpu_model":"Intel i7","memory_gb":16,"disk_total_gb":512,"disk_free_gb":256},"security":{"defender_on":true,"bitlocker_on":true,"pattern_date":"2025-01-01","pending_patches":0},"software":[{"name":"Chrome","version":"120","publisher":"Google"}]}'

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
if [ "$OUTPUT_FORMAT" = "json" ]; then
  echo "["
  first=true
  for row in "${RESULTS[@]}"; do
    IFS='|' read -r name method url code ms bytes <<< "$row"
    [ "$first" = true ] && first=false || echo ","
    printf '  {"name":"%s","method":"%s","url":"%s","status":%s,"time_ms":%s,"size_bytes":%s}' \
      "$name" "$method" "$url" "$code" "$ms" "$bytes"
  done
  echo ""
  echo "]"
else
  printf "\n%-22s %-6s %-42s %6s %10s %10s\n" \
    "Endpoint" "Method" "URL" "Status" "Time(ms)" "Size(B)"
  printf "%-22s %-6s %-42s %6s %10s %10s\n" \
    "----------------------" "------" "------------------------------------------" "------" "----------" "----------"
  for row in "${RESULTS[@]}"; do
    IFS='|' read -r name method url code ms bytes <<< "$row"
    printf "%-22s %-6s %-42s %6s %10s %10s\n" \
      "$name" "$method" "$url" "$code" "$ms" "$bytes"
  done
  echo ""
  echo "Base URL: ${BASE_URL}"
  echo "Date:     $(date -Iseconds)"
fi
