# 02. バックエンドAPI設計（Backend API Design）

## 1. 概要

AEGIS-SIGHTのバックエンドはFastAPI（Python）で実装し、RESTful APIとして各機能を提供する。全APIは `/api/v1` プレフィックスで統一し、JWT（RS256）による認証とRBACによるアクセス制御を適用する。

## 2. API設計原則

- RESTful設計に準拠（リソース指向、HTTPメソッドの適切な使用）
- レスポンスはすべてJSON形式
- ページネーションは `offset` / `limit` パラメータで統一
- エラーレスポンスはRFC 7807（Problem Details）準拠
- APIバージョニングはURLパスで管理（`/api/v1/`）
- OpenAPI（Swagger）仕様を自動生成（FastAPIのビルトイン機能）

## 3. 共通ヘッダー

| ヘッダー | 必須 | 説明 |
|---------|------|------|
| `Authorization` | Yes | `Bearer <JWT token>` |
| `Content-Type` | Yes | `application/json` |
| `X-Request-ID` | No | リクエスト追跡用UUID |
| `Accept-Language` | No | `ja` / `en`（デフォルト: `ja`） |

## 4. 共通レスポンス形式

### 成功レスポンス

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "total": 100,
    "offset": 0,
    "limit": 20
  }
}
```

### エラーレスポンス

```json
{
  "status": "error",
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "指定された資産が見つかりません",
    "details": []
  }
}
```

## 5. エンドポイント一覧

### 5.1 資産管理 API（/api/v1/assets）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/v1/assets` | 資産一覧取得 | readonly+ |
| `GET` | `/api/v1/assets/{asset_id}` | 資産詳細取得 | readonly+ |
| `POST` | `/api/v1/assets` | 資産登録 | operator+ |
| `PUT` | `/api/v1/assets/{asset_id}` | 資産情報更新 | operator+ |
| `DELETE` | `/api/v1/assets/{asset_id}` | 資産削除（論理削除） | admin |
| `GET` | `/api/v1/assets/{asset_id}/history` | 資産変更履歴取得 | readonly+ |
| `POST` | `/api/v1/assets/bulk` | 資産一括登録 | operator+ |
| `POST` | `/api/v1/assets/sync` | エージェント同期 | operator+ |
| `GET` | `/api/v1/assets/search` | 資産検索 | readonly+ |
| `GET` | `/api/v1/assets/export` | 資産データエクスポート（CSV/Excel） | auditor+ |
| `GET` | `/api/v1/assets/stats` | 資産統計情報 | readonly+ |

#### リクエスト例: 資産登録

```http
POST /api/v1/assets
Content-Type: application/json
Authorization: Bearer <token>

{
  "hostname": "PC-OFFICE-001",
  "asset_tag": "AST-2024-0001",
  "asset_type": "desktop",
  "manufacturer": "Dell",
  "model": "OptiPlex 7090",
  "serial_number": "ABC123DEF",
  "os_name": "Windows 11 Pro",
  "os_version": "23H2",
  "ip_address": "192.168.1.100",
  "mac_address": "00:1A:2B:3C:4D:5E",
  "location": "本社3F-A区画",
  "department": "情報システム部",
  "assigned_user": "yamada.taro@example.com",
  "purchase_date": "2024-01-15",
  "warranty_expiry": "2027-01-14"
}
```

#### レスポンス例

```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "hostname": "PC-OFFICE-001",
    "asset_tag": "AST-2024-0001",
    "asset_type": "desktop",
    "status": "active",
    "created_at": "2024-06-01T09:00:00Z",
    "updated_at": "2024-06-01T09:00:00Z"
  }
}
```

### 5.2 操作ログ API（/api/v1/logs）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/v1/logs` | 操作ログ一覧取得 | auditor+ |
| `GET` | `/api/v1/logs/{log_id}` | ログ詳細取得 | auditor+ |
| `GET` | `/api/v1/logs/search` | ログ検索（期間・ユーザー・アクション） | auditor+ |
| `GET` | `/api/v1/logs/export` | ログエクスポート | admin |
| `GET` | `/api/v1/logs/stats` | ログ統計 | auditor+ |

#### クエリパラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `start_date` | datetime | 開始日時 |
| `end_date` | datetime | 終了日時 |
| `user_id` | UUID | ユーザーID |
| `action` | string | アクション種別（create/update/delete/login/export） |
| `resource_type` | string | リソース種別（asset/license/procurement） |
| `offset` | int | オフセット（デフォルト: 0） |
| `limit` | int | 取得件数（デフォルト: 20、最大: 100） |

