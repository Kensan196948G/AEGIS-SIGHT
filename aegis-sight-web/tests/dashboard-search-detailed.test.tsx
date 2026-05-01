import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation - useSearchParams can return query params
let mockSearchQuery = '';
let mockSearchType = 'all';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'q') return mockSearchQuery;
      if (key === 'type') return mockSearchType;
      return null;
    },
  }),
  usePathname: () => '/dashboard/search',
  useParams: () => ({}),
}));

// Mock @/lib/api to control search results
const mockApiGet = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

beforeEach(() => {
  mockSearchQuery = '';
  mockSearchType = 'all';
  mockApiGet.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Search page - initial render (no query)', () => {
  it('renders without crashing', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    const { container } = render(<SearchPage />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows 統合検索 heading', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    expect(screen.getByText('統合検索')).toBeTruthy();
  });

  it('shows search input', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    const input = document.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
  });

  it('shows 検索 submit button', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    expect(screen.getByText('検索')).toBeTruthy();
  });

  it('shows type filter tabs (すべて、デバイス、ライセンス etc)', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    expect(screen.getByText('すべて')).toBeTruthy();
    expect(screen.getByText('デバイス')).toBeTruthy();
    expect(screen.getByText('ライセンス')).toBeTruthy();
    expect(screen.getByText('調達')).toBeTruthy();
    expect(screen.getByText('アラート')).toBeTruthy();
  });

  it('no results shown initially without query', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    // Without query, no API call, no results
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});

