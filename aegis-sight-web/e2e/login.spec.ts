import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ------------------------------------------------------------------
  // Display tests
  // ------------------------------------------------------------------
  test('shows the login form with required fields', async ({ page }) => {
    // Page title / heading
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();

    // Email field
    const emailInput = page.getByLabel('メールアドレス');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');

    // Password field
    const passwordInput = page.getByLabel('パスワード');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('required', '');

    // Submit button
    await expect(
      page.getByRole('button', { name: 'ログイン' }),
    ).toBeVisible();
  });

  test('shows demo credentials hint', async ({ page }) => {
    await expect(page.getByText('Demo:')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Login flow tests
  // ------------------------------------------------------------------
  test('successful login redirects to dashboard', async ({ page }) => {
    // Fill in credentials (demo account)
    await page.getByLabel('メールアドレス').fill('admin@aegis-sight.local');
    await page.getByLabel('パスワード').fill('admin');

    // Submit the form
    await page.getByRole('button', { name: 'ログイン' }).click();

    // After successful login the app should navigate to the dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Dashboard should render a recognisable element
    await expect(
      page.getByRole('heading', { name: /ダッシュボード|Dashboard/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByLabel('メールアドレス').fill('wrong@example.com');
    await page.getByLabel('パスワード').fill('wrongpassword');

    await page.getByRole('button', { name: 'ログイン' }).click();

    // An error message should appear (the exact text depends on the API)
    const errorBanner = page.locator('[class*="red"]');
    await expect(errorBanner.first()).toBeVisible({ timeout: 5_000 });
  });
});