### 5.3 セキュリティ API（/api/v1/security）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/v1/security/alerts` | セキュリティアラート一覧 | operator+ |
| `GET` | `/api/v1/security/alerts/{alert_id}` | アラート詳細 | operator+ |
| `PUT` | `/api/v1/security/alerts/{alert_id}` | アラートステータス更新 | operator+ |
| `GET` | `/api/v1/security/vulnerabilities` | 脆弱性一覧 | auditor+ |
| `GET` | `/api/v1/security/compliance` | コンプライアンスレポート | auditor+ |
| `POST` | `/api/v1/security/scan` | セキュリティスキャン実行 | admin |
| `GET` | `/api/v1/security/dashboard` | セキュリティダッシュボード情報 | readonly+ |

### 5.4 SAM管理 API（/api/v1/sam）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/v1/sam/licenses` | ライセンス一覧取得 | readonly+ |
| `GET` | `/api/v1/sam/licenses/{license_id}` | ライセンス詳細取得 | readonly+ |
| `POST` | `/api/v1/sam/licenses` | ライセンス登録 | operator+ |
| `PUT` | `/api/v1/sam/licenses/{license_id}` | ライセンス情報更新 | operator+ |
| `DELETE` | `/api/v1/sam/licenses/{license_id}` | ライセンス削除（論理削除） | admin |
| `GET` | `/api/v1/sam/licenses/{license_id}/assignments` | ライセンス割当一覧 | readonly+ |
| `POST` | `/api/v1/sam/licenses/{license_id}/assignments` | ライセンス割当追加 | operator+ |
| `DELETE` | `/api/v1/sam/licenses/{license_id}/assignments/{assignment_id}` | ライセンス割当解除 | operator+ |
| `GET` | `/api/v1/sam/compliance` | SAMコンプライアンスレポート | auditor+ |
| `GET` | `/api/v1/sam/usage` | ライセンス使用状況 | readonly+ |
| `POST` | `/api/v1/sam/sync/m365` | M365ライセンス同期 | admin |
| `GET` | `/api/v1/sam/export` | SAMデータエクスポート | auditor+ |

#### リクエスト例: ライセンス登録

```http
POST /api/v1/sam/licenses
Content-Type: application/json
Authorization: Bearer <token>

{
  "software_name": "Microsoft Office 365 E3",
  "vendor": "Microsoft",
  "license_type": "subscription",
  "license_key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "total_quantity": 100,
  "purchase_date": "2024-04-01",
  "expiry_date": "2025-03-31",
  "cost_per_unit": 3960,
  "currency": "JPY",
  "contract_number": "CNT-2024-0042",
  "notes": "年間サブスクリプション契約"
}
```

### 5.5 調達管理 API（/api/v1/procurement）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/v1/procurement/requests` | 調達申請一覧取得 | readonly+ |
| `GET` | `/api/v1/procurement/requests/{request_id}` | 調達申請詳細取得 | readonly+ |
| `POST` | `/api/v1/procurement/requests` | 調達申請作成 | operator+ |
| `PUT` | `/api/v1/procurement/requests/{request_id}` | 調達申請更新 | operator+ |
| `POST` | `/api/v1/procurement/requests/{request_id}/approve` | 調達申請承認 | admin |
| `POST` | `/api/v1/procurement/requests/{request_id}/reject` | 調達申請却下 | admin |
| `GET` | `/api/v1/procurement/requests/{request_id}/history` | 調達申請履歴 | readonly+ |
| `GET` | `/api/v1/procurement/vendors` | 取引先一覧 | readonly+ |
| `POST` | `/api/v1/procurement/vendors` | 取引先登録 | operator+ |
| `GET` | `/api/v1/procurement/budgets` | 予算情報 | auditor+ |
| `GET` | `/api/v1/procurement/export` | 調達データエクスポート | auditor+ |

#### リクエスト例: 調達申請作成

```http
POST /api/v1/procurement/requests
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "開発部ノートPC調達",
  "description": "新規入社者向けノートPC 10台の調達",
  "category": "hardware",
  "priority": "normal",
  "items": [
    {
      "item_name": "Dell Latitude 5540",
      "quantity": 10,
      "unit_price": 198000,
      "currency": "JPY"
    }
  ],
  "vendor_id": "550e8400-e29b-41d4-a716-446655440001",
  "requested_delivery_date": "2024-08-01",
  "budget_code": "IT-2024-DEV",
  "department": "開発部"
}
```

### 5.6 メトリクス API（/api/v1/metrics）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `GET` | `/api/v1/metrics` | Prometheusメトリクスエンドポイント | (内部) |
| `GET` | `/api/v1/metrics/dashboard` | ダッシュボード集計データ | readonly+ |
| `GET` | `/api/v1/metrics/assets/summary` | 資産サマリーメトリクス | readonly+ |
| `GET` | `/api/v1/metrics/sam/summary` | SAMサマリーメトリクス | readonly+ |
| `GET` | `/api/v1/metrics/procurement/summary` | 調達サマリーメトリクス | readonly+ |
| `GET` | `/api/v1/metrics/health` | ヘルスチェック | (公開) |

