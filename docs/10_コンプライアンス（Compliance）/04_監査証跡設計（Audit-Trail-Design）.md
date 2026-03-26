# 監査証跡設計書（AEGIS-SIGHT）

| 項目 | 内容 |
|------|------|
| 文書ID | AEGIS-COMP-004 |
| バージョン | 1.0 |
| 作成日 | 2026-03-27 |
| 対象システム | AEGIS-SIGHT（みらい建設工業） |
| 対象規模 | 従業員550名、管理端末500台 |
| 準拠規格 | ISO 27001:2022, J-SOX, NIST CSF 2.0 |

---

## 1. 概要

### 1.1 目的

本文書は、AEGIS-SIGHT における監査証跡（Audit Trail）の設計を定義する。追記専用データベース、ハッシュチェーンによる改ざん検知、監査ログフォーマットの標準化により、ISO 27001認証、J-SOX内部統制、NIST CSF対応に必要な監査証跡の完全性・可用性・機密性を確保する。

### 1.2 設計原則

| 原則 | 説明 | 実装 |
|------|------|------|
| 不変性（Immutability） | 記録された証跡は変更・削除不可 | 追記専用DB + WORM Storage |
| 完全性（Integrity） | 証跡の改ざんを検知可能 | SHA-256ハッシュチェーン |
| 可用性（Availability） | 監査時に迅速にアクセス可能 | インデックス最適化 + 検索API |
| 機密性（Confidentiality） | 権限のない者がアクセス不可 | AES-256-GCM + RBAC |
| 否認防止（Non-repudiation） | 操作者を一意に特定可能 | ユーザーID + タイムスタンプ |
| 長期保存（Retention） | 規定期間の保存を保証 | 3年以上（監査ログ）/ 7年（廃棄証明書） |

### 1.3 保存期間ポリシー

| 証跡種別 | 保存期間 | 根拠 |
|---------|---------|------|
| セキュリティ監査ログ | 3年以上 | ISO 27001 / 社内規程 |
| アクセスログ | 3年以上 | ISO 27001 |
| 変更管理ログ | 3年以上 | ISO 27001 / J-SOX |
| ライセンス管理証跡 | 7年 | J-SOX / 税法 |
| 調達記録 | 7年 | J-SOX / 税法 |
| 廃棄証明書 | 7年 | J-SOX / 税法 |
| インシデント対応記録 | 5年 | 社内規程 |

---

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    AEGIS-SIGHT 監査証跡基盤                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐                                   │
│  │    ログ生成レイヤー     │                                   │
│  │  ┌────┐┌────┐┌────┐ │                                   │
│  │  │API ││ UI ││Agent│ │                                   │
│  │  └──┬─┘└──┬─┘└──┬─┘ │                                   │
│  └─────┼─────┼─────┼───┘                                   │
│        │     │     │                                        │
│        ▼     ▼     ▼                                        │
│  ┌──────────────────────┐                                   │
│  │   ログ収集レイヤー      │                                   │
│  │  ・イベントバス         │                                   │
│  │  ・バッファリング       │                                   │
│  │  ・フォーマット正規化    │                                   │
│  └──────────┬───────────┘                                   │
│             │                                               │
│             ▼                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │          ログ保存レイヤー                       │           │
│  │                                              │           │
│  │  ┌────────────────┐  ┌────────────────────┐  │           │
│  │  │ 追記専用DB       │  │ 不変ストレージ       │  │           │
│  │  │ (Azure SQL)    │  │ (Azure Blob WORM)  │  │           │
│  │  │ ・ハッシュチェーン │  │ ・廃棄証明書        │  │           │
│  │  │ ・インデックス   │  │ ・レポートPDF       │  │           │
│  │  │ ・暗号化        │  │ ・暗号化            │  │           │
│  │  └────────────────┘  └────────────────────┘  │           │
│  └──────────────────────────────────────────────┘           │
│             │                                               │
│             ▼                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │          ログ活用レイヤー                       │           │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │           │
│  │  │ 検索API   │  │ 改ざん検知 │  │ レポート  │  │           │
│  │  │          │  │ エンジン   │  │ 生成     │  │           │
│  │  └──────────┘  └──────────┘  └──────────┘  │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 コンポーネント一覧

