# テスト変換設計（Test Conversion Design）

## 1. 概要

AEGIS-SIGHTのテスト基盤を旧IAMS（Jest / 自前E2E）から新スタックへ移行する。本設計書は、テスト変換の対象・方針・変換ルール・実行環境を定義する。

**変換サマリ:**

| 区分 | 件数 | 変換元 | 変換先 | 方針 |
|---|---|---|---|---|
| 単体テスト | 400件 | Jest | Vitest | 構文変換 |
| 統合テスト | 500件 | Jest | pytest + httpx | 言語変換（TS → Python） |
| E2Eテスト | 200件 | 独自E2E | Playwright | 流用・リライト |
| 廃棄対象 | 57件 | Jest | - | 不要テスト削除 |

**合計:** 1,157件（うち廃棄57件、実変換1,100件）

---

## 2. クラス図

```mermaid
classDiagram
    class TestConversionPipeline {
        -source_dir: str
        -target_dir: str
        -config: ConversionConfig
        +run() ConversionReport
        +convert_unit_tests() BatchResult
        +convert_integration_tests() BatchResult
        +migrate_e2e_tests() BatchResult
        +archive_deprecated() int
        -_validate_conversion(source, target) ValidationResult
    }

    class UnitTestConverter {
        -jest_parser: JestParser
        -vitest_emitter: VitestEmitter
        +convert(file_path: str) ConvertedFile
        +convert_imports() str
        +convert_mocks() str
        +convert_assertions() str
        +convert_lifecycle_hooks() str
    }

    class IntegrationTestConverter {
        -jest_parser: JestParser
        -pytest_emitter: PytestEmitter
        +convert(file_path: str) ConvertedFile
        +convert_http_calls() str
        +convert_fixtures() str
        +convert_assertions() str
        +map_endpoints() dict
    }

    class E2ETestMigrator {
        -source_parser: LegacyE2EParser
        -playwright_emitter: PlaywrightEmitter
        +migrate(file_path: str) ConvertedFile
        +convert_selectors() str
        +convert_actions() str
        +convert_assertions() str
        +add_fixtures() str
    }

    class JestParser {
        +parse(source: str) TestAST
        +extract_describes() list~DescribeBlock~
        +extract_tests() list~TestCase~
        +extract_imports() list~ImportStatement~
        +extract_mocks() list~MockDefinition~
    }

    class VitestEmitter {
        +emit(ast: TestAST) str
        +emit_imports() str
        +emit_test_suite() str
    }

    class PytestEmitter {
        +emit(ast: TestAST) str
        +emit_fixtures() str
        +emit_test_functions() str
        +emit_parametrize() str
    }

    class PlaywrightEmitter {
        +emit(ast: TestAST) str
        +emit_test() str
        +emit_page_actions() str
    }

    class ConversionConfig {
        +source_root: str
        +target_root: str
        +unit_test_glob: str
        +integration_test_glob: str
        +e2e_test_glob: str
        +deprecated_list: list~str~
        +dry_run: bool
    }

    class ConversionReport {
        +total_files: int
        +converted: int
        +failed: int
        +skipped: int
        +deprecated: int
        +errors: list~ConversionError~
        +duration_seconds: float
    }

    TestConversionPipeline --> UnitTestConverter : uses
    TestConversionPipeline --> IntegrationTestConverter : uses
    TestConversionPipeline --> E2ETestMigrator : uses
    TestConversionPipeline --> ConversionConfig : configured by
    TestConversionPipeline --> ConversionReport : produces
    UnitTestConverter --> JestParser : uses
    UnitTestConverter --> VitestEmitter : uses
    IntegrationTestConverter --> JestParser : uses
    IntegrationTestConverter --> PytestEmitter : uses
    E2ETestMigrator --> PlaywrightEmitter : uses
```

---

## 3. シーケンス図

### 3.1 単体テスト変換（Jest → Vitest）

```mermaid
sequenceDiagram
    participant Dev as 開発者 / CI
    participant Pipe as TestConversionPipeline
    participant Parser as JestParser
    participant Conv as UnitTestConverter
    participant Emitter as VitestEmitter
    participant FS as ファイルシステム
    participant Vitest as Vitest Runner

    Dev->>Pipe: run() / convert_unit_tests()
    Pipe->>FS: glob("**/*.test.ts") → 400ファイル

    loop 各テストファイル
        Pipe->>Conv: convert(file_path)
        Conv->>FS: read source file
        FS-->>Conv: Jest test source
        Conv->>Parser: parse(source)
        Parser-->>Conv: TestAST

        Conv->>Conv: convert_imports()
        Note over Conv: jest → vitest import変換
        Conv->>Conv: convert_mocks()
        Note over Conv: jest.fn() → vi.fn()
        Conv->>Conv: convert_assertions()
        Conv->>Conv: convert_lifecycle_hooks()

        Conv->>Emitter: emit(converted_ast)
        Emitter-->>Conv: vitest_source

        Conv->>FS: write target file
        Conv-->>Pipe: ConvertedFile
    end

    Pipe->>Vitest: npx vitest run
    Vitest-->>Pipe: test results
    Pipe->>Pipe: 結果比較・レポート生成
    Pipe-->>Dev: ConversionReport
```

