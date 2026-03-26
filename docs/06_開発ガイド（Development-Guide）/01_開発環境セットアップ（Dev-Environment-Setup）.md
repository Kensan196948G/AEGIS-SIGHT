# 01 開発環境セットアップ（Dev Environment Setup）

## 1. 概要

AEGIS-SIGHT プロジェクトの開発環境構築手順を記載する。
Docker Compose によるコンテナベース開発を基本とし、ローカル環境での直接開発にも対応する。

---

## 2. 必要ツール

### 2.1 共通ツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Git | 2.40+ | バージョン管理 |
| Docker | 24.0+ | コンテナランタイム |
| Docker Compose | 2.20+ | マルチコンテナ管理 |
| VS Code / Cursor | 最新 | エディタ（推奨） |
| Claude Code CLI | 最新 | ClaudeOS v4 自律開発 |

### 2.2 Backend（Python）

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Python | 3.12.x | ランタイム |
| pip / uv | 最新 | パッケージ管理（uv 推奨） |
| ruff | 最新 | Linter / Formatter |

### 2.3 Frontend（Next.js）

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20 LTS | ランタイム |
| pnpm | 9.x | パッケージ管理 |

### 2.4 Agent（PowerShell）

| ツール | バージョン | 用途 |
|--------|-----------|------|
| PowerShell | 7.4.x | エージェントスクリプト実行 |
| Pester | 5.x | テストフレームワーク |

---

## 3. リポジトリのクローン

```bash
git clone git@github.com:<org>/AEGIS-SIGHT.git
cd AEGIS-SIGHT
```

---

## 4. 環境変数の設定

### 4.1 `.env` ファイルの作成

プロジェクトルートに `.env` ファイルを作成する。テンプレートとして `.env.example` を利用する。

```bash
cp .env.example .env
```

### 4.2 主要な環境変数

```dotenv
# ===== Database =====
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aegis_sight
POSTGRES_USER=aegis
POSTGRES_PASSWORD=<ローカル開発用パスワード>

# ===== Redis =====
REDIS_HOST=localhost
REDIS_PORT=6379

# ===== Backend =====
BACKEND_PORT=8000
SECRET_KEY=<ランダム文字列>
DEBUG=true
LOG_LEVEL=DEBUG

# ===== Frontend =====
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# ===== Celery =====
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

> **注意**: `.env` ファイルは `.gitignore` に含まれており、リポジトリにコミットしないこと。

---

## 5. Docker Compose による起動

### 5.1 全サービス起動

```bash
docker compose up -d
```

起動されるサービス:

| サービス | ポート | 説明 |
|----------|--------|------|
| `backend` | 8000 | FastAPI アプリケーション |
| `frontend` | 3000 | Next.js アプリケーション |
| `db` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis（キャッシュ / Celery ブローカー） |
| `celery-worker` | - | Celery ワーカー |
| `celery-beat` | - | Celery スケジューラ |

### 5.2 個別サービスの起動

```bash
# DB と Redis のみ起動（ローカル開発時）
docker compose up -d db redis

# Backend のみ再ビルド・起動
docker compose up -d --build backend
```

### 5.3 ログの確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービスのログ
docker compose logs -f backend
```

### 5.4 停止・削除

```bash
# 停止
docker compose down

# ボリュームも含めて削除（DB データリセット）
docker compose down -v
```

---

## 6. 初回マイグレーション

### 6.1 Alembic マイグレーションの実行

```bash
# Docker 経由
docker compose exec backend alembic upgrade head

# ローカル環境
cd backend
alembic upgrade head
```

### 6.2 マイグレーションの作成

モデル変更後に新しいマイグレーションを作成する場合:

```bash
# 自動生成
alembic revision --autogenerate -m "add_users_table"

# 手動作成
alembic revision -m "add_custom_migration"
```

### 6.3 マイグレーションの状態確認

```bash
# 現在のリビジョン確認
alembic current

# マイグレーション履歴
alembic history
```

### 6.4 シードデータの投入

```bash
# 開発用初期データ
docker compose exec backend python scripts/seed.py
```

---

## 7. ローカル直接開発（Docker 外）

### 7.1 Backend

```bash
cd backend

# 仮想環境の作成・有効化
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\Activate.ps1  # Windows (PowerShell)

# 依存パッケージのインストール
pip install -e ".[dev]"
# または uv を利用
uv pip install -e ".[dev]"

# 開発サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7.2 Frontend

```bash
cd frontend

# 依存パッケージのインストール
pnpm install

# 開発サーバー起動
pnpm dev
```

### 7.3 Celery ワーカー

```bash
cd backend

# ワーカー起動
celery -A app.celery_app worker --loglevel=info

# Beat スケジューラ起動
celery -A app.celery_app beat --loglevel=info
```

---

## 8. テストの実行

### 8.1 Backend テスト

```bash
# 全テスト実行
cd backend
pytest

# カバレッジ付き
pytest --cov=app --cov-report=html

# 特定テスト
pytest tests/test_users.py -v
```

### 8.2 Frontend テスト

```bash
cd frontend

# ユニットテスト（Vitest）
pnpm test

# E2E テスト（Playwright）
pnpm test:e2e
```

### 8.3 Agent テスト

```powershell
# Pester テスト実行
Invoke-Pester -Path ./agent/tests/ -Output Detailed
```

---

## 9. よくあるトラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :8000
# プロセスを停止するか、.env でポートを変更する
```

### DB 接続エラー

```bash
# PostgreSQL コンテナが起動しているか確認
docker compose ps db

# 手動でDB接続テスト
docker compose exec db psql -U aegis -d aegis_sight
```

### マイグレーションエラー

```bash
# マイグレーション状態のリセット（開発環境のみ）
alembic downgrade base
alembic upgrade head
```

---

## 10. 推奨 VS Code 拡張機能

| 拡張機能 | 用途 |
|----------|------|
| Python (ms-python) | Python 開発 |
| Ruff | Linter / Formatter |
| ESLint | TypeScript Linter |
| Prettier | コードフォーマッター |
| Tailwind CSS IntelliSense | Tailwind 補完 |
| Docker | Docker 管理 |
| PostgreSQL (ckolkman) | DB 管理 |
| PowerShell | Agent 開発 |
