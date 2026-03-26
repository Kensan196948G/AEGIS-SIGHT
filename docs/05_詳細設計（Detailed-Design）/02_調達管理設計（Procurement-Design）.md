# 調達管理 詳細設計（Procurement Design）

## 1. 概要

調達管理モジュールは、IT資産の調達プロセスをライフサイクル全体にわたって管理する。調達申請の起票から受領、資産台帳への自動登録までをカバーし、`ProcurementService`がビジネスロジックの中核を担う。

**ステータス遷移:**
`draft` → `submitted` → `approved` → `ordered` → `received` → `registered` → `active` → `disposed`

---

## 2. クラス図

```mermaid
classDiagram
    class ProcurementService {
        -db_session: AsyncSession
        -asset_service: AssetService
        -notification_service: NotificationService
        +create_request(data: ProcurementCreateDTO) ProcurementOrder
        +submit_request(order_id: int) ProcurementOrder
        +approve_request(order_id: int, approver_id: int) ProcurementOrder
        +reject_request(order_id: int, reason: str) ProcurementOrder
        +mark_as_ordered(order_id: int, po_number: str) ProcurementOrder
        +mark_as_received(order_id: int, received_data: ReceivedDTO) ProcurementOrder
        -_auto_register_asset(order: ProcurementOrder) Asset
        -_validate_transition(current: Status, target: Status) bool
        -_notify_status_change(order: ProcurementOrder) None
    }

    class AssetService {
        +create_asset(data: AssetCreateDTO) Asset
        +update_asset(asset_id: int, data: AssetUpdateDTO) Asset
        +get_asset(asset_id: int) Asset
    }

    class ProcurementOrder {
        +id: int
        +request_number: str
        +requester_id: int
        +approver_id: int
        +status: ProcurementStatus
        +vendor_name: str
        +items: list~ProcurementItem~
        +total_amount: Decimal
        +po_number: str
        +requested_date: date
        +approved_date: date
        +ordered_date: date
        +received_date: date
        +notes: str
        +created_at: datetime
        +updated_at: datetime
    }

    class ProcurementItem {
        +id: int
        +order_id: int
        +product_name: str
        +category: AssetCategory
        +quantity: int
        +unit_price: Decimal
        +specifications: dict
        +serial_numbers: list~str~
    }

    class ProcurementStatus {
        <<enumeration>>
        DRAFT
        SUBMITTED
        APPROVED
        REJECTED
        ORDERED
        RECEIVED
        REGISTERED
        ACTIVE
        DISPOSED
    }

    class AssetCategory {
        <<enumeration>>
        PC_DESKTOP
        PC_LAPTOP
        MONITOR
        SERVER
        NETWORK
        PERIPHERAL
        SOFTWARE
        MOBILE
        OTHER
    }

    class ProcurementCreateDTO {
        +vendor_name: str
        +items: list~ItemDTO~
        +notes: str
    }

    class ReceivedDTO {
        +received_date: date
        +serial_numbers: dict~int_list_str~
        +condition_notes: str
        +receiver_id: int
    }

    class Asset {
        +id: int
        +asset_tag: str
        +product_name: str
        +serial_number: str
        +category: AssetCategory
        +status: str
        +procurement_order_id: int
    }

    ProcurementService --> AssetService : uses
    ProcurementService --> ProcurementOrder : manages
    ProcurementOrder --> ProcurementItem : contains
    ProcurementOrder --> ProcurementStatus : has
    ProcurementItem --> AssetCategory : has
    ProcurementService ..> ProcurementCreateDTO : accepts
    ProcurementService ..> ReceivedDTO : accepts
    ProcurementService ..> Asset : creates via AssetService
```

---

## 3. ステータス遷移図

