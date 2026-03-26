# AEGIS-SIGHT Project Configuration

## Project Overview
- **Name**: AEGIS-SIGHT (Autonomous Endpoint Governance & Integrated Sight)
- **Purpose**: SKYSEA Client View 同等機能の内製代替 + IAMS選択移植
- **Organization**: みらい建設工業 IT部門
- **Repository**: Kensan196948G/AEGIS-SIGHT

## Tech Stack
- **Backend**: Python 3.12 / FastAPI / SQLAlchemy / Alembic / Celery
- **Frontend**: Next.js 14 / TypeScript / Tailwind CSS
- **Database**: PostgreSQL 16 / Redis
- **Agent**: PowerShell 7.4 (Windows Endpoint)
- **Infrastructure**: Docker Compose / GitHub Actions
- **Observability**: Prometheus / Grafana (IAMS移植)

## Directory Structure
```
AEGIS-SIGHT/
├── aegis-sight-api/          # FastAPI バックエンド
│   ├── app/api/v1/           # APIエンドポイント
│   ├── app/models/           # SQLAlchemy モデル
│   ├── app/services/         # ビジネスロジック
│   └── tests/                # pytest
├── aegis-sight-web/          # Next.js フロントエンド
│   ├── app/                  # App Router
│   └── public/               # 静的ファイル + PWA manifest
├── aegis-sight-agent/        # PowerShell Agent
├── aegis-sight-infra/        # Docker / Prometheus / Grafana
├── docs/                     # プロジェクトドキュメント
├── scripts/                  # ClaudeOS自動化スクリプト
└── .github/workflows/        # CI/CD
```

## Development Rules
- main への直接 push 禁止
- feature branch または Git WorkTree で開発
- PR 必須、CI 通過必須
- Python: ruff + mypy でlint
- TypeScript: ESLint + Prettier
- テストカバレッジ 80% 以上目標
- コミットメッセージは日本語可（Conventional Commits推奨）

## IAMS Integration Scope
### 移植対象
- Prometheus/Grafana インフラ可観測性
- PWA対応（オフラインUI）
- 調達管理（Procurement）
- SAMライセンス管理
- テスト資産（1,157件 Jest → pytest変換）

### 移植しない（ITSM-Systemと重複）
- CMDB
- インシデント管理
- SLA管理
- 変更管理

## Compliance
- ISO 27001:2022
- ISO 20000-1:2018
- NIST CSF 2.0
- J-SOX IT全般統制

## ClaudeOS Integration
- scripts/project-sync.sh: GitHub Projects ステータス更新
- scripts/create-issue.sh: Issue自動生成
- scripts/create-pr.sh: PR自動生成
- .github/workflows/claudeos-ci.yml: CI パイプライン
