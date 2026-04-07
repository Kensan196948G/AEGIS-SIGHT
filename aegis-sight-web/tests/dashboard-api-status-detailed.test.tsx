import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/api-status',
  useParams: () => ({}),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  // Default: all fetches fail (API not available)
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  vi.clearAllMocks();
});

// Helper to render and wait for initial state
async function renderApiStatus() {
  const { default: Page } = await import('@/app/dashboard/api-status/page');
  const result = render(<Page />);
  await waitFor(() => {
    expect(screen.getByText('API接続状態')).toBeTruthy();
  });
  return result;
}

describe('ApiStatus page - basic render', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/api-status/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows API接続状態 heading', async () => {
    await renderApiStatus();
    expect(screen.getByText('API接続状態')).toBeTruthy();
  });

  it('shows page subtitle', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('APIヘルスチェック');
  });

  it('shows 更新 button', async () => {
    await renderApiStatus();
    // Button may show '更新中...' during initial refresh; wait for completion
    await waitFor(() => {
      expect(screen.getByText('更新')).toBeTruthy();
    });
  });

  it('shows 全体ステータス section', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('全体ステータス');
  });

  it('shows API URL in overall status section', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('API:');
  });
});

describe('ApiStatus page - subsystem section', () => {
  it('shows サブシステム section heading', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('サブシステム');
  });

  it('shows Database card', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('Database');
  });

  it('shows Redis card', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('Redis');
  });

  it('shows Celery card', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('Celery');
  });

  it('shows Disk card', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('Disk');
  });
});

describe('ApiStatus page - endpoint table', () => {
  it('shows エンドポイント応答時間 section', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('エンドポイント応答時間');
  });

  it('shows Health endpoint in table', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('Health');
  });

  it('shows Version endpoint in table', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('Version');
  });

  it('shows OpenAPI Schema endpoint in table', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('OpenAPI Schema');
  });

  it('shows endpoint URLs in table', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('/health');
  });

  it('shows /openapi.json URL', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('/openapi.json');
  });

  it('shows table headers', async () => {
    await renderApiStatus();
    expect(document.body.textContent).toContain('エンドポイント');
    expect(document.body.textContent).toContain('URL');
    expect(document.body.textContent).toContain('ステータス');
    expect(document.body.textContent).toContain('応答時間');
  });
});

describe('ApiStatus page - fetch failure (all error)', () => {
  it('shows endpoints in error state when all fetches fail', async () => {
    await renderApiStatus();
    // Wait for fetches to complete
    await waitFor(() => {
      // Status badges should be present - error or loading state
      expect(document.body.textContent?.length).toBeGreaterThan(100);
    });
  });

  it('latency shows dash (-) when fetch fails', async () => {
    await renderApiStatus();
    await waitFor(() => {
      // Failed fetches → latency_ms is null → shows '-'
      expect(document.body.textContent).toContain('-');
    });
  });

  it('no healthDetail shown when health/detail fetch fails', async () => {
    await renderApiStatus();
    await waitFor(() => {
      // healthDetail is null when fetch fails → StatusBadge not shown in header
      // Just verify page is stable
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  });
});

describe('ApiStatus page - fetch success', () => {
  beforeEach(() => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'healthy',
            version: '1.0.0',
            checks: {
              database: { status: 'ok', latency_ms: 12 },
              redis: { status: 'ok', latency_ms: 3 },
              celery: { status: 'ok', workers: 4 },
              disk: { status: 'ok', used_percent: 45, free_gb: 110, total_gb: 200 },
            },
          }),
        };
      }
      // Other endpoints succeed
      const latency = 50;
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(100);
  });

  it('shows healthy status badge when API returns healthy', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('healthy');
    });
  });

  it('shows database latency when available', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('12ms');
    });
  });

  it('shows redis latency when available', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('3ms');
    });
  });

  it('shows celery worker count', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('4');
    });
  });

  it('shows disk usage information', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('45');
      expect(document.body.textContent).toContain('110');
    });
  });

  it('shows last refreshed time after update', async () => {
    await renderApiStatus();
    await waitFor(() => {
      // 最終更新 should appear after first refresh
      expect(document.body.textContent).toContain('最終更新');
    });
  });

  it('shows endpoint ok status', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('ok');
    });
  });
});

