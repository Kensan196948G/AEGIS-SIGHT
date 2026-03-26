# 04 CI/CD 設計（CICD Design）

## 1. 概要

AEGIS-SIGHT プロジェクトの CI/CD パイプラインの設計を定義する。
GitHub Actions をプラットフォームとして使用し、品質ゲートによる自動検証と段階的デプロイを実現する。

---

## 2. パイプライン全体像

```
Push / PR
  │
  ├─ ci.yml ─────────────────────────────────────────┐
  │   ├─ Lint（ruff, ESLint, PSScriptAnalyzer）       │
  │   ├─ Type Check（mypy, tsc）                      │
  │   ├─ Unit Test（pytest, Vitest, Pester）          │
  │   ├─ Build Check（Docker build, Next.js build）   │
  │   └─ Security Scan（Trivy, pip-audit）            │
  │                                                    │
  │   品質ゲート ──── 全パス必須 ──── PR マージ可能    │
  │                                                    │
  ├─ e2e.yml ── PR マージ後（main push）──────────────┤
  │   └─ E2E Test（Playwright）                        │
  │                                                    │
  └─ deploy.yml ── E2E パス後 ────────────────────────┘
      ├─ staging deploy
      ├─ smoke test
      └─ production deploy（手動承認）
```

---

## 3. CI ワークフロー（ci.yml）

### 3.1 トリガー

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