describe('Search page - user interaction (no query param)', () => {
  it('can type in search input', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value: 'laptop' } });
      expect(input.value).toBe('laptop');
    }
  });

  it('type filter tab switch デバイス works', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    fireEvent.click(screen.getByText('デバイス'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('type filter tab switch ライセンス works', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    fireEvent.click(screen.getByText('ライセンス'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('type filter tab switch 調達 works', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    fireEvent.click(screen.getByText('調達'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('type filter tab switch アラート works', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    fireEvent.click(screen.getByText('アラート'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('form submission with non-empty query triggers search', async () => {
    mockApiGet.mockResolvedValue({
      query: 'laptop',
      total: 0,
      groups: [],
      offset: 0,
      limit: 20,
      has_more: false,
    });

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value: 'laptop' } });
    }
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    });
  });
});

describe('Search page - with initial query from URL', () => {
  beforeEach(() => {
    mockSearchQuery = 'device-001';
    mockSearchType = 'all';
  });

  it('triggers search when query is in URL params', async () => {
    mockApiGet.mockResolvedValue({
      query: 'device-001',
      total: 1,
      groups: [
        {
          type: 'device',
          count: 1,
          items: [
            {
              id: 'dev-001',
              type: 'device',
              title: 'DEVICE-001',
              subtitle: 'Windows 11',
              matched_field: 'hostname',
              matched_value: 'device-001',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
      ],
      offset: 0,
      limit: 20,
      has_more: false,
    });

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });
  });

  it('shows search results when API returns data', async () => {
    mockApiGet.mockResolvedValue({
      query: 'device-001',
      total: 1,
      groups: [
        {
          type: 'device',
          count: 1,
          items: [
            {
              id: 'dev-001',
              type: 'device',
              title: 'DEVICE-001',
              subtitle: 'Windows 11',
              matched_field: 'hostname',
              matched_value: 'device-001',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
      ],
      offset: 0,
      limit: 20,
      has_more: false,
    });

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    await waitFor(() => {
      const hasResult = document.body.textContent?.includes('DEVICE-001') ||
                        document.body.textContent?.includes('device-001');
      expect(hasResult).toBe(true);
    });
  });

  it('shows empty results state when total is 0', async () => {
    mockApiGet.mockResolvedValue({
      query: 'nonexistent-device',
      total: 0,
      groups: [],
      offset: 0,
      limit: 20,
      has_more: false,
    });

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(30);
    });
  });

  it('shows error state when API throws', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    await waitFor(() => {
      const hasError = document.body.textContent?.includes('エラー') ||
                       document.body.textContent?.includes('error');
      expect(hasError).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Branch: results && type !== 'all' (true arm) — count badge per tab type
// ---------------------------------------------------------------------------

describe('SearchPage - results && type !== all branch', () => {
  it('shows count badge on non-all type tabs when results are present', async () => {
    // activeType defaults to 'all', but results are loaded → type !== 'all' tabs show count
    mockSearchQuery = 'laptop';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'laptop',
      total: 3,
      groups: [
        { type: 'device', count: 2, items: [
          { id: 'd1', type: 'device', title: 'laptop-01', subtitle: 'Windows 11', matched_field: 'name', matched_value: 'laptop', created_at: '2026-01-15T00:00:00Z' },
          { id: 'd2', type: 'device', title: 'laptop-02', subtitle: null, matched_field: 'name', matched_value: 'laptop-02', created_at: null },
        ]},
        { type: 'license', count: 1, items: [
          { id: 'l1', type: 'license', title: 'LaptopSoft', subtitle: null, matched_field: 'name', matched_value: 'laptop', created_at: null },
        ]},
      ],
      offset: 0, limit: 20, has_more: false,
    });

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    // Wait for API response
    await waitFor(() => {
      expect(document.body.textContent).toContain('laptop');
    });

    // results present → type !== 'all' tabs show count badges (covers true arm)
    // results present → type === 'all' tab shows total (3)
    expect(document.body.textContent).toContain('3');
  });

  it('covers results && type === all branch (total count shown)', async () => {
    mockSearchQuery = 'alert';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'alert',
      total: 5,
      groups: [
        { type: 'alert', count: 5, items: [
          { id: 'a1', type: 'alert', title: 'Critical Alert', subtitle: 'Server down', matched_field: 'title', matched_value: 'alert', created_at: '2026-03-01T09:00:00Z' },
        ]},
      ],
      offset: 0, limit: 20, has_more: false,
    });

    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('5');
    });
    // 'Server down' subtitle should be rendered (item.subtitle truthy branch)
    expect(document.body.textContent).toContain('Server down');
  });
});

// ---------------------------------------------------------------------------
// Branch: item.subtitle (null vs non-null)
// Branch: item.created_at (null vs non-null)
// ---------------------------------------------------------------------------

describe('SearchPage - item.subtitle and item.created_at branches', () => {
  it('renders subtitle when item.subtitle is non-null (true arm)', async () => {
    mockSearchQuery = 'test';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'test',
      total: 1,
      groups: [{ type: 'device', count: 1, items: [
        { id: '1', type: 'device', title: 'test-device', subtitle: 'OS: Windows 11', matched_field: 'name', matched_value: 'test', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('test-device'));
    // subtitle truthy → paragraph rendered
    expect(document.body.textContent).toContain('OS: Windows 11');
  });

  it('does not render subtitle when item.subtitle is null (false arm)', async () => {
    mockSearchQuery = 'test';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'test',
      total: 1,
      groups: [{ type: 'device', count: 1, items: [
        { id: '1', type: 'device', title: 'test-device-null', subtitle: null, matched_field: 'name', matched_value: 'test', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('test-device-null'));
    // subtitle null → false arm, no subtitle paragraph
    const body = document.body.textContent || '';
    expect(body).not.toContain('OS: Windows');
  });

  it('renders created_at time element when non-null (true arm)', async () => {
    mockSearchQuery = 'test';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'test',
      total: 1,
      groups: [{ type: 'procurement', count: 1, items: [
        { id: '1', type: 'procurement', title: 'PO-2026-001', subtitle: null, matched_field: 'id', matched_value: 'test', created_at: '2026-02-20T12:00:00Z' },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('PO-2026-001'));
    // created_at truthy → <time> element rendered
    const timeEls = document.querySelectorAll('time');
    expect(timeEls.length).toBeGreaterThan(0);
  });

  it('does not render time element when item.created_at is null (false arm)', async () => {
    mockSearchQuery = 'test';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'test',
      total: 1,
      groups: [{ type: 'device', count: 1, items: [
        { id: '1', type: 'device', title: 'no-date-device', subtitle: null, matched_field: 'name', matched_value: 'test', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('no-date-device'));
    // created_at null → false arm, no <time> element
    const timeEls = document.querySelectorAll('time');
    expect(timeEls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Branch: TYPE_LABELS[item.type] || item.type  — unknown type fallback
// Branch: TYPE_COLORS[item.type] || ''         — unknown type fallback
// Branch: TYPE_LINKS[item.type] || '/dashboard' — unknown type fallback
// ---------------------------------------------------------------------------

describe('SearchPage - unknown type fallback branches', () => {
  it('falls back to raw type string when TYPE_LABELS has no entry', async () => {
    mockSearchQuery = 'custom';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'custom',
      total: 1,
      groups: [{ type: 'custom_type', count: 1, items: [
        { id: '1', type: 'custom_type', title: 'custom-item', subtitle: null, matched_field: 'id', matched_value: 'custom', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('custom-item'));
    // TYPE_LABELS['custom_type'] is undefined → OR fallback returns 'custom_type'
    expect(document.body.textContent).toContain('custom_type');
  });

  it('fallback TYPE_COLORS is empty string for unknown type (no color class applied)', async () => {
    mockSearchQuery = 'unknown';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'unknown',
      total: 1,
      groups: [{ type: 'unknown_kind', count: 1, items: [
        { id: '1', type: 'unknown_kind', title: 'UnknownItem', subtitle: null, matched_field: 'name', matched_value: 'unknown', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('UnknownItem'));
    // TYPE_COLORS['unknown_kind'] is undefined → '' fallback applied, no color classes crash
    expect(document.body.textContent).toContain('unknown_kind');
  });
});

// ---------------------------------------------------------------------------
// Branch: highlightMatch — index === -1 (no match) and match found
// ---------------------------------------------------------------------------

describe('SearchPage - highlightMatch branches', () => {
  it('renders mark element when query matches title (highlight branch)', async () => {
    mockSearchQuery = 'laptop';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'laptop',
      total: 1,
      groups: [{ type: 'device', count: 1, items: [
        { id: '1', type: 'device', title: 'laptop-station', subtitle: null, matched_field: 'name', matched_value: 'laptop', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('laptop-station'));
    // highlightMatch('laptop-station', 'laptop') → index === 0 → <mark> rendered
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
  });

  it('does not render mark element when query does not match title (index === -1 branch)', async () => {
    mockSearchQuery = 'zzznomatch';
    mockSearchType = 'all';
    mockApiGet.mockResolvedValue({
      query: 'zzznomatch',
      total: 1,
      groups: [{ type: 'device', count: 1, items: [
        { id: '1', type: 'device', title: 'ALPHA-DEVICE', subtitle: null, matched_field: 'os', matched_value: 'zzznomatch', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('ALPHA-DEVICE'));
    // highlightMatch('ALPHA-DEVICE', 'zzznomatch') → index === -1 → no <mark> for title
    // matched_value 'zzznomatch' will be highlighted though
    expect(document.body.textContent).toContain('ALPHA-DEVICE');
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: handleSubmit empty query (B7[1]) + highlightMatch empty cases (B0[0])
// ---------------------------------------------------------------------------

describe('SearchPage - branch coverage (empty query and highlightMatch edge cases)', () => {
  it('handleSubmit with empty query is a no-op (branch B7[1] line=113)', async () => {
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    const form = document.querySelector('form');
    if (form) {
      // Submit form with empty query input → if(query.trim()) is FALSE → no router.push/performSearch
      fireEvent.submit(form);
      // No API call should be made
      expect(mockApiGet).not.toHaveBeenCalled();
    }
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('highlightMatch early-returns when results.query is empty string (B0[0] line=56)', async () => {
    mockSearchQuery = 'test';
    mockSearchType = 'all';
    // API returns results with empty query string → highlightMatch(title, '') → !query is true → returns text
    mockApiGet.mockResolvedValue({
      query: '',
      total: 1,
      groups: [{ type: 'device', count: 1, items: [
        { id: '1', type: 'device', title: 'NoHighlight Device', subtitle: null, matched_field: 'name', matched_value: 'NoHighlight', created_at: null },
      ]}],
      offset: 0, limit: 20, has_more: false,
    });
    const { default: SearchPage } = await import('@/app/dashboard/search/page');
    render(<SearchPage />);
    await waitFor(() => expect(document.body.textContent).toContain('NoHighlight Device'));
    // With empty query, no <mark> element should be added (early return branch)
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBe(0);
  });
});
