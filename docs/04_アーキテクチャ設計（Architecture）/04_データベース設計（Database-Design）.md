# 04. データベース設計（Database Design）

## 1. 概要

AEGIS-SIGHTのデータベースはPostgreSQL 16を使用し、資産管理DB・SAM DB・調達DBの3つの論理データベースを1つの物理インスタンス上にスキーマ分離で構成する。キャッシュ層としてRedis 7を併用する。

## 2. スキーマ構成

| スキーマ | 用途 | 主要テーブル |
|---------|------|-------------|
| `public` | 共通マスタ・認証 | users, departments, audit_logs |
| `asset` | 資産管理 | assets, asset_history, asset_software |
| `sam` | ソフトウェア資産管理 | software_licenses, license_assignments |
| `procurement` | 調達管理 | procurement_requests, procurement_items, vendors |

## 3. ER図（概要）

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   users      │     │    assets        │     │ software_licenses │
│──────────────│     │──────────────────│     │───────────────────│
│ id (PK)      │◀───┐│ id (PK)          │    ┌│ id (PK)           │
│ email        │    ││ asset_tag        │    ││ software_name     │
│ display_name │    ││ hostname         │    ││ vendor            │
│ role         │    ││ assigned_user_id │────┘│ license_type      │
│ department_id│    ││ department_id    │     │ total_quantity    │
└──────┬───────┘    │└──────────────────┘     └───────┬───────────┘
       │            │                                  │
       │            │  ┌──────────────────┐            │
       │            │  │ asset_history    │            │
       │            │  │──────────────────│            │
       │            └──│ asset_id (FK)    │            │
       │               │ changed_by (FK)  │────────────┘
       │               │ field_name       │
       │               │ old_value        │   ┌───────────────────────┐
       │               │ new_value        │   │ license_assignments   │
       │               └──────────────────┘   │───────────────────────│
       │                                      │ id (PK)               │
       │            ┌─────────────────────┐   │ license_id (FK)       │
       │            │ procurement_requests│   │ asset_id (FK)         │
       │            │─────────────────────│   │ user_id (FK)          │
       └───────────▶│ requester_id (FK)   │   └───────────────────────┘
                    │ approver_id (FK)    │
                    │ vendor_id (FK)      │   ┌───────────────────────┐
                    │ status              │   │ vendors               │
                    └─────────┬───────────┘   │───────────────────────│
                              │               │ id (PK)               │
                    ┌─────────▼───────────┐   │ name                  │
                    │ procurement_items   │   │ contact_email         │
                    │─────────────────────│   └───────────────────────┘
                    │ request_id (FK)     │
                    │ item_name           │
                    │ quantity            │
                    │ unit_price          │
                    └─────────────────────┘
