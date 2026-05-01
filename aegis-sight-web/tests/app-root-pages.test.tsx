import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/link for not-found.tsx
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation redirect for app/page.tsx
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Suppress console.error from error.tsx useEffect
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // matchMedia stub for ThemeProvider
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Not Found page ────────────────────────────────────────────────────────
describe('NotFound page (app/not-found.tsx)', () => {
  it('renders without crashing', async () => {
    const { default: NotFound } = await import('@/app/not-found');
    const { container } = render(<NotFound />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 404 error code', async () => {
    const { default: NotFound } = await import('@/app/not-found');
    render(<NotFound />);
    expect(screen.getByText('404')).toBeTruthy();
  });

  it('shows ページが見つかりません message', async () => {
    const { default: NotFound } = await import('@/app/not-found');
    render(<NotFound />);
    expect(screen.getByText('ページが見つかりません')).toBeTruthy();
  });

  it('has dashboard and top page links', async () => {
    const { default: NotFound } = await import('@/app/not-found');
    render(<NotFound />);
    expect(screen.getByText('ダッシュボードへ')).toBeTruthy();
    expect(screen.getByText('トップページへ')).toBeTruthy();
  });

  it('shows AEGIS-SIGHT branding', async () => {
    const { default: NotFound } = await import('@/app/not-found');
    render(<NotFound />);
    expect(screen.getByText('AEGIS-SIGHT IT Management Platform')).toBeTruthy();
  });
});

// ─── Root page (redirect) ──────────────────────────────────────────────────
describe('Root page (app/page.tsx)', () => {
  it('module exports a default function', async () => {
    // page.tsx calls redirect() at module/render time; just verify it exports a component
    const mod = await import('@/app/page');
    expect(typeof mod.default).toBe('function');
  });

  it('renders Home component and calls redirect to /dashboard', async () => {
    const { redirect } = await import('next/navigation');
    const { default: Home } = await import('@/app/page');
    // Rendering Home calls redirect('/dashboard')
    try {
      render(<Home />);
    } catch {
      // redirect() may throw in some environments — that's OK, it was called
    }
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});

// ─── Error page ────────────────────────────────────────────────────────────
describe('Error page (app/error.tsx)', () => {
  const mockReset = vi.fn();
  const mockError = new Error('テストエラーメッセージ') as Error & { digest?: string };

  it('renders without crashing', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    const { container } = render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows エラーが発生しました heading', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('エラーが発生しました')).toBeTruthy();
  });

  it('shows error message', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('テストエラーメッセージ')).toBeTruthy();
  });

  it('shows digest when present', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    const errorWithDigest = Object.assign(new Error('テスト'), { digest: 'abc123' });
    render(<ErrorPage error={errorWithDigest} reset={mockReset} />);
    expect(screen.getByText('Digest: abc123')).toBeTruthy();
  });

  it('calls reset when リトライ button clicked', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    render(<ErrorPage error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByText('リトライ'));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('logs error to console', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith('AEGIS-SIGHT error:', mockError);
  });

  it('has dashboard link', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText('ダッシュボードへ')).toBeTruthy();
  });

  it('does not show digest section when digest is absent', async () => {
    const { default: ErrorPage } = await import('@/app/error');
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.queryByText(/Digest:/)).toBeNull();
  });
});

// ─── Providers ─────────────────────────────────────────────────────────────
describe('Providers (app/providers.tsx)', () => {
  it('renders children through all providers', async () => {
    const { Providers } = await import('@/app/providers');
    render(
      <Providers>
        <span data-testid="child">Hello</span>
      </Providers>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