| コンポーネント | 技術 | 目的 | 冗長化 |
|--------------|------|------|--------|
| イベントバス | Azure Event Hubs | ログ収集・バッファリング | 3パーティション |
| 追記専用DB | Azure SQL Database | 構造化ログ保存 | Geo レプリケーション |
| 不変ストレージ | Azure Blob（WORMポリシー） | 文書・証明書保存 | GRS |
| ハッシュチェーンエンジン | カスタム（.NET） | 改ざん検知 | Active-Standby |
| 検索API | AEGIS-SIGHT API | ログ検索・取得 | ロードバランサー |
| 改ざん検知スケジューラ | Azure Functions | 定期整合性検証 | — |
| レポート生成 | Azure Functions + PDF | 監査レポート生成 | — |
| 暗号化 | Azure Key Vault | 鍵管理 | Geo冗長 |

---

## 3. 追記専用データベース設計

### 3.1 設計方針

| 方針 | 実装 |
|------|------|
| INSERT のみ許可 | UPDATE/DELETE トリガーで拒否 |
| 論理削除なし | 削除フラグ列なし |
| ハッシュチェーン | 前レコードのハッシュを保持 |
| タイムスタンプ | サーバー側UTC自動付与 |
| 暗号化 | TDE（Transparent Data Encryption）+ 列レベル暗号化 |

### 3.2 テーブル構造

#### 3.2.1 audit_logs（メイン監査ログテーブル）

```sql
CREATE TABLE audit_logs (
    -- 識別子
    log_id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    sequence_number     BIGINT              NOT NULL IDENTITY(1,1),

    -- タイムスタンプ
    event_timestamp     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    received_timestamp  DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),

    -- イベント情報
    event_type          NVARCHAR(50)        NOT NULL,  -- カテゴリ
    event_action        NVARCHAR(100)       NOT NULL,  -- アクション
    event_outcome       NVARCHAR(20)        NOT NULL,  -- Success/Failure/Unknown
    severity            NVARCHAR(20)        NOT NULL,  -- Critical/High/Medium/Low/Info

    -- アクター情報
    actor_id            NVARCHAR(256)       NOT NULL,  -- ユーザーID
    actor_name          NVARCHAR(256)       NOT NULL,  -- 表示名
    actor_role          NVARCHAR(100)       NOT NULL,  -- 役割
    actor_ip            NVARCHAR(45)        NULL,      -- IPアドレス
    actor_user_agent    NVARCHAR(512)       NULL,      -- ユーザーエージェント

    -- 対象情報
    target_type         NVARCHAR(50)        NULL,      -- 対象の種類
    target_id           NVARCHAR(256)       NULL,      -- 対象のID
    target_name         NVARCHAR(512)       NULL,      -- 対象の名前

    -- 詳細
    details             NVARCHAR(MAX)       NULL,      -- JSON形式の詳細
    previous_value      NVARCHAR(MAX)       NULL,      -- 変更前値
    new_value           NVARCHAR(MAX)       NULL,      -- 変更後値

    -- ハッシュチェーン
    record_hash         NVARCHAR(64)        NOT NULL,  -- SHA-256ハッシュ
    previous_hash       NVARCHAR(64)        NOT NULL,  -- 前レコードのハッシュ

    -- メタデータ
    source_system       NVARCHAR(100)       NOT NULL,  -- 発生元システム
    correlation_id      UNIQUEIDENTIFIER    NULL,      -- 相関ID
    retention_until     DATE                NOT NULL,  -- 保存期限

    -- 制約
    CONSTRAINT PK_audit_logs PRIMARY KEY CLUSTERED (sequence_number),
    CONSTRAINT UQ_audit_logs_id UNIQUE (log_id),
    CONSTRAINT CK_event_outcome CHECK (event_outcome IN ('Success', 'Failure', 'Unknown')),
    CONSTRAINT CK_severity CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info'))
);

-- INSERT以外を拒否するトリガー
CREATE TRIGGER TR_audit_logs_prevent_update
ON audit_logs
INSTEAD OF UPDATE
AS
BEGIN
    RAISERROR('UPDATE operation is not permitted on audit_logs table.', 16, 1);
    ROLLBACK TRANSACTION;
END;

CREATE TRIGGER TR_audit_logs_prevent_delete
ON audit_logs
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR('DELETE operation is not permitted on audit_logs table.', 16, 1);
    ROLLBACK TRANSACTION;
END;
```

