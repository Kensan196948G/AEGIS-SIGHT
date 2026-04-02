# Phase C: IAMS選択移植（IAMS Selective Migration）

| 項目 | 内容 |
|------|------|
| **フェーズ** | Phase C |
| **名称** | 🔄 IAMS選択移植 |
| **期間** | 2026-04-01 〜 2026-06-30（3ヶ月） |
| **状態** | 🔄 進行中（約35%完了） |
| **担当** | Developer / QA |

---

## 🎯 目標

IAMSの1,157件のJestテストをpytest形式に変換し、AEGIS-SIGHTの品質基盤を確立する。
選択移植機能（SAM・調達・M365・通知）の完全統合を完了する。

---

## 📋 IAMS移植対象機能

### ✅ 移植する機能

| 機能 | 移植理由 | 状態 |
|------|---------|------|
| 📊 Prometheus/Grafana | インフラ可観測性・監視ダッシュボード | ⏳ Phase D |
| 📱 PWA対応 | 建設現場オフライン端末対応 | ⏳ Phase D |
| 🛒 調達管理 | 調達→受領→廃棄ライフサイクル | ✅ API完了 |
| 📦 SAMライセンス管理 | ライセンス期限アラート | ✅ API完了 |
| 🧪 1,157テスト資産 | Jest→pytest変換 品質保証 | 🔄 進行中 |

### ❌ 移植しない機能

| 機能 | 除外理由 |
|------|---------|
| CMDB | AEGIS-SIGHTと重複 |
| インシデント管理 | ITSM-Systemと重複 |
| SLA管理 | ITSM-Systemと重複（AEGIS-SIGHTに独自実装済み） |
| 変更管理 | ITSM-Systemと重複 |

---

## 🧪 pytest変換進捗

### IAMS Phase → AEGIS-SIGHT Phase マッピング

| IAMS Phase | 内容 | AEGIS Phase | pytest移植状態 | PR# |
|-----------|------|------------|-------------|-----|
| IAMS Phase01-10 | 基本CRUD・認証 | Phase92-94 | ✅ マージ済み | #164-166 |
| IAMS Phase11-20 | デバイス詳細 | Phase95 | ✅ マージ済み | #167 |
| IAMS Phase21-30 | ユーザー・権限 | Phase96 | ✅ マージ済み | #168 |
| IAMS Phase31-40 | ワークフロー基本 | Phase97 | ✅ マージ済み | #169 |
| IAMS Phase41-44 | ポリシー・アラート・セッション・設定 | Phase98 | ✅ マージ済み | - |
| IAMS Phase45-46 | ログ・エクスポート・印刷・リモートワーク | Phase99 | ✅ マージ済み | #170 |
| IAMS Phase47 | M365・通知・部署・ソフトウェア | Phase99 | ✅ マージ済み | #170 |
| IAMS Phase48 | ナレッジ・調達・SAM詳細 | Phase100 | ✅ マージ済み | #171 |
| IAMS Phase49 | ナレッジベース・FAQ・ヘルプ | Phase101+ | ⏳ 予定 | - |
| IAMS Phase50-70 | 残りの詳細テスト | Phase102+ | ⏳ 未開始 | - |
| IAMS Phase71-100 | 高度なワークフロー | Phase110+ | ⏳ 未開始 | - |

### pytest変換パターン

```python
# 標準パターン：認証必須テスト
async def test_endpoint_requires_auth(self, client: AsyncClient):
    response = await client.get("/api/v1/resource")
    assert response.status_code == 401

# 標準パターン：ページネーション確認
async def test_list_returns_paginated(self, client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/resource", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    for field in ("items", "total", "offset", "limit", "has_more"):
        assert field in data

# 標準パターン：404確認（存在しないリソース）
async def test_get_nonexistent_returns_404(self, client: AsyncClient, auth_headers: dict):
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/v1/resource/{fake_id}", headers=auth_headers)
    assert response.status_code == 404

# 標準パターン：422確認（必須フィールド欠損）
async def test_create_missing_required_returns_422(self, client, auth_headers):
    response = await client.post("/api/v1/resource", json={}, headers=auth_headers)
    assert response.status_code == 422
```

### 特殊パターン

| パターン | 説明 | 例 |
|---------|------|---|
| Admin/Role | 管理者専用エンドポイント | `status_code in (200, 403)` |
| 外部サービス | M365/VPN未接続時 | `status_code in (200, 503, 422)` |
| リスト返却 | ページネーションなし | `assert status_code == 200`のみ |

---

## 📅 詳細スケジュール（Phase C期間）

| 週 | 期間 | 目標AEGIS Phase | IAMS変換数 |
|----|------|----------------|-----------|
| W1 | 2026-04-01〜07 | Phase100-102 | 約100件 |
| W2 | 2026-04-08〜14 | Phase103-105 | 約100件 |
| W3 | 2026-04-15〜21 | Phase106-108 | 約100件 |
| W4 | 2026-04-22〜28 | Phase109-111 | 約100件 |
| W5-8 | 2026-04-29〜05-26 | Phase112-120 | 約300件 |
| W9-12 | 2026-05-27〜06-23 | Phase121-130 | 約350件 |
| W13 | 2026-06-24〜30 | Phase131-135 | 最終調整 |

---

## ✅ 品質基準

| 基準 | 目標値 |
|------|-------|
| pytest変換完了 | 1,157件中1,000件以上 |
| テスト成功率 | 95%以上 |
| `pytestmark = pytest.mark.iams` | 全ファイルに付与 |
| 1ファイルあたりテスト数 | 30-40件 |

---

## 📁 ファイル構成

```
aegis-sight-api/tests/iams/
├── conftest.py
├── test_iams_policies_alerts_sessions_config.py     # Phase98
├── test_iams_logs_export_printing_remote_work.py    # Phase99
├── test_iams_m365_notifications_departments_software.py  # Phase99
├── test_iams_knowledge_procurement_workflow.py      # Phase100
└── test_iams_phase49_*.py                           # Phase101〜（予定）
```

---

*最終更新: 2026-04-02 | Phase C 進行中*
