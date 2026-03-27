# ===========================================================================
# AEGIS-SIGHT -- Project-level Makefile
# ===========================================================================
#
# Usage:
#   make dev        Start development environment (docker compose)
#   make test       Run all tests (API + Web)
#   make test-api   Run API tests only (pytest)
#   make test-web   Run Web tests only (vitest)
#   make lint       Run linters (ruff + eslint)
#   make migrate    Apply database migrations (alembic)
#   make seed       Seed development database
#   make build      Build Docker images
#   make clean      Tear down all containers and volumes
# ===========================================================================

.PHONY: dev test test-api test-web lint migrate seed build clean help \
       deploy-prod deploy-staging deploy-dev healthcheck monitoring monitoring-down \
       benchmark load-test load-test-k6 db-benchmark generate-api-types

COMPOSE       = docker compose
COMPOSE_DEV   = $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_TEST  = $(COMPOSE) -f docker-compose.yml -f docker-compose.test.yml
COMPOSE_PROD  = $(COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_MON   = $(COMPOSE) -f docker-compose.yml -f docker-compose.monitoring.yml

API_DIR       = aegis-sight-api
WEB_DIR       = aegis-sight-web

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------
dev: ## Start development environment
	$(COMPOSE_DEV) up --build

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------
test: test-api test-web ## Run all tests

test-api: ## Run API tests (pytest)
	cd $(API_DIR) && python -m pytest tests/ -v --tb=short

test-web: ## Run Web tests (vitest)
	cd $(WEB_DIR) && npm run test

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------
lint: ## Run linters (ruff + eslint)
	cd $(API_DIR) && python -m ruff check .
	cd $(WEB_DIR) && npx eslint .

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
migrate: ## Apply database migrations
	cd $(API_DIR) && python -m alembic upgrade head

seed: ## Seed development database with test data
	cd $(API_DIR) && python -m scripts.seed_data

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
build: ## Build Docker images
	$(COMPOSE) build

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
clean: ## Tear down containers and volumes
	$(COMPOSE) down -v --remove-orphans

# ---------------------------------------------------------------------------
# Deployment
# ---------------------------------------------------------------------------
deploy-prod: ## Deploy to production
	./scripts/deploy.sh production

deploy-staging: ## Deploy to staging
	./scripts/deploy.sh staging

deploy-dev: ## Deploy to development
	./scripts/deploy.sh development

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
healthcheck: ## Run health checks on all services
	./scripts/healthcheck.sh

healthcheck-json: ## Run health checks (JSON output)
	./scripts/healthcheck.sh --json

# ---------------------------------------------------------------------------
# Monitoring
# ---------------------------------------------------------------------------
monitoring: ## Start monitoring stack (Prometheus + Grafana + Alertmanager)
	$(COMPOSE_MON) up -d prometheus grafana alertmanager

monitoring-down: ## Stop monitoring stack
	$(COMPOSE_MON) down

# ---------------------------------------------------------------------------
# Performance / Benchmarks
# ---------------------------------------------------------------------------
benchmark: ## Run API endpoint benchmark (curl-based)
	./scripts/benchmark.sh

benchmark-json: ## Run API benchmark (JSON output)
	./scripts/benchmark.sh --json

load-test: ## Run Locust load test (headless, 100 users)
	cd $(API_DIR) && locust -f tests/performance/locustfile.py --config tests/performance/locust.conf

load-test-k6: ## Run k6 performance test (smoke + load + stress)
	k6 run $(API_DIR)/tests/performance/k6-load-test.js

db-benchmark: ## Run database query benchmark
	cd $(API_DIR) && python -m tests.performance.db_benchmark

generate-api-types: ## Generate TypeScript types from OpenAPI schema
	./scripts/generate-api-types.sh

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
