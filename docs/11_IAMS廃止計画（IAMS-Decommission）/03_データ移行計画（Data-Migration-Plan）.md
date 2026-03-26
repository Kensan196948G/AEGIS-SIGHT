# データ移行計画書（IAMS → AEGIS-SIGHT）

| 項目 | 内容 |
|------|------|
| 文書ID | AEGIS-DECOM-003 |
| バージョン | 1.0 |
| 作成日 | 2026-03-27 |
| 移行元 | IAMS（旧IT資産管理システム） |
| 移行先 | AEGIS-SIGHT |
| 対象規模 | みらい建設工業 550名、500台端末 |

---

## 1. 概要

### 1.1 目的

本文書は、IAMS から AEGIS-SIGHT へのデータ移行に関する計画を定義する。移行対象データの特定、データ変換ルール、テストデータの準備、移行実行手順、および移行後の検証手順を包括的に記述する。

### 1.2 移行方針

| 方針 | 説明 |
|------|------|
| 段階的移行 | 機能単位で段階的に移行（ビッグバンではない） |
| データクレンジング | 移行前に不整合データを修正 |
| 双方向検証 | 移行前後でのデータ整合性を全件検証 |
| ロールバック可能 | 各段階でロールバック可能な設計 |
| 暗号化維持 | 移行中もデータの暗号化を維持 |

### 1.3 移行スケジュール

| フェーズ | 期間 | 内容 | ステータス |
|---------|------|------|-----------|
| 準備 | 2026-01-15 〜 02-14 | データ分析、マッピング定義、ツール開発 | 完了 |
| テスト移行（第1回） | 2026-02-15 〜 02-28 | テスト環境でのリハーサル | 完了 |
| テスト移行（第2回） | 2026-03-01 〜 03-10 | 修正版でのリハーサル | 完了 |
| 本番移行 | 2026-03-11 〜 03-20 | 本番データの移行実施 | 完了 |
| 検証 | 2026-03-21 〜 03-27 | 移行後の全件検証 | 完了 |

---

## 2. 移行対象データ

### 2.1 データインベントリ

| # | データ種別 | テーブル/ファイル数 | レコード数 | サイズ | 移行対象 | 優先度 |
|---|-----------|------------------|----------|--------|---------|--------|
| 1 | ハードウェア資産データ | 8テーブル | 約2,000件 | 500 MB | Yes | P1 |
| 2 | ソフトウェア資産データ | 5テーブル | 約15,000件 | 300 MB | Yes | P1 |
| 3 | ライセンスデータ | 6テーブル | 約1,700件 | 200 MB | Yes | P1 |
| 4 | 調達記録 | 4テーブル | 約3,000件 | 1 GB | Yes | P1 |
| 5 | 廃棄記録 | 3テーブル | 約800件 | 500 MB | Yes | P1 |
| 6 | 廃棄証明書（PDF） | — | 約800件 | 2 GB | Yes | P1 |
| 7 | ユーザー・権限データ | 3テーブル | 約600件 | 50 MB | Yes | P2 |
| 8 | 監査ログ | 2テーブル | 約5,000,000件 | 10 GB | Yes | P2 |
| 9 | レポートテンプレート | — | 5件 | 10 MB | No（再作成） | — |
| 10 | ヘルプデスクチケット | 4テーブル | 約10,000件 | 1 GB | No（ServiceNow） | — |
| 11 | ネットワーク監視データ | 2テーブル | 約2,000,000件 | 5 GB | No（Azure Monitor） | — |

### 2.2 移行対象・除外の判断基準

| 判断基準 | 移行対象 | 移行除外 |
|---------|---------|---------|
| AEGIS-SIGHT で管理する機能のデータ | Yes | — |
| 法的保存義務のあるデータ | Yes | — |
| 代替システムに移行済みのデータ | — | Yes（アーカイブのみ） |
| 一時的・キャッシュ的データ | — | Yes |

---

## 3. データマッピング

### 3.1 ハードウェア資産データマッピング

