# 詳細設計仕様書
## AEGIS-SIGHT — IntegratedITAsset（IAMS）選択的統合

| 項目 | 内容 |
|------|------|
| **文書番号** | DES-AEGIS-IAMS-001 |
| **バージョン** | 1.0.0 |
| **作成日** | 2026-03-22 |
| **作成者** | みらい建設工業 IT部門 |
| **統合先リポジトリ** | Kensan196948G/AEGIS-SIGHT |
| **既存AEGIS-SIGHT詳細仕様書** | AEGIS-SIGHT_詳細仕様書_v1.1.docx（本書はIAMS統合分の追補） |

---

## 1. 統合後システムアーキテクチャ

### 1.1 全体構成（IAMS 統合後）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        クライアント層                                     │
│  Windows 11/10 PC（PowerShell Agent）                                   │
│  現場PC（オフラインバッファ + PWA Service Worker）← IAMS追加             │
│  iOS/Androidタブレット（PWA対応）← IAMS追加                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS（TLS 1.2+）
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    バックエンド API（FastAPI / Docker）                    │
│  【既存】/api/v1/assets       IT資産管理（HW/SW収集）                    │
│  【既存】/api/v1/logs         ログ管理                                   │
│  【既存】/api/v1/security     セキュリティ監視                            │
│  【IAMS移植】/api/v1/sam      SAMライセンス管理                          │
│  【IAMS移植】/api/v1/procurement  調達管理                              │
│  【IAMS移植】/api/v1/metrics  Prometheusメトリクス受信                   │
└──┬───────────┬──────────────┬──────────────────────────────────────────┘
   │           │              │
┌──▼──────┐  ┌─▼──────────┐  ┌─▼────────────────────────────────────────┐
│PostgreSQL│  │Prometheus  │  │  外部連携                               │
│資産DB   │  │+ Grafana   │  │  Microsoft Graph API（M365ライセンス）   │
│SAM DB   │  │【IAMS移植】│  │  Windows Agent（WMI/Prometheus Exporter）│
│調達DB   │  └────────────┘  └──────────────────────────────────────────┘
└─────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│              フロントエンド（Next.js 14 + PWA / Docker）                  │
│  【既存】管理ダッシュボード・インシデントビュー                           │
│  【IAMS移植】SAMライセンス管理 UI                                        │
│  【IAMS移植】調達管理 UI・承認ワークフロー UI                            │
│  【IAMS移植】Grafana 埋め込みパネル                                      │
│  【IAMS移植】PWA Service Worker（オフライン対応）                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 追加ディレクトリ構成（IAMS 移植分）

```
AEGIS-SIGHT（統合後）
├── aegis-sight-api/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── sam.py              # SAMライセンス管理API【IAMS移植】
│   │   │   ├── procurement.py      # 調達管理API【IAMS移植】
│   │   │   └── metrics.py          # Prometheusメトリクス受信API【IAMS移植】
│   │   ├── models/
│   │   │   ├── license.py          # ライセンスモデル【IAMS移植】
│   │   │   └── procurement.py      # 調達モデル【IAMS移植】
│   │   └── services/
│   │       ├── sam_service.py      # SAM照合ロジック【IAMS移植】
│   │       └── procurement_service.py # 調達ワークフロー【IAMS移植】
│   └── tests/
│       ├── test_sam.py             # SAMテスト【IAMS 1,157件から変換】
│       └── test_procurement.py     # 調達テスト【IAMS変換】
├── aegis-sight-web/
│   ├── app/
│   │   ├── sam/                    # SAM管理UI【IAMS移植】
│   │   │   ├── licenses/           # ライセンス一覧・登録
│   │   │   ├── compliance/         # ライセンス照合結果
│   │   │   └── reports/            # SAMレポート（J-SOX）
│   │   └── procurement/            # 調達管理UI【IAMS移植】
│   │       ├── requests/           # 調達申請
│   │       ├── approvals/          # 承認ダッシュボード
│   │       ├── received/           # 受領登録
│   │       └── disposal/           # 廃棄申請
│   └── public/
│       └── manifest.json           # PWA マニフェスト【IAMS移植】
└── aegis-sight-infra/
    └── observability/              # 可観測性スタック【IAMS移植】
        ├── prometheus/
        │   └── prometheus.yml      # スクレイプ設定
        └── grafana/
            ├── dashboards/         # ダッシュボード JSON
            └── datasources/        # データソース設定
```

