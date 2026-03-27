import { test, expect } from '@playwright/test';

test.describe('Assets page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@aegis-sight.local');
    await page.getByLabel('パスワード').fill('admin');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Navigate to assets page
    await page.goto('/dashboard/assets');
  });

  // ------------------------------------------------------------------
  // Page display
  // ------------------------------------------------------------------
  test('displays the assets page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'IT資産一覧' }),
    ).toBeVisible();
  });

  test('displays the page description', async ({ page }) => {
    await expect(
      page.getByText('管理対象のハードウェア・ソフトウェア資産'),
    ).toBeVisible();
  });

  test('displays the "add asset" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: '資産を追加' }),
    ).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Search functionality
  // ------------------------------------------------------------------
  test('displays the search input with placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      'ホスト名、IPアドレス、シリアル番号で検索...',
    );
    await expect(searchInput).toBeVisible();
  });

  test('search input accepts text', async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      'ホスト名、IPアドレス、シリアル番号で検索...',
    );
    await searchInput.fill('TESTPC01');
    await expect(searchInput).toHaveValue('TESTPC01');
  });

  // ------------------------------------------------------------------
  // Filter functionality
  // ------------------------------------------------------------------
  test('displays status filter dropdown', async ({ page }) => {
    const statusSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'すべてのステータス' }),
    });
    await expect(statusSelect).toBeVisible();
  });

  test('status filter has correct options', async ({ page }) => {
    const statusSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'すべてのステータス' }),
    });

    await expect(statusSelect.locator('option')).toHaveCount(5);
    await expect(statusSelect.locator('option', { hasText: 'アクティブ' })).toBeAttached();
    await expect(statusSelect.locator('option', { hasText: '非アクティブ' })).toBeAttached();
    await expect(statusSelect.locator('option', { hasText: 'メンテナンス' })).toBeAttached();
    await expect(statusSelect.locator('option', { hasText: '廃棄' })).toBeAttached();
  });

  test('displays department filter dropdown', async ({ page }) => {
    const deptSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'すべての部門' }),
    });
    await expect(deptSelect).toBeVisible();
  });

  test('department filter has correct options', async ({ page }) => {
    const deptSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'すべての部門' }),
    });

    await expect(deptSelect.locator('option', { hasText: 'エンジニアリング' })).toBeAttached();
    await expect(deptSelect.locator('option', { hasText: '営業' })).toBeAttached();
    await expect(deptSelect.locator('option', { hasText: '人事' })).toBeAttached();
    await expect(deptSelect.locator('option', { hasText: '経理' })).toBeAttached();
  });

  test('can select a status filter value', async ({ page }) => {
    const statusSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'すべてのステータス' }),
    });
    await statusSelect.selectOption('active');
    await expect(statusSelect).toHaveValue('active');
  });

  test('can select a department filter value', async ({ page }) => {
    const deptSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'すべての部門' }),
    });
    await deptSelect.selectOption('engineering');
    await expect(deptSelect).toHaveValue('engineering');
  });

  // ------------------------------------------------------------------
  // Table structure
  // ------------------------------------------------------------------
  test('displays the assets table with correct headers', async ({ page }) => {
    const headers = ['ホスト名', 'IPアドレス', 'OS', '部門', 'ステータス', '最終確認'];
    for (const header of headers) {
      await expect(
        page.locator('th', { hasText: header }),
      ).toBeVisible();
    }
  });

  test('displays skeleton loading rows', async ({ page }) => {
    // The table shows 8 skeleton rows
    const skeletonRows = page.locator('tbody tr');
    await expect(skeletonRows).toHaveCount(8);
  });

  // ------------------------------------------------------------------
  // Pagination
  // ------------------------------------------------------------------
  test('displays pagination information', async ({ page }) => {
    await expect(page.getByText(/全.*1,284.*件/)).toBeVisible();
  });

  test('displays pagination buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: '前へ' })).toBeVisible();
    await expect(page.getByRole('button', { name: '次へ' })).toBeVisible();
  });

  test('previous button is disabled on first page', async ({ page }) => {
    await expect(page.getByRole('button', { name: '前へ' })).toBeDisabled();
  });
});
