import { test, expect } from '@playwright/test';

test.describe('SAM pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@aegis-sight.local');
    await page.getByLabel('パスワード').fill('admin');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  // ==================================================================
  // SAM Overview page
  // ==================================================================
  test.describe('SAM overview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/sam');
    });

    test('displays the SAM page heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /SAM.*ソフトウェア資産管理/ }),
      ).toBeVisible();
    });

    test('displays overview statistics cards', async ({ page }) => {
      await expect(page.getByText('総ライセンス数')).toBeVisible();
      await expect(page.getByText('342')).toBeVisible();

      await expect(page.getByText('コンプライアント')).toBeVisible();
      await expect(page.getByText('322')).toBeVisible();

      await expect(page.getByText('要対応')).toBeVisible();
      await expect(page.getByText('20')).toBeVisible();
    });

    test('displays quick navigation links', async ({ page }) => {
      await expect(page.getByText('ライセンス一覧')).toBeVisible();
      await expect(page.getByText('コンプライアンスチェック')).toBeVisible();
      await expect(page.getByText('SAMレポート')).toBeVisible();
    });

    test('license list link navigates to licenses page', async ({ page }) => {
      await page.getByRole('link', { name: /ライセンス一覧/ }).click();
      await expect(page).toHaveURL(/\/dashboard\/sam\/licenses/);
    });

    test('compliance link navigates to compliance page', async ({ page }) => {
      await page.getByRole('link', { name: /コンプライアンスチェック/ }).click();
      await expect(page).toHaveURL(/\/dashboard\/sam\/compliance/);
    });
  });

  // ==================================================================
  // Licenses page
  // ==================================================================
  test.describe('Licenses list', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/sam/licenses');
    });

    test('displays the licenses page heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'ライセンス一覧' }),
      ).toBeVisible();
    });

    test('displays "add license" button', async ({ page }) => {
      await expect(
        page.getByRole('button', { name: 'ライセンスを追加' }),
      ).toBeVisible();
    });

    test('displays the licenses table with correct headers', async ({ page }) => {
      const headers = ['ソフトウェア', 'ベンダー', '種別', '購入数', '使用数', '使用率', 'ステータス'];
      for (const header of headers) {
        await expect(
          page.locator('th', { hasText: header }),
        ).toBeVisible();
      }
    });

    test('displays license entries', async ({ page }) => {
      await expect(page.getByText('Microsoft 365 E3')).toBeVisible();
      await expect(page.getByText('Adobe Creative Cloud')).toBeVisible();
      await expect(page.getByText('Slack Business+')).toBeVisible();
    });

    test('displays status badges', async ({ page }) => {
      await expect(page.getByText('準拠').first()).toBeVisible();
      await expect(page.getByText('超過').first()).toBeVisible();
      await expect(page.getByText('低利用').first()).toBeVisible();
    });

    test('displays vendor information', async ({ page }) => {
      await expect(page.getByText('Microsoft').first()).toBeVisible();
      await expect(page.getByText('Adobe').first()).toBeVisible();
      await expect(page.getByText('Salesforce').first()).toBeVisible();
    });

    test('displays usage rate bars', async ({ page }) => {
      // Usage rate percentage values should be visible
      const usageRates = page.locator('td >> text=/\\d+%/');
      const count = await usageRates.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ==================================================================
  // Compliance page
  // ==================================================================
  test.describe('Compliance check', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/sam/compliance');
    });

    test('displays the compliance page heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'コンプライアンスチェック' }),
      ).toBeVisible();
    });

    test('displays action buttons', async ({ page }) => {
      await expect(
        page.getByRole('button', { name: /再スキャン/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /レポート出力/ }),
      ).toBeVisible();
    });

    test('displays compliance summary cards', async ({ page }) => {
      await expect(page.getByText('全体遵守率')).toBeVisible();
      await expect(page.getByText('94.2%')).toBeVisible();
      await expect(page.getByText('超過ライセンス')).toBeVisible();
      await expect(page.getByText('低利用ライセンス')).toBeVisible();
      await expect(page.getByText('推定超過コスト')).toBeVisible();
    });

    test('displays filter tabs', async ({ page }) => {
      await expect(page.getByRole('button', { name: /すべて/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /超過/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /低利用/ })).toBeVisible();
    });

    test('filter tabs change displayed data', async ({ page }) => {
      // Click on "over-deployed" filter
      await page.getByRole('button', { name: /超過/ }).click();

      // Should still show over-deployed items
      await expect(page.getByText('Adobe Creative Cloud')).toBeVisible();
      // Under-utilized items should be hidden
      await expect(page.getByText('Norton 360')).not.toBeVisible();
    });

    test('displays compliance table with correct headers', async ({ page }) => {
      const headers = ['ソフトウェア', 'ベンダー', 'ライセンス数', 'インストール数', '差分', 'ステータス', 'リスク', '対応'];
      for (const header of headers) {
        await expect(
          page.locator('th', { hasText: header }),
        ).toBeVisible();
      }
    });

    test('displays bar chart for over-deployed licenses', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: '超過ライセンス数' }),
      ).toBeVisible();
    });
  });
});