| IAMS フィールド | IAMS 型 | AEGIS-SIGHT フィールド | AEGIS 型 | 変換ルール |
|----------------|---------|---------------------|---------|-----------|
| hw_id | INT | asset_id | UUID | 新規UUID生成（マッピングテーブル保持） |
| pc_name | VARCHAR(50) | asset_name | NVARCHAR(256) | そのまま移行 |
| model | VARCHAR(100) | model_name | NVARCHAR(256) | そのまま移行 |
| serial_no | VARCHAR(50) | serial_number | NVARCHAR(128) | そのまま移行 |
| manufacturer | VARCHAR(100) | vendor | NVARCHAR(256) | ベンダーマスタ照合 |
| purchase_date | DATE | acquisition_date | DATE | そのまま移行 |
| warranty_end | DATE | warranty_expiry | DATE | そのまま移行 |
| assigned_user | VARCHAR(50) | owner | NVARCHAR(256) | Azure AD UPN変換 |
| department | VARCHAR(50) | department_id | UUID | 部門マスタ照合 |
| location | VARCHAR(100) | location | NVARCHAR(256) | ロケーションマスタ照合 |
| status | VARCHAR(20) | status | ENUM | ステータスマッピング（下表） |
| ip_address | VARCHAR(15) | — | — | エージェントが自動収集 |
| mac_address | VARCHAR(17) | — | — | エージェントが自動収集 |
| cpu | VARCHAR(100) | — | — | エージェントが自動収集 |
| memory_gb | INT | — | — | エージェントが自動収集 |
| disk_gb | INT | — | — | エージェントが自動収集 |
| os_version | VARCHAR(100) | — | — | エージェントが自動収集 |
| — | — | asset_type | ENUM | 固定値: "Hardware" |
| — | — | classification | ENUM | デフォルト: "社内" |
| — | — | criticality | ENUM | デフォルト: "Medium"（後に見直し） |
| — | — | last_scan_date | DATETIME | 初回エージェントスキャン時に設定 |
| notes | TEXT | description | NVARCHAR(MAX) | そのまま移行 |

#### ステータスマッピング

| IAMS status | AEGIS-SIGHT status | 備考 |
|------------|-------------------|------|
| Active | Active | — |
| In Use | Active | 統合 |
| Storage | Inactive | — |
| Repair | Active | maintenance_flagをtrue |
| Disposed | Retired | — |
| Lost | Retired | lost_flagをtrue |

### 3.2 ライセンスデータマッピング

| IAMS フィールド | AEGIS-SIGHT フィールド | 変換ルール |
|----------------|---------------------|-----------|
| lic_id | license_id | 新規UUID生成 |
| product | product_name | そのまま移行 |
| vendor_name | vendor | ベンダーマスタ照合 |
| license_key | license_key | AES-256-GCM再暗号化 |
| lic_type | license_type | ライセンスタイプマッピング |
| qty_purchased | quantity_purchased | そのまま移行 |
| qty_used | quantity_assigned | そのまま移行 |
| purchase_date | purchase_date | そのまま移行 |
| expiry_date | expiry_date | そのまま移行 |
| po_number | purchase_order | そのまま移行 |
| invoice_no | invoice_number | そのまま移行 |
| unit_cost | cost_per_license | 通貨コード追加（JPY） |
| total_cost | total_cost | 通貨コード追加（JPY） |
| — | budget_code | デフォルト値設定（後に修正） |
| — | approval_id | 移行用の一括承認ID |

### 3.3 調達記録データマッピング

| IAMS フィールド | AEGIS-SIGHT フィールド | 変換ルール |
|----------------|---------------------|-----------|
| proc_id | procurement_id | 新規UUID生成 |
| request_date | request_date | そのまま移行 |
| requestor | requester | Azure AD UPN変換 |
| item_name | product_info.name | JSON構造化 |
| item_spec | product_info.spec | JSON構造化 |
| quantity | quantity | そのまま移行 |
| unit_price | unit_price | AES-256-GCM暗号化 |
| total_price | total_amount | AES-256-GCM暗号化 |
| approver1 | approval_chain[0] | JSON配列化 |
| approver2 | approval_chain[1] | JSON配列化 |
| approve_date1 | approval_chain[0].date | JSON構造化 |
| approve_date2 | approval_chain[1].date | JSON構造化 |
| po_number | purchase_order | そのまま移行 |
| delivery_date | delivery_date | そのまま移行 |
| invoice_no | invoice_number | そのまま移行 |
| — | hash_chain | 移行後にハッシュチェーン生成 |

