# 単体テスト計画（Unit Test Plan）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| 対象ツール | pytest（Backend）/ Vitest（Frontend） |

---

## 1. 概要

単体テストはテストピラミッドの最下層を構成し、個々の関数・クラス・コンポーネントの正確な動作を検証する。AEGIS-SIGHTでは全テストの70%を単体テストで構成し、高速なフィードバックループを実現する。

---

## 2. バックエンド単体テスト（pytest）

### 2.1 テスト対象

| 対象レイヤー | テスト対象 | 優先度 |
|-------------|-----------|--------|
| Domain（ドメインモデル） | エンティティ、値オブジェクト、ドメインサービス | 最高 |
| UseCase（ユースケース） | ビジネスロジック、バリデーション | 最高 |
| Repository | データアクセスロジック（モック使用） | 高 |
| API Schema | リクエスト/レスポンススキーマ | 高 |
| Utility | ヘルパー関数、共通処理 | 中 |
| Middleware | 認証・認可ミドルウェア | 高 |

### 2.2 ディレクトリ構成

```
tests/
├── unit/
│   ├── domain/
│   │   ├── test_user.py
│   │   ├── test_device.py
│   │   └── test_asset.py
│   ├── usecase/
│   │   ├── test_user_usecase.py
│   │   ├── test_device_usecase.py
│   │   └── test_auth_usecase.py
│   ├── repository/
│   │   ├── test_user_repository.py
│   │   └── test_device_repository.py
│   ├── api/
│   │   ├── test_user_schema.py
│   │   └── test_device_schema.py
│   ├── middleware/
│   │   └── test_auth_middleware.py
│   └── utils/
│       ├── test_crypto.py
│       └── test_validators.py
├── conftest.py
├── factories/
│   ├── user_factory.py
│   └── device_factory.py
└── fixtures/
    └── master_data.yaml
```

### 2.3 テスト命名規約

```python
# パターン: test_<対象メソッド>_<条件>_<期待結果>

# --- 正常系 ---
def test_create_user_with_valid_data_returns_user():
    """有効なデータでユーザーが作成されること"""
    pass

# --- 異常系 ---
def test_create_user_with_duplicate_email_raises_error():
    """重複メールアドレスでエラーが発生すること"""
    pass

# --- 境界値 ---
def test_validate_password_with_min_length_returns_true():
    """パスワードが最小文字数で有効と判定されること"""
    pass

# --- パラメータ化 ---
@pytest.mark.parametrize("email,expected", [
    ("user@example.com", True),
    ("invalid-email", False),
    ("", False),
    (None, False),
])
def test_validate_email_with_various_inputs(email, expected):
    """各種メール形式のバリデーション結果が正しいこと"""
    pass
```

### 2.4 モック戦略（Backend）

| モック対象 | ツール | 方針 |
|-----------|--------|------|
| DB接続 | unittest.mock / pytest-mock | Repositoryインターフェースをモック |
| 外部API | httpx.MockTransport / respx | レスポンスを固定値で返却 |
| ファイルI/O | tmp_path fixture | 一時ディレクトリを使用 |
| 日時 | freezegun | 固定日時でテスト |
| 環境変数 | monkeypatch | テスト用値を注入 |
| 認証トークン | factory | テスト用JWTを生成 |

```python
# モック使用例: Repositoryのモック
from unittest.mock import AsyncMock

async def test_get_user_usecase_returns_user(mocker):
    """ユーザー取得ユースケースが正しくユーザーを返すこと"""
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.find_by_id.return_value = UserFactory.build(id=1, name="テスト太郎")
    usecase = GetUserUseCase(user_repository=mock_repo)

    # Act
    result = await usecase.execute(user_id=1)

    # Assert
    assert result.name == "テスト太郎"
    mock_repo.find_by_id.assert_called_once_with(1)
```

### 2.5 pytest設定

```ini
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
python_classes = ["Test*"]
asyncio_mode = "auto"
markers = [
    "slow: 実行時間の長いテスト",
    "integration: 統合テスト（単体テスト実行時は除外）",
    "iams: IAMS移植テスト",
]
addopts = [
    "-v",
    "--strict-markers",
    "--tb=short",
    "-x",  # 最初の失敗で停止（CI以外）
]

[tool.coverage.run]
source = ["app"]
omit = ["*/tests/*", "*/migrations/*", "*/__pycache__/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.",
]
```

### 2.6 テストデータファクトリ

```python
# tests/factories/user_factory.py
import factory
from faker import Faker

fake = Faker("ja_JP")

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Sequence(lambda n: n + 1)
    name = factory.LazyFunction(fake.name)
    email = factory.LazyFunction(fake.email)
    department = factory.LazyFunction(lambda: fake.company_prefix())
    is_active = True
    created_at = factory.LazyFunction(fake.date_time_this_year)

class DeviceFactory(factory.Factory):
    class Meta:
        model = Device

    id = factory.Sequence(lambda n: n + 1)
    hostname = factory.LazyFunction(fake.hostname)
    ip_address = factory.LazyFunction(fake.ipv4_private)
    os_type = factory.Iterator(["Windows 11", "macOS 14", "Ubuntu 24.04"])
    owner = factory.SubFactory(UserFactory)
    registered_at = factory.LazyFunction(fake.date_time_this_year)
```

---

## 3. フロントエンド単体テスト（Vitest）

### 3.1 テスト対象

