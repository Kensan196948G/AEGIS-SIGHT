# デプロイ手順書（Deployment Procedure）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| デプロイ方式 | Docker Compose |

---

## 1. デプロイ概要

### 1.1 デプロイ構成

```
┌──────────────────────────────────────────┐
│              Docker Host                  │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ nginx    │  │ frontend │  │ backend│ │
│  │ (proxy)  │──│ (Next.js)│  │(FastAPI)│ │
│  │ :80/:443 │  │ :3000    │  │ :8000  │ │
│  └──────────┘  └──────────┘  └────────┘ │
│                                    │     │
│                              ┌─────┴───┐ │
│                              │PostgreSQL│ │
│                              │ :5432    │ │
│                              └─────────┘ │
└──────────────────────────────────────────┘
```

### 1.2 環境一覧

| 環境 | 用途 | ホスト | ブランチ |
|------|------|--------|---------|
| 開発 | 開発者ローカル | localhost | feature/* |
| ステージング | QA検証 | staging.aegis-sight.internal | develop |
| 本番 | 運用 | aegis-sight.internal | main（タグ） |

---

## 2. 前提条件

### 2.1 必要ソフトウェア

| ソフトウェア | バージョン | 用途 |
|------------|-----------|------|
| Docker Engine | >= 24.0 | コンテナランタイム |
| Docker Compose | >= 2.20 | オーケストレーション |
| Git | >= 2.40 | ソースコード管理 |

### 2.2 必要な権限

| 権限 | 対象 | 用途 |
|------|------|------|
| SSH接続 | デプロイサーバー | リモートデプロイ |
| Docker操作 | dockerグループ | コンテナ管理 |
| 環境変数ファイル | .env.production | シークレット管理 |

---

## 3. デプロイ手順（通常リリース）

### 3.1 事前準備

```bash
# 手順1: デプロイサーバーにSSH接続
ssh deploy@aegis-sight.internal

# 手順2: プロジェクトディレクトリに移動
cd /opt/aegis-sight

# 手順3: 現在のバージョンを確認・記録
docker compose ps
docker compose exec backend cat /app/VERSION
echo "現在のバージョン: $(git describe --tags)" >> /var/log/aegis-sight/deploy.log

# 手順4: ディスク容量確認
df -h /opt/aegis-sight
# 空き容量 > 5GB であることを確認
```

### 3.2 バックアップ

```bash
# 手順5: データベースバックアップ
docker compose exec db pg_dump -U aegis_user aegis_sight_db \
  | gzip > /opt/backups/aegis_sight_$(date +%Y%m%d_%H%M%S).sql.gz

# 手順6: バックアップ検証
ls -la /opt/backups/aegis_sight_*.sql.gz | tail -1
# ファイルサイズが0でないことを確認

# 手順7: 環境変数ファイルのバックアップ
cp .env.production .env.production.bak
```

### 3.3 ソースコード更新

```bash
# 手順8: 最新コードを取得
git fetch --all --tags

# 手順9: リリースタグに切り替え
git checkout v{X.Y.Z}
# 例: git checkout v1.0.0

# 手順10: タグの署名を検証（設定されている場合）
git tag -v v{X.Y.Z}
```

### 3.4 環境変数更新

```bash
# 手順11: 環境変数の差分確認
diff .env.production .env.production.example
# 新しい環境変数が追加されていないか確認

# 手順12: 必要に応じて環境変数を更新
# vim .env.production
```

### 3.5 Dockerイメージビルド

```bash
# 手順13: イメージビルド
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# 手順14: ビルド結果確認
docker images | grep aegis-sight
# 新しいイメージが作成されていることを確認
```

### 3.6 データベースマイグレーション

```bash
# 手順15: マイグレーション確認（dry-run）
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm backend alembic check

# 手順16: マイグレーション実行
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm backend alembic upgrade head

# 手順17: マイグレーション結果確認
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm backend alembic current
```

### 3.7 サービス更新

```bash
# 手順18: サービス停止（ダウンタイム最小化のためrolling update）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

# 手順19: コンテナ状態確認
docker compose ps
# 全サービスが "Up" であることを確認
```

### 3.8 ヘルスチェック

```bash
# 手順20: バックエンドヘルスチェック
curl -s http://localhost:8000/api/v1/health | jq .
# 期待レスポンス: {"status": "healthy", "version": "X.Y.Z", "db": "connected"}

# 手順21: フロントエンドヘルスチェック
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# 期待: 200

# 手順22: データベース接続確認
docker compose exec db pg_isready -U aegis_user -d aegis_sight_db
# 期待: accepting connections

# 手順23: API動作確認（スモークテスト）
curl -s http://localhost:8000/api/v1/health/ready | jq .
# 期待: {"status": "ready", "checks": {"db": "ok", "cache": "ok"}}
```

### 3.9 動作確認

```bash
# 手順24: ログ確認（エラーがないこと）
docker compose logs --tail=50 backend | grep -i error
docker compose logs --tail=50 frontend | grep -i error

# 手順25: 主要APIエンドポイント確認
curl -s http://localhost:8000/api/v1/docs | head -5
# OpenAPIドキュメントが返ること

# 手順26: デプロイ完了記録
echo "$(date): v{X.Y.Z} deployed successfully" >> /var/log/aegis-sight/deploy.log
```

---

## 4. Docker Compose構成

### 4.1 本番用 docker-compose.prod.yml

```yaml
# docker-compose.prod.yml（本番オーバーライド）
services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

volumes:
  postgres_data:
    driver: local
```

### 4.2 ヘルスチェックエンドポイント

| エンドポイント | 用途 | レスポンス |
|--------------|------|-----------|
| `GET /api/v1/health` | 基本ヘルスチェック | `{"status": "healthy"}` |
| `GET /api/v1/health/ready` | Readinessチェック | `{"status": "ready", "checks": {...}}` |
| `GET /api/v1/health/live` | Livenessチェック | `{"status": "alive"}` |

```python
# app/api/v1/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}

@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    checks = {}
    try:
        await db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "error"

    status = "ready" if all(v == "ok" for v in checks.values()) else "not_ready"
    return {"status": status, "checks": checks}

@router.get("/live")
async def liveness_check():
    return {"status": "alive"}
```

---

## 5. 環境変数管理

### 5.1 環境変数一覧

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `ENVIRONMENT` | 実行環境 | Yes | production |
| `DATABASE_URL` | DB接続文字列 | Yes | postgresql+asyncpg://... |
| `SECRET_KEY` | JWT署名キー | Yes | (ランダム文字列) |
| `ALLOWED_ORIGINS` | CORS許可オリジン | Yes | https://aegis-sight.internal |
| `API_URL` | バックエンドURL | Yes | https://aegis-sight.internal/api |
| `POSTGRES_DB` | DB名 | Yes | aegis_sight_db |
| `POSTGRES_USER` | DBユーザー | Yes | aegis_user |
| `POSTGRES_PASSWORD` | DBパスワード | Yes | (強力なパスワード) |
| `LOG_LEVEL` | ログレベル | No | INFO |
| `SENTRY_DSN` | エラートラッキング | No | https://... |

### 5.2 シークレット管理

- `.env.production` はGit管理外（.gitignore）
- 初回セットアップ時に手動配置
- パスワード・キーは暗号化バックアップ

---

## 6. デプロイ後確認手順

| # | 確認項目 | コマンド/方法 | 期待結果 |
|---|---------|-------------|---------|
| 1 | 全コンテナ起動 | `docker compose ps` | 全サービス Up |
| 2 | ヘルスチェック | `curl /api/v1/health` | status: healthy |
| 3 | Readiness | `curl /api/v1/health/ready` | status: ready |
| 4 | ログインテスト | ブラウザから手動 | 正常ログイン |
| 5 | エラーログ | `docker compose logs --tail=100` | エラーなし |
| 6 | バージョン表示 | 設定画面 or APIレスポンス | 新バージョン |
| 7 | DB接続 | `docker compose exec db pg_isready` | accepting |
| 8 | レスポンス時間 | `curl -w "%{time_total}" /api/v1/health` | < 1秒 |

---

## 7. トラブルシューティング

| 問題 | 原因候補 | 対応 |
|------|---------|------|
| コンテナが起動しない | イメージビルド失敗 | `docker compose logs <service>` でログ確認 |
| DB接続エラー | 環境変数誤り | `.env.production` の DATABASE_URL を確認 |
| マイグレーション失敗 | スキーマ不整合 | `alembic history` で状態確認、手動修正 |
| ヘルスチェック失敗 | 起動時間不足 | `start_period` を延長 |
| ポート競合 | 既存プロセス | `netstat -tlnp` でポート使用状況確認 |
| ディスク不足 | Dockerイメージ蓄積 | `docker system prune` で不要リソース削除 |

---

## 8. チェックリスト

### デプロイ前チェック

- [ ] リリースタグが作成されているか
- [ ] CI/CDパイプラインが全てグリーンか
- [ ] データベースバックアップが取得済みか
- [ ] 環境変数の差分が確認済みか
- [ ] ディスク空き容量が十分か（> 5GB）
- [ ] 関係者への事前通知が完了しているか
- [ ] ロールバック手順を確認したか

### デプロイ後チェック

- [ ] 全コンテナが正常起動しているか
- [ ] ヘルスチェックが全てパスしているか
- [ ] ログインが正常に行えるか
- [ ] エラーログが出力されていないか
- [ ] バージョンが正しく表示されているか
- [ ] レスポンス時間が基準内か
- [ ] デプロイ完了の記録・通知が完了したか