### 3.4 廃棄証明書データマッピング

| IAMS フィールド | AEGIS-SIGHT フィールド | 変換ルール |
|----------------|---------------------|-----------|
| disposal_id | certificate_id | 新規ID生成（DC-YYYY-NNNN形式） |
| hw_id | asset_id | マッピングテーブル参照 |
| disposal_date | disposal_date | そのまま移行 |
| disposal_method | disposal_method | 用語マッピング |
| disposal_vendor | disposal_vendor | ベンダーマスタ照合 |
| cert_file_path | certificate_file | Blob URLに変換 |
| — | data_sanitization | IAMSにデータなし（手動補完） |
| — | retention_until | disposal_date + 7年 |
| — | hash | 移行後にハッシュ生成 |

---

## 4. データ変換・クレンジング

### 4.1 データ品質チェック項目

| チェック項目 | 対象 | 方法 | 結果 |
|------------|------|------|------|
| NULL/空白チェック | 全必須フィールド | SQL COUNT | 23件の空白を検出→手動補完 |
| 重複チェック | 資産シリアル番号 | DISTINCT COUNT | 3件の重複→統合 |
| 参照整合性チェック | FK関係 | JOIN検証 | 5件の孤立レコード→修正 |
| 日付妥当性チェック | 全DATE型 | 範囲チェック | 2件の未来日付→修正 |
| 文字コードチェック | 全テキスト型 | エンコーディング検証 | Shift-JIS→UTF-8変換 |
| 数値範囲チェック | 金額・数量 | MIN/MAX | 異常値なし |
| ステータス値チェック | 状態フィールド | ENUM照合 | 全件一致 |

### 4.2 データクレンジングルール

| ルールID | 対象 | ルール | 適用結果 |
|---------|------|--------|---------|
| CLN-001 | 人名フィールド | 全角/半角統一、前後空白除去 | 120件修正 |
| CLN-002 | メールアドレス | 小文字統一、Azure AD UPN形式 | 550件変換 |
| CLN-003 | 電話番号 | ハイフン付き統一形式 | 35件修正 |
| CLN-004 | 日付形式 | ISO 8601形式に統一 | 全件変換 |
| CLN-005 | 金額 | 小数点以下切り捨て（円単位） | 12件修正 |
| CLN-006 | 重複レコード | 新しいレコードを正とし統合 | 3件統合 |
| CLN-007 | 文字コード | UTF-8に統一 | 全件変換 |

---

## 5. テストデータ変換

### 5.1 テスト環境構成

| 環境 | 用途 | データ |
|------|------|--------|
| テスト環境A | 移行ツールの単体テスト | サンプルデータ（100件） |
| テスト環境B | 移行リハーサル（第1回） | 本番データの匿名化コピー |
| テスト環境C | 移行リハーサル（第2回） | 本番データの匿名化コピー |
| ステージング | 本番前最終確認 | 本番データ |

### 5.2 テストデータ生成ルール

| 項目 | 匿名化ルール | 例 |
|------|------------|-----|
| 氏名 | ランダム日本語名に置換 | 田中太郎 → テスト太郎001 |
| メールアドレス | test+連番@example.com | test001@example.com |
| 電話番号 | 000-0000-XXXX | 000-0000-0001 |
| IPアドレス | 10.0.0.X に置換 | 10.0.0.1 |
| シリアル番号 | TEST-SERIAL-XXXX | TEST-SERIAL-0001 |
| ライセンスキー | マスキング | XXXXX-XXXXX-XXXXX |
| 金額 | ランダム化（±10%） | 原値近傍のランダム値 |

### 5.3 テスト移行結果

#### 第1回リハーサル（2026-02-15 〜 02-28）

