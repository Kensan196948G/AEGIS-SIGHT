# 06. セキュリティ設計（Security Design）

## 1. 概要

AEGIS-SIGHTのセキュリティ設計は、多層防御（Defense in Depth）の原則に基づき、認証・認可・通信暗号化・データ保護・監査の各レイヤーで包括的なセキュリティ対策を実装する。

## 2. セキュリティアーキテクチャ全体図

```
┌─────────────────────────────────────────────────────────────┐
│                   セキュリティレイヤー                        │
│                                                             │
│  Layer 1: ネットワーク                                       │
│  ├── TLS 1.3 (全通信暗号化)                                  │
│  ├── mTLS (Windows Agent通信)                                │
│  ├── ネットワーク分離 (Docker内部ネットワーク)                  │
│  └── レート制限 (Nginx + アプリケーション)                     │
│                                                             │
│  Layer 2: 認証                                               │
│  ├── OIDC (Microsoft Entra ID)                               │
│  ├── JWT (RS256)                                             │
│  └── API Key (エージェント認証)                               │
│                                                             │
│  Layer 3: 認可                                               │
│  ├── RBAC (admin/operator/auditor/readonly)                  │
│  └── エンドポイント単位のアクセス制御                          │
│                                                             │
│  Layer 4: データ保護                                         │
│  ├── 暗号化保存 (ライセンスキー等)                            │
│  ├── パラメータバインディング (SQLインジェクション防止)          │
│  ├── 入力バリデーション (Pydantic)                            │
│  └── 論理削除 (データ保全)                                    │
│                                                             │
│  Layer 5: 監査                                               │
│  ├── 全操作の監査ログ                                        │
│  ├── ログの改ざん防止                                        │
│  └── コンプライアンスレポート                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 3. 認証設計

### 3.1 OIDC認証（Microsoft Entra ID）

AEGIS-SIGHTの主認証方式はMicrosoft Entra ID（旧Azure AD）によるOpenID Connect認証である。

#### 認証フロー（Authorization Code Flow with PKCE）

```
ユーザー         Next.js           FastAPI           Entra ID
  │                │                  │                  │
  │ ログイン押下    │                  │                  │
  │───────────────▶│                  │                  │
  │                │ GET /auth/oidc/login               │
  │                │─────────────────▶│                  │
  │                │                  │ Authorization    │
  │                │  302 Redirect    │  Request         │
  │◀───────────────│◀─────────────────│─────────────────▶│
  │                                                      │
  │ ユーザー認証（Entra IDログイン画面）                    │
  │─────────────────────────────────────────────────────▶│
  │                                                      │
  │ Redirect with authorization code                     │
  │◀─────────────────────────────────────────────────────│
  │                │                  │                  │
  │ Callback       │                  │                  │
  │───────────────▶│ GET /auth/oidc/callback             │
  │                │─────────────────▶│ Token Exchange   │
  │                │                  │─────────────────▶│
  │                │                  │◀─────────────────│
  │                │                  │                  │
  │                │                  │ (ID Token検証)   │
  │                │                  │ (ユーザー情報取得) │
  │                │                  │ (JWT発行)        │
  │                │ Set-Cookie (JWT) │                  │
  │◀───────────────│◀─────────────────│                  │
```

#### OIDC設定項目

| 項目 | 値 |
|------|-----|
| Authority | `https://login.microsoftonline.com/{tenant_id}/v2.0` |
| Client ID | Entra IDアプリ登録のクライアントID |
| Scope | `openid profile email` |
| Response Type | `code` |
| Grant Type | `authorization_code` |
| PKCE | `S256` |

### 3.2 JWT設計

| 項目 | 設定値 |
|------|-------|
| アルゴリズム | RS256（RSA + SHA-256） |
| Access Tokenの有効期限 | 15分 |
| Refresh Tokenの有効期限 | 7日 |
| 発行者（iss） | `aegis-sight` |
| 署名鍵 | RSA 2048-bit以上 |

