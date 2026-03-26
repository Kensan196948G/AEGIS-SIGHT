# 05. インフラ構成（Infrastructure）

## 1. 概要

AEGIS-SIGHTのインフラはDocker Composeベースで構成し、GitHub Actionsによるci/CDパイプラインで自動デプロイを行う。全サービスはコンテナ化され、環境間の差異を最小化する。

## 2. コンテナ構成

```
┌────────────────────────────────────────────────────────────────┐
│                     Docker Compose                             │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │  nginx   │  │ frontend │  │  backend  │  │  worker      │ │
│  │  :80/443 │──│  :3000   │  │  :8000    │  │  (Celery)    │ │
│  │          │  │ Next.js  │  │  FastAPI  │  │  非同期処理   │ │
│  └──────────┘  └──────────┘  └─────┬─────┘  └──────┬───────┘ │
│                                     │               │         │
│                              ┌──────┴───────────────┘         │
│                              │                                │
│  ┌──────────────┐  ┌────────▼───┐  ┌───────────────────────┐ │
│  │  prometheus  │  │ postgresql │  │  redis                │ │
│  │  :9090       │  │ :5432      │  │  :6379                │ │
│  └──────┬───────┘  └────────────┘  └───────────────────────┘ │
│         │                                                     │
│  ┌──────▼───────┐                                             │
│  │   grafana    │                                             │
│  │   :3001      │                                             │
│  └──────────────┘                                             │
└────────────────────────────────────────────────────────────────┘
```

## 3. Docker Compose定義

```yaml
# docker-compose.yml
version: "3.9"

services:
  # ----- Reverse Proxy -----
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - frontend-net
      - backend-net

  # ----- Frontend -----
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    environment:
      - NEXT_PUBLIC_API_URL=/api/v1
      - NODE_ENV=production
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    networks:
      - frontend-net

  # ----- Backend API -----
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    environment:
      - DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgresql:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private_key
      - JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public_key
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
      - OIDC_TENANT_ID=${OIDC_TENANT_ID}
      - GRAPH_API_CLIENT_ID=${GRAPH_API_CLIENT_ID}
      - GRAPH_API_CLIENT_SECRET=${GRAPH_API_CLIENT_SECRET}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    expose:
      - "8000"
    secrets:
      - jwt_private_key
      - jwt_public_key
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/metrics/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    networks:
      - backend-net
      - db-net

  # ----- Background Worker -----
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    command: celery -A app.worker worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgresql:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/1
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - db-net

  # ----- PostgreSQL -----
  postgresql:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - db-net

  # ----- Redis -----
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    expose:
      - "6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - db-net

  # ----- Prometheus -----
  prometheus:
    image: prom/prometheus:v2.50.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    expose:
      - "9090"
    restart: unless-stopped
    networks:
      - backend-net
      - monitoring-net

  # ----- Grafana -----
  grafana:
    image: grafana/grafana:10.3.0
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - monitoring-net

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
  db-net:
    driver: bridge
    internal: true
  monitoring-net:
    driver: bridge

secrets:
  jwt_private_key:
    file: ./secrets/jwt_private.pem
  jwt_public_key:
    file: ./secrets/jwt_public.pem
```

## 4. Nginx設定

```nginx
# nginx/conf.d/default.conf

upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aegis-sight.example.com;

    ssl_certificate     /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols       TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # API Backend
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;

        # CORS
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Request-ID" always;
        add_header Access-Control-Max-Age 86400 always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Auth Endpoints (stricter rate limit)
    location /api/v1/auth/login {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Assets Cache
    location /_next/static/ {
        proxy_pass http://frontend;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "OK";
    }
}
```

## 5. Dockerfile

### 5.1 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim AS base

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS production
COPY ./app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 5.2 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## 6. CI/CDパイプライン（GitHub Actions）

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository }}