| テスト項目 | 結果 | 発見事項 | 対応 |
|-----------|------|---------|------|
| データ抽出 | OK | — | — |
| データ変換 | NG | 文字コード変換エラー（15件） | CLN-007追加 |
| データロード | OK | — | — |
| 件数検証 | NG | 3件の重複により件数不一致 | CLN-006追加 |
| 整合性検証 | NG | FK不整合（5件） | CLN修正 |
| 性能テスト | OK | 全データ移行：4.5時間 | 許容範囲内 |

#### 第2回リハーサル（2026-03-01 〜 03-10）

| テスト項目 | 結果 | 発見事項 | 対応 |
|-----------|------|---------|------|
| データ抽出 | OK | — | — |
| データ変換 | OK | 全件正常変換 | — |
| データロード | OK | — | — |
| 件数検証 | OK | 全件一致 | — |
| 整合性検証 | OK | 全FK整合 | — |
| 性能テスト | OK | 全データ移行：3.8時間 | 最適化効果 |
| ハッシュチェーン生成 | OK | 全移行データにハッシュ付与 | — |
| ロールバックテスト | OK | 15分で完全復旧 | — |

---

## 6. 本番移行手順

### 6.1 移行実行計画

| 日付 | 時間 | アクション | 担当 | 確認者 |
|------|------|-----------|------|--------|
| 2026-03-11 | 09:00 | 移行開始会議 | PM | 全担当者 |
| 2026-03-11 | 10:00 | IAMS データベースの整合性最終確認 | DBA | PM |
| 2026-03-11 | 11:00 | IAMS 書き込み一時停止 | インフラ管理者 | DBA |
| 2026-03-11 | 11:30 | 移行元データのフルエクスポート | DBA | PM |
| 2026-03-11 | 13:00 | P1データの変換・ロード開始 | 移行チーム | DBA |
| 2026-03-12 | 09:00 | P1データの変換・ロード完了確認 | 移行チーム | PM |
| 2026-03-12 | 10:00 | P1データの件数・整合性検証 | QA | PM |
| 2026-03-13 | 09:00 | P2データの変換・ロード開始 | 移行チーム | DBA |
| 2026-03-14 | 09:00 | P2データの変換・ロード完了確認 | 移行チーム | PM |
| 2026-03-14 | 10:00 | 全データの件数・整合性検証 | QA | PM |
| 2026-03-15 | 09:00 | 廃棄証明書PDFの移行 | 移行チーム | PM |
| 2026-03-16 | 09:00 | ハッシュチェーン生成・検証 | 移行チーム | セキュリティ管理者 |
| 2026-03-17 | 09:00 | IAMS 書き込み再開（読み取り専用移行まで） | インフラ管理者 | PM |
| 2026-03-18 | 09:00 | 差分データの追加移行 | 移行チーム | DBA |
| 2026-03-19 | 09:00 | 最終整合性検証 | QA | PM |
| 2026-03-20 | 09:00 | 移行完了判定会議 | PM | 全担当者 |

### 6.2 移行ツール構成

```
┌────────────────────────────────────────────────────┐
│              データ移行パイプライン                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Extractor │───▶│Transformer│───▶│  Loader   │    │
│  │           │    │           │    │           │    │
│  │・SQL抽出  │    │・型変換    │    │・バルク   │    │
│  │・CSV出力  │    │・クレンジング│   │ インサート│    │
│  │・チェック  │    │・マッピング │   │・検証    │    │
│  │ サム生成  │    │・暗号化    │    │・ハッシュ │    │
│  └──────────┘    └──────────┘    └──────────┘     │
│       │               │               │           │
│       ▼               ▼               ▼           │
│  ┌──────────────────────────────────────────┐     │
│  │         移行ログ・監査証跡                  │     │
│  │  ・処理件数  ・エラー件数  ・実行時間       │     │
│  │  ・チェックサム  ・変換ログ                 │     │
│  └──────────────────────────────────────────┘     │
└────────────────────────────────────────────────────┘
```

### 6.3 ロールバック手順

