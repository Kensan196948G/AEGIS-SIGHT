import { test, expect } from '@playwright/test';

test.describe('Procurement pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@aegis-sight.local');
    await page.getByLabel('パスワード').fill('admin');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  // ==================================================================
  // Procurement list page
  // ==================================================================
  test.describe('Procurement list', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/procurement');
    });

    test('displays the procurement page heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: '調達管理' }),
      ).toBeVisible();
    });

    test('displays the page description', async ({ page }) => {
      await expect(
        page.getByText('IT機器・ソフトウェアの調達申請と承認'),
      ).toBeVisible();
    });

    test('displays "new request" button linking to form', async ({ page }) => {
      const newButton = page.getByRole('link', { name: '新規申請' });
      await expect(newButton).toBeVisible();
      await expect(newButton).toHaveAttribute('href', '/dashboard/procurement/new');
    });

    test('displays the requests table with correct headers', async ({ page }) => {
      const headers = ['申請番号', 'タイトル', '申請者', '部門', '見積額', '優先度', 'ステータス'];
      for (const header of headers) {
        await expect(
          page.locator('th', { hasText: header }),
        ).toBeVisible();
      }
    });

    test('displays procurement request entries', async ({ page }) => {
      await expect(page.getByText('PR-2024-089')).toBeVisible();
      await expect(page.getByText('Dell Latitude 5540 x 20台')).toBeVisible();
      await expect(page.getByText('PR-2024-090')).toBeVisible();
    });

    test('displays requester and department info', async ({ page }) => {
      await expect(page.getByText('田中太郎')).toBeVisible();
      await expect(page.getByText('エンジニアリング').first()).toBeVisible();
      await expect(page.getByText('佐藤花子')).toBeVisible();
    });

    test('displays cost information', async ({ page }) => {
      await expect(page.getByText('¥3,200,000')).toBeVisible();
      await expect(page.getByText('¥720,000')).toBeVisible();
    });

    test('displays priority labels', async ({ page }) => {
      await expect(page.getByText('高').first()).toBeVisible();
      await expect(page.getByText('中').first()).toBeVisible();
      await expect(page.getByText('低').first()).toBeVisible();
    });

    test('displays status badges', async ({ page }) => {
      await expect(page.getByText('承認済').first()).toBeVisible();
      await expect(page.getByText('申請中').first()).toBeVisible();
      await expect(page.getByText('下書き').first()).toBeVisible();
    });

    test('request IDs link to detail pages', async ({ page }) => {
      const link = page.getByRole('link', { name: 'PR-2024-089' });
      await expect(link).toHaveAttribute('href', '/dashboard/procurement/PR-2024-089');
    });

    test('navigating to new request page', async ({ page }) => {
      await page.getByRole('link', { name: '新規申請' }).click();
      await expect(page).toHaveURL(/\/dashboard\/procurement\/new/);
    });
  });

  // ==================================================================
  // New procurement request form
  // ==================================================================
  test.describe('New procurement form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/procurement/new');
    });

    test('displays the new request page heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: '新規調達申請' }),
      ).toBeVisible();
    });

    test('displays the form description', async ({ page }) => {
      await expect(
        page.getByText('IT機器・ソフトウェアの調達を申請します'),
      ).toBeVisible();
    });

    test('displays basic info section', async ({ page }) => {
      await expect(page.getByText('基本情報')).toBeVisible();
    });

    test('displays required form fields', async ({ page }) => {
      // Title
      const titleInput = page.getByLabel(/申請タイトル/);
      await expect(titleInput).toBeVisible();
      await expect(titleInput).toHaveAttribute('required', '');

      // Category
      await expect(page.getByLabel(/カテゴリ/)).toBeVisible();

      // Department
      const deptSelect = page.getByLabel(/申請部門/);
      await expect(deptSelect).toBeVisible();
      await expect(deptSelect).toHaveAttribute('required', '');

      // Purpose
      const purposeField = page.getByLabel(/調達目的/);
      await expect(purposeField).toBeVisible();
      await expect(purposeField).toHaveAttribute('required', '');
    });

    test('displays category options', async ({ page }) => {
      const categorySelect = page.getByLabel(/カテゴリ/);
      await expect(categorySelect.locator('option', { hasText: 'ハードウェア' })).toBeAttached();
      await expect(categorySelect.locator('option', { hasText: 'ソフトウェア' })).toBeAttached();
      await expect(categorySelect.locator('option', { hasText: 'サービス' })).toBeAttached();
    });

    test('displays priority options', async ({ page }) => {
      const prioritySelect = page.getByLabel(/優先度/);
      await expect(prioritySelect.locator('option', { hasText: '低' })).toBeAttached();
      await expect(prioritySelect.locator('option', { hasText: '中' })).toBeAttached();
      await expect(prioritySelect.locator('option', { hasText: '高' })).toBeAttached();
      await expect(prioritySelect.locator('option', { hasText: '緊急' })).toBeAttached();
    });

    test('displays item details section', async ({ page }) => {
      await expect(page.getByText('品目明細')).toBeVisible();
      await expect(
        page.getByRole('button', { name: '品目を追加' }),
      ).toBeVisible();
    });

    test('can fill in a line item', async ({ page }) => {
      const nameInput = page.getByPlaceholder('例: Dell Latitude 5540');
      await nameInput.fill('Dell Latitude 5540');
      await expect(nameInput).toHaveValue('Dell Latitude 5540');
    });

    test('add item button adds a new row', async ({ page }) => {
      // Initially one item row
      const itemRows = page.locator('[class*="grid-cols-12"]');
      const initialCount = await itemRows.count();

      await page.getByRole('button', { name: '品目を追加' }).click();

      await expect(itemRows).toHaveCount(initialCount + 1);
    });

    test('displays total cost calculation', async ({ page }) => {
      await expect(page.getByText('合計金額:')).toBeVisible();
    });

    test('displays form action buttons', async ({ page }) => {
      await expect(
        page.getByRole('button', { name: 'キャンセル' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: '下書き保存' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: '申請を提出' }),
      ).toBeVisible();
    });

    test('displays back navigation button', async ({ page }) => {
      // The back arrow button should be present
      const backButton = page.locator('button').filter({
        has: page.locator('svg path[d*="M10.5 19.5"]'),
      });
      await expect(backButton).toBeVisible();
    });

    test('notes section is displayed', async ({ page }) => {
      await expect(page.getByLabel('備考')).toBeVisible();
    });

    test('delivery date field is displayed', async ({ page }) => {
      await expect(page.getByLabel(/希望納期/)).toBeVisible();
    });
  });
});