#### 3.2.2 audit_hash_checkpoints（ハッシュチェーン検証ポイント）

```sql
CREATE TABLE audit_hash_checkpoints (
    checkpoint_id       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    checkpoint_time     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    sequence_from       BIGINT              NOT NULL,
    sequence_to         BIGINT              NOT NULL,
    chain_hash          NVARCHAR(64)        NOT NULL,  -- チェーン全体のハッシュ
    record_count        BIGINT              NOT NULL,
    verification_status NVARCHAR(20)        NOT NULL,  -- Valid/Invalid/Pending
    verified_by         NVARCHAR(256)       NOT NULL,
    notes               NVARCHAR(MAX)       NULL,

    CONSTRAINT PK_audit_hash_checkpoints PRIMARY KEY (checkpoint_id)
);
```

### 3.3 インデックス設計

```sql
-- 時間範囲検索用
CREATE NONCLUSTERED INDEX IX_audit_logs_timestamp
ON audit_logs (event_timestamp)
INCLUDE (event_type, event_action, actor_id, target_id);

-- イベント種別検索用
CREATE NONCLUSTERED INDEX IX_audit_logs_event_type
ON audit_logs (event_type, event_action)
INCLUDE (event_timestamp, actor_id, event_outcome);

-- アクター検索用
CREATE NONCLUSTERED INDEX IX_audit_logs_actor
ON audit_logs (actor_id, event_timestamp)
INCLUDE (event_type, event_action, event_outcome);

-- 対象検索用
CREATE NONCLUSTERED INDEX IX_audit_logs_target
ON audit_logs (target_type, target_id, event_timestamp)
INCLUDE (event_type, event_action, actor_id);

-- 相関ID検索用
CREATE NONCLUSTERED INDEX IX_audit_logs_correlation
ON audit_logs (correlation_id)
WHERE correlation_id IS NOT NULL;

-- 保存期限管理用
CREATE NONCLUSTERED INDEX IX_audit_logs_retention
ON audit_logs (retention_until)
INCLUDE (log_id, event_type);
```

---

## 4. ハッシュチェーン設計

### 4.1 ハッシュチェーンの仕組み

```
Record N-2          Record N-1          Record N
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ data_N-2     │    │ data_N-1     │    │ data_N       │
│              │    │              │    │              │
│ prev_hash:   │    │ prev_hash:   │    │ prev_hash:   │
│  H(N-3)     │──▶ │  H(N-2)     │──▶ │  H(N-1)     │
│              │    │              │    │              │
│ record_hash: │    │ record_hash: │    │ record_hash: │
│  H(N-2)     │    │  H(N-1)     │    │  H(N)       │
└──────────────┘    └──────────────┘    └──────────────┘

H(N) = SHA-256(sequence_number + event_timestamp + event_type +
       event_action + actor_id + target_id + details + H(N-1))
```

### 4.2 ハッシュ計算アルゴリズム

```
入力データ:
  canonical_data = CONCAT(
    sequence_number,      '|',
    event_timestamp,      '|',  -- ISO 8601形式
    event_type,           '|',
    event_action,         '|',
    event_outcome,        '|',
    actor_id,             '|',
    target_type,          '|',
    target_id,            '|',
    COALESCE(details,''), '|',
    previous_hash
  )

ハッシュ計算:
  record_hash = SHA-256(UTF-8(canonical_data))

出力:
  64文字の16進数文字列（小文字）
```

### 4.3 ジェネシスレコード

チェーンの最初のレコード（sequence_number = 1）は特別なジェネシスハッシュを使用する。

```
Genesis previous_hash = SHA-256("AEGIS-SIGHT-AUDIT-GENESIS-" + system_init_timestamp)
```

### 4.4 改ざん検知プロセス

#### 4.4.1 検証フロー

```
┌─────────────────┐
│ 検証スケジューラ   │  毎時実行
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 前回チェックポイント│
│ 以降のレコード取得  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 各レコードの       │
│ ハッシュ再計算     │
└────────┬────────┘
         │
    ┌────┴────┐
    │一致する？ │
    └────┬────┘
     Yes │    No
     ┌───┘    └───┐
     ▼            ▼
┌─────────┐  ┌──────────────┐
│チェック   │  │改ざんアラート   │
│ポイント   │  │・CISO通知     │
│記録      │  │・該当区間ロック │
└─────────┘  │・フォレンジック │
             └──────────────┘
```