#### JWTペイロード

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "yamada.taro@example.com",
  "name": "山田太郎",
  "role": "operator",
  "department_id": "dept-uuid",
  "iss": "aegis-sight",
  "aud": "aegis-sight-api",
  "iat": 1717225200,
  "exp": 1717226100,
  "jti": "unique-token-id"
}
```

#### トークンリフレッシュフロー

```
クライアント                    FastAPI
    │                             │
    │ POST /auth/refresh          │
    │ Cookie: refresh_token=xxx   │
    │────────────────────────────▶│
    │                             │ Refresh Token検証
    │                             │ 新Access Token生成
    │                             │ Refresh Token Rotation
    │  Set-Cookie: access_token   │
    │  Set-Cookie: refresh_token  │
    │◀────────────────────────────│
```

### 3.3 mTLS認証（Windows Agent）

Windows PowerShellエージェントとの通信にはmTLS（相互TLS認証）を使用する。

| 項目 | 説明 |
|------|------|
| CA証明書 | 自己署名CA（内部PKI） |
| サーバー証明書 | APIサーバー用 |
| クライアント証明書 | 各Agentに個別発行 |
| 証明書有効期限 | 1年（自動ローテーション推奨） |
| 失効管理 | CRL（証明書失効リスト）で管理 |

## 4. 認可設計（RBAC）

### 4.1 ロール定義

| ロール | 説明 | 対象ユーザー |
|-------|------|-------------|
| `admin` | 全機能へのフルアクセス | システム管理者 |
| `operator` | 資産・SAM・調達の作成・更新 | IT運用担当者 |
| `auditor` | 参照＋エクスポート＋監査ログ | 監査担当者 |
| `readonly` | 参照のみ | 一般閲覧ユーザー |

### 4.2 権限マトリクス（詳細）

| 操作 | admin | operator | auditor | readonly |
|------|-------|----------|---------|----------|
| 資産一覧・詳細参照 | OK | OK | OK | OK |
| 資産登録・更新 | OK | OK | - | - |
| 資産削除（論理削除） | OK | - | - | - |
| ライセンス一覧・詳細参照 | OK | OK | OK | OK |
| ライセンス登録・更新 | OK | OK | - | - |
| ライセンス削除 | OK | - | - | - |
| ライセンス割当・解除 | OK | OK | - | - |
| 調達申請作成・更新 | OK | OK | - | - |
| 調達申請承認・却下 | OK | - | - | - |
| セキュリティスキャン実行 | OK | - | - | - |
| 監査ログ参照 | OK | - | OK | - |
| データエクスポート | OK | - | OK | - |
| ユーザー管理 | OK | - | - | - |
| システム設定 | OK | - | - | - |

### 4.3 RBAC実装

```python
# FastAPIでのRBAC実装例
from enum import Enum
from fastapi import Depends, HTTPException, status