---

## 2. データベース設計（IAMS 移植分）

### 2.1 SAM ライセンス管理テーブル

#### software_licenses テーブル
```sql
CREATE TABLE software_licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_name   VARCHAR(500) NOT NULL,           -- ソフトウェア名
    vendor          VARCHAR(200),                    -- ベンダー名
    license_type    VARCHAR(50) CHECK (license_type IN (
                        'perpetual','subscription','oem','volume','freeware','open_source')),
    license_key     VARCHAR(500),                    -- ライセンスキー（暗号化）
    purchased_count INTEGER NOT NULL DEFAULT 0,      -- 購入ライセンス数
    installed_count INTEGER DEFAULT 0,               -- 検出インストール数（自動更新）
    m365_assigned   INTEGER DEFAULT 0,               -- M365 Graph API取得割当数
    cost_per_unit   DECIMAL(12,2),                   -- 単価（円）
    currency        VARCHAR(3) DEFAULT 'JPY',
    purchase_date   DATE,
    expiry_date     DATE,                            -- ライセンス有効期限
    vendor_contract_id VARCHAR(200),                 -- ベンダー管理番号
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ライセンス超過チェックビュー
CREATE VIEW license_compliance_view AS
SELECT
    sl.id,
    sl.software_name,
    sl.purchased_count,
    sl.installed_count,
    sl.installed_count - sl.purchased_count AS over_count,
    CASE
        WHEN sl.installed_count > sl.purchased_count THEN 'OVER'
        WHEN sl.installed_count = sl.purchased_count THEN 'AT_LIMIT'
        ELSE 'OK'
    END AS compliance_status,
    sl.expiry_date,
    CASE
        WHEN sl.expiry_date IS NOT NULL
             AND sl.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        WHEN sl.expiry_date IS NOT NULL
             AND sl.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        ELSE 'VALID'
    END AS expiry_status
FROM software_licenses sl;
```

### 2.2 調達管理テーブル

#### procurement_requests テーブル
```sql
CREATE TABLE procurement_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number  VARCHAR(30) UNIQUE NOT NULL,     -- PRC-2026-0001 形式
    item_name       VARCHAR(500) NOT NULL,            -- 品目名
    category        VARCHAR(30) CHECK (category IN ('hardware','software','service','consumable')),
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,2),
    total_price     DECIMAL(12,2),
    requester_id    UUID REFERENCES users(id),
    department_id   UUID REFERENCES departments(id),
    purpose         TEXT,                            -- 調達目的
    status          VARCHAR(30) DEFAULT 'draft',
    -- draft → submitted → approved → ordered → received → registered → active → disposed
    approver_id     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    ordered_at      TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    asset_id        UUID REFERENCES assets(id),      -- 受領後に資産台帳とリンク
    disposal_at     TIMESTAMPTZ,
    disposal_cert   TEXT,                            -- 廃棄証明書ファイルパス
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_procurement_status ON procurement_requests(status);
CREATE INDEX idx_procurement_requester ON procurement_requests(requester_id);
```

---

## 3. SAM ライセンス照合エンジン

### 3.1 照合ロジック（sam_service.py）

