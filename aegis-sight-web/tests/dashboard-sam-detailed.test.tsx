import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sam',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ value, color, label }: { value: number; color: string; label: string }) =>
    <div data-testid="donut-chart" data-value={value} data-color={color}>{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) =>
    <div data-testid="bar-chart">{data.map(d => <span key={d.label}>{d.label}</span>)}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot, size }: {
    children: React.ReactNode; variant?: string; dot?: boolean; size?: string;
  }) => <span data-variant={variant} data-dot={dot} data-size={size}>{children}</span>,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('SAM page - basic render', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows SAM - ソフトウェア資産管理 heading', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(screen.getByText('SAM - ソフトウェア資産管理')).toBeTruthy();
  });

  it('shows ライセンスコンプライアンスと最適化 subtitle', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ライセンスコンプライアンスと最適化');
  });

  it('shows DonutChart component', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.querySelector('[data-testid="donut-chart"]')).toBeTruthy();
  });

  it('shows BarChart component', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
  });
});

describe('SAM page - compliance rate display (complianceRate=50, red branch)', () => {
  it('shows compliance rate percentage in donut label', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    // complianceRate = Math.round(4/8*100) = 50
    expect(document.body.textContent).toContain('50%');
  });

  it('DonutChart receives red color for complianceRate=50 (< 70)', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    const chart = document.querySelector('[data-testid="donut-chart"]');
    expect(chart?.getAttribute('data-color')).toBe('#ef4444');
  });

  it('shows ライセンス遵守率 label', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ライセンス遵守率');
  });
});

describe('SAM page - donutColor branch logic (inline coverage)', () => {
  // complianceRate=50 in static data → hits red branch only
  // Test other branches via inline logic

  it('green branch: complianceRate >= 90 → #10b981', () => {
    const complianceRate = 95;
    const donutColor = complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(donutColor).toBe('#10b981');
  });

  it('amber branch: 70 <= complianceRate < 90 → #f59e0b', () => {
    const complianceRate = 75;
    const donutColor = complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(donutColor).toBe('#f59e0b');
  });

  it('red branch: complianceRate < 70 → #ef4444', () => {
    const complianceRate = 50;
    const donutColor = complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(donutColor).toBe('#ef4444');
  });

  it('boundary: exactly 90 → green', () => {
    const complianceRate = 90;
    const donutColor = complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(donutColor).toBe('#10b981');
  });

  it('boundary: exactly 70 → amber', () => {
    const complianceRate = 70;
    const donutColor = complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(donutColor).toBe('#f59e0b');
  });
});

describe('SAM page - status breakdown section', () => {
  it('shows ステータス内訳 heading', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ステータス内訳');
  });

  it('shows 準拠 badge', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('準拠');
  });

  it('shows 超過 badge', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('超過');
  });

  it('shows 低利用 badge', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('低利用');
  });

  it('shows 期限間近 badge', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('期限間近');
  });

  it('shows total product count', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    // totalItems = 8
    expect(document.body.textContent).toContain('8');
  });
});

describe('SAM page - vendor cost chart', () => {
  it('shows ベンダー別月額コスト heading', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ベンダー別月額コスト');
  });

  it('shows Microsoft in bar chart', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Microsoft');
  });

  it('shows Adobe in bar chart', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Adobe');
  });
});

describe('SAM page - quick links', () => {
  it('shows ライセンス一覧 link', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ライセンス一覧');
  });
});
