# IAMS pytest変換計画（IAMS Test Conversion Plan）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| 更新日 | 2026-04-02 |
| ステータス | Review |
| 変換元 | IAMS Jest テスト 1,157件 |
| 変換先 | pytest |

---

## 1. 概要

IAMSシステムの既存テスト（Jest / TypeScript）をpytestに変換し、AEGIS-SIGHTのテスト基盤に統合する。1,157件のテストから移植対象を選定し、段階的に変換を進める。

---

## 2. 現状分析

### 2.1 IAMS既存テスト概要

| カテゴリ | テスト数 | 内容 |
|---------|---------|------|
| ユーザー管理 | 187件 | ユーザーCRUD、認証、権限 |
| 資産管理 | 312件 | 資産登録、棚卸、ライフサイクル |
| ライセンス管理 | 198件 | ライセンス割当、期限管理 |
| レポート | 124件 | レポート生成、エクスポート |
| 通知 | 89件 | メール通知、Webhook |
| API共通 | 156件 | バリデーション、エラーハンドリング |
| ユーティリティ | 91件 | ヘルパー関数、データ変換 |
| **合計** | **1,157件** | |

### 2.2 変換対象選定基準

| 基準 | 説明 | 重み |
|------|------|------|
| 移植対象機能 | AEGIS-SIGHTに移植するIAMS機能に関連 | 最高 |
| ビジネスロジック | ドメインロジックのテスト | 高 |
| 境界値・異常系 | エッジケースのテスト | 高 |
| 外部依存少 | モックが少ないテスト（変換容易） | 中 |
| 重複なし | AEGIS-SIGHT側で既にカバー済みでない | 中 |

### 2.3 変換対象・除外の判定

| カテゴリ | 全件数 | 変換対象 | 除外 | 除外理由 |
|---------|--------|---------|------|---------|
| ユーザー管理 | 187 | 120 | 67 | AEGIS-SIGHT独自認証に置換 |
| 資産管理 | 312 | 280 | 32 | UI固有テスト |
| ライセンス管理 | 198 | 175 | 23 | フロントエンド固有 |
| レポート | 124 | 95 | 29 | テンプレート依存 |
| 通知 | 89 | 60 | 29 | メールライブラリ固有 |
| API共通 | 156 | 130 | 26 | Express固有ミドルウェア |
| ユーティリティ | 91 | 80 | 11 | JS固有ユーティリティ |
| **合計** | **1,157** | **940** | **217** | |

---

## 3. 変換ルール

### 3.1 テストフレームワーク対応表

| Jest（変換元） | pytest（変換先） | 備考 |
|---------------|-----------------|------|
| `describe('...')` | `class Test...` または モジュールレベル | pytestはクラス任意 |
| `it('should ...')` | `def test_...():` | 命名規約に従う |
| `beforeAll()` | `@pytest.fixture(scope="module")` | モジュールスコープ |
| `beforeEach()` | `@pytest.fixture` | 関数スコープ（デフォルト） |
| `afterEach()` | fixture の `yield` 後処理 | |
| `afterAll()` | fixture の finalizer | |
| `expect(x).toBe(y)` | `assert x == y` | |
| `expect(x).toEqual(y)` | `assert x == y` | 深い比較 |
| `expect(x).toBeTruthy()` | `assert x` | |
| `expect(x).toThrow()` | `with pytest.raises(...)` | |
| `expect(x).toHaveLength(n)` | `assert len(x) == n` | |
| `expect(x).toContain(y)` | `assert y in x` | |
| `expect(fn).toHaveBeenCalledWith(...)` | `mock.assert_called_with(...)` | |
| `jest.fn()` | `unittest.mock.MagicMock()` | |
| `jest.spyOn(obj, 'method')` | `mocker.patch.object(obj, 'method')` | |
| `jest.mock('module')` | `mocker.patch('module')` | |
| `it.each([...])` | `@pytest.mark.parametrize` | |
| `jest.setTimeout(ms)` | `@pytest.mark.timeout(sec)` | |

### 3.2 アサーション変換例

```javascript
// Jest（変換元）
describe('AssetService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AssetService(mockRepository);
  });

  it('should return asset when found', async () => {
    const asset = { id: 1, name: 'PC-001', type: 'laptop' };
    mockRepository.findById.mockResolvedValue(asset);

    const result = await service.getAsset(1);

    expect(result).toEqual(asset);
    expect(mockRepository.findById).toHaveBeenCalledWith(1);
  });

  it('should throw NotFoundError when asset not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(service.getAsset(999)).rejects.toThrow(NotFoundError);
  });

  it.each([
    ['laptop', true],
    ['desktop', true],
    ['invalid', false],
  ])('should validate asset type "%s" as %s', (type, expected) => {
    expect(service.isValidType(type)).toBe(expected);
  });
});
```

