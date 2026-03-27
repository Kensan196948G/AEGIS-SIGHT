import { test, expect } from '@playwright/test';

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@aegis-sight.local');
    await page.getByLabel('パスワード').fill('admin');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  // ------------------------------------------------------------------
  // Page load and heading
  // ------------------------------------------------------------------
  test('displays the dashboard heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'ダッシュボード' }),
    ).toBeVisible();
  });

  test('displays the page description', async ({ page }) => {
    await expect(
      page.getByText('IT資産管理の概要とアラート'),
    ).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Stats cards
  // ------------------------------------------------------------------
  test('displays all four stat cards', async ({ page }) => {
    await expect(page.getByText('管理端末数')).toBeVisible();
    await expect(page.getByText('アクティブアラート')).toBeVisible();
    await expect(page.getByText('ライセンス遵守率')).toBeVisible();
    await expect(page.getByText('調達申請数')).toBeVisible();
  });

  test('stat cards show numeric values', async ({ page }) => {
    // Total devices
    await expect(page.getByText('1,284')).toBeVisible();
    // Active alerts
    await expect(page.getByText('7')).toBeVisible();
    // Compliance rate
    await expect(page.getByText('94.2%')).toBeVisible();
    // Pending procurements
    await expect(page.getByText('12')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Recent alerts section
  // ------------------------------------------------------------------
  test('displays recent alerts section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: '最近のアラート' }),
    ).toBeVisible();
  });

  test('shows "view all" link pointing to monitoring page', async ({ page }) => {
    const viewAllLink = page.getByRole('link', { name: /すべて表示/ });
    await expect(viewAllLink).toBeVisible();
    await expect(viewAllLink).toHaveAttribute('href', '/dashboard/monitoring');
  });

  test('displays alert items with severity badges', async ({ page }) => {
    // Check that severity badges exist
    await expect(page.getByText('重大').first()).toBeVisible();
    await expect(page.getByText('警告').first()).toBeVisible();
    await expect(page.getByText('情報').first()).toBeVisible();
  });

  test('displays specific alert titles', async ({ page }) => {
    await expect(
      page.getByText('Adobe Creative Suite ライセンス超過'),
    ).toBeVisible();
    await expect(
      page.getByText('サーバー CPU 使用率 90% 超過'),
    ).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Sidebar navigation
  // ------------------------------------------------------------------
  test('sidebar shows AEGIS-SIGHT branding', async ({ page }) => {
    await expect(page.getByText('AEGIS-SIGHT')).toBeVisible();
    await expect(page.getByText('IT Management')).toBeVisible();
  });

  test('sidebar contains all navigation links', async ({ page }) => {
    const navItems = [
      'ダッシュボード',
      '資産管理',
      'SAM',
      '部門管理',
      '調達管理',
      '監視',
      'セキュリティ',
      'アラート',
      'スケジューラ',
      'ユーザー管理',
      '設定',
    ];

    for (const item of navItems) {
      await expect(
        page.locator('aside').getByText(item, { exact: true }),
      ).toBeVisible();
    }
  });

  test('sidebar highlights the active page', async ({ page }) => {
    // The dashboard link should have the active styling class
    const dashboardLink = page.locator('aside a[href="/dashboard"]');
    await expect(dashboardLink).toHaveClass(/primary/);
  });

  test('sidebar navigation to assets page', async ({ page }) => {
    await page.locator('aside').getByText('資産管理', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/assets/);
    await expect(
      page.getByRole('heading', { name: 'IT資産一覧' }),
    ).toBeVisible();
  });

  test('sidebar navigation to SAM page', async ({ page }) => {
    await page.locator('aside').getByText('SAM', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/sam/);
    await expect(
      page.getByRole('heading', { name: /SAM/ }),
    ).toBeVisible();
  });

  test('sidebar navigation to procurement page', async ({ page }) => {
    await page.locator('aside').getByText('調達管理', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/procurement/);
    await expect(
      page.getByRole('heading', { name: '調達管理' }),
    ).toBeVisible();
  });

  // ------------------------------------------------------------------
  // User info in sidebar footer
  // ------------------------------------------------------------------
  test('sidebar shows logged-in user information', async ({ page }) => {
    await expect(page.locator('aside').getByText('管理者')).toBeVisible();
    await expect(
      page.locator('aside').getByText('admin@aegis-sight.local'),
    ).toBeVisible();
  });
});