```python
class SAMService:
    """
    AEGIS-SIGHT の SW インベントリ収集結果と
    software_licenses テーブルを自動照合する。
    Celery タスクとして 1日1回（03:00）実行。
    """
    async def run_compliance_check(self) -> ComplianceCheckResult:
        # 1. 全端末の SW インベントリ（過去24h収集分）を集計
        installed = await self.db.aggregate_installed_software()
        # 2. ライセンス登録との照合
        violations = []
        for sw_name, count in installed.items():
            license = await self.db.find_license(sw_name)
            if license is None:
                # 未登録ソフトウェア検出
                violations.append(Violation(
                    type='UNLICENSED', software=sw_name, count=count
                ))
            elif count > license.purchased_count:
                # ライセンス超過
                violations.append(Violation(
                    type='OVER_LICENSE',
                    software=sw_name,
                    purchased=license.purchased_count,
                    installed=count,
                    over=count - license.purchased_count
                ))
            # DB の installed_count を更新
            await self.db.update_installed_count(license.id, count)

        if violations:
            await self.alert_service.send_sam_violation_alert(violations)

        return ComplianceCheckResult(
            check_date=date.today(),
            total_licenses=len(installed),
            violations=violations
        )

    async def sync_m365_licenses(self) -> None:
        """Microsoft Graph API で M365 ライセンス割当数を同期"""
        m365_licenses = await self.graph_client.get_subscribed_skus()
        for sku in m365_licenses:
            await self.db.upsert_m365_license(
                sku_part_number=sku['skuPartNumber'],
                consumed=sku['consumedUnits'],
                enabled=sku['prepaidUnits']['enabled']
            )
```

---

## 4. Prometheus/Grafana 可観測性スタック

### 4.1 Prometheus 設定（prometheus.yml）

```yaml
global:
  scrape_interval: 60s
  evaluation_interval: 60s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # AEGIS-SIGHT API サーバ
  - job_name: 'aegis-sight-api'
    static_configs:
      - targets: ['aegis-sight-api:8000']
    metrics_path: '/metrics'

  # Windows エンドポイント（Windows Exporter）
  - job_name: 'windows-endpoints'
    file_sd_configs:
      - files: ['/etc/prometheus/targets/windows_*.yml']
        refresh_interval: 5m
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # PostgreSQL
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

### 4.2 Grafana ダッシュボード構成

| ダッシュボード名 | 表示内容 |
|---------------|---------|
| AEGIS-SIGHT Overview | 全端末ステータス・アラートサマリ・ライセンス遵守率 |
| Windows Endpoints | CPU/メモリ/ディスク/ネットワーク per 端末 |
| SAM License Status | ライセンス購入数/インストール数/超過一覧 |
| Procurement Pipeline | 調達申請ステータス・月次調達費用トレンド |
| Security Posture | Defender状態・BitLocker状態・パッチ適用率 |

### 4.3 アラートルール（rules/aegis_alerts.yml）

```yaml
groups:
  - name: endpoint_alerts
    rules:
      - alert: HighCPUUsage
        expr: windows_cpu_time_total{mode!="idle"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU使用率90%超過: {{ $labels.instance }}"

      - alert: LowDiskSpace
        expr: (windows_logical_disk_free_bytes / windows_logical_disk_size_bytes) < 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ディスク残量10%未満: {{ $labels.instance }} {{ $labels.volume }}"

  - name: sam_alerts
    rules:
      - alert: LicenseOveruse
        expr: aegis_license_installed_count > aegis_license_purchased_count
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "ライセンス超過: {{ $labels.software_name }}"
```

---

## 5. PWA 実装設計

### 5.1 Service Worker（service-worker.ts）

```typescript
const CACHE_NAME = 'aegis-sight-v1';
const ASSET_CACHE_STRATEGY = [
  '/api/v1/assets',      // 資産一覧（直近30日分）
  '/api/v1/sam/licenses', // ライセンス一覧
  '/offline.html'
];

// インストール時にキャッシュ
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSET_CACHE_STRATEGY))
  );
});

// フェッチ戦略: Network First、失敗時はキャッシュ
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.url.includes('/api/v1/assets')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 成功したらキャッシュ更新
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))  // オフライン時はキャッシュ返却
    );
  }
});