#### 4.4.2 検証スケジュール

| 検証種別 | 頻度 | 対象範囲 | 自動化 |
|---------|------|---------|--------|
| インクリメンタル検証 | 毎時 | 前回チェックポイント以降 | 自動 |
| 日次フル検証 | 日次（深夜） | 当日全レコード | 自動 |
| 月次完全検証 | 月次 | 当月全レコード | 自動 |
| 年次完全検証 | 年次 | 全期間（サンプリング） | 自動 + 手動確認 |
| オンデマンド検証 | 随時 | 指定範囲 | 手動トリガー |

#### 4.4.3 改ざん検知時の対応

| ステップ | アクション | 責任者 | 自動化 |
|---------|-----------|--------|--------|
| 1 | アラート発報 | システム | 自動 |
| 2 | CISO即時通知 | システム | 自動 |
| 3 | 該当期間のログアクセスロック | セキュリティ管理者 | 半自動 |
| 4 | バックアップからの検証 | セキュリティ管理者 | 手動 |
| 5 | 改ざん範囲の特定 | フォレンジックチーム | 手動 |
| 6 | 原因調査 | フォレンジックチーム | 手動 |
| 7 | 是正措置 | CISO | 手動 |
| 8 | インシデント報告 | CISO | テンプレート |

---

## 5. 監査ログフォーマット

### 5.1 イベントタイプ体系

| event_type | 説明 | 例 |
|-----------|------|-----|
| AUTH | 認証関連 | ログイン、ログアウト、MFA |
| ACCESS | アクセス制御 | 権限変更、アクセス拒否 |
| ASSET | 資産管理 | 登録、変更、廃棄 |
| LICENSE | ライセンス管理 | 購入、割当、回収 |
| CONFIG | 構成変更 | 設定変更、ポリシー更新 |
| SECURITY | セキュリティイベント | 脆弱性検出、脅威検知 |
| INCIDENT | インシデント管理 | 報告、対応、クローズ |
| COMPLIANCE | コンプライアンス | 監査、レビュー、是正 |
| SYSTEM | システム操作 | バックアップ、メンテナンス |
| DATA | データ操作 | エクスポート、転送、削除 |

### 5.2 イベントアクション一覧

| event_type | event_action | 説明 |
|-----------|-------------|------|
| AUTH | LOGIN_SUCCESS | ログイン成功 |
| AUTH | LOGIN_FAILURE | ログイン失敗 |
| AUTH | LOGOUT | ログアウト |
| AUTH | MFA_CHALLENGE | MFA認証要求 |
| AUTH | MFA_SUCCESS | MFA認証成功 |
| AUTH | MFA_FAILURE | MFA認証失敗 |
| AUTH | PASSWORD_CHANGE | パスワード変更 |
| AUTH | SESSION_TIMEOUT | セッションタイムアウト |
| ACCESS | PERMISSION_GRANT | 権限付与 |
| ACCESS | PERMISSION_REVOKE | 権限剥奪 |
| ACCESS | ROLE_ASSIGN | 役割割当 |
| ACCESS | ROLE_REMOVE | 役割削除 |
| ACCESS | ACCESS_DENIED | アクセス拒否 |
| ACCESS | PRIVILEGE_ESCALATION | 特権昇格 |
| ASSET | ASSET_CREATE | 資産登録 |
| ASSET | ASSET_UPDATE | 資産更新 |
| ASSET | ASSET_TRANSFER | 資産移管 |
| ASSET | ASSET_DISPOSE | 資産廃棄 |
| ASSET | ASSET_SCAN | 資産スキャン |
| LICENSE | LICENSE_PURCHASE | ライセンス購入 |
| LICENSE | LICENSE_ASSIGN | ライセンス割当 |
| LICENSE | LICENSE_REVOKE | ライセンス回収 |
| LICENSE | LICENSE_EXPIRE | ライセンス期限切れ |
| LICENSE | LICENSE_VIOLATION | ライセンス違反検出 |
| CONFIG | CONFIG_CHANGE | 設定変更 |
| CONFIG | POLICY_UPDATE | ポリシー更新 |
| CONFIG | BASELINE_DRIFT | ベースラインドリフト |
| SECURITY | VULN_DETECTED | 脆弱性検出 |
| SECURITY | VULN_PATCHED | 脆弱性修正 |
| SECURITY | THREAT_DETECTED | 脅威検出 |
| SECURITY | MALWARE_DETECTED | マルウェア検出 |
| INCIDENT | INCIDENT_CREATE | インシデント作成 |
| INCIDENT | INCIDENT_UPDATE | インシデント更新 |
| INCIDENT | INCIDENT_RESOLVE | インシデント解決 |
| INCIDENT | INCIDENT_CLOSE | インシデントクローズ |
| DATA | DATA_EXPORT | データエクスポート |
| DATA | DATA_TRANSFER | データ転送 |
| DATA | DATA_DELETE | データ削除 |

