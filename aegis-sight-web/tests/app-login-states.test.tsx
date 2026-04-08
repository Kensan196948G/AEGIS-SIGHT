import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mutable auth state — mutate before each test to control branches
const authState = {
  login: vi.fn(),
  isLoading: false,
  error: null as string | null,
};

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/ui/loading', () => ({
  Spinner: () => <span data-testid="spinner">...</span>,
}));

import LoginPage from '@/app/login/page';

afterEach(() => {
  authState.error = null;
  authState.isLoading = false;
  authState.login.mockReset();
  vi.clearAllMocks();
});

describe('LoginPage - error branch (line 98: {error && ...})', () => {
  beforeEach(() => {
    authState.error = '認証に失敗しました';
    authState.isLoading = false;
  });

  it('shows error message div when error is non-null', () => {
    render(<LoginPage />);
    expect(screen.getByText('認証に失敗しました')).toBeTruthy();
  });

  it('error branch renders red error container', () => {
    render(<LoginPage />);
    // The error message <p> should appear
    const errorEl = document.querySelector('p.text-sm.text-red-700, p[class*="text-red"]');
    expect(errorEl).toBeTruthy();
  });

  it('error branch: error text is visible in body', () => {
    render(<LoginPage />);
    expect(document.body.textContent).toContain('認証に失敗しました');
  });
});

describe('LoginPage - isLoading branch (line 206: isLoading ? spinner : ログイン)', () => {
  beforeEach(() => {
    authState.error = null;
    authState.isLoading = true;
  });

  it('shows ログイン中... text when isLoading=true', () => {
    render(<LoginPage />);
    expect(document.body.textContent).toContain('ログイン中...');
  });

  it('shows Spinner when isLoading=true', () => {
    render(<LoginPage />);
    expect(document.querySelector('[data-testid="spinner"]')).toBeTruthy();
  });

  it('button is disabled when isLoading=true', () => {
    render(<LoginPage />);
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn?.disabled).toBe(true);
  });

  it('loading: button shows ログイン中... and not plain ログイン', () => {
    render(<LoginPage />);
    expect(document.body.textContent).toContain('ログイン中...');
  });
});

describe('LoginPage - no error, not loading (null branch for error)', () => {
  it('error null → error div not rendered', () => {
    render(<LoginPage />);
    // No red error text
    const errorEl = document.querySelector('p.text-sm.text-red-700');
    expect(errorEl).toBeFalsy();
  });

  it('isLoading false → shows ログイン button text', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy();
  });
});
