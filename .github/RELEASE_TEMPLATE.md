# Release v{VERSION}

**Release Date:** {DATE}

---

## Highlights

-
-
-

---

## New Features

-

## Improvements

-

## Bug Fixes

-

---

## Breaking Changes

> **Note:** 以下の変更は後方互換性に影響します。アップグレード前に確認してください。

- なし

---

## Known Issues

-

---

## Upgrade Guide

### Prerequisites

- Docker >= 24.0
- Docker Compose >= 2.20
- Node.js >= 20 (フロントエンド開発時)
- Python >= 3.12 (API 開発時)

### Steps

1. リポジトリを最新版に更新:
   ```bash
   git pull origin main
   git checkout v{VERSION}
   ```

2. Docker イメージを再ビルド:
   ```bash
   docker compose build --no-cache
   ```

3. データベースマイグレーションを実行:
   ```bash
   docker compose exec api alembic upgrade head
   ```

4. サービスを再起動:
   ```bash
   docker compose down && docker compose up -d
   ```

5. ヘルスチェックの確認:
   ```bash
   curl http://localhost:8000/health
   ```

---

## Docker Images

| Image | Tag |
|-------|-----|
| `aegis-sight-api` | `v{VERSION}` |
| `aegis-sight-web` | `v{VERSION}` |

---

## Contributors

<!-- GitHub が自動的に貢献者を表示します -->

---

## Full Changelog

https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v{PREVIOUS_VERSION}...v{VERSION}