### 3.2 統合テスト変換（Jest → pytest + httpx）

```mermaid
sequenceDiagram
    participant Dev as 開発者 / CI
    participant Pipe as TestConversionPipeline
    participant Conv as IntegrationTestConverter
    participant Parser as JestParser
    participant Emitter as PytestEmitter
    participant FS as ファイルシステム
    participant Pytest as pytest Runner

    Dev->>Pipe: convert_integration_tests()
    Pipe->>FS: glob("**/*.integration.test.ts") → 500ファイル

    loop 各テストファイル
        Pipe->>Conv: convert(file_path)
        Conv->>FS: read source file
        Conv->>Parser: parse(source)
        Parser-->>Conv: TestAST

        Conv->>Conv: convert_http_calls()
        Note over Conv: fetch/axios → httpx.AsyncClient
        Conv->>Conv: convert_fixtures()
        Note over Conv: beforeEach → @pytest.fixture
        Conv->>Conv: convert_assertions()
        Note over Conv: expect().toBe() → assert ==
        Conv->>Conv: map_endpoints()
        Note over Conv: エンドポイントURLマッピング

        Conv->>Emitter: emit(converted_ast)
        Emitter-->>Conv: pytest_source (.py)

        Conv->>FS: write tests/integration/test_*.py
        Conv-->>Pipe: ConvertedFile
    end

    Pipe->>Pytest: pytest tests/integration/ -v
    Pytest-->>Pipe: test results
    Pipe-->>Dev: ConversionReport
```

### 3.3 E2Eテスト移行（独自 → Playwright）

```mermaid
sequenceDiagram
    participant Dev as 開発者 / CI
    participant Pipe as TestConversionPipeline
    participant Migrator as E2ETestMigrator
    participant Emitter as PlaywrightEmitter
    participant FS as ファイルシステム
    participant PW as Playwright Runner

    Dev->>Pipe: migrate_e2e_tests()
    Pipe->>FS: glob("e2e/**/*.e2e.ts") → 200ファイル

    loop 各テストファイル
        Pipe->>Migrator: migrate(file_path)
        Migrator->>FS: read source file
        FS-->>Migrator: legacy E2E source

        Migrator->>Migrator: convert_selectors()
        Note over Migrator: CSS/XPath → Playwright locator
        Migrator->>Migrator: convert_actions()
        Note over Migrator: click/type → page.click/fill
        Migrator->>Migrator: convert_assertions()
        Note over Migrator: → expect(locator).toBeVisible()
        Migrator->>Migrator: add_fixtures()
        Note over Migrator: page/context fixture追加

        Migrator->>Emitter: emit(converted_ast)
        Emitter-->>Migrator: playwright_source

        Migrator->>FS: write e2e/*.spec.ts
        Migrator-->>Pipe: ConvertedFile
    end

    Pipe->>PW: npx playwright test
    PW-->>Pipe: test results
    Pipe-->>Dev: ConversionReport
```

---

## 4. データフロー

```mermaid
flowchart TB
    subgraph 旧テストコード（IAMS）
        JestUnit[Jest 単体テスト<br/>400件 .test.ts]
        JestInteg[Jest 統合テスト<br/>500件 .integration.test.ts]
        LegacyE2E[独自E2E<br/>200件 .e2e.ts]
        Deprecated[廃棄対象<br/>57件]
    end

    subgraph 変換パイプライン
        UnitConv[UnitTestConverter<br/>Jest → Vitest]
        IntegConv[IntegrationTestConverter<br/>Jest → pytest+httpx]
        E2EMig[E2ETestMigrator<br/>Legacy → Playwright]
        Archive[Archive<br/>廃棄ログ記録]
    end

    subgraph 新テストコード（AEGIS-SIGHT）
        VitestTests[Vitest 単体テスト<br/>400件 .test.ts]
        PytestTests[pytest 統合テスト<br/>500件 test_*.py]
        PWTests[Playwright E2E<br/>200件 .spec.ts]
        DepLog[deprecated_tests.json<br/>廃棄記録]
    end

    subgraph CI/CD
        CI[GitHub Actions]
    end

    JestUnit --> UnitConv
    JestInteg --> IntegConv
    LegacyE2E --> E2EMig
    Deprecated --> Archive

    UnitConv --> VitestTests
    IntegConv --> PytestTests
    E2EMig --> PWTests
    Archive --> DepLog

    VitestTests --> CI
    PytestTests --> CI
    PWTests --> CI
```