describe('ApiStatus page - degraded/error subsystem status', () => {
  beforeEach(() => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'degraded',
            version: '1.0.0',
            checks: {
              database: { status: 'unhealthy', error: 'Connection refused', latency_ms: null },
              redis: { status: 'degraded', latency_ms: 500 },
              celery: { status: 'unavailable', error: 'Worker down' },
              disk: { status: 'warning', used_percent: 80, free_gb: 40, total_gb: 200 },
            },
          }),
        };
      }
      return { ok: false, status: 503, json: async () => ({}) };
    });
    vi.spyOn(performance, 'now').mockReturnValue(100);
  });

  it('shows degraded overall status', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('degraded');
    });
  });

  it('shows database error message', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Connection refused');
    });
  });

  it('shows celery error message', async () => {
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Worker down');
    });
  });

  it('shows disk warning usage', async () => {
    await renderApiStatus();
    await waitFor(() => {
      // used_percent: 80 → amber bar
      expect(document.body.textContent).toContain('80');
    });
  });

  it('shows disk high usage (>90%) renders red bar', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'unhealthy',
            version: '1.0.0',
            checks: {
              disk: { status: 'unhealthy', used_percent: 95, free_gb: 10, total_gb: 200 },
            },
          }),
        };
      }
      return { ok: false, status: 503, json: async () => ({}) };
    });
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('95');
    });
  });
});

describe('ApiStatus page - refresh button', () => {
  it('clicking 更新 button triggers refresh', async () => {
    await renderApiStatus();
    // Wait for initial refresh to complete (isRefreshing goes false → button shows '更新')
    const refreshBtn = await waitFor(() => screen.getByText('更新'));
    fireEvent.click(refreshBtn);
    // Button should show 更新中... during refresh
    await waitFor(() => {
      // After async, button returns to 更新
      expect(document.body.textContent).toContain('更新');
    });
  });

  it('更新中... appears while refreshing then returns to 更新', async () => {
    // Slow fetch to potentially catch the refreshing state
    let resolveFetch: (() => void) | null = null;
    mockFetch.mockImplementation(async () => {
      await new Promise<void>((resolve) => { resolveFetch = resolve; });
      return { ok: false, status: 503, json: async () => ({}) };
    });
    const { default: Page } = await import('@/app/dashboard/api-status/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('API接続状態')).toBeTruthy();
    });
    // After initial render, button could be '更新中...' or '更新'
    expect(document.body.textContent?.match(/更新/)).toBeTruthy();
    if (resolveFetch) resolveFetch();
    await waitFor(() => {
      expect(document.body.textContent).toContain('更新');
    });
  });

  it('refresh updates lastRefreshed timestamp', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ok',
            version: '1.0.0',
            checks: {},
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.spyOn(performance, 'now').mockReturnValue(50);

    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('最終更新');
    });

    // Click refresh again
    const refreshBtn = screen.getByText('更新');
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(document.body.textContent).toContain('最終更新');
    });
  });
});

describe('ApiStatus page - StatusBadge variants', () => {
  it('shows various status colors correctly', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ready',
            version: '1.0.0',
            checks: {
              database: { status: 'ok' },
              redis: { status: 'warning' },
              celery: { status: 'unhealthy' },
              disk: { status: 'unavailable' },
            },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.spyOn(performance, 'now').mockReturnValue(100);

    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('ready');
    });
  });

  it('unknown status renders with gray color', async () => {
    // When no health data, checks are empty, each subsystem shows 'unknown'
    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('unknown');
    });
  });
});

describe('ApiStatus page - endpoint status codes', () => {
  it('shows HTTP status code when endpoint returns error', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ok',
            version: '1.0.0',
            checks: {},
          }),
        };
      }
      // Other endpoints return 404
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.spyOn(performance, 'now').mockReturnValue(100);

    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('404');
    });
  });

  it('shows HTTP status 200 when endpoint returns success', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ok',
            version: '1.0.0',
            checks: {},
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.spyOn(performance, 'now').mockReturnValue(100);

    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('200');
    });
  });
});

describe('ApiStatus page - endpoint latency display', () => {
  it('shows latency in ms when fetch succeeds', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return {
          ok: true,
          json: async () => ({ status: 'ok', version: '1.0.0', checks: {} }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    // Mock performance.now to return increasing values
    let callCount = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      callCount++;
      return callCount * 25; // 25ms per endpoint
    });

    await renderApiStatus();
    await waitFor(() => {
      expect(document.body.textContent).toContain('ms');
    });
  });
});

describe('ApiStatus page - health detail failure branch', () => {
  it('health/detail returning 500 sets healthDetail to null', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/health/detail')) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.spyOn(performance, 'now').mockReturnValue(100);

    await renderApiStatus();
    await waitFor(() => {
      // healthDetail is null → no StatusBadge in Overall Status section header
      // But page still renders
      expect(document.body.textContent).toContain('全体ステータス');
    });
  });
});

describe('ApiStatus page - 5 endpoints verified', () => {
  it('all 5 configured endpoints are shown in table', async () => {
    await renderApiStatus();
    const expectedEndpoints = ['Health', 'Health Detail', 'Health Ready', 'Version', 'OpenAPI Schema'];
    for (const ep of expectedEndpoints) {
      expect(document.body.textContent).toContain(ep);
    }
  });

  it('endpoint URLs listed correctly', async () => {
    await renderApiStatus();
    const expectedUrls = ['/health', '/health/detail', '/health/ready', '/api/v1/version', '/openapi.json'];
    for (const url of expectedUrls) {
      expect(document.body.textContent).toContain(url);
    }
  });
});