### 5.3 ログ出力サンプル

#### 5.3.1 認証成功ログ

```json
{
  "log_id": "550e8400-e29b-41d4-a716-446655440001",
  "sequence_number": 1234567,
  "event_timestamp": "2026-03-27T09:15:30.1234567Z",
  "event_type": "AUTH",
  "event_action": "LOGIN_SUCCESS",
  "event_outcome": "Success",
  "severity": "Info",
  "actor_id": "tanaka@mirai-kensetsu.co.jp",
  "actor_name": "田中花子",
  "actor_role": "AssetManager",
  "actor_ip": "192.168.1.100",
  "actor_user_agent": "Mozilla/5.0 ...",
  "target_type": "Application",
  "target_id": "aegis-sight-web",
  "target_name": "AEGIS-SIGHT Web Portal",
  "details": {
    "auth_method": "AzureAD_MFA",
    "mfa_type": "FIDO2",
    "session_id": "sess-xxxxx"
  },
  "record_hash": "a1b2c3d4e5f6...",
  "previous_hash": "f6e5d4c3b2a1...",
  "source_system": "aegis-sight-auth",
  "retention_until": "2029-03-27"
}
```

#### 5.3.2 資産廃棄ログ

```json
{
  "log_id": "550e8400-e29b-41d4-a716-446655440002",
  "sequence_number": 1234568,
  "event_timestamp": "2026-03-27T14:30:00.0000000Z",
  "event_type": "ASSET",
  "event_action": "ASSET_DISPOSE",
  "event_outcome": "Success",
  "severity": "Medium",
  "actor_id": "suzuki@mirai-kensetsu.co.jp",
  "actor_name": "鈴木一郎",
  "actor_role": "SystemAdmin",
  "actor_ip": "192.168.1.50",
  "target_type": "Hardware",
  "target_id": "ast-xxxxx-xxxxx",
  "target_name": "ThinkPad X1 Carbon Gen11 (SN: XXXX)",
  "details": {
    "disposal_method": "物理破壊",
    "disposal_vendor": "株式会社XXリサイクル",
    "data_sanitization": "NIST SP 800-88 Purge",
    "certificate_id": "DC-2026-0001",
    "approval_chain": [
      {"approver": "yamada@mirai-kensetsu.co.jp", "date": "2026-03-25", "decision": "Approved"},
      {"approver": "tanaka@mirai-kensetsu.co.jp", "date": "2026-03-25", "decision": "Approved"}
    ]
  },
  "previous_value": "{\"status\": \"Active\", \"location\": \"本社3F\"}",
  "new_value": "{\"status\": \"Disposed\", \"disposal_date\": \"2026-03-27\"}",
  "record_hash": "b2c3d4e5f6a7...",
  "previous_hash": "a1b2c3d4e5f6...",
  "source_system": "aegis-sight-asset",
  "correlation_id": "corr-xxxxx-xxxxx",
  "retention_until": "2033-03-27"
}
```

#### 5.3.3 ライセンス違反検出ログ