---

## 5. 変換ルール詳細

### 5.1 単体テスト変換ルール（Jest → Vitest）

| Jest（変換元） | Vitest（変換先） | 備考 |
|---|---|---|
| `import { render } from '@testing-library/react'` | そのまま維持 | 互換性あり |
| `jest.fn()` | `vi.fn()` | グローバルvi |
| `jest.mock('module')` | `vi.mock('module')` | |
| `jest.spyOn(obj, 'method')` | `vi.spyOn(obj, 'method')` | |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | |
| `jest.advanceTimersByTime(ms)` | `vi.advanceTimersByTime(ms)` | |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` | |
| `beforeEach(() => {})` | `beforeEach(() => {})` | 同一構文 |
| `expect(x).toBe(y)` | `expect(x).toBe(y)` | 同一構文 |
| `expect(x).toMatchSnapshot()` | `expect(x).toMatchSnapshot()` | スナップショット再生成必要 |
| `@jest-environment jsdom` | `// @vitest-environment jsdom` | コメント形式変換 |
| `jest.config.ts` | `vitest.config.ts` | 設定ファイル移行 |

**vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './reports/unit-test-results.xml',
    },
  },
});
```

### 5.2 統合テスト変換ルール（Jest → pytest + httpx）

| Jest / TypeScript（変換元） | pytest / Python（変換先） |
|---|---|
| `describe('API', () => { ... })` | `class TestAPI:` |
| `it('should ...', async () => { ... })` | `async def test_should_...(self, client):` |
| `beforeEach(async () => { ... })` | `@pytest.fixture(autouse=True)` |
| `afterEach(async () => { ... })` | `yield` (fixture teardown) |
| `const res = await fetch('/api/...')` | `res = await client.get('/api/...')` |
| `expect(res.status).toBe(200)` | `assert res.status_code == 200` |
| `expect(res.json()).toEqual({...})` | `assert res.json() == {...}` |
| `expect(res.json()).toHaveProperty('id')` | `assert 'id' in res.json()` |
| `expect(arr).toHaveLength(5)` | `assert len(arr) == 5` |
| `expect(fn).toThrow(Error)` | `with pytest.raises(Exception):` |
| `jest.setTimeout(10000)` | `@pytest.mark.timeout(10)` |

**conftest.py:**

```python
# tests/integration/conftest.py
import pytest
import httpx
from app.main import app


@pytest.fixture
async def client():
    """非同期HTTPテストクライアント"""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        headers={"Content-Type": "application/json"},
    ) as client:
        yield client


@pytest.fixture
async def auth_client(client):
    """認証済みテストクライアント"""
    response = await client.post("/api/v1/auth/login", json={
        "username": "test_user",
        "password": "test_password",
    })
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client


@pytest.fixture(autouse=True)
async def db_transaction():
    """テストごとにDBトランザクションをロールバック"""
    async with async_session() as session:
        async with session.begin():
            yield session
            await session.rollback()
```

**変換例:**

```python
# tests/integration/test_assets_api.py
import pytest
from httpx import AsyncClient