| # | 手順 | 担当 | 所要時間 |
|---|------|------|---------|
| 1 | ロールバック判断（PM + 情シス部長） | PM | 即時 |
| 2 | AEGIS-SIGHT への移行データの削除 | DBA | 30分 |
| 3 | AEGIS-SIGHT の状態を移行前に復元 | DBA | 15分 |
| 4 | IAMS の書き込み復旧 | インフラ管理者 | 5分 |
| 5 | 動作確認 | テストチーム | 15分 |
| 6 | ユーザー通知 | PM | 即時 |
| **合計** | | | **約65分** |

---

## 7. 移行後検証手順

### 7.1 検証レベル

| レベル | 検証内容 | 方法 | 合格基準 |
|--------|---------|------|---------|
| L1 | 件数検証 | COUNT比較 | 100%一致 |
| L2 | チェックサム検証 | SHA-256比較 | 100%一致 |
| L3 | サンプリング検証 | ランダム100件の値比較 | 100%一致 |
| L4 | 業務シナリオ検証 | 主要業務フローの実行 | 全シナリオ成功 |
| L5 | パフォーマンス検証 | レスポンスタイム測定 | SLA内 |

### 7.2 件数検証チェックリスト

| データ種別 | IAMS 件数 | AEGIS-SIGHT 件数 | 差異 | 結果 | 備考 |
|-----------|----------|-----------------|------|------|------|
| ハードウェア資産 | 495 | 495 | 0 | OK | 重複統合後 |
| ソフトウェア資産 | 14,850 | 14,850 | 0 | OK | — |
| ライセンスデータ | 1,665 | 1,665 | 0 | OK | — |
| 調達記録 | 2,980 | 2,980 | 0 | OK | 過去5年分 |
| 廃棄記録 | 790 | 790 | 0 | OK | 過去7年分 |
| 廃棄証明書 | 790 | 790 | 0 | OK | PDF全件 |
| ユーザーデータ | 580 | 580 | 0 | OK | — |
| 監査ログ | 4,892,340 | 4,892,340 | 0 | OK | 全件 |

### 7.3 整合性検証クエリ（例）

```sql
-- 資産データの件数検証
SELECT
    'Hardware Assets' AS data_type,
    (SELECT COUNT(*) FROM iams.hw_inventory) AS iams_count,
    (SELECT COUNT(*) FROM aegis.assets WHERE asset_type = 'Hardware') AS aegis_count,
    CASE
        WHEN (SELECT COUNT(*) FROM iams.hw_inventory) =
             (SELECT COUNT(*) FROM aegis.assets WHERE asset_type = 'Hardware')
        THEN 'MATCH'
        ELSE 'MISMATCH'
    END AS result;

-- ライセンスデータの金額合計検証
SELECT
    'License Total Cost' AS data_type,
    (SELECT SUM(total_cost) FROM iams.licenses) AS iams_total,
    (SELECT SUM(total_cost) FROM aegis.licenses) AS aegis_total,
    CASE
        WHEN (SELECT SUM(total_cost) FROM iams.licenses) =
             (SELECT SUM(total_cost) FROM aegis.licenses)
        THEN 'MATCH'
        ELSE 'MISMATCH'
    END AS result;
```

### 7.4 業務シナリオテスト

| # | シナリオ | 手順 | 期待結果 | 結果 |
|---|---------|------|---------|------|
| 1 | 資産検索 | シリアル番号で資産検索 | IAMS と同じ資産情報が表示 | OK |
| 2 | ライセンス確認 | 製品名でライセンス検索 | 保有数・利用数が一致 | OK |
| 3 | 調達記録参照 | 注文番号で調達記録検索 | 承認チェーン含め一致 | OK |
| 4 | 廃棄証明書参照 | 廃棄IDで証明書表示 | PDF が正常表示 | OK |
| 5 | SAMレポート生成 | 月次レポート生成 | IAMS 最終レポートと同等 | OK |
| 6 | 監査ログ検索 | 日付範囲で監査ログ検索 | IAMS と同件数ヒット | OK |
| 7 | コンプライアンスチェック | ライセンス超過チェック実行 | 同じ超過ライセンスを検出 | OK |
| 8 | 棚卸レポート | 四半期棚卸レポート生成 | 全資産が正しくリスト | OK |
| 9 | 新規調達フロー | 新規調達申請→承認→登録 | 正常完了 | OK |
| 10 | 廃棄フロー | 廃棄申請→承認→証明書保存 | 正常完了（7年保存確認） | OK |

