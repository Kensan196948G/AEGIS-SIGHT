# E2Eテスト計画（E2E Test Plan）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| テストツール | Playwright |
| テスト比率 | 全テストの約10% |

---

## 1. 概要

E2E（End-to-End）テストはユーザーの操作シナリオを再現し、システム全体が正しく動作することを検証する。Playwrightを使用し、クリティカルなユーザージャーニーに集中してテストを実施する。

---

## 2. テスト対象シナリオ

### 2.1 シナリオ優先度マトリクス

| # | シナリオ | 優先度 | 頻度 | ビジネス影響 |
|---|---------|--------|------|------------|
| S01 | ログイン・ログアウト | P0 | 毎日 | 全ユーザー |
| S02 | ダッシュボード表示 | P0 | 毎日 | 全ユーザー |
| S03 | デバイス一覧・検索 | P0 | 毎日 | 運用担当 |
| S04 | デバイス登録・編集 | P0 | 週次 | 管理者 |
| S05 | ユーザー管理 | P1 | 週次 | 管理者 |
| S06 | アラート確認・対応 | P0 | 毎日 | 運用担当 |
| S07 | レポート生成・ダウンロード | P1 | 月次 | 管理者 |
| S08 | 資産管理（IAMS移植） | P1 | 週次 | 資産管理者 |
| S09 | 設定変更 | P2 | 月次 | 管理者 |
| S10 | パスワード変更 | P1 | 不定期 | 全ユーザー |

---

## 3. シナリオ詳細

### S01: ログイン・ログアウト

```
前提条件: テスト用ユーザーアカウントが存在する

ステップ:
1. ログインページにアクセス（/login）
2. メールアドレスを入力
3. パスワードを入力
4. ログインボタンをクリック
5. ダッシュボードが表示されることを確認
6. ユーザーメニューを開く
7. ログアウトをクリック
8. ログインページにリダイレクトされることを確認

バリエーション:
- 無効なパスワードでエラーメッセージ表示
- アカウントロック（5回失敗）
- セッションタイムアウト
```

### S02: ダッシュボード表示

```
前提条件: ログイン済み

ステップ:
1. ダッシュボードページにアクセス（/dashboard）
2. デバイス概要ウィジェットが表示されることを確認
3. アラートサマリーが表示されることを確認
4. 各ウィジェットのデータが読み込まれることを確認
5. ウィジェットクリックで詳細ページに遷移することを確認

検証項目:
- デバイス総数の表示
- オンライン/オフライン台数
- 最新アラート5件
- 読み込み時間 < 3秒
```

### S03: デバイス一覧・検索

```
前提条件: ログイン済み、デバイスデータ登録済み

ステップ:
1. デバイス一覧ページにアクセス（/devices）
2. テーブルにデバイスが表示されることを確認
3. 検索ボックスにホスト名を入力
4. フィルター結果が表示されることを確認
5. OS種別フィルターで絞り込み
6. ステータスフィルターで絞り込み
7. カラムヘッダーをクリックしてソート
8. ページネーションで次ページに移動
9. デバイス行をクリックして詳細に遷移

検証項目:
- テーブル列: ホスト名、IPアドレス、OS、ステータス、所有者、最終確認日時
- 検索の即時フィードバック（debounce 300ms）
- フィルターの組み合わせ動作
- ページネーション情報（1-10 of 150）
```

### S04: デバイス登録・編集

```
前提条件: 管理者権限でログイン済み

ステップ（登録）:
1. デバイス一覧ページから「新規登録」ボタンをクリック
2. 登録フォームが表示されることを確認
3. ホスト名、IPアドレス、OS種別、所有者を入力
4. 「登録」ボタンをクリック
5. 成功メッセージが表示されることを確認
6. 一覧ページに新しいデバイスが表示されることを確認

ステップ（編集）:
1. デバイス詳細ページから「編集」ボタンをクリック
2. 編集フォームに既存データがプリセットされることを確認
3. フィールドを変更
4. 「更新」ボタンをクリック
5. 成功メッセージが表示されることを確認

バリデーション検証:
- 必須フィールド未入力でエラー表示
- 重複IPアドレスでエラー表示
- 不正なIPアドレス形式でエラー表示
```

### S06: アラート確認・対応

```
前提条件: ログイン済み、未対応アラートが存在

ステップ:
1. アラート一覧ページにアクセス（/alerts）
2. 未対応アラートが表示されることを確認
3. 重要度フィルターで「Critical」を選択
4. アラートをクリックして詳細を表示
5. 「対応開始」ボタンをクリック
6. 対応メモを入力
7. 「対応完了」ボタンをクリック
8. アラートステータスが「対応済み」に変更されることを確認
```

---

## 4. テスト実装

### 4.1 ディレクトリ構成

```
e2e/
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── dashboard/
│   │   └── dashboard.spec.ts
│   ├── devices/
│   │   ├── device-list.spec.ts
│   │   ├── device-create.spec.ts
│   │   └── device-edit.spec.ts
│   ├── users/
│   │   └── user-management.spec.ts
│   ├── alerts/
│   │   └── alert-response.spec.ts
│   ├── reports/
│   │   └── report-generation.spec.ts
│   └── iams/
│       └── asset-management.spec.ts
├── pages/                    # Page Objectモデル
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── device-list.page.ts
│   ├── device-form.page.ts
│   └── alert-list.page.ts
├── fixtures/
│   ├── auth.fixture.ts       # 認証fixture
│   └── test-data.fixture.ts  # テストデータfixture
├── helpers/
│   ├── api.helper.ts         # APIヘルパー（データセットアップ）
│   └── wait.helper.ts        # 待機ヘルパー
└── playwright.config.ts
```