jobs:
  # ----- Lint & Type Check -----
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-dev.txt

      - name: Run Ruff (Python Linter)
        run: cd backend && ruff check .

      - name: Run mypy (Type Check)
        run: cd backend && mypy app/

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Run ESLint
        run: cd frontend && npm run lint

      - name: Run TypeScript Check
        run: cd frontend && npx tsc --noEmit

  # ----- Backend Tests -----
  test-backend:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: aegis_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-dev.txt
      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/aegis_test
          REDIS_URL: redis://localhost:6379/0
        run: cd backend && pytest --cov=app --cov-report=xml -v
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: backend/coverage.xml

  # ----- Frontend Tests -----
  test-frontend:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test -- --coverage
      - name: Build
        run: cd frontend && npm run build

  # ----- Security Scan -----
  security:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          severity: "CRITICAL,HIGH"

  # ----- Build & Push -----
  build:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend, security]
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/backend:${{ github.sha }}
      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/frontend:${{ github.sha }}

  # ----- Deploy -----
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying ${{ github.sha }} to production..."
          # SSH経由でDocker Compose更新、またはWatchtower等を使用
```

## 7. 環境変数管理

### 7.1 .env ファイル構成

```
# .env.example（リポジトリに含める）
DB_USER=aegis
DB_PASSWORD=<change-me>
DB_NAME=aegis_sight

REDIS_PASSWORD=<change-me>

OIDC_CLIENT_ID=<entra-id-client-id>
OIDC_CLIENT_SECRET=<change-me>
OIDC_TENANT_ID=<entra-id-tenant-id>

GRAPH_API_CLIENT_ID=<graph-api-client-id>
GRAPH_API_CLIENT_SECRET=<change-me>

GRAFANA_PASSWORD=<change-me>
LOG_LEVEL=info
```

### 7.2 シークレット管理

| シークレット | 保管場所 | 用途 |
|------------|---------|------|
| DB_PASSWORD | Docker Secrets / GitHub Secrets | PostgreSQL認証 |
| REDIS_PASSWORD | Docker Secrets / GitHub Secrets | Redis認証 |
| JWT秘密鍵/公開鍵 | Docker Secrets (ファイル) | JWTトークン署名 |
| OIDC_CLIENT_SECRET | GitHub Secrets | Entra ID認証 |
| GRAPH_API_CLIENT_SECRET | GitHub Secrets | Microsoft Graph API |

## 8. ネットワーク設計

| ネットワーク | 用途 | 接続サービス |
|------------|------|-------------|
| `frontend-net` | フロントエンド通信 | nginx, frontend |
| `backend-net` | バックエンド通信 | nginx, backend, prometheus |
| `db-net` (internal) | DB接続（外部非公開） | backend, worker, postgresql, redis |
| `monitoring-net` | 監視系 | prometheus, grafana |

## 9. 監視設定

### 9.1 Prometheus設定

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "aegis-backend"
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ["backend:8000"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "windows-agent"
    static_configs:
      - targets: [] # Windows Agentのターゲットを動的追加
```

### 9.2 監視メトリクス

| メトリクス | 種別 | 説明 |
|-----------|------|------|
| `http_requests_total` | Counter | HTTPリクエスト総数 |
| `http_request_duration_seconds` | Histogram | リクエスト処理時間 |
| `active_sessions` | Gauge | アクティブセッション数 |
| `assets_total` | Gauge | 登録資産総数 |
| `licenses_compliance_ratio` | Gauge | ライセンスコンプライアンス率 |
| `db_connection_pool_size` | Gauge | DBコネクションプール状態 |

## 10. ログ管理

### 10.1 ログ出力方式

全サービスは構造化JSON形式でログを出力する。

```json
{
  "timestamp": "2024-06-01T09:00:00.000Z",
  "level": "INFO",
  "service": "backend",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Asset created",
  "user_id": "user-uuid",
  "asset_id": "asset-uuid",
  "duration_ms": 45
}
```

### 10.2 ログローテーション

| サービス | 出力先 | ローテーション |
|---------|-------|-------------|
| Nginx | /var/log/nginx/ | 日次、30日保持 |
| Backend | stdout (Docker) | Docker log driver |
| Frontend | stdout (Docker) | Docker log driver |
| PostgreSQL | /var/log/postgresql/ | 週次、12週保持 |
