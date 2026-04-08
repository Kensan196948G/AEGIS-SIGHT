import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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

// ─── Settings page ─────────────────────────────────────────────────────────
describe('Settings page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/settings/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows システム設定 content', async () => {
    const { default: Page } = await import('@/app/dashboard/settings/page');
    render(<Page />);
    expect(screen.getAllByText(/設定/).length).toBeGreaterThan(0);
  });
});

// ─── Assets page ───────────────────────────────────────────────────────────
describe('Assets page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/assets/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows IT資産 content', async () => {
    const { default: Page } = await import('@/app/dashboard/assets/page');
    render(<Page />);
    expect(screen.getAllByText(/資産/).length).toBeGreaterThan(0);
  });
});

// ─── Patches page ──────────────────────────────────────────────────────────
describe('Patches page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/patches/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows patch severity content', async () => {
    const { default: Page } = await import('@/app/dashboard/patches/page');
    render(<Page />);
    expect(screen.getAllByText(/Critical/i).length).toBeGreaterThan(0);
  });
});

// ─── Network page ──────────────────────────────────────────────────────────
describe('Network page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/network/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows ネットワーク content', async () => {
    const { default: Page } = await import('@/app/dashboard/network/page');
    render(<Page />);
    expect(screen.getAllByText(/ネットワーク/).length).toBeGreaterThan(0);
  });
});

// ─── Procurement page ──────────────────────────────────────────────────────
describe('Procurement page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 調達 content', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/page');
    render(<Page />);
    expect(screen.getAllByText(/調達/).length).toBeGreaterThan(0);
  });
});

// ─── Departments page ──────────────────────────────────────────────────────
describe('Departments page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/departments/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows Department Management heading', async () => {
    const { default: Page } = await import('@/app/dashboard/departments/page');
    render(<Page />);
    expect(screen.getByText('Department Management')).toBeTruthy();
  });
});

// ─── Device Groups page ────────────────────────────────────────────────────
describe('Device Groups page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows Groups content', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    expect(screen.getAllByText(/Groups|グループ/i).length).toBeGreaterThan(0);
  });
});

// ─── Compliance page ───────────────────────────────────────────────────────
describe('Compliance page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/compliance/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows コンプライアンス content', async () => {
    const { default: Page } = await import('@/app/dashboard/compliance/page');
    render(<Page />);
    expect(screen.getAllByText(/コンプライアンス/).length).toBeGreaterThan(0);
  });
});

// ─── Lifecycle page ────────────────────────────────────────────────────────
describe('Lifecycle page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/lifecycle/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows ライフサイクル content', async () => {
    const { default: Page } = await import('@/app/dashboard/lifecycle/page');
    render(<Page />);
    expect(screen.getAllByText(/ライフサイクル/).length).toBeGreaterThan(0);
  });
});

// ─── About page ────────────────────────────────────────────────────────────
describe('About page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/about/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows AEGIS-SIGHT about content', async () => {
    const { default: Page } = await import('@/app/dashboard/about/page');
    render(<Page />);
    expect(screen.getAllByText(/AEGIS-SIGHT/).length).toBeGreaterThan(0);
  });
});