```python
# pytest（変換先）
import pytest
from unittest.mock import AsyncMock

class TestAssetService:
    """資産管理サービステスト（IAMS移植）"""

    @pytest.fixture
    def mock_repository(self):
        repo = AsyncMock()
        return repo

    @pytest.fixture
    def service(self, mock_repository):
        return AssetService(repository=mock_repository)

    async def test_get_asset_returns_asset_when_found(
        self, service, mock_repository
    ):
        """資産が見つかった場合に正しく返却すること"""
        asset = Asset(id=1, name="PC-001", asset_type="laptop")
        mock_repository.find_by_id.return_value = asset

        result = await service.get_asset(1)

        assert result == asset
        mock_repository.find_by_id.assert_called_once_with(1)

    async def test_get_asset_raises_not_found_when_missing(
        self, service, mock_repository
    ):
        """資産が見つからない場合にNotFoundErrorが発生すること"""
        mock_repository.find_by_id.return_value = None

        with pytest.raises(NotFoundError):
            await service.get_asset(999)

    @pytest.mark.parametrize("asset_type,expected", [
        ("laptop", True),
        ("desktop", True),
        ("invalid", False),
    ])
    def test_is_valid_type(self, service, asset_type, expected):
        """資産種別のバリデーションが正しいこと"""
        assert service.is_valid_type(asset_type) == expected
```

### 3.3 データ型変換

| JavaScript/TypeScript | Python | 備考 |
|----------------------|--------|------|
| `string` | `str` | |
| `number` | `int` / `float` | 用途に応じて |
| `boolean` | `bool` | |
| `Date` | `datetime` | |
| `null` / `undefined` | `None` | |
| `Array<T>` | `list[T]` | |
| `Record<K, V>` | `dict[K, V]` | |
| `interface` | `dataclass` / `Pydantic model` | |
| `enum` | `enum.Enum` | |
| `Promise<T>` | `async` / `Coroutine` | |

---

## 4. 変換手順

### 4.1 フェーズ計画

| フェーズ | 期間 | 対象 | 件数 | マイルストーン |
|---------|------|------|------|-------------|
| Phase 1 | Week 1-2 | ユーティリティ・API共通 | 210件 | 基盤テスト完了 |
| Phase 2 | Week 3-5 | 資産管理 | 280件 | コア機能テスト完了 |
| Phase 3 | Week 6-7 | ライセンス管理 | 175件 | ライセンステスト完了 |
| Phase 4 | Week 8-9 | ユーザー管理・通知 | 180件 | 認証連携テスト完了 |
| Phase 5 | Week 10 | レポート | 95件 | 全変換完了 |

### 4.2 各テスト変換手順

```
1. Jest テストファイルを分析
   ├── テスト構造の把握（describe/it のネスト）
   ├── モック対象の特定
   ├── テストデータの抽出
   └── アサーションの列挙

2. Python テストファイルの作成
   ├── ファイル名: test_<IAMS機能名>.py
   ├── マーカー: @pytest.mark.iams
   ├── fixture の定義
   └── テスト関数の実装

3. ドメインモデルの変換（必要な場合）
   ├── TypeScript interface → Pydantic model
   ├── enum → Python Enum
   └── 型アノテーションの付与

4. 動作確認
   ├── pytest 実行
   ├── カバレッジ確認
   └── 元の Jest テストとの結果比較

5. レビュー・マージ
   ├── コードレビュー
   ├── CI通過確認
   └── マージ
```

### 4.3 変換作業テンプレート

```python
# tests/iams/test_<機能名>.py

"""
IAMS移植テスト: <機能名>
変換元: <IAMS側のテストファイルパス>
変換日: YYYY-MM-DD
変換者: <担当者>
元テスト数: XX件
変換テスト数: XX件
除外テスト数: XX件（除外理由: ）
"""

import pytest
from unittest.mock import AsyncMock, patch

pytestmark = [
    pytest.mark.iams,
    pytest.mark.asyncio,
]


class Test<機能名>:
    """<機能名>のテスト（IAMS移植）"""

    @pytest.fixture
    def setup(self):
        """テストセットアップ"""
        # beforeEach に相当
        pass

    # テスト関数群
```

---

## 5. テスト配置

### 5.1 ディレクトリ構成

```
tests/
├── unit/
│   └── ...（AEGIS-SIGHT固有テスト）
├── integration/
│   └── ...（AEGIS-SIGHT固有テスト）
├── iams/                        # IAMS移植テスト
│   ├── __init__.py
│   ├── conftest.py              # IAMS共通fixture
│   ├── asset/
│   │   ├── test_asset_service.py
│   │   ├── test_asset_repository.py
│   │   ├── test_asset_validation.py
│   │   └── test_asset_lifecycle.py
│   ├── license/
│   │   ├── test_license_service.py
│   │   ├── test_license_allocation.py
│   │   └── test_license_expiry.py
│   ├── user/
│   │   ├── test_user_service.py
│   │   └── test_user_permission.py
│   ├── report/
│   │   ├── test_report_generation.py
│   │   └── test_report_export.py
│   ├── notification/
│   │   └── test_notification_service.py
│   └── common/
│       ├── test_validation.py
│       ├── test_error_handling.py
│       └── test_data_transform.py
└── fixtures/
    └── iams/
        ├── asset_data.yaml
        ├── license_data.yaml
        └── user_data.yaml
```