| 対象 | テスト内容 | 優先度 |
|------|-----------|--------|
| Reactコンポーネント | レンダリング、イベント、状態 | 最高 |
| カスタムフック | 状態管理、副作用 | 高 |
| ユーティリティ関数 | データ変換、バリデーション | 高 |
| API クライアント | リクエスト構築、レスポンス処理 | 高 |
| ストア（状態管理） | 状態遷移、アクション | 中 |

### 3.2 ディレクトリ構成

```
src/
├── components/
│   ├── UserList/
│   │   ├── UserList.tsx
│   │   ├── UserList.test.tsx
│   │   └── UserList.stories.tsx
│   └── DeviceCard/
│       ├── DeviceCard.tsx
│       └── DeviceCard.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
├── utils/
│   ├── formatDate.ts
│   └── formatDate.test.ts
└── lib/
    ├── api/
    │   ├── client.ts
    │   └── client.test.ts
    └── validators/
        ├── userValidator.ts
        └── userValidator.test.ts
```

### 3.3 テスト命名規約

```typescript
// パターン: describe('<対象>') + it('should <期待動作> when <条件>')

describe('UserList', () => {
  // --- レンダリングテスト ---
  it('should render user list when data is provided', () => {
    render(<UserList users={mockUsers} />);
    expect(screen.getByText('テスト太郎')).toBeInTheDocument();
  });

  // --- インタラクションテスト ---
  it('should call onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(<UserList users={mockUsers} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  // --- 条件分岐テスト ---
  it('should show empty message when user list is empty', () => {
    render(<UserList users={[]} />);
    expect(screen.getByText('ユーザーが見つかりません')).toBeInTheDocument();
  });

  // --- ローディングテスト ---
  it('should show skeleton when loading', () => {
    render(<UserList users={[]} isLoading={true} />);
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });
});
```

### 3.4 モック戦略（Frontend）

| モック対象 | ツール | 方針 |
|-----------|--------|------|
| APIリクエスト | msw (Mock Service Worker) | サービスワーカーでインターセプト |
| Next.js Router | vi.mock('next/navigation') | useRouter等をモック |
| 環境変数 | vi.stubEnv | テスト用値を注入 |
| 日時 | vi.useFakeTimers | 固定日時でテスト |
| ブラウザAPI | vi.stubGlobal | localStorage等をモック |
| 子コンポーネント | vi.mock | 依存コンポーネントをスタブ |

```typescript
// msw ハンドラ例
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/users', () => {
    return HttpResponse.json({
      users: [
        { id: 1, name: 'テスト太郎', email: 'taro@example.com' },
        { id: 2, name: 'テスト花子', email: 'hanako@example.com' },
      ],
      total: 2,
    });
  }),

  http.post('/api/v1/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  }),
];
```

### 3.5 Vitest設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 4. テスト分類マトリクス

| テスト分類 | Backend対象 | Frontend対象 | 実行頻度 |
|-----------|------------|-------------|---------|
| 正常系 | 全メソッド | 全コンポーネント | 毎回 |
| 異常系 | バリデーション、エラーハンドリング | エラー表示、フォールバック | 毎回 |
| 境界値 | 文字数制限、数値範囲、日付範囲 | 入力制限、表示切替 | 毎回 |
| NULL/空値 | Optional項目、空リスト | 未入力、undefined | 毎回 |
| 権限 | 認証・認可ロジック | 権限表示切替 | 毎回 |
| 並行処理 | 非同期処理、競合状態 | - | 選択的 |

---

## 5. カバレッジ除外対象

| 除外対象 | 理由 |
|---------|------|
| `tests/` ディレクトリ | テストコード自体 |
| `migrations/` | 自動生成マイグレーション |
| `__pycache__/` | Pythonキャッシュ |
| `*.d.ts` | TypeScript型定義 |
| `*.stories.tsx` | Storybook |
| `TYPE_CHECKING` ブロック | 型チェック専用インポート |
| 設定ファイル | conftest.py 等 |

---

## 6. テスト実行手順

### 6.1 ローカル開発時

```bash
# Backend - 特定テスト実行
pytest tests/unit/domain/test_user.py -v

# Backend - 変更ファイルに関連するテストのみ
pytest tests/unit/ -v --last-failed

# Backend - カバレッジ付き
pytest tests/unit/ --cov=app --cov-report=html
open htmlcov/index.html

# Frontend - 特定テスト実行
npx vitest run src/components/UserList/UserList.test.tsx

# Frontend - ウォッチモード（TDD推奨）
npx vitest --watch

# Frontend - カバレッジ付き
npx vitest run --coverage
```

### 6.2 CI実行時

```bash
# Backend
pytest tests/unit/ -v --cov=app --cov-report=xml --cov-fail-under=80 --junitxml=reports/unit-test-results.xml

# Frontend
npx vitest run --coverage --reporter=junit --outputFile=reports/frontend-test-results.xml
```

---

## 7. チェックリスト

### 単体テスト作成チェック

- [ ] テスト命名規約に従っているか
- [ ] Arrange-Act-Assert パターンを使用しているか
- [ ] モック対象が適切か（外部依存のみモック）
- [ ] 正常系・異常系・境界値をカバーしているか
- [ ] テストが独立して実行可能か（他テストに依存していないか）
- [ ] パラメータ化テストで重複を排除しているか
- [ ] カバレッジ80%以上を達成しているか
- [ ] テスト実行時間が妥当か（1テスト1秒以内）
- [ ] テストデータにファクトリを使用しているか
- [ ] アサーションメッセージが明確か