```mermaid
stateDiagram-v2
    [*] --> draft : 起票

    draft --> submitted : submit_request()
    draft --> draft : 編集

    submitted --> approved : approve_request()
    submitted --> rejected : reject_request()
    submitted --> draft : 差し戻し

    rejected --> draft : 再編集
    rejected --> [*] : 取り下げ

    approved --> ordered : mark_as_ordered()

    ordered --> received : mark_as_received()

    received --> registered : _auto_register_asset()
    note right of registered : 資産台帳に自動登録

    registered --> active : 配布・利用開始

    active --> disposed : 廃棄処理
    disposed --> [*]
```

---

## 4. シーケンス図

### 4.1 受領 → 資産台帳自動登録フロー

```mermaid
sequenceDiagram
    participant User as 受領担当者
    participant API as REST API
    participant PS as ProcurementService
    participant DB as PostgreSQL
    participant AS as AssetService
    participant Notify as NotificationService

    User->>API: POST /api/v1/procurement/{id}/receive
    API->>PS: mark_as_received(order_id, received_data)

    PS->>DB: SELECT * FROM procurement_orders WHERE id = order_id
    DB-->>PS: order (status: ordered)

    PS->>PS: _validate_transition(ORDERED → RECEIVED)

    PS->>DB: UPDATE procurement_orders SET status = 'received'
    PS->>DB: UPDATE procurement_items SET serial_numbers = [...]

    loop 各アイテム x 数量分
        PS->>AS: _auto_register_asset(order)
        AS->>AS: asset_tag 自動採番
        AS->>DB: INSERT INTO assets (asset_tag, serial_number, ...)
        DB-->>AS: asset
        AS-->>PS: asset
    end

    PS->>DB: UPDATE procurement_orders SET status = 'registered'
    DB-->>PS: updated

    PS->>Notify: _notify_status_change(order)
    Notify-->>PS: sent

    PS-->>API: ProcurementOrder (status: registered)
    API-->>User: 200 OK
```

### 4.2 調達申請 → 承認フロー

```mermaid
sequenceDiagram
    participant Requester as 申請者
    participant API as REST API
    participant PS as ProcurementService
    participant DB as PostgreSQL
    participant Approver as 承認者
    participant Notify as NotificationService

    Requester->>API: POST /api/v1/procurement
    API->>PS: create_request(data)
    PS->>DB: INSERT INTO procurement_orders (status: draft)
    DB-->>PS: order
    PS-->>API: ProcurementOrder
    API-->>Requester: 201 Created

    Requester->>API: POST /api/v1/procurement/{id}/submit
    API->>PS: submit_request(order_id)
    PS->>DB: UPDATE SET status = 'submitted'
    PS->>Notify: 承認依頼通知
    Notify-->>Approver: メール/Teams通知

    Approver->>API: POST /api/v1/procurement/{id}/approve
    API->>PS: approve_request(order_id, approver_id)
    PS->>DB: UPDATE SET status = 'approved', approved_date, approver_id
    PS->>Notify: 承認完了通知
    Notify-->>Requester: メール/Teams通知
    PS-->>API: ProcurementOrder (status: approved)
    API-->>Approver: 200 OK
```

---

## 5. API仕様

### 5.1 調達申請作成

| 項目 | 値 |
|---|---|
| **エンドポイント** | `POST /api/v1/procurement` |
| **認証** | Bearer Token (JWT) |
| **権限** | `procurement:create` |

**リクエストボディ:**

```json
{
  "vendor_name": "Dell Technologies",
  "items": [
    {
      "product_name": "Dell Latitude 5550",
      "category": "PC_LAPTOP",
      "quantity": 10,
      "unit_price": 185000,
      "specifications": {
        "cpu": "Intel Core Ultra 7",
        "memory": "32GB",
        "storage": "512GB NVMe"
      }
    }
  ],
  "notes": "2026年度新入社員用"
}
```

**レスポンス (201):**

```json
{
  "id": 101,
  "request_number": "PR-2026-0101",
  "status": "draft",
  "vendor_name": "Dell Technologies",
  "items": [...],
  "total_amount": "1850000.00",
  "created_at": "2026-03-27T10:00:00+09:00"
}
```