```

## 4. テーブル定義（CREATE TABLE）

### 4.1 共通スキーマ（public）

#### users テーブル

```sql
CREATE TABLE public.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255),                    -- OIDC利用時はNULL
    role            VARCHAR(20) NOT NULL DEFAULT 'readonly'
                    CHECK (role IN ('admin', 'operator', 'auditor', 'readonly')),
    department_id   UUID REFERENCES public.departments(id),
    entra_id        VARCHAR(255) UNIQUE,             -- Microsoft Entra ID (OIDC用)
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_entra_id ON public.users(entra_id) WHERE entra_id IS NOT NULL;
```

#### departments テーブル

```sql
CREATE TABLE public.departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    code            VARCHAR(20) NOT NULL UNIQUE,
    parent_id       UUID REFERENCES public.departments(id),
    manager_id      UUID REFERENCES public.users(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_code ON public.departments(code);
CREATE INDEX idx_departments_parent ON public.departments(parent_id);
```

#### audit_logs テーブル

```sql
CREATE TABLE public.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES public.users(id),
    action          VARCHAR(50) NOT NULL
                    CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject')),
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     UUID,
    details         JSONB,                           -- 変更内容の詳細
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
```

### 4.2 資産管理スキーマ（asset）

#### assets テーブル

```sql
CREATE SCHEMA IF NOT EXISTS asset;

CREATE TABLE asset.assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag       VARCHAR(50) NOT NULL UNIQUE,     -- 資産管理番号
    hostname        VARCHAR(255),
    asset_type      VARCHAR(30) NOT NULL
                    CHECK (asset_type IN ('desktop', 'laptop', 'server', 'tablet', 'smartphone',
                                          'printer', 'network', 'monitor', 'peripheral', 'other')),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'maintenance', 'retired', 'lost', 'disposed')),
    manufacturer    VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100),
    os_name         VARCHAR(100),
    os_version      VARCHAR(50),
    cpu_info        VARCHAR(200),
    ram_gb          INTEGER,
    storage_gb      INTEGER,
    ip_address      INET,
    mac_address     MACADDR,
    location        VARCHAR(200),
    department_id   UUID REFERENCES public.departments(id),
    assigned_user_id UUID REFERENCES public.users(id),
    purchase_date   DATE,
    warranty_expiry DATE,
    purchase_cost   DECIMAL(12, 2),
    currency        VARCHAR(3) DEFAULT 'JPY',
    notes           TEXT,
    custom_fields   JSONB DEFAULT '{}',              -- カスタムフィールド（拡張用）
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,  -- 論理削除
    last_seen_at    TIMESTAMPTZ,                     -- エージェント最終通信日時
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_tag ON asset.assets(asset_tag);
CREATE INDEX idx_assets_hostname ON asset.assets(hostname);
CREATE INDEX idx_assets_type ON asset.assets(asset_type);
CREATE INDEX idx_assets_status ON asset.assets(status);
CREATE INDEX idx_assets_department ON asset.assets(department_id);
CREATE INDEX idx_assets_assigned_user ON asset.assets(assigned_user_id);
CREATE INDEX idx_assets_serial ON asset.assets(serial_number);
CREATE INDEX idx_assets_not_deleted ON asset.assets(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_assets_last_seen ON asset.assets(last_seen_at);
```

#### asset_history テーブル

```sql
CREATE TABLE asset.asset_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID NOT NULL REFERENCES asset.assets(id),
    changed_by      UUID REFERENCES public.users(id),
    change_type     VARCHAR(20) NOT NULL
                    CHECK (change_type IN ('create', 'update', 'status_change', 'assign', 'unassign')),
    field_name      VARCHAR(50),
    old_value       TEXT,
    new_value       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_history_asset ON asset.asset_history(asset_id);
CREATE INDEX idx_asset_history_created ON asset.asset_history(created_at DESC);
```

#### asset_software テーブル（資産にインストールされたソフトウェア）

```sql
CREATE TABLE asset.asset_software (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID NOT NULL REFERENCES asset.assets(id),
    software_name   VARCHAR(200) NOT NULL,
    version         VARCHAR(50),
    publisher       VARCHAR(100),
    install_date    DATE,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_software_asset ON asset.asset_software(asset_id);
CREATE INDEX idx_asset_software_name ON asset.asset_software(software_name);
```

### 4.3 SAMスキーマ（sam）

#### software_licenses テーブル

```sql
CREATE SCHEMA IF NOT EXISTS sam;

CREATE TABLE sam.software_licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_name   VARCHAR(200) NOT NULL,
    vendor          VARCHAR(100) NOT NULL,
    license_type    VARCHAR(30) NOT NULL
                    CHECK (license_type IN ('perpetual', 'subscription', 'oem', 'volume', 'site', 'freeware', 'open_source')),
    license_key     VARCHAR(500),                    -- 暗号化して保存
    license_model   VARCHAR(30) DEFAULT 'per_device'
                    CHECK (license_model IN ('per_device', 'per_user', 'per_core', 'per_instance', 'concurrent', 'site')),
    total_quantity  INTEGER NOT NULL DEFAULT 0,
    used_quantity   INTEGER NOT NULL DEFAULT 0,      -- 割当済み数（キャッシュ）
    purchase_date   DATE,
    expiry_date     DATE,                            -- サブスクリプション期限
    cost_per_unit   DECIMAL(12, 2),
    total_cost      DECIMAL(14, 2),
    currency        VARCHAR(3) DEFAULT 'JPY',
    contract_number VARCHAR(100),
    vendor_contact  VARCHAR(255),
    support_level   VARCHAR(30)
                    CHECK (support_level IN ('none', 'basic', 'standard', 'premium', 'enterprise')),
    support_expiry  DATE,
    m365_sku_id     VARCHAR(100),                    -- M365連携用SKU ID
    compliance_status VARCHAR(20) DEFAULT 'compliant'
                    CHECK (compliance_status IN ('compliant', 'over_licensed', 'under_licensed', 'expiring', 'expired')),
    notes           TEXT,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID REFERENCES public.users(id),
    updated_by      UUID REFERENCES public.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_licenses_software ON sam.software_licenses(software_name);
CREATE INDEX idx_licenses_vendor ON sam.software_licenses(vendor);
CREATE INDEX idx_licenses_type ON sam.software_licenses(license_type);
CREATE INDEX idx_licenses_expiry ON sam.software_licenses(expiry_date);
CREATE INDEX idx_licenses_compliance ON sam.software_licenses(compliance_status);
CREATE INDEX idx_licenses_m365 ON sam.software_licenses(m365_sku_id) WHERE m365_sku_id IS NOT NULL;
CREATE INDEX idx_licenses_not_deleted ON sam.software_licenses(is_deleted) WHERE is_deleted = FALSE;
```

#### license_assignments テーブル

```sql
CREATE TABLE sam.license_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id      UUID NOT NULL REFERENCES sam.software_licenses(id),
    asset_id        UUID REFERENCES asset.assets(id),       -- デバイスライセンスの場合
    user_id         UUID REFERENCES public.users(id),       -- ユーザーライセンスの場合
    assigned_by     UUID REFERENCES public.users(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at   TIMESTAMPTZ,                             -- 割当解除日時
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- デバイスまたはユーザーのいずれかは必須
    CONSTRAINT chk_assignment_target CHECK (asset_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX idx_assignments_license ON sam.license_assignments(license_id);
CREATE INDEX idx_assignments_asset ON sam.license_assignments(asset_id);
CREATE INDEX idx_assignments_user ON sam.license_assignments(user_id);
CREATE INDEX idx_assignments_active ON sam.license_assignments(is_active) WHERE is_active = TRUE;
```

### 4.4 調達管理スキーマ（procurement）

#### vendors テーブル

```sql
CREATE SCHEMA IF NOT EXISTS procurement;

CREATE TABLE procurement.vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(20) NOT NULL UNIQUE,
    contact_name    VARCHAR(100),
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    address         TEXT,
    website         VARCHAR(255),
    payment_terms   VARCHAR(100),                    -- 支払条件
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_code ON procurement.vendors(code);
CREATE INDEX idx_vendors_name ON procurement.vendors(name);
```

#### procurement_requests テーブル

```sql
CREATE TABLE procurement.procurement_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number  VARCHAR(30) NOT NULL UNIQUE,     -- 申請番号（自動採番）
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(30) NOT NULL
                    CHECK (category IN ('hardware', 'software', 'license', 'service', 'consumable', 'other')),
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'submitted', 'pending_approval', 'approved', 'rejected',
                                      'ordered', 'delivered', 'completed', 'cancelled')),
    requester_id    UUID NOT NULL REFERENCES public.users(id),
    approver_id     UUID REFERENCES public.users(id),
    vendor_id       UUID REFERENCES procurement.vendors(id),
    department_id   UUID REFERENCES public.departments(id),
    budget_code     VARCHAR(50),
    total_amount    DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'JPY',
    tax_amount      DECIMAL(12, 2) DEFAULT 0,
    requested_delivery_date DATE,
    actual_delivery_date    DATE,
    approved_at     TIMESTAMPTZ,
    rejected_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    ordered_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    notes           TEXT,
    attachments     JSONB DEFAULT '[]',              -- 添付ファイルメタデータ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_procurement_number ON procurement.procurement_requests(request_number);
CREATE INDEX idx_procurement_status ON procurement.procurement_requests(status);
CREATE INDEX idx_procurement_requester ON procurement.procurement_requests(requester_id);
CREATE INDEX idx_procurement_approver ON procurement.procurement_requests(approver_id);
CREATE INDEX idx_procurement_vendor ON procurement.procurement_requests(vendor_id);
CREATE INDEX idx_procurement_category ON procurement.procurement_requests(category);
CREATE INDEX idx_procurement_created ON procurement.procurement_requests(created_at DESC);
```

#### procurement_items テーブル

```sql
CREATE TABLE procurement.procurement_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL REFERENCES procurement.procurement_requests(id) ON DELETE CASCADE,
    item_name       VARCHAR(200) NOT NULL,
    description     TEXT,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price      DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    currency        VARCHAR(3) DEFAULT 'JPY',
    subtotal        DECIMAL(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    item_category   VARCHAR(30),
    model_number    VARCHAR(100),
    specifications  JSONB DEFAULT '{}',              -- スペック詳細
    delivered_quantity INTEGER DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_procurement_items_request ON procurement.procurement_items(request_id);
```

#### procurement_history テーブル（調達申請のステータス変更履歴）

```sql
CREATE TABLE procurement.procurement_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL REFERENCES procurement.procurement_requests(id),
    changed_by      UUID REFERENCES public.users(id),
    old_status      VARCHAR(20),
    new_status      VARCHAR(20) NOT NULL,
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_procurement_history_request ON procurement.procurement_history(request_id);
CREATE INDEX idx_procurement_history_created ON procurement.procurement_history(created_at DESC);
```

## 5. 自動更新トリガー

```sql
-- updated_at自動更新用の関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガー適用
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON asset.assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_licenses_updated_at
    BEFORE UPDATE ON sam.software_licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_procurement_updated_at
    BEFORE UPDATE ON procurement.procurement_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_procurement_items_updated_at
    BEFORE UPDATE ON procurement.procurement_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 6. ライセンス使用数自動更新トリガー

```sql
-- ライセンス割当時にused_quantityを自動更新
CREATE OR REPLACE FUNCTION update_license_used_quantity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sam.software_licenses
    SET used_quantity = (
        SELECT COUNT(*) FROM sam.license_assignments
        WHERE license_id = COALESCE(NEW.license_id, OLD.license_id)
          AND is_active = TRUE
    )
    WHERE id = COALESCE(NEW.license_id, OLD.license_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assignment_count
    AFTER INSERT OR UPDATE OR DELETE ON sam.license_assignments
    FOR EACH ROW EXECUTE FUNCTION update_license_used_quantity();
```

## 7. Redis キャッシュ設計

| キー | TTL | 用途 |
|------|-----|------|
| `session:<session_id>` | 30分 | ユーザーセッション |
| `asset:list:<hash>` | 5分 | 資産一覧キャッシュ |
| `asset:<id>` | 10分 | 資産詳細キャッシュ |
| `license:list:<hash>` | 5分 | ライセンス一覧キャッシュ |
| `sam:compliance` | 15分 | SAMコンプライアンスレポート |
| `metrics:dashboard` | 1分 | ダッシュボードメトリクス |
| `rate_limit:<ip>:<endpoint>` | 1分 | レート制限カウンター |

## 8. マイグレーション方針

- Alembic（SQLAlchemy Migration Tool）を使用
- マイグレーションファイルはGit管理
- 本番適用前にステージング環境で検証
- ロールバック手順を各マイグレーションに含める

```
backend/app/db/migrations/
├── env.py
├── script.py.mako
└── versions/
    ├── 001_create_users_departments.py
    ├── 002_create_assets.py
    ├── 003_create_sam_tables.py
    ├── 004_create_procurement_tables.py
    └── 005_create_audit_logs.py
```

## 9. バックアップ方針

| 対象 | 方法 | 頻度 | 保持期間 |
|------|------|------|---------|
| PostgreSQL全体 | pg_dump（フルバックアップ） | 日次（深夜2:00） | 30日間 |
| PostgreSQL差分 | WALアーカイブ | 継続 | 7日間 |
| Redis | RDB Snapshot | 1時間ごと | 24時間分 |