### 4.2 Playwright設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'reports/e2e-results.xml' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
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
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 4.3 Page Objectモデル

```typescript
// e2e/pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード');
    this.loginButton = page.getByRole('button', { name: 'ログイン' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### 4.4 テスト実装例

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

test.describe('ログイン機能', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('有効な認証情報でダッシュボードに遷移する', async ({ page }) => {
    await loginPage.login('admin@example.com', 'test_password');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
  });

  test('無効なパスワードでエラーメッセージを表示する', async () => {
    await loginPage.login('admin@example.com', 'wrong_password');
    await loginPage.expectError('メールアドレスまたはパスワードが正しくありません');
  });

  test('必須フィールド未入力でバリデーションエラーを表示する', async () => {
    await loginPage.loginButton.click();
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('5回失敗でアカウントロックメッセージを表示する', async () => {
    for (let i = 0; i < 5; i++) {
      await loginPage.login('admin@example.com', 'wrong');
      if (i < 4) {
        await loginPage.goto();
      }
    }
    await loginPage.expectError('アカウントがロックされました');
  });
});

// e2e/tests/devices/device-list.spec.ts
import { test, expect } from '@playwright/test';

test.describe('デバイス一覧', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('デバイス一覧が表示される', async ({ page }) => {
    await page.goto('/devices');
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    const rows = table.getByRole('row');
    await expect(rows).toHaveCount.greaterThan(1);
  });

  test('ホスト名で検索できる', async ({ page }) => {
    await page.goto('/devices');
    await page.getByPlaceholder('検索...').fill('web-server');
    await page.waitForResponse('**/api/v1/devices**');
    const rows = page.getByRole('table').getByRole('row');
    for (const row of await rows.all()) {
      if (await row.isVisible()) {
        await expect(row).toContainText('web-server');
      }
    }
  });

  test('OS種別でフィルターできる', async ({ page }) => {
    await page.goto('/devices');
    await page.getByLabel('OS種別').selectOption('Windows 11');
    await page.waitForResponse('**/api/v1/devices**');
    const firstRow = page.getByRole('table').getByRole('row').nth(1);
    await expect(firstRow).toContainText('Windows 11');
  });
});
```

### 4.5 認証fixture

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

type AuthFixtures = {
  adminPage: Page;
  viewerPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/viewer.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

// 認証状態のセットアップ（global-setup.ts）
async function globalSetup() {
  const browser = await chromium.launch();

  // Admin認証状態を保存
  const adminPage = await browser.newPage();
  await adminPage.goto('/login');
  await adminPage.getByLabel('メールアドレス').fill('admin@example.com');
  await adminPage.getByLabel('パスワード').fill('admin_password');
  await adminPage.getByRole('button', { name: 'ログイン' }).click();
  await adminPage.waitForURL('/dashboard');
  await adminPage.context().storageState({ path: 'e2e/.auth/admin.json' });

  await browser.close();
}

export default globalSetup;
```

---

## 5. テスト実行

### 5.1 ローカル実行

```bash
# 全E2Eテスト実行
npx playwright test

# UIモードで実行（デバッグ用）
npx playwright test --ui

# 特定テストファイル
npx playwright test e2e/tests/auth/login.spec.ts

# 特定ブラウザのみ
npx playwright test --project=chromium

# デバッグモード
npx playwright test --debug

# レポート表示
npx playwright show-report
```

### 5.2 CI実行

```bash
# ブラウザインストール
npx playwright install --with-deps chromium firefox

# CI用実行
npx playwright test --reporter=junit,html

# 失敗時のトレース確認
npx playwright show-trace test-results/trace.zip
```

---

## 6. テスト実行マトリクス

| ブラウザ | デスクトップ | モバイル | CI実行 |
|---------|------------|---------|--------|
| Chromium | 全シナリオ | P0のみ | 全PR |
| Firefox | P0シナリオ | - | リリース前 |
| WebKit | P0シナリオ | - | リリース前 |

---

## 7. 非機能テスト

### 7.1 パフォーマンス基準

| 画面 | 読み込み目標 | 操作応答目標 |
|------|------------|------------|
| ログインページ | < 1秒 | < 500ms |
| ダッシュボード | < 3秒 | < 1秒 |
| デバイス一覧（100件） | < 2秒 | < 500ms |
| レポート生成 | < 10秒 | - |

### 7.2 アクセシビリティ

```typescript
// axe-coreによるアクセシビリティチェック
import AxeBuilder from '@axe-core/playwright';

test('ログインページのアクセシビリティ', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

## 8. チェックリスト

### E2Eテスト作成チェック

- [ ] Page Objectモデルを使用しているか
- [ ] テストデータのセットアップ・クリーンアップが適切か
- [ ] 待機処理が明示的か（固定sleep禁止）
- [ ] アサーションが具体的か
- [ ] スクリーンショット/トレースが失敗時に取得されるか
- [ ] テスト間の依存がないか（並列実行可能か）
- [ ] クリティカルパス（P0）が全て網羅されているか
- [ ] モバイルビューのテストが含まれているか
- [ ] テスト実行時間が20分以内か
- [ ] CI環境での安定実行が確認されているか