class TestAssetsAPI:
    """資産管理API統合テスト"""

    @pytest.mark.asyncio
    async def test_get_assets_returns_list(self, auth_client: AsyncClient):
        """資産一覧を取得できること"""
        response = await auth_client.get("/api/v1/assets")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_create_asset_returns_201(self, auth_client: AsyncClient):
        """資産を作成できること"""
        payload = {
            "product_name": "Dell Latitude 5550",
            "serial_number": "TEST-SN-001",
            "category": "PC_LAPTOP",
        }
        response = await auth_client.post("/api/v1/assets", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["serial_number"] == "TEST-SN-001"
        assert "asset_tag" in data

    @pytest.mark.asyncio
    async def test_create_asset_duplicate_serial_returns_422(self, auth_client: AsyncClient):
        """重複シリアル番号で422を返すこと"""
        payload = {
            "product_name": "Dell Latitude 5550",
            "serial_number": "EXISTING-SN-001",
            "category": "PC_LAPTOP",
        }
        response = await auth_client.post("/api/v1/assets", json=payload)
        assert response.status_code == 422
```

### 5.3 E2Eテスト変換ルール（独自E2E → Playwright）

| 独自E2E（変換元） | Playwright（変換先） |
|---|---|
| `browser.goto(url)` | `await page.goto(url)` |
| `browser.click('#btn')` | `await page.locator('#btn').click()` |
| `browser.type('#input', 'text')` | `await page.locator('#input').fill('text')` |
| `browser.waitFor('#elem')` | `await page.locator('#elem').waitFor()` |
| `browser.getText('#elem')` | `await page.locator('#elem').textContent()` |
| `assert.isVisible('#elem')` | `await expect(page.locator('#elem')).toBeVisible()` |
| `assert.textContains('#elem', 'text')` | `await expect(page.locator('#elem')).toContainText('text')` |
| `browser.screenshot()` | `await page.screenshot({ path: '...' })` |
| `browser.selectOption('#sel', 'val')` | `await page.locator('#sel').selectOption('val')` |

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/e2e' }],
    ['junit', { outputFile: 'reports/e2e-results.xml' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

**変換例:**

```typescript
// e2e/assets/asset-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('資産検索', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assets/search');
  });

  test('キーワードで資産を検索できること', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('Dell Latitude');
    await page.locator('[data-testid="search-button"]').click();

    const results = page.locator('[data-testid="search-results"] tbody tr');
    await expect(results).toHaveCount(5);
    await expect(results.first()).toContainText('Dell Latitude');
  });

  test('フィルタ条件で絞り込みできること', async ({ page }) => {
    await page.locator('[data-testid="category-filter"]').selectOption('PC_LAPTOP');
    await page.locator('[data-testid="status-filter"]').selectOption('active');
    await page.locator('[data-testid="search-button"]').click();

    const results = page.locator('[data-testid="search-results"] tbody tr');
    await expect(results.first()).toBeVisible();
  });

  test('検索結果が0件の場合にメッセージを表示すること', async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill('存在しない資産名XYZ');
    await page.locator('[data-testid="search-button"]').click();

    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results"]')).toContainText('該当する資産が見つかりません');
  });
});
```

---

## 6. 廃棄対象テスト（57件）

### 6.1 廃棄基準

| 基準 | 説明 |
|---|---|
| IAMS固有機能 | AEGIS-SIGHTに引き継がない旧機能のテスト |
| 重複テスト | 同一ロジックを異なるファイルでテストしている重複 |
| 無効テスト | `xit` / `test.skip` で長期間スキップされていたテスト |
| 非推奨API | 廃止予定のAPIエンドポイントに対するテスト |

### 6.2 廃棄記録フォーマット

```json
{
  "deprecated_tests": [
    {
      "file": "src/modules/iams-legacy/auth.test.ts",
      "test_count": 12,
      "reason": "IAMS固有認証モジュール廃止",
      "deprecated_at": "2026-03-27",
      "approved_by": "tech-lead"
    },
    {
      "file": "src/modules/iams-legacy/report-v1.test.ts",
      "test_count": 8,
      "reason": "レポートv1 API廃止、v2に移行済み",
      "deprecated_at": "2026-03-27",
      "approved_by": "tech-lead"
    }
  ],
  "total_deprecated": 57,
  "archive_path": "archive/deprecated-tests/"
}
```

---

## 7. CI/CDパイプライン統合

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: unit-coverage
          path: coverage/

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: aegis_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements-test.txt
      - run: pytest tests/integration/ -v --tb=short --junitxml=reports/integration-results.xml
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/aegis_test
          REDIS_URL: redis://localhost:6379/0

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium firefox
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: reports/e2e/
```

---

## 8. 変換進捗トラッキング

| フェーズ | 対象 | 件数 | 期間 | 完了基準 |
|---|---|---|---|---|
| Phase 1 | 単体テスト（Jest → Vitest） | 400件 | 2週間 | 全テストGreen、カバレッジ80%以上 |
| Phase 2 | 統合テスト（Jest → pytest+httpx） | 500件 | 3週間 | 全テストGreen、API網羅率90%以上 |
| Phase 3 | E2Eテスト（独自 → Playwright） | 200件 | 2週間 | 主要シナリオ全Green |
| Phase 4 | 廃棄テスト整理 | 57件 | 3日 | 廃棄記録作成、アーカイブ完了 |
| Phase 5 | CI統合・最終検証 | - | 1週間 | 全パイプラインGreen |

---

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| スナップショットテストの差分 | 中 | Vitest移行後にスナップショット再生成、目視確認 |
| 非同期テストのタイミング問題 | 高 | httpx AsyncClient + pytest-asyncio でasync/awaitを統一 |
| E2Eセレクタの非互換 | 中 | data-testid ベースに統一、XPath使用禁止 |
| モック差異（jest.fn vs vi.fn） | 低 | 自動置換スクリプトで一括変換 |
| Playwright環境差異 | 中 | Docker化したテスト実行環境、CI上で3ブラウザテスト |
| テスト実行時間の増加 | 中 | Vitest並列実行、pytestxdist、Playwright sharding |
