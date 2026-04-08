import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Next.js navigation for pages using useRouter/useParams/useSearchParams
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
  useParams: () => ({ id: 'test-id-001' }),
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

// ─── Alerts page ───────────────────────────────────────────────────────────
describe('Alerts page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows alert severity categories', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    // Static data includes these severity labels
    expect(screen.getAllByText(/重大|警告|情報/).length).toBeGreaterThan(0);
  });

  it('renders filter tabs', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    expect(screen.getAllByText(/全て|未対応|対応済/).length).toBeGreaterThan(0);
  });
});

// ─── Device Detail page ────────────────────────────────────────────────────
describe('Device Detail page [id]', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows device detail content', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    // Device detail page always renders something
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});

// ─── Procurement Detail page ───────────────────────────────────────────────
describe('Procurement Detail page [id]', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders page content', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });
});

// ─── Procurement New page ──────────────────────────────────────────────────
describe('Procurement New page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows form elements', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    // Form submission button
    expect(screen.getAllByText(/申請|送信|提出/).length).toBeGreaterThan(0);
  });
});

// ─── SAM Compliance page ───────────────────────────────────────────────────
describe('SAM Compliance page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/compliance/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows compliance content', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/compliance/page');
    render(<Page />);
    expect(screen.getAllByText(/コンプライアンス|ライセンス/).length).toBeGreaterThan(0);
  });
});

// ─── SAM Licenses page ─────────────────────────────────────────────────────
describe('SAM Licenses page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows license content', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    render(<Page />);
    expect(screen.getAllByText(/ライセンス/).length).toBeGreaterThan(0);
  });
});

// ─── SAM Reports page ──────────────────────────────────────────────────────
describe('SAM Reports page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/reports/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows reports content', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/reports/page');
    render(<Page />);
    expect(screen.getAllByText(/レポート|コンプライアンス/).length).toBeGreaterThan(0);
  });
});