```json
{
  "log_id": "550e8400-e29b-41d4-a716-446655440003",
  "sequence_number": 1234569,
  "event_timestamp": "2026-03-27T16:00:00.0000000Z",
  "event_type": "LICENSE",
  "event_action": "LICENSE_VIOLATION",
  "event_outcome": "Success",
  "severity": "High",
  "actor_id": "SYSTEM",
  "actor_name": "AEGIS-SIGHT License Monitor",
  "actor_role": "System",
  "target_type": "License",
  "target_id": "lic-xxxxx-xxxxx",
  "target_name": "Adobe Creative Cloud - Enterprise",
  "details": {
    "violation_type": "OVER_USAGE",
    "licensed_count": 50,
    "actual_usage": 53,
    "excess_count": 3,
    "affected_users": [
      "user1@mirai-kensetsu.co.jp",
      "user2@mirai-kensetsu.co.jp",
      "user3@mirai-kensetsu.co.jp"
    ],
    "recommended_action": "追加ライセンス購入または利用制限"
  },
  "record_hash": "c3d4e5f6a7b8...",
  "previous_hash": "b2c3d4e5f6a7...",
  "source_system": "aegis-sight-license",
  "retention_until": "2033-03-27"
}
```

---

## 6. ログ収集パイプライン

### 6.1 収集フロー

| ステップ | 処理 | 技術 | SLA |
|---------|------|------|-----|
| 1. イベント発生 | アプリケーションがイベント生成 | 各コンポーネント | — |
| 2. ログ送信 | イベントバスへ送信 | Azure Event Hubs | 1秒以内 |
| 3. バッファリング | 一時保存・順序保証 | Event Hubs パーティション | 5秒以内 |
| 4. フォーマット変換 | 標準フォーマットに正規化 | Azure Functions | 2秒以内 |
| 5. ハッシュ計算 | ハッシュチェーン付与 | ハッシュエンジン | 1秒以内 |
| 6. DB書き込み | 追記専用DBへINSERT | Azure SQL | 1秒以内 |
| 7. アーカイブ | 長期保存ストレージへコピー | Azure Blob | 非同期 |

### 6.2 耐障害設計

| 障害シナリオ | 対策 | RPO |
|-------------|------|-----|
| Event Hubs障害 | ローカルバッファ + リトライ | 0（バッファ保持） |
| Azure SQL障害 | Geo レプリケーション自動フェイルオーバー | 5秒 |
| ハッシュエンジン障害 | Active-Standby切替 | 0 |
| ネットワーク障害 | エージェント側ローカルキュー | 24時間分 |
| リージョン障害 | セカンダリリージョン自動切替 | 1分 |

### 6.3 パフォーマンス要件

| 指標 | 要件 | 根拠 |
|------|------|------|
| ログ書き込みスループット | 10,000件/秒 | 550名×ピーク係数 |
| 検索レスポンス（単純） | 2秒以内 | ユーザー体験 |
| 検索レスポンス（複合） | 10秒以内 | 監査対応 |
| ハッシュ検証速度 | 100,000件/分 | 日次検証完了時間 |
| ストレージ増加率 | 約50GB/年 | 見積もり |

---

## 7. 監査対応機能

### 7.1 監査ログ検索API

| エンドポイント | メソッド | 説明 | 権限 |
|--------------|---------|------|------|
| /api/audit/search | POST | 条件指定検索 | AuditViewer以上 |
| /api/audit/timeline/{target_id} | GET | 特定資産の操作履歴 | AuditViewer以上 |
| /api/audit/actor/{actor_id} | GET | 特定ユーザーの操作履歴 | AuditViewer以上 |
| /api/audit/verify/{from}/{to} | POST | ハッシュチェーン検証 | AuditAdmin |
| /api/audit/export | POST | 証跡エクスポート（PDF/CSV） | AuditViewer以上 |
| /api/audit/report/{report_type} | GET | 定型レポート取得 | AuditViewer以上 |

### 7.2 検索条件

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| date_from | DateTime | 検索開始日時 |
| date_to | DateTime | 検索終了日時 |
| event_types | String[] | イベントタイプ（複数指定可） |
| event_actions | String[] | イベントアクション（複数指定可） |
| actor_ids | String[] | アクターID（複数指定可） |
| target_types | String[] | ターゲットタイプ（複数指定可） |
| target_ids | String[] | ターゲットID（複数指定可） |
| severity | String[] | 重大度（複数指定可） |
| event_outcome | String | 結果（Success/Failure） |
| keyword | String | 全文検索キーワード |
| page | Integer | ページ番号 |
| page_size | Integer | 1ページあたりの件数（最大1000） |