### 3.2 ジョブ構成

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ========================================
  # Backend Jobs
  # ========================================
  backend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install ruff
        run: pip install ruff
      - name: Run ruff lint
        run: ruff check backend/
      - name: Run ruff format check
        run: ruff format --check backend/

  backend-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: |
          cd backend
          pip install -e ".[dev]"
      - name: Run mypy
        run: cd backend && mypy app/

  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: aegis_sight_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: |
          cd backend
          pip install -e ".[dev]"
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml --junitxml=junit.xml
        env:
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_DB: aegis_sight_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: backend/coverage.xml

  # ========================================
  # Frontend Jobs
  # ========================================
  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: cd frontend && pnpm install --frozen-lockfile
      - name: Run ESLint
        run: cd frontend && pnpm lint
      - name: Run Prettier check
        run: cd frontend && pnpm format:check

  frontend-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: cd frontend && pnpm install --frozen-lockfile
      - name: Run TypeScript check
        run: cd frontend && pnpm tsc --noEmit

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: cd frontend && pnpm install --frozen-lockfile
      - name: Run Vitest
        run: cd frontend && pnpm test -- --coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: frontend/coverage/

  frontend-build:
    runs-on: ubuntu-latest
    needs: [frontend-lint, frontend-typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: cd frontend && pnpm install --frozen-lockfile
      - name: Build
        run: cd frontend && pnpm build

  # ========================================
  # Agent Jobs
  # ========================================
  agent-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install PowerShell modules
        shell: pwsh
        run: |
          Install-Module -Name Pester -Force -Scope CurrentUser
          Install-Module -Name PSScriptAnalyzer -Force -Scope CurrentUser
      - name: Run PSScriptAnalyzer
        shell: pwsh
        run: |
          Invoke-ScriptAnalyzer -Path ./agent/src/ -Recurse -EnableExit
      - name: Run Pester tests
        shell: pwsh
        run: |
          Invoke-Pester -Path ./agent/tests/ -Output Detailed -CI

  # ========================================
  # Security
  # ========================================
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: CRITICAL,HIGH
          exit-code: 1
      - name: Python dependency audit
        run: |
          pip install pip-audit
          cd backend && pip-audit
```

---

## 4. 品質ゲート

### 4.1 マージブロック条件

PR を main にマージするには以下の全てがパスしている必要がある:

| チェック | しきい値 |
|----------|---------|
| ruff lint | エラー 0 |
| ruff format | 差分 0 |
| ESLint | エラー 0 |
| Prettier | 差分 0 |
| mypy | エラー 0 |
| tsc | エラー 0 |
| pytest | 全テストパス |
| Vitest | 全テストパス |
| Pester | 全テストパス |
| Backend カバレッジ | 80% 以上 |
| Frontend カバレッジ | 80% 以上 |
| Trivy セキュリティスキャン | CRITICAL / HIGH 0 件 |
| pip-audit | 既知脆弱性 0 件 |

### 4.2 STABLE 判定条件（ClaudeOS）

ClaudeOS v4 が STABLE と判定する条件:

```
- test: 全パス
- CI: 全パス
- lint: エラー 0
- build: 成功
- error: 0
- security issue: 0
```

STABLE 達成に必要なループ回数:
- small 変更: 2 回
- normal 変更: 3 回
- critical 変更: 5 回

---

## 5. E2E テストワークフロー（e2e.yml）

```yaml
name: E2E Tests

on:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:8000/health; do sleep 2; done'
          timeout 60 bash -c 'until curl -s http://localhost:3000; do sleep 2; done'

      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        run: cd frontend && pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: cd frontend && pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: cd frontend && pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/

      - name: Stop services
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

---

## 6. デプロイパイプライン（deploy.yml）

```yaml
name: Deploy

on:
  workflow_run:
    workflows: ["E2E Tests"]
    types: [completed]
    branches: [main]

jobs:
  # ========================================
  # Staging Deploy
  # ========================================
  deploy-staging:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker images
        run: |
          docker compose -f docker-compose.prod.yml build
          # レジストリへの push（環境に応じて設定）

      - name: Deploy to staging
        run: |
          # staging 環境へのデプロイコマンド
          echo "Deploying to staging..."

  # ========================================
  # Smoke Test
  # ========================================
  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: |
          # staging 環境に対するスモークテスト
          curl -sf https://staging.aegis-sight.example.com/health
          # 追加のスモークテスト

  # ========================================
  # Production Deploy（手動承認）
  # ========================================
  deploy-production:
    needs: smoke-test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://aegis-sight.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: |
          echo "Deploying to production..."

      - name: Verify deployment
        run: |
          curl -sf https://aegis-sight.example.com/health
```

---

## 7. GitHub Actions の設定

### 7.1 シークレット管理

| シークレット | 用途 | 環境 |
|-------------|------|------|
| `DOCKER_REGISTRY_URL` | コンテナレジストリURL | 共通 |
| `DOCKER_USERNAME` | レジストリ認証ユーザー | 共通 |
| `DOCKER_PASSWORD` | レジストリ認証パスワード | 共通 |
| `STAGING_DEPLOY_KEY` | staging デプロイ鍵 | staging |
| `PRODUCTION_DEPLOY_KEY` | production デプロイ鍵 | production |
| `DATABASE_URL` | DB 接続文字列 | 環境別 |

### 7.2 Environment 設定

| 環境 | 保護ルール |
|------|-----------|
| staging | 自動デプロイ（E2E パス後） |
| production | 手動承認必須（承認者 1 名以上） |

### 7.3 キャッシュ戦略

```yaml
# Python パッケージのキャッシュ
- uses: actions/setup-python@v5
  with:
    python-version: "3.12"
    cache: pip
    cache-dependency-path: backend/pyproject.toml

# Node.js パッケージのキャッシュ
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
    cache-dependency-path: frontend/pnpm-lock.yaml

# Docker レイヤーキャッシュ
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

## 8. モニタリングとアラート

### 8.1 CI 失敗時の通知

- GitHub Actions の失敗通知をリポジトリの通知設定で有効化する
- CRITICAL な失敗は Slack / Teams 等に即座に通知する

### 8.2 パイプラインのメトリクス

| メトリクス | 目標値 |
|-----------|--------|
| CI 実行時間 | 10 分以内 |
| E2E 実行時間 | 15 分以内 |
| デプロイ時間（staging） | 5 分以内 |
| CI 成功率 | 95% 以上 |

### 8.3 定期実行

```yaml
# 依存関係の脆弱性チェック（毎日）
on:
  schedule:
    - cron: "0 0 * * *"
```