---

## 8. セキュリティ要件

### 8.1 移行中のセキュリティ対策

| 対策 | 実装 |
|------|------|
| データ転送暗号化 | TLS 1.3（IAMS→移行サーバー→AEGIS-SIGHT） |
| 一時データの暗号化 | AES-256-GCM（変換中の一時ファイル） |
| アクセス制御 | 移行チームのみアクセス可能（専用RBAC） |
| ライセンスキーの保護 | 移行中も常時暗号化状態を維持 |
| 金額データの保護 | 列レベル暗号化を維持 |
| 監査ログ | 移行操作の全ログを記録 |
| 一時ファイルの消去 | 移行完了後、セキュアデリート実行 |

### 8.2 個人情報保護

| 対策 | 実装 |
|------|------|
| テスト環境での匿名化 | 氏名・メール・電話番号をマスキング |
| 本番移行時の最小権限 | 移行に必要な最小限のアクセス権 |
| 移行後の権限剥奪 | 移行完了後、即時に移行用権限を削除 |
| 移行ログの保護 | 個人情報を含むログは暗号化保存 |

---

## 9. リスク管理

### 9.1 リスク一覧と緩和策

| リスク | 影響 | 確率 | 緩和策 | 残存リスク |
|--------|------|------|--------|-----------|
| データ損失 | Critical | Low | フルバックアップ + チェックサム検証 | 極低 |
| データ不整合 | High | Medium | 全件検証 + サンプリングテスト | 低 |
| 移行時間超過 | Medium | Medium | 2回のリハーサルで時間測定済み | 低 |
| ライセンスキー漏洩 | Critical | Low | 常時暗号化 + アクセス制限 | 極低 |
| ロールバック失敗 | High | Low | リハーサルでロールバックテスト済み | 極低 |
| 文字化け | Medium | Medium | 文字コード統一 + テスト検証 | 低 |
| 業務影響 | High | Low | 並行運用期間設定 | 低 |

---

## 10. IDマッピングテーブル

### 10.1 目的

IAMS と AEGIS-SIGHT 間でIDが変わるため、移行後も旧IDから新IDを追跡できるようマッピングテーブルを永続保存する。

### 10.2 マッピングテーブル構造

```sql
CREATE TABLE migration_id_mapping (
    mapping_id      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    entity_type     NVARCHAR(50)        NOT NULL,  -- Asset/License/Procurement/Disposal
    iams_id         NVARCHAR(256)       NOT NULL,  -- IAMS側の旧ID
    aegis_id        UNIQUEIDENTIFIER    NOT NULL,  -- AEGIS-SIGHT側の新ID
    migrated_at     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    migrated_by     NVARCHAR(256)       NOT NULL,
    notes           NVARCHAR(MAX)       NULL,

    CONSTRAINT PK_migration_id_mapping PRIMARY KEY (mapping_id),
    CONSTRAINT UQ_migration_mapping UNIQUE (entity_type, iams_id)
);

CREATE INDEX IX_mapping_iams ON migration_id_mapping (entity_type, iams_id);
CREATE INDEX IX_mapping_aegis ON migration_id_mapping (aegis_id);
```

### 10.3 保存ポリシー

| 項目 | 内容 |
|------|------|
| 保存場所 | AEGIS-SIGHT データベース内 |
| 保存期間 | IAMS廃止後 7年間 |
| アクセス権 | 読み取り専用（管理者・監査人のみ） |
| 暗号化 | TDE（テーブルレベル） |

---

## 11. 文書管理

| 版数 | 日付 | 変更内容 | 承認者 |
|------|------|---------|--------|
| 1.0 | 2026-03-27 | 初版作成 | — |