class Role(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    AUDITOR = "auditor"
    READONLY = "readonly"

ROLE_HIERARCHY = {
    Role.ADMIN: 4,
    Role.OPERATOR: 3,
    Role.AUDITOR: 2,
    Role.READONLY: 1,
}

def require_role(minimum_role: Role):
    """指定ロール以上の権限を要求するデコレータ"""
    async def role_checker(current_user = Depends(get_current_user)):
        if ROLE_HIERARCHY[current_user.role] < ROLE_HIERARCHY[minimum_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="権限が不足しています"
            )
        return current_user
    return role_checker

# 使用例
@router.post("/assets")
async def create_asset(
    asset: AssetCreate,
    user = Depends(require_role(Role.OPERATOR))
):
    ...
```

## 5. 通信セキュリティ

### 5.1 TLS設定

| 項目 | 設定 |
|------|------|
| プロトコル | TLS 1.3のみ |
| 暗号スイート | `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256` |
| HSTS | `max-age=31536000; includeSubDomains` |
| OCSP Stapling | 有効 |

### 5.2 HTTPセキュリティヘッダー

| ヘッダー | 値 | 目的 |
|---------|-----|------|
| `X-Frame-Options` | `DENY` | クリックジャッキング防止 |
| `X-Content-Type-Options` | `nosniff` | MIMEスニッフィング防止 |
| `X-XSS-Protection` | `1; mode=block` | XSSフィルター |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS強制 |
| `Content-Security-Policy` | `default-src 'self'...` | コンテンツインジェクション防止 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | リファラー制御 |
| `Permissions-Policy` | `camera=(), microphone=()` | ブラウザ機能制限 |

## 6. データ保護

### 6.1 保存データの暗号化

| 対象データ | 暗号化方式 | 備考 |
|-----------|----------|------|
| ライセンスキー | AES-256-GCM（アプリケーション層暗号化） | 暗号鍵はDocker Secretsで管理 |
| パスワードハッシュ | bcrypt (cost=12) | OIDC利用時はNULL |
| JWTリフレッシュトークン | ハッシュ保存（SHA-256） | DB保存時 |
| PostgreSQL通信 | SSL | `sslmode=verify-ca` |
| バックアップ | GPG暗号化 | バックアップファイル |

### 6.2 機密データの分類

| 分類 | 対象 | 保護レベル |
|------|------|----------|
| 極秘 | ライセンスキー、暗号鍵、APIシークレット | 暗号化保存 + アクセス制限 |
| 秘密 | パスワードハッシュ、個人メールアドレス | ハッシュ化 + アクセス制限 |
| 社外秘 | 資産情報、調達金額 | RBAC + 監査ログ |
| 公開 | ソフトウェア名、部署名 | 通常アクセス制御 |

## 7. 入力バリデーション

### 7.1 バリデーション方針

| レイヤー | ツール | 対象 |
|---------|-------|------|
| フロントエンド | Zod + React Hook Form | ユーザー入力の即座のフィードバック |
| バックエンド | Pydantic v2 | 全APIリクエストの厳密なバリデーション |
| データベース | CHECK制約 | 最終防衛ライン |

### 7.2 主要なバリデーションルール

```python
# Pydanticスキーマ例
from pydantic import BaseModel, Field, EmailStr, validator
import re

class AssetCreate(BaseModel):
    hostname: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r'^[a-zA-Z0-9\-\.]+$'
    )
    asset_tag: str = Field(
        ...,
        min_length=1,
        max_length=50,
        pattern=r'^AST-\d{4}-\d{4,}$'
    )
    asset_type: str = Field(
        ...,
        pattern=r'^(desktop|laptop|server|tablet|smartphone|printer|network|monitor|peripheral|other)$'
    )
    ip_address: str | None = None
    mac_address: str | None = None
    serial_number: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=2000)

    @validator('ip_address')
    def validate_ip(cls, v):
        if v is not None:
            import ipaddress
            ipaddress.ip_address(v)  # 無効なIPは例外発生
        return v

    @validator('mac_address')
    def validate_mac(cls, v):
        if v is not None and not re.match(
            r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$', v
        ):
            raise ValueError('無効なMACアドレス形式です')
        return v