### 5.2 受領処理

| 項目 | 値 |
|---|---|
| **エンドポイント** | `POST /api/v1/procurement/{id}/receive` |
| **認証** | Bearer Token (JWT) |
| **権限** | `procurement:receive` |

**リクエストボディ:**

```json
{
  "received_date": "2026-04-10",
  "serial_numbers": {
    "1": ["DELL-SN-001", "DELL-SN-002", "DELL-SN-003"]
  },
  "condition_notes": "全数検品完了。外装破損なし。",
  "receiver_id": 42
}
```

**レスポンス (200):**

```json
{
  "id": 101,
  "request_number": "PR-2026-0101",
  "status": "registered",
  "received_date": "2026-04-10",
  "registered_assets": [
    {
      "asset_tag": "AST-2026-04-0001",
      "serial_number": "DELL-SN-001",
      "product_name": "Dell Latitude 5550"
    }
  ]
}
```

### 5.3 ステータス変更API一覧

| エンドポイント | メソッド | 権限 | 遷移 |
|---|---|---|---|
| `/api/v1/procurement/{id}/submit` | POST | `procurement:create` | draft → submitted |
| `/api/v1/procurement/{id}/approve` | POST | `procurement:approve` | submitted → approved |
| `/api/v1/procurement/{id}/reject` | POST | `procurement:approve` | submitted → rejected |
| `/api/v1/procurement/{id}/order` | POST | `procurement:order` | approved → ordered |
| `/api/v1/procurement/{id}/receive` | POST | `procurement:receive` | ordered → received → registered |
| `/api/v1/procurement/{id}/activate` | POST | `procurement:manage` | registered → active |
| `/api/v1/procurement/{id}/dispose` | POST | `procurement:manage` | active → disposed |

### 5.4 調達一覧取得

| 項目 | 値 |
|---|---|
| **エンドポイント** | `GET /api/v1/procurement` |
| **認証** | Bearer Token (JWT) |
| **権限** | `procurement:read` |

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `status` | string | No | ステータスフィルタ |
| `vendor_name` | string | No | ベンダー名部分一致 |
| `date_from` | string | No | 申請日From |
| `date_to` | string | No | 申請日To |
| `page` | int | No | ページ番号 |
| `per_page` | int | No | 1ページあたり件数 |

---

## 6. データフロー

```mermaid
flowchart TB
    subgraph ユーザー操作
        Requester[申請者]
        Approver[承認者]
        Receiver[受領担当]
    end

    subgraph AEGIS-SIGHT
        subgraph API Layer
            ProcAPI[Procurement API]
        end

        subgraph Service Layer
            PS[ProcurementService]
            AS[AssetService]
        end

        subgraph Database
            TblOrder[(procurement_orders)]
            TblItem[(procurement_items)]
            TblAsset[(assets)]
            TblAudit[(procurement_audit_log)]
        end

        subgraph 通知
            Notify[NotificationService]
        end
    end

    Requester -->|起票・提出| ProcAPI
    Approver -->|承認・却下| ProcAPI
    Receiver -->|受領登録| ProcAPI

    ProcAPI --> PS
    PS --> TblOrder
    PS --> TblItem
    PS --> TblAudit
    PS --> AS
    AS --> TblAsset
    PS --> Notify

    Notify -->|メール| Requester
    Notify -->|メール| Approver
```

---

## 7. データベース設計

### 7.1 procurement_orders テーブル

```sql
CREATE TABLE procurement_orders (
    id              SERIAL PRIMARY KEY,
    request_number  VARCHAR(20) NOT NULL UNIQUE,
    requester_id    INTEGER NOT NULL REFERENCES users(id),
    approver_id     INTEGER REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    vendor_name     VARCHAR(255) NOT NULL,
    total_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    po_number       VARCHAR(50),
    requested_date  DATE,
    approved_date   DATE,
    ordered_date    DATE,
    received_date   DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_status CHECK (
        status IN ('draft','submitted','approved','rejected',
                   'ordered','received','registered','active','disposed')
    )
);

CREATE INDEX idx_po_status ON procurement_orders (status);
CREATE INDEX idx_po_requester ON procurement_orders (requester_id);
CREATE INDEX idx_po_vendor ON procurement_orders (vendor_name);
```

