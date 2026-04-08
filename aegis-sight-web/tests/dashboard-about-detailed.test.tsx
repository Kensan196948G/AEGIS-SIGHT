import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/about',
  useParams: () => ({}),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  vi.clearAllMocks();
});

const mockVersionData = {
  api_version: '1.0.0',
  app_version: '2.0.0',
  python_version: '3.11.0',
  build_date: '2024-01-15T10:00:00',
  git_commit_hash: 'abc123',
  minimum_agent_version: '1.5.0',
};

// Helper: mock fetch to return version data successfully
function mockFetchSuccess() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => mockVersionData,
  });
}

// Helper: mock fetch to reject with a network error
function mockFetchNetworkError() {
  mockFetch.mockRejectedValue(new Error('Network error'));
}

// Helper: mock fetch to return an HTTP error (e.g. 404)
function mockFetchHttpError(status = 404) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  });
}

// Helper: render About page after a never-resolving fetch (loading state)
function mockFetchPending() {
  mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
}

// ─── Group 1: Basic render ──────────────────────────────────────────────────

describe('About page - basic render', () => {
  it('renders without crashing', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows "AEGIS-SIGHT について" heading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(screen.getByText('AEGIS-SIGHT について')).toBeTruthy();
  });

  it('shows page subtitle text', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('バージョン情報・システム情報・ライセンス');
  });

  it('shows "AEGIS-SIGHT" brand heading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    // h2 brand heading inside the card
    const headings = screen.getAllByText('AEGIS-SIGHT');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('shows platform description in brand section', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('統合IT資産管理・SAM・調達・監視プラットフォーム');
  });
});

// ─── Group 2: Loading state ─────────────────────────────────────────────────

describe('About page - loading state', () => {
  it('shows "読み込み中..." while fetch has not resolved', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('shows "バージョン情報" section heading while loading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('バージョン情報');
  });

  it('does NOT show version labels while still loading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).not.toContain('APIバージョン');
    expect(document.body.textContent).not.toContain('Gitコミット');
  });
});

// ─── Group 3: Version data displayed on success (line 97 branch) ────────────

describe('About page - fetch success (version data)', () => {
  it('shows api_version prefixed with "v"', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('v1.0.0');
    });
  });

  it('shows app_version prefixed with "v"', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('v2.0.0');
    });
  });

  it('shows python_version value', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('3.11.0');
    });
  });

  it('shows git_commit_hash value', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('abc123');
    });
  });

  it('shows minimum_agent_version prefixed with "v"', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('v1.5.0');
    });
  });

  it('shows all version field labels when fetch succeeds', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('APIバージョン');
      expect(document.body.textContent).toContain('アプリバージョン');
      expect(document.body.textContent).toContain('Python');
      expect(document.body.textContent).toContain('ビルド日時');
      expect(document.body.textContent).toContain('Gitコミット');
      expect(document.body.textContent).toContain('最小エージェントバージョン');
    });
  });

  it('no longer shows "読み込み中..." after fetch succeeds', async () => {
    mockFetchSuccess();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('v1.0.0');
    });
    expect(document.body.textContent).not.toContain('読み込み中...');
  });
});

// ─── Group 4: Error branch (line 24 .catch) ─────────────────────────────────

describe('About page - fetch error (network error)', () => {
  it('shows error message when fetch rejects with network error', async () => {
    mockFetchNetworkError();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        'APIからバージョン情報を取得できませんでした: Network error'
      );
    });
  });

  it('does not show "読み込み中..." after network error', async () => {
    mockFetchNetworkError();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('APIからバージョン情報を取得できませんでした');
    });
    expect(document.body.textContent).not.toContain('読み込み中...');
  });

  it('shows error message when fetch returns HTTP 404', async () => {
    mockFetchHttpError(404);
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        'APIからバージョン情報を取得できませんでした: HTTP 404'
      );
    });
  });

  it('does not show version field labels when an HTTP error occurs', async () => {
    mockFetchHttpError(500);
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('APIからバージョン情報を取得できませんでした');
    });
    expect(document.body.textContent).not.toContain('APIバージョン');
  });
});

// ─── Group 5: System info section ───────────────────────────────────────────

describe('About page - system info section', () => {
  it('shows "システム情報" heading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('システム情報');
  });

  it('shows フロントエンド: Next.js (React)', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('フロントエンド');
    expect(document.body.textContent).toContain('Next.js (React)');
  });

  it('shows バックエンド: FastAPI (Python)', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('バックエンド');
    expect(document.body.textContent).toContain('FastAPI (Python)');
  });

  it('shows all system component rows', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('PostgreSQL');
    expect(document.body.textContent).toContain('Redis');
    expect(document.body.textContent).toContain('Celery');
    expect(document.body.textContent).toContain('AEGIS-SIGHT Agent (Go)');
  });
});

// ─── Group 6: License section ────────────────────────────────────────────────

describe('About page - license section', () => {
  it('shows "ライセンス" heading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ライセンス');
  });

  it('shows MIT License text', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('MIT License');
  });

  it('shows copyright notice', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Copyright (c) 2024-2026 AEGIS-SIGHT Contributors');
  });
});

// ─── Group 7: Links section ──────────────────────────────────────────────────

describe('About page - links section', () => {
  it('shows "リンク" heading', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('リンク');
  });

  it('shows API docs Swagger link label', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('API ドキュメント (Swagger)');
  });

  it('shows API docs ReDoc link label', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('API ドキュメント (ReDoc)');
  });

  it('shows GitHub repository link label', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('GitHub リポジトリ');
  });

  it('shows Issues and Projects link labels', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Issues');
    expect(document.body.textContent).toContain('Projects');
  });

  it('links have target="_blank" for external navigation', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    const { container } = render(<Page />);
    const externalLinks = container.querySelectorAll('a[target="_blank"]');
    expect(externalLinks.length).toBeGreaterThan(0);
  });

  it('GitHub link has correct href', async () => {
    mockFetchPending();
    const { default: Page } = await import('@/app/dashboard/about/page');
    const { container } = render(<Page />);
    const ghLink = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent?.includes('GitHub リポジトリ')
    );
    expect(ghLink).toBeTruthy();
    expect(ghLink?.getAttribute('href')).toBe('https://github.com/aegis-sight/aegis-sight');
  });
});