### 5.2 IAMS共通fixture

```python
# tests/iams/conftest.py
import pytest
from app.iams.models import Asset, License, AssetCategory

@pytest.fixture
def sample_asset():
    """サンプル資産データ"""
    return Asset(
        id=1,
        asset_code="PC-2026-001",
        name="開発用ノートPC",
        category=AssetCategory.LAPTOP,
        serial_number="SN-12345678",
        purchase_date="2026-01-15",
        purchase_price=250000,
        department="情報システム部",
        assigned_user="田中太郎",
        status="in_use",
    )

@pytest.fixture
def sample_license():
    """サンプルライセンスデータ"""
    return License(
        id=1,
        product_name="Microsoft 365 E3",
        license_key="XXXXX-XXXXX-XXXXX-XXXXX",
        license_type="subscription",
        total_seats=100,
        used_seats=85,
        expiry_date="2027-03-31",
        vendor="Microsoft",
    )
```

---

## 6. 品質基準

### 6.1 変換品質チェック

| チェック項目 | 基準 |
|------------|------|
| テスト数の一致 | 変換対象テスト数と実装テスト数が一致 |
| カバレッジ | 移植モジュール80%以上 |
| 実行成功率 | 100%（全テストパス） |
| 命名規約 | AEGIS-SIGHT命名規約に準拠 |
| マーカー | `@pytest.mark.iams` が付与されている |
| ドキュメント | 変換元情報がdocstringに記載 |

### 6.2 変換進捗トラッキング

| フェーズ | 対象件数 | 変換済み | 成功 | 失敗 | 除外 | 進捗率 |
|---------|---------|---------|------|------|------|--------|
| Phase 1 | 210 | - | - | - | - | 0% |
| Phase 2 | 280 | - | - | - | - | 0% |
| Phase 3 | 175 | - | - | - | - | 0% |
| Phase 4 | 180 | - | - | - | - | 0% |
| Phase 5 | 95 | - | - | - | - | 0% |
| **合計** | **940** | **-** | **-** | **-** | **-** | **0%** |

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| ドメインロジックの差異 | テスト失敗 | IAMS仕様書との突合、差分の明示的管理 |
| 非同期処理の差異 | テスト不安定 | pytest-asyncioの適切な設定、タイムアウト設定 |
| モック構造の複雑さ | 変換工数増大 | モック対象の最小化、共通fixtureの活用 |
| データ型の不一致 | テスト失敗 | Pydanticモデルでの型強制、変換ヘルパー |
| テスト数の多さ | スケジュール遅延 | 優先度に基づく段階実施、自動変換ツール活用 |

---

## 8. 自動変換支援

### 8.1 変換スクリプト

```python
# scripts/convert_jest_to_pytest.py
"""
Jest → pytest 自動変換支援スクリプト
完全自動変換ではなく、骨格生成+手動調整の方針
"""

# 主な変換処理:
# 1. describe/it → class/def 構造変換
# 2. expect().toBe() → assert 変換
# 3. beforeEach → fixture 変換
# 4. jest.fn() → MagicMock() 変換
# 5. import文の変換

# 使用方法:
# python scripts/convert_jest_to_pytest.py <input_jest_file> <output_pytest_file>
```

### 8.2 変換チェックスクリプト

```bash
#!/bin/bash
# scripts/check_iams_conversion.sh
# IAMS変換テストの一括チェック

echo "=== IAMS変換テスト実行 ==="
pytest tests/iams/ -v --tb=short -m iams

echo ""
echo "=== カバレッジレポート ==="
pytest tests/iams/ --cov=app/iams --cov-report=term-missing

echo ""
echo "=== テスト数サマリー ==="
pytest tests/iams/ --collect-only -q | tail -1
```

---

## 9. チェックリスト

### IAMS変換テスト作成チェック

- [ ] 変換元のJestテストファイルを特定したか
- [ ] 変換対象/除外の判定を行ったか
- [ ] `@pytest.mark.iams` マーカーを付与したか
- [ ] 変換元情報をdocstringに記載したか
- [ ] AEGIS-SIGHTの命名規約に準拠しているか
- [ ] モック戦略がpytestに適した形に変換されているか
- [ ] 非同期テストが正しく設定されているか（asyncio_mode）
- [ ] テストデータがfactory/fixtureで管理されているか
- [ ] 元のJestテストと結果が一致するか検証したか
- [ ] カバレッジ80%以上を達成しているか

### フェーズ完了チェック

- [ ] 対象テストの全件変換が完了したか
- [ ] 全テストがパスしているか
- [ ] カバレッジレポートを確認したか
- [ ] コードレビューが完了したか
- [ ] CIで実行確認ができたか
- [ ] 進捗トラッキング表を更新したか