### 7.2 procurement_items テーブル

```sql
CREATE TABLE procurement_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES procurement_orders(id) ON DELETE CASCADE,
    product_name    VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12, 2) NOT NULL,
    specifications  JSONB DEFAULT '{}',
    serial_numbers  JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_price_positive CHECK (unit_price >= 0)
);

CREATE INDEX idx_pi_order ON procurement_items (order_id);
```

### 7.3 procurement_audit_log テーブル

```sql
CREATE TABLE procurement_audit_log (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES procurement_orders(id),
    action          VARCHAR(50) NOT NULL,
    from_status     VARCHAR(20),
    to_status       VARCHAR(20),
    performed_by    INTEGER NOT NULL REFERENCES users(id),
    details         JSONB DEFAULT '{}',
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pal_order ON procurement_audit_log (order_id);
CREATE INDEX idx_pal_date ON procurement_audit_log (performed_at DESC);
```

---

## 8. ステータス遷移バリデーション

```python
# app/services/procurement_service.py

VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft":      ["submitted"],
    "submitted":  ["approved", "rejected", "draft"],
    "approved":   ["ordered"],
    "rejected":   ["draft"],
    "ordered":    ["received"],
    "received":   ["registered"],
    "registered": ["active"],
    "active":     ["disposed"],
    "disposed":   [],
}

class ProcurementService:
    def _validate_transition(self, current: str, target: str) -> bool:
        """ステータス遷移の妥当性を検証"""
        allowed = VALID_TRANSITIONS.get(current, [])
        if target not in allowed:
            raise InvalidTransitionError(
                f"遷移不可: {current} → {target} "
                f"(許可: {allowed})"
            )
        return True

    async def mark_as_received(
        self, order_id: int, received_data: ReceivedDTO
    ) -> ProcurementOrder:
        """受領処理 → 資産台帳自動登録"""
        order = await self._get_order(order_id)
        self._validate_transition(order.status, "received")

        # ステータス更新: received
        order.status = "received"
        order.received_date = received_data.received_date

        # シリアル番号をアイテムに紐付け
        for item_id_str, serials in received_data.serial_numbers.items():
            item = await self._get_item(int(item_id_str))
            item.serial_numbers = serials

        # 資産台帳への自動登録
        registered_assets = await self._auto_register_asset(order)

        # ステータス更新: registered
        order.status = "registered"

        # 監査ログ記録
        await self._audit_log(order, "received_and_registered", received_data.receiver_id)

        # 通知
        await self._notify_status_change(order)

        await self.db_session.commit()
        return order

    async def _auto_register_asset(self, order: ProcurementOrder) -> list:
        """受領済みアイテムから資産を自動登録"""
        assets = []
        for item in order.items:
            for serial in item.serial_numbers:
                asset = await self.asset_service.create_asset(
                    AssetCreateDTO(
                        product_name=item.product_name,
                        serial_number=serial,
                        category=item.category,
                        procurement_order_id=order.id,
                        status="registered",
                    )
                )
                assets.append(asset)
        return assets
```

---

## 9. エラーハンドリング

| エラー | HTTPステータス | 対処 |
|---|---|---|
| `InvalidTransitionError` | 409 Conflict | 不正なステータス遷移を拒否 |
| `OrderNotFoundError` | 404 Not Found | 指定IDの注文が存在しない |
| `DuplicateSerialNumberError` | 422 Unprocessable Entity | シリアル番号重複 |
| `InsufficientPermissionError` | 403 Forbidden | 権限不足 |
| `ApprovalRequiredError` | 422 Unprocessable Entity | 承認者未設定のまま承認操作 |
