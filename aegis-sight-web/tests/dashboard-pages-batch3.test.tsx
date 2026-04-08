import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Next.js navigation for pages using useRouter / useSearchParams
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/search',
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
  ProgressBar: ({ value }: { value: number }) => <div data-testid="progress-bar">{value}</div>,
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => '',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

// ─── Monitoring page ───────────────────────────────────────────────────────
describe('Monitoring page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/monitoring/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 監視ダッシュボード heading', async () => {
    const { default: Page } = await import('@/app/dashboard/monitoring/page');
    render(<Page />);
    expect(screen.getByText('監視ダッシュボード')).toBeTruthy();
  });
});

// ─── Security page ─────────────────────────────────────────────────────────
describe('Security page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/security/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows security event content', async () => {
    const { default: Page } = await import('@/app/dashboard/security/page');
    render(<Page />);
    // Static data: recent event exists
    expect(screen.getAllByText(/隔離済|マルウェア/).length).toBeGreaterThan(0);
  });
});

// ─── Scheduler page ────────────────────────────────────────────────────────
describe('Scheduler page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders page container', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);
    // Page renders something on loading state
    expect(container.querySelector('div')).toBeTruthy();
  });
});

// ─── Users page ────────────────────────────────────────────────────────────
describe('Users page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows ユーザー content', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getAllByText(/ユーザー/).length).toBeGreaterThan(0);
  });
});

// ─── Search page ───────────────────────────────────────────────────────────
describe('Search page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/search/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows search filter options', async () => {
    const { default: Page } = await import('@/app/dashboard/search/page');
    render(<Page />);
    // Static filter buttons: すべて, デバイス, ライセンス
    expect(screen.getAllByText(/すべて|デバイス/).length).toBeGreaterThan(0);
  });
});

// ─── Export page ───────────────────────────────────────────────────────────
describe('Export page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows export category options', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText(/デバイス|ライセンス/).length).toBeGreaterThan(0);
  });
});

// ─── Reports page ──────────────────────────────────────────────────────────
describe('Reports page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/reports/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows レポート heading', async () => {
    const { default: Page } = await import('@/app/dashboard/reports/page');
    render(<Page />);
    expect(screen.getAllByText(/レポート/).length).toBeGreaterThan(0);
  });
});

// ─── Audit page ────────────────────────────────────────────────────────────
describe('Audit page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/audit/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 監査ログ heading', async () => {
    const { default: Page } = await import('@/app/dashboard/audit/page');
    render(<Page />);
    expect(screen.getByText('監査ログ')).toBeTruthy();
  });
});

// ─── API Status page ───────────────────────────────────────────────────────
describe('API Status page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/api-status/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows API接続状態 content', async () => {
    const { default: Page } = await import('@/app/dashboard/api-status/page');
    render(<Page />);
    expect(screen.getAllByText(/API/).length).toBeGreaterThan(0);
  });
});

// ─── Devices page ──────────────────────────────────────────────────────────
describe('Devices page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows デバイス管理 heading', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getAllByText(/デバイス/).length).toBeGreaterThan(0);
  });
});

// ─── SAM page ──────────────────────────────────────────────────────────────
describe('SAM page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders SAM page content', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    const { container } = render(<Page />);
    // SAM page renders even during loading
    expect(container.querySelector('div')).toBeTruthy();
  });
});
