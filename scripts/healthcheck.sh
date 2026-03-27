#!/usr/bin/env bash
# ===========================================================================
# AEGIS-SIGHT -- Health Check Script
# ===========================================================================
# Checks the health of all AEGIS-SIGHT services and displays results.
#
# Usage:
#   ./scripts/healthcheck.sh
#   ./scripts/healthcheck.sh --json     Output as JSON
# ===========================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

JSON_OUTPUT=false
if [[ "${1:-}" == "--json" ]]; then
    JSON_OUTPUT=true
fi

# ---------------------------------------------------------------------------
# Check Functions
# ---------------------------------------------------------------------------
declare -A RESULTS
declare -A DETAILS
TOTAL=0
HEALTHY=0
UNHEALTHY=0

check_service() {
    local name="$1"
    local check_cmd="$2"
    local detail=""

    TOTAL=$((TOTAL + 1))

    if detail=$(eval "$check_cmd" 2>&1); then
        RESULTS["$name"]="HEALTHY"
        DETAILS["$name"]="$detail"
        HEALTHY=$((HEALTHY + 1))
    else
        RESULTS["$name"]="UNHEALTHY"
        DETAILS["$name"]="${detail:-no response}"
        UNHEALTHY=$((UNHEALTHY + 1))
    fi
}

# ---------------------------------------------------------------------------
# Service Checks
# ---------------------------------------------------------------------------

# API: /health/detail
check_service "API (FastAPI)" \
    'curl -sf --max-time 5 http://localhost:8000/health/detail 2>/dev/null || curl -sf --max-time 5 http://localhost:8000/health 2>/dev/null'

# Web: HTTP 200
check_service "Web (Next.js)" \
    'curl -sf --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:3000'

# Database: pg_isready
check_service "Database (PostgreSQL)" \
    'docker exec aegis-sight-db pg_isready -U aegis -d aegis_sight 2>/dev/null'

# Redis: redis-cli ping
check_service "Redis" \
    'docker exec aegis-sight-redis redis-cli ping 2>/dev/null'

# Nginx (if running)
if docker ps --format '{{.Names}}' | grep -q "aegis-sight-nginx"; then
    check_service "Nginx" \
        'curl -sf --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:80'
fi

# Prometheus: /-/healthy
if docker ps --format '{{.Names}}' | grep -q "aegis-sight-prometheus"; then
    check_service "Prometheus" \
        'curl -sf --max-time 5 http://localhost:9090/-/healthy 2>/dev/null'
fi

# Grafana: /api/health
if docker ps --format '{{.Names}}' | grep -q "aegis-sight-grafana"; then
    check_service "Grafana" \
        'curl -sf --max-time 5 http://localhost:3001/api/health 2>/dev/null'
fi

# Alertmanager: /-/healthy
if docker ps --format '{{.Names}}' | grep -q "aegis-sight-alertmanager"; then
    check_service "Alertmanager" \
        'curl -sf --max-time 5 http://localhost:9093/-/healthy 2>/dev/null'
fi

# Celery Worker (check container running)
if docker ps --format '{{.Names}}' | grep -q "aegis-sight-celery-worker"; then
    check_service "Celery Worker" \
        'docker inspect --format="{{.State.Health.Status}}" aegis-sight-celery-worker 2>/dev/null || docker inspect --format="{{.State.Status}}" aegis-sight-celery-worker'
fi

# Celery Beat (check container running)
if docker ps --format '{{.Names}}' | grep -q "aegis-sight-celery-beat"; then
    check_service "Celery Beat" \
        'docker inspect --format="{{.State.Health.Status}}" aegis-sight-celery-beat 2>/dev/null || docker inspect --format="{{.State.Status}}" aegis-sight-celery-beat'
fi

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

if [[ "$JSON_OUTPUT" == true ]]; then
    # JSON output
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"total\": $TOTAL,"
    echo "  \"healthy\": $HEALTHY,"
    echo "  \"unhealthy\": $UNHEALTHY,"
    echo "  \"services\": {"
    first=true
    for name in "${!RESULTS[@]}"; do
        if [[ "$first" == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"${name}\": {\"status\": \"${RESULTS[$name]}\", \"detail\": \"${DETAILS[$name]}\"}"
    done
    echo ""
    echo "  }"
    echo "}"
    exit 0
fi

# Table output
echo ""
echo -e "${BOLD}==========================================================================${NC}"
echo -e "${BOLD} AEGIS-SIGHT -- Service Health Check${NC}"
echo -e "${BOLD}==========================================================================${NC}"
echo -e " Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BOLD}==========================================================================${NC}"
printf "${BOLD} %-25s %-12s %s${NC}\n" "SERVICE" "STATUS" "DETAIL"
echo "--------------------------------------------------------------------------"

for name in "${!RESULTS[@]}"; do
    status="${RESULTS[$name]}"
    detail="${DETAILS[$name]}"

    # Truncate detail for display
    if [[ ${#detail} -gt 40 ]]; then
        detail="${detail:0:37}..."
    fi

    if [[ "$status" == "HEALTHY" ]]; then
        printf " %-25s ${GREEN}%-12s${NC} %s\n" "$name" "$status" "$detail"
    else
        printf " %-25s ${RED}%-12s${NC} %s\n" "$name" "$status" "$detail"
    fi
done

echo "--------------------------------------------------------------------------"

if [[ $UNHEALTHY -eq 0 ]]; then
    echo -e " ${GREEN}${BOLD}All ${TOTAL} services are healthy${NC}"
else
    echo -e " ${RED}${BOLD}${UNHEALTHY}/${TOTAL} services are unhealthy${NC}"
fi

echo "=========================================================================="
echo ""

# Exit with error if any service is unhealthy
[[ $UNHEALTHY -eq 0 ]]