### 7.3 定型レポート

| レポートID | レポート名 | 内容 | 生成頻度 |
|-----------|-----------|------|---------|
| AUD-R001 | アクセスログサマリ | ログイン/ログアウト統計 | 日次 |
| AUD-R002 | 権限変更レポート | アクセス権変更の全記録 | 週次 |
| AUD-R003 | 特権操作レポート | 特権アカウントの全操作 | 日次 |
| AUD-R004 | 資産変更レポート | 資産の登録/変更/廃棄 | 月次 |
| AUD-R005 | ライセンス管理レポート | ライセンスの変動記録 | 月次 |
| AUD-R006 | セキュリティイベントレポート | セキュリティ関連イベント | 日次 |
| AUD-R007 | コンプライアンスレポート | 統制活動の実施状況 | 四半期 |
| AUD-R008 | ハッシュチェーン検証レポート | 改ざん検知結果 | 月次 |
| AUD-R009 | J-SOX証跡パッケージ | ITGC証跡一式 | 年次 |

---

## 8. セキュリティ設計

### 8.1 アクセス制御

| 役割 | 検索 | エクスポート | 検証 | 設定変更 |
|------|------|------------|------|---------|
| AuditAdmin | Yes | Yes | Yes | Yes |
| AuditViewer | Yes | Yes | No | No |
| SecurityAdmin | Yes | Yes | Yes | No |
| SystemAdmin | No | No | No | No |
| GeneralUser | No | No | No | No |

### 8.2 暗号化設計

| レイヤー | 方式 | 鍵管理 |
|---------|------|--------|
| 転送時暗号化 | TLS 1.3 | Azure Key Vault |
| 保存時暗号化（DB） | TDE + AES-256-GCM | Azure Key Vault（CMK） |
| 保存時暗号化（Blob） | SSE + AES-256-GCM | Azure Key Vault（CMK） |
| 機密フィールド暗号化 | AES-256-GCM（列レベル） | Azure Key Vault |
| バックアップ暗号化 | AES-256-GCM | Azure Key Vault（別鍵） |

### 8.3 監査ログ自身の保護

| 脅威 | 対策 |
|------|------|
| 内部者による改ざん | ハッシュチェーン + 追記専用DB + トリガー |
| DBA による直接操作 | DDL監査 + Azure SQL監査ログ |
| バックアップ改ざん | WORM ストレージ + 署名付きハッシュ |
| 不正アクセス | RBAC + MFA + アクセスログ |
| 鍵の漏洩 | HSM + 鍵ローテーション + 分離 |

---

## 9. 運用手順

### 9.1 日常運用チェックリスト

- [ ] ログ収集パイプラインの稼働確認（自動）
- [ ] ハッシュチェーンのインクリメンタル検証結果確認
- [ ] ストレージ使用量の確認
- [ ] エラーログの確認
- [ ] アラートの確認・対応

### 9.2 月次運用チェックリスト

- [ ] 月次完全検証の実行・結果確認
- [ ] ストレージ容量の予測・計画
- [ ] パフォーマンス指標の確認
- [ ] アーカイブの完全性確認
- [ ] 保存期限超過データの確認（削除はポリシーに従う）

### 9.3 年次運用チェックリスト

- [ ] 年次完全検証の実行
- [ ] J-SOX証跡パッケージの生成・確認
- [ ] 保存ポリシーの見直し
- [ ] 暗号化鍵のローテーション確認
- [ ] DR訓練（監査ログ復旧テスト）

---

## 10. KPI

| KPI | 目標値 | 測定頻度 |
|-----|--------|---------|
| ログ収集率 | 100% | 日次 |
| ハッシュチェーン整合性 | 100% | 毎時 |
| ログ書き込みレイテンシ | 10秒以内 | リアルタイム |
| 検索レスポンスタイム | 2秒以内（単純）/10秒以内（複合） | リアルタイム |
| ストレージ可用性 | 99.99% | 月次 |
| レポート生成遅延 | 0件 | 月次 |
| 改ざん検知偽陽性率 | 0% | 月次 |

---

## 11. 文書管理

| 版数 | 日付 | 変更内容 | 承認者 |
|------|------|---------|--------|
| 1.0 | 2026-03-27 | 初版作成 | — |
