#!/usr/bin/env bash
# ===========================================================================
# AEGIS-SIGHT -- Deployment Script
# ===========================================================================
# Usage:
#   ./scripts/deploy.sh production          Deploy to production
#   ./scripts/deploy.sh staging             Deploy to staging
#   ./scripts/deploy.sh development         Deploy to development
#   ./scripts/deploy.sh production --rollback   Rollback production
# ===========================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------
log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

usage() {
    cat <<EOF
Usage: $(basename "$0") <environment> [options]

Environments:
  production    Deploy with production configuration
  staging       Deploy with staging configuration
  development   Deploy with development configuration

Options:
  --rollback    Rollback to previous deployment
  --no-build    Skip image rebuild
  --version     Set build version (default: git SHA)
  --help        Show this help message

Examples:
  $(basename "$0") production
  $(basename "$0") staging --version v1.2.3
  $(basename "$0") production --rollback
EOF
    exit 0
}

# Determine compose files for the environment
get_compose_files() {
    local env="$1"
    case "$env" in
        production)
            echo "-f docker-compose.yml -f docker-compose.prod.yml"
            ;;
        staging)
            echo "-f docker-compose.yml -f docker-compose.prod.yml"
            ;;
        development)
            echo "-f docker-compose.yml -f docker-compose.dev.yml"
            ;;
        *)
            log_error "Unknown environment: $env"
            exit 1
            ;;
    esac
}

# Determine env file for the environment
get_env_file() {
    local env="$1"
    echo ".env.${env}"
}

# Save current image tags for rollback
save_deployment_state() {
    local state_file="${PROJECT_DIR}/.deploy-state-${ENVIRONMENT}"
    log_info "Saving deployment state to ${state_file}"
    ${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" ps --format json > "${state_file}" 2>/dev/null || true
    ${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" images --format json > "${state_file}.images" 2>/dev/null || true
}

# Rollback to previous deployment
rollback() {
    log_warn "Rolling back ${ENVIRONMENT} deployment..."

    local state_file="${PROJECT_DIR}/.deploy-state-${ENVIRONMENT}.images"
    if [[ ! -f "$state_file" ]]; then
        log_error "No previous deployment state found for ${ENVIRONMENT}"
        exit 1
    fi

    log_info "Stopping current deployment..."
    cd "$PROJECT_DIR"
    ${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" down --timeout 30

    log_info "Starting previous deployment..."
    ${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" up -d

    log_ok "Rollback complete"
    run_healthchecks
}

# Wait for a single service to become healthy
wait_for_health() {
    local service="$1"
    local url="$2"
    local max_attempts="${3:-30}"
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    return 1
}

# Run health checks on all services
run_healthchecks() {
    log_info "Running health checks..."
    echo ""

    local all_healthy=true

    # API health
    if wait_for_health "api" "http://localhost:8000/health" 30; then
        log_ok "API:        healthy"
    else
        log_error "API:        unhealthy"
        all_healthy=false
    fi

    # Web health
    if wait_for_health "web" "http://localhost:3000" 30; then
        log_ok "Web:        healthy"
    else
        log_error "Web:        unhealthy"
        all_healthy=false
    fi

    # Database health
    if docker exec aegis-sight-db pg_isready -U aegis -d aegis_sight > /dev/null 2>&1; then
        log_ok "Database:   healthy"
    else
        log_error "Database:   unhealthy"
        all_healthy=false
    fi

    # Redis health
    if docker exec aegis-sight-redis redis-cli ping > /dev/null 2>&1; then
        log_ok "Redis:      healthy"
    else
        log_error "Redis:      unhealthy"
        all_healthy=false
    fi

    echo ""
    if [[ "$all_healthy" == true ]]; then
        log_ok "All services are healthy"
        return 0
    else
        log_error "Some services are unhealthy"
        return 1
    fi
}

# Print deployment report
print_report() {
    local status="$1"
    echo ""
    echo "==========================================================================="
    echo " AEGIS-SIGHT Deployment Report"
    echo "==========================================================================="
    echo " Environment:  ${ENVIRONMENT}"
    echo " Version:      ${VERSION}"
    echo " Timestamp:    ${TIMESTAMP}"
    echo " Status:       ${status}"
    echo "==========================================================================="
    echo ""

    log_info "Running containers:"
    cd "$PROJECT_DIR"
    ${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" ps
    echo ""
}

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------
ENVIRONMENT=""
DO_ROLLBACK=false
NO_BUILD=false
VERSION="${VERSION:-$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        production|staging|development)
            ENVIRONMENT="$1"
            shift
            ;;
        --rollback)
            DO_ROLLBACK=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            log_error "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    usage
fi

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
COMPOSE_FILES="$(get_compose_files "$ENVIRONMENT")"
ENV_FILE="$(get_env_file "$ENVIRONMENT")"

# Validate env file exists
if [[ ! -f "${PROJECT_DIR}/${ENV_FILE}" ]]; then
    log_error "Environment file not found: ${PROJECT_DIR}/${ENV_FILE}"
    log_info "Copy from template: cp ${PROJECT_DIR}/.env.example ${PROJECT_DIR}/${ENV_FILE}"
    exit 1
fi

# Production safety check
if [[ "$ENVIRONMENT" == "production" ]]; then
    if grep -q "CHANGE_ME_IN_PRODUCTION" "${PROJECT_DIR}/${ENV_FILE}"; then
        log_error "Production env file contains placeholder values (CHANGE_ME_IN_PRODUCTION)"
        log_error "Update all secrets in ${PROJECT_DIR}/${ENV_FILE} before deploying"
        exit 1
    fi
fi

cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Execute
# ---------------------------------------------------------------------------
echo ""
echo "==========================================================================="
echo " AEGIS-SIGHT -- Deploying to ${ENVIRONMENT}"
echo "==========================================================================="
echo ""

# Handle rollback
if [[ "$DO_ROLLBACK" == true ]]; then
    rollback
    print_report "ROLLBACK COMPLETE"
    exit 0
fi

# Save current state for potential rollback
save_deployment_state

# Build images
if [[ "$NO_BUILD" == false ]]; then
    log_info "Building Docker images (version: ${VERSION})..."
    ${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" build \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_DATE="${TIMESTAMP}"
    log_ok "Images built successfully"
else
    log_info "Skipping image build (--no-build)"
fi

# Deploy
log_info "Starting services..."
${COMPOSE} ${COMPOSE_FILES} --env-file "${ENV_FILE}" up -d --remove-orphans

# Wait for services to start
log_info "Waiting for services to initialize..."
sleep 5

# Health checks
if run_healthchecks; then
    print_report "SUCCESS"
    exit 0
else
    log_error "Deployment health checks failed!"
    log_warn "Consider running: $(basename "$0") ${ENVIRONMENT} --rollback"
    print_report "DEGRADED"
    exit 1
fi
