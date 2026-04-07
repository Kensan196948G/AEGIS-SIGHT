import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock chart components that use ResizeObserver / SVG calculations
vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
}));

// Mock fetch globally for pages that call API on mount
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

// ─── DLP page ─────────────────────────────────────────────────────────────
describe('DLP page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/dlp/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows DLP heading content', async () => {
    const { default: Page } = await import('@/app/dashboard/dlp/page');
    render(<Page />);
    // DLP page has "DLPルール" text
    expect(screen.getAllByText(/DLP/i).length).toBeGreaterThan(0);
  });
});

// ─── Knowledge page ────────────────────────────────────────────────────────
describe('Knowledge page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/knowledge/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows ナレッジベース heading', async () => {
    const { default: Page } = await import('@/app/dashboard/knowledge/page');
    render(<Page />);
    expect(screen.getByText('ナレッジベース')).toBeTruthy();
  });
});

// ─── Incidents page ────────────────────────────────────────────────────────
describe('Incidents page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/incidents/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows インシデント related content', async () => {
    const { default: Page } = await import('@/app/dashboard/incidents/page');
    render(<Page />);
    expect(screen.getAllByText(/インシデント/).length).toBeGreaterThan(0);
  });
});

// ─── Policies page ─────────────────────────────────────────────────────────
describe('Policies page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/policies/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows ポリシー related content', async () => {
    const { default: Page } = await import('@/app/dashboard/policies/page');
    render(<Page />);
    expect(screen.getAllByText(/ポリシー/).length).toBeGreaterThan(0);
  });
});

// ─── Remote Work page ──────────────────────────────────────────────────────
describe('Remote Work page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/remote-work/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows リモートワーク related content', async () => {
    const { default: Page } = await import('@/app/dashboard/remote-work/page');
    render(<Page />);
    expect(screen.getAllByText(/リモート/).length).toBeGreaterThan(0);
  });
});

// ─── SLA page ─────────────────────────────────────────────────────────────
describe('SLA page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sla/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows SLA related content', async () => {
    const { default: Page } = await import('@/app/dashboard/sla/page');
    render(<Page />);
    expect(screen.getAllByText(/SLA/).length).toBeGreaterThan(0);
  });
});

// ─── Printing page ─────────────────────────────────────────────────────────
describe('Printing page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/printing/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 印刷 related content', async () => {
    const { default: Page } = await import('@/app/dashboard/printing/page');
    render(<Page />);
    expect(screen.getAllByText(/印刷/).length).toBeGreaterThan(0);
  });
});

// ─── Sessions page ─────────────────────────────────────────────────────────
describe('Sessions page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows セッション related content', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getAllByText(/セッション/).length).toBeGreaterThan(0);
  });
});

// ─── Notifications page ────────────────────────────────────────────────────
describe('Notifications page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 通知 related content', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getAllByText(/通知/).length).toBeGreaterThan(0);
  });
});

// ─── Changes page ──────────────────────────────────────────────────────────
describe('Changes page', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/changes/page');
    const { container } = render(<Page />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows 変更 related content', async () => {
    const { default: Page } = await import('@/app/dashboard/changes/page');
    render(<Page />);
    expect(screen.getAllByText(/変更/).length).toBeGreaterThan(0);
  });
});