// オンライン復帰時の同期（Background Sync API）
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-offline-operations') {
    event.waitUntil(syncOfflineOperations());
  }
});
```

### 5.2 PWA マニフェスト（manifest.json）

```json
{
  "name": "AEGIS-SIGHT IT管理",
  "short_name": "AEGIS-SIGHT",
  "description": "みらい建設工業 ITエンドポイント管理システム",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#1A3A5C",
  "theme_color": "#2563EB",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "categories": ["business", "productivity"]
}
```

---

## 6. 調達ワークフロー設計

### 6.1 ステータス遷移

```
draft（起票）
  → submitted（提出）
    → approved（上長承認）
      → rejected（却下）
      → ordered（発注）
        → received（受領）
          → registered（資産台帳登録）← AEGIS-SIGHT 資産台帳と自動連携
            → active（使用中）
              → disposal_requested（廃棄申請）
                → disposed（廃棄完了・台帳除却）
```

### 6.2 資産台帳との自動連携（procurement_service.py）

```python
class ProcurementService:
    async def mark_as_received(self, request_id: UUID,
                               received_info: ReceivedInfo) -> None:
        """受領処理と資産台帳への自動登録"""
        request = await self.db.get_request(request_id)

        if request.category == 'hardware':
            # AEGIS-SIGHT 資産台帳に自動登録
            asset = AssetCreate(
                asset_name=request.item_name,
                asset_type='hardware',
                serial_number=received_info.serial_number,
                purchase_date=received_info.received_date,
                purchase_cost=request.total_price,
                department_id=request.department_id,
                status='unassigned',
                procurement_request_id=request_id
            )
            asset_id = await self.asset_service.create(asset)
            # 調達申請と資産レコードをリンク
            await self.db.link_asset_to_request(request_id, asset_id)

        await self.db.update_status(request_id, 'received',
                                     received_at=received_info.received_date)
```

---

## 7. テスト資産変換計画（IAMS 1,157件 → pytest）

### 7.1 変換方針

| IAMS テスト種別 | 件数（推定） | 変換方針 |
|--------------|------------|---------|
| Jest 単体テスト（フロント） | 約400件 | Next.js コンポーネントテストは Vitest で移植 |
| Jest 統合テスト（API） | 約500件 | AEGIS-SIGHT の pytest + httpx で変換 |
| Jest E2E テスト（Playwright） | 約200件 | Playwright は変換なしで流用可能 |
| カバレッジ対象外・廃棄 | 約57件 | CMDB/インシデント/変更管理関連（廃棄機能のため） |

### 7.2 変換例（SAM 照合テスト）

```python
# tests/test_sam.py（IAMS Jest テスト → pytest 変換例）

@pytest.mark.asyncio
async def test_license_overuse_detection(sam_service, db_session):
    """ライセンス超過を正しく検知すること"""
    # GIVEN: 10ライセンス購入、15台にインストール
    await db_session.execute(insert(SoftwareLicense).values(
        software_name="Adobe Acrobat",
        purchased_count=10
    ))
    # インベントリに15件登録（モック）
    sam_service.inventory_client.get_installed_count = AsyncMock(
        return_value={"Adobe Acrobat": 15}
    )

    # WHEN: コンプライアンスチェック実行
    result = await sam_service.run_compliance_check()

    # THEN: 超過違反が1件検出されること
    violations = [v for v in result.violations if v.type == 'OVER_LICENSE']
    assert len(violations) == 1
    assert violations[0].software == "Adobe Acrobat"
    assert violations[0].over == 5
```

---

## 8. セキュリティ設計（IAMS 追加分）

| 項目 | 設計 |
|------|------|
| ライセンスキー保護 | AES-256-GCM で暗号化してDB保存（Azure Key Vault でキー管理） |
| 調達費用データ | 管理者ロールのみアクセス可（RBAC で制御） |
| 廃棄証明書 | Azure Blob Storage に保存・7年間保持 |
| PWA データ | Service Worker キャッシュは個人識別情報を含まない設計 |
| Prometheus エンドポイント | 社内ネットワーク限定公開（Nginx で外部アクセスブロック） |

---

*🏗️ みらい建設工業 IT部門 | AEGIS-SIGHT × IAMS 選択的統合 詳細設計仕様書 | 2026.03.22*