```

## 8. 脆弱性対策

### 8.1 OWASP Top 10 対策

| 脅威 | 対策 |
|------|------|
| A01: アクセス制御の不備 | RBAC、JWT検証、エンドポイント単位のアクセス制御 |
| A02: 暗号化の失敗 | TLS 1.3、AES-256-GCM、bcrypt |
| A03: インジェクション | Pydanticバリデーション、SQLAlchemy ORM（パラメータバインディング）|
| A04: 安全でない設計 | 脅威モデリング、最小権限の原則 |
| A05: セキュリティの設定ミス | Dockerセキュリティスキャン、CIでの自動チェック |
| A06: 脆弱で古いコンポーネント | Dependabot、Trivy、定期的な依存関係更新 |
| A07: 認証の識別と失敗 | OIDC、レート制限、アカウントロックアウト |
| A08: ソフトウェアとデータの整合性 | CI/CDパイプラインでの整合性検証、イメージ署名 |
| A09: セキュリティログと監視の失敗 | 全操作の監査ログ、Prometheus/Grafana監視 |
| A10: SSRF | 外部URLの許可リスト、内部ネットワークアクセスのブロック |

### 8.2 追加セキュリティ対策

| 対策 | 実装 |
|------|------|
| CSRF防止 | SameSite Cookie + CSRFトークン |
| XSS防止 | CSPヘッダー、出力エスケープ、`httpOnly` Cookie |
| クリックジャッキング防止 | `X-Frame-Options: DENY` |
| SQLインジェクション防止 | SQLAlchemy ORM（パラメータバインディング） |
| ディレクトリトラバーサル防止 | パス正規化、ホワイトリスト検証 |

## 9. 監査ログ設計

### 9.1 記録対象イベント

| カテゴリ | イベント |
|---------|---------|
| 認証 | ログイン成功/失敗、ログアウト、トークンリフレッシュ |
| 資産管理 | 資産の作成・更新・削除・割当変更 |
| SAM | ライセンスの作成・更新・削除・割当・解除 |
| 調達 | 申請の作成・承認・却下・ステータス変更 |
| セキュリティ | アラート確認、スキャン実行 |
| データアクセス | エクスポート実行、一括操作 |
| 管理 | ユーザー作成・権限変更・設定変更 |

### 9.2 監査ログのフォーマット

```json
{
  "id": "log-uuid",
  "timestamp": "2024-06-01T09:00:00Z",
  "user_id": "user-uuid",
  "user_email": "yamada.taro@example.com",
  "action": "update",
  "resource_type": "asset",
  "resource_id": "asset-uuid",
  "details": {
    "changes": [
      {
        "field": "status",
        "old_value": "active",
        "new_value": "maintenance"
      }
    ]
  },
  "ip_address": "192.168.1.50",
  "user_agent": "Mozilla/5.0 ..."
}
```

### 9.3 監査ログの保護

- 監査ログテーブルはAPPEND ONLY（更新・削除不可）
- 管理者であっても監査ログの改ざんは不可
- 90日以上のログは冷ストレージにアーカイブ
- ログへのアクセス自体もログ記録対象

## 10. セキュリティ運用

### 10.1 脆弱性管理

| ツール | 対象 | 頻度 |
|-------|------|------|
| Dependabot | Python/Node.js依存関係 | 日次（自動PR） |
| Trivy | Dockerイメージ | CI実行時 + 週次 |
| GitHub Advanced Security | ソースコード | Push時 |
| OWASP ZAP | API | 月次 |

### 10.2 インシデント対応

```
検知 → 分類 → 封じ込め → 調査 → 復旧 → 再発防止

Level 1 (低): ログ記録、次回メンテナンス時に対応
Level 2 (中): 24時間以内に対応、影響範囲の調査
Level 3 (高): 即座に対応、サービス停止の検討
Level 4 (緊急): 即座にサービス停止、全関係者に通知
```

### 10.3 定期セキュリティレビュー

| 項目 | 頻度 |
|------|------|
| 依存関係の更新 | 週次 |
| アクセスログレビュー | 週次 |
| 権限棚卸し | 月次 |
| セキュリティスキャン | 月次 |
| ペネトレーションテスト | 年次 |
| セキュリティポリシーの見直し | 年次 |

## 11. コンプライアンス

| 規格・法令 | 対応内容 |
|-----------|---------|
| 個人情報保護法 | ユーザー情報の適切な管理、アクセス制御、監査ログ |
| ISMSの要求事項への整合 | 情報資産管理、リスクアセスメント、アクセス制御 |
| NIST CSF | 識別・防御・検知・対応・復旧の各機能の実装 |
| CIS Controls | ソフトウェア資産管理、ハードウェア資産管理、アクセス制御 |
