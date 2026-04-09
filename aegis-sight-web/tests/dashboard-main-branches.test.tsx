import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getCompColor } from '@/app/dashboard/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ value, color, label }: { value: number; color: string; label: string }) =>
    <div data-testid="donut-chart" data-value={value} data-color={color}>{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) =>
    <div data-testid="bar-chart">{data.map(d => <span key={d.label}>{d.label}</span>)}</div>,
}));

vi.mock('@/components/ui/stat-card', () => ({
  StatCard: ({ title, value }: { title: string; value: string }) =>
    <div data-testid="stat-card">{title}: {value}</div>,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('Dashboard page - basic render with default data (compRate=94, green branch)', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows ダッシュボード heading', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(screen.getByText('ダッシュボード')).toBeTruthy();
  });

  it('shows DonutChart with green color (compRate=94 >= 90 branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    const chart = document.querySelector('[data-testid="donut-chart"]');
    expect(chart).toBeTruthy();
    // With licenseComplianceRate=94.2, compRate=94 >= 90 → green #10b981
    expect(chart?.getAttribute('data-color')).toBe('#10b981');
  });

  it('shows 94% in donut label', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('94%');
  });

  it('shows BarChart with key metrics', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
  });

  it('shows システム概要 section', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('システム概要');
  });

  it('shows ライセンスコンプライアンス率 label', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ライセンスコンプライアンス率');
  });

  it('renders StatCard components', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    const cards = document.querySelectorAll('[data-testid="stat-card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows recent alerts section', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('最近のアラート');
  });

  it('shows critical alert (重大 badge)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('重大');
  });

  it('shows warning alert (警告 badge)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('警告');
  });

  it('shows info alert (情報 badge)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('情報');
  });

  it('shows Adobe license alert', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Adobe Creative Suite');
  });

  it('shows 管理端末数 stat', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('管理端末');
  });
});

describe('Dashboard page - getCompColor branch coverage', () => {
  it('green branch: rate >= 90 → #10b981', () => {
    expect(getCompColor(94)).toBe('#10b981');
    expect(getCompColor(90)).toBe('#10b981');
  });

  it('amber branch: 70 <= rate < 90 → #f59e0b', () => {
    expect(getCompColor(75)).toBe('#f59e0b');
    expect(getCompColor(70)).toBe('#f59e0b');
  });

  it('red branch: rate < 70 → #ef4444', () => {
    expect(getCompColor(65)).toBe('#ef4444');
    expect(getCompColor(0)).toBe('#ef4444');
  });
});