### 5.7 認証 API（/api/v1/auth）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| `POST` | `/api/v1/auth/login` | ログイン（JWT発行） | (公開) |
| `POST` | `/api/v1/auth/logout` | ログアウト | 認証済み |
| `POST` | `/api/v1/auth/refresh` | トークンリフレッシュ | 認証済み |
| `GET` | `/api/v1/auth/me` | 現在のユーザー情報取得 | 認証済み |
| `GET` | `/api/v1/auth/oidc/login` | OIDC認証開始（Entra IDリダイレクト） | (公開) |
| `GET` | `/api/v1/auth/oidc/callback` | OIDCコールバック | (公開) |

## 6. 認証・認可フロー

### 6.1 JWT認証

```
クライアント                    FastAPI                     Entra ID
    │                             │                            │
    │  POST /auth/oidc/login      │                            │
    │────────────────────────────▶│                            │
    │                             │  Authorization Code Flow   │
    │  302 Redirect               │───────────────────────────▶│
    │◀────────────────────────────│                            │
    │                             │                            │
    │  Redirect with code         │                            │
    │────────────────────────────▶│  Token Exchange            │
    │                             │───────────────────────────▶│
    │                             │◀───────────────────────────│
    │                             │                            │
    │  JWT (access + refresh)     │                            │
    │◀────────────────────────────│                            │
```

### 6.2 RBAC権限マトリクス

| エンドポイント | admin | operator | auditor | readonly |
|--------------|-------|----------|---------|----------|
| GET（参照系） | OK | OK | OK | OK |
| POST（作成系） | OK | OK | - | - |
| PUT（更新系） | OK | OK | - | - |
| DELETE（削除系） | OK | - | - | - |
| 承認系 | OK | - | - | - |
| エクスポート | OK | - | OK | - |
| 管理機能 | OK | - | - | - |

## 7. レート制限

| エンドポイント | 制限 | 備考 |
|--------------|------|------|
| `/api/v1/auth/login` | 5回/分 | ブルートフォース防止 |
| `/api/v1/assets/sync` | 60回/時 | エージェント同期 |
| `/api/v1/*/export` | 10回/時 | 大量データエクスポート |
| その他のGET | 100回/分 | 通常参照 |
| その他のPOST/PUT/DELETE | 30回/分 | 書き込み操作 |

## 8. エラーコード一覧

| コード | HTTPステータス | 説明 |
|-------|--------------|------|
| `AUTH_INVALID_TOKEN` | 401 | 無効なJWTトークン |
| `AUTH_EXPIRED_TOKEN` | 401 | トークン期限切れ |
| `AUTH_FORBIDDEN` | 403 | 権限不足 |
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない |
| `VALIDATION_ERROR` | 422 | リクエストバリデーションエラー |
| `DUPLICATE_ENTRY` | 409 | 重複エントリ |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `INTERNAL_ERROR` | 500 | 内部サーバーエラー |
| `SERVICE_UNAVAILABLE` | 503 | サービス利用不可 |

## 9. FastAPIプロジェクト構成

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPIアプリケーションエントリ
│   ├── config.py              # 環境設定
│   ├── dependencies.py        # 依存性注入
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py      # ルーター集約
│   │       ├── assets.py      # 資産管理API
│   │       ├── logs.py        # ログAPI
│   │       ├── security.py    # セキュリティAPI
│   │       ├── sam.py         # SAM管理API
│   │       ├── procurement.py # 調達管理API
│   │       ├── metrics.py     # メトリクスAPI
│   │       └── auth.py        # 認証API
│   ├── models/                # SQLAlchemy ORMモデル
│   │   ├── __init__.py
│   │   ├── asset.py
│   │   ├── user.py
│   │   ├── license.py
│   │   ├── procurement.py
│   │   └── audit_log.py
│   ├── schemas/               # Pydanticスキーマ
│   │   ├── __init__.py
│   │   ├── asset.py
│   │   ├── license.py
│   │   ├── procurement.py
│   │   └── common.py
│   ├── services/              # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── asset_service.py
│   │   ├── sam_service.py
│   │   ├── procurement_service.py
│   │   └── m365_service.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py            # JWT・OIDC認証
│   │   ├── rbac.py            # RBAC制御
│   │   ├── rate_limit.py      # レート制限
│   │   └── logging.py         # 構造化ログ
│   └── db/
│       ├── __init__.py
│       ├── session.py         # DBセッション管理
│       └── migrations/        # Alembicマイグレーション
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_assets.py
│   ├── test_sam.py
│   └── test_procurement.py
├── Dockerfile
├── requirements.txt
└── alembic.ini
```
