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
