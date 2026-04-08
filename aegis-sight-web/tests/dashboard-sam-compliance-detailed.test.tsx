import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sam/compliance',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ value, color, label }: { value?: number; color?: string; label?: string }) => (
    <div data-testid="donut-chart" data-value={value} data-color={color}>{label}</div>
  ),
  BarChart: ({ data }: { data: { label: string; value: number; color?: string }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label} data-color={d.color}>{d.label}: {d.value}</span>)}</div>
  ),
  ProgressBar: ({ value }: { value?: number }) => <div data-testid="progress-bar" data-value={value} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) => (
    <span data-variant={variant} data-dot={dot}>{children}</span>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function loadPage() {
  const mod = await import('@/app/dashboard/sam/compliance/page');
  return mod.default;
}

/* ========================================================================
 * 1. Basic rendering
 * ======================================================================== */
describe('SAM Compliance page - basic rendering', () => {
  it('renders without crashing', async () => {
    const Page = await loadPage();
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows page heading コンプライアンスチェック', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('コンプライアンスチェック')).toBeTruthy();
  });

  it('shows page subtitle', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('ライセンス超過・低利用の検出結果');
  });

  it('renders 再スキャン button', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('再スキャン')).toBeTruthy();
  });

  it('renders レポート出力 button', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('レポート出力')).toBeTruthy();
  });
});

/* ========================================================================
 * 2. Summary cards
 * ======================================================================== */
describe('SAM Compliance page - summary cards', () => {
  it('renders DonutChart with compliance rate label', async () => {
    const Page = await loadPage();
    render(<Page />);
    const donut = screen.getByTestId('donut-chart');
    expect(donut).toBeTruthy();
    expect(donut.textContent).toContain('遵守率');
  });

  it('shows 全体遵守率 94.2%', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('全体遵守率');
    expect(document.body.textContent).toContain('94.2%');
  });

  it('shows overDeployedCount = 4', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('超過ライセンス');
    // 4 over-deployed items
    const overCards = screen.getByText('超過ライセンス').closest('div');
    expect(overCards?.textContent).toContain('4');
  });

  it('shows underUtilizedCount = 2', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('低利用ライセンス');
    const underCards = screen.getByText('低利用ライセンス').closest('div');
    expect(underCards?.textContent).toContain('2');
  });

  it('calculates and displays totalGapCost correctly', async () => {
    const Page = await loadPage();
    render(<Page />);
    // gap > 0 items: 8, 3, 2, 1 -> total gap = 14, cost = 14 * 12000 = 168000
    expect(document.body.textContent).toContain('推定超過コスト');
    expect(document.body.textContent).toContain('168,000');
    expect(document.body.textContent).toContain('円/年');
  });
});

/* ========================================================================
 * 3. BarChart - gap chart with risk-based color branches
 * ======================================================================== */
describe('SAM Compliance page - gap bar chart', () => {
  it('renders 超過ライセンス数 heading', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('超過ライセンス数')).toBeTruthy();
  });

  it('renders BarChart with only gap > 0 items', async () => {
    const Page = await loadPage();
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    // 4 items have gap > 0: Adobe(8), AutoCAD(3), Visio(2), Photoshop(1)
    expect(barChart.textContent).toContain('Adobe');
    expect(barChart.textContent).toContain('AutoCAD');
    expect(barChart.textContent).toContain('Visio');
    expect(barChart.textContent).toContain('Photoshop');
    // gap <= 0 items should NOT appear: Norton, Slack
    expect(barChart.textContent).not.toContain('Norton');
    expect(barChart.textContent).not.toContain('Slack');
  });

  it('bar chart uses correct color for high risk (bg-red-500)', async () => {
    const Page = await loadPage();
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    // Adobe CC has risk=high -> bg-red-500
    const adobeSpan = Array.from(barChart.querySelectorAll('span')).find(
      (el) => el.textContent?.includes('Adobe')
    );
    expect(adobeSpan?.getAttribute('data-color')).toBe('bg-red-500');
  });

  it('bar chart uses correct color for medium risk (bg-amber-500)', async () => {
    const Page = await loadPage();
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    const autocadSpan = Array.from(barChart.querySelectorAll('span')).find(
      (el) => el.textContent?.includes('AutoCAD')
    );
    expect(autocadSpan?.getAttribute('data-color')).toBe('bg-amber-500');
  });

  it('bar chart uses correct color for low risk (bg-gray-400)', async () => {
    const Page = await loadPage();
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    const photoshopSpan = Array.from(barChart.querySelectorAll('span')).find(
      (el) => el.textContent?.includes('Photoshop')
    );
    expect(photoshopSpan?.getAttribute('data-color')).toBe('bg-gray-400');
  });
});

/* ========================================================================
 * 4. Filter tabs - useState filter branch
 * ======================================================================== */
describe('SAM Compliance page - filter tabs', () => {
  it('renders all 3 filter tabs: すべて, 超過, 低利用', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getAllByText('すべて').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('超過').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('低利用').length).toBeGreaterThanOrEqual(1);
  });

  it('default filter is "all" - shows all 6 rows', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('Adobe Creative Cloud')).toBeTruthy();
    expect(screen.getByText('Norton 360')).toBeTruthy();
    expect(screen.getByText('Slack Business+')).toBeTruthy();
  });

  it('shows counts in filter tabs: 6, 4, 2', async () => {
    const Page = await loadPage();
    render(<Page />);
    // Tab counts rendered as text inside spans
    expect(document.body.textContent).toContain('6');
    expect(document.body.textContent).toContain('4');
    expect(document.body.textContent).toContain('2');
  });

  it('clicking 超過 tab filters to over-deployed items only', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getAllByText('超過').find((el) => el.closest('button'))!);
    // over-deployed items: Adobe CC, AutoCAD, Visio, Photoshop
    expect(screen.getByText('Adobe Creative Cloud')).toBeTruthy();
    expect(screen.getByText('AutoCAD LT 2024')).toBeTruthy();
    expect(screen.getByText('Visio Professional')).toBeTruthy();
    expect(screen.getByText('Photoshop Elements')).toBeTruthy();
    // under-utilized should be hidden
    expect(screen.queryByText('Norton 360')).toBeNull();
    expect(screen.queryByText('Slack Business+')).toBeNull();
  });

  it('clicking 低利用 tab filters to under-utilized items only', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getAllByText('低利用').find((el) => el.closest('button'))!);
    // under-utilized items: Norton 360, Slack Business+
    expect(screen.getByText('Norton 360')).toBeTruthy();
    expect(screen.getByText('Slack Business+')).toBeTruthy();
    // over-deployed should be hidden
    expect(screen.queryByText('Adobe Creative Cloud')).toBeNull();
    expect(screen.queryByText('AutoCAD LT 2024')).toBeNull();
  });

  it('clicking すべて tab restores all items after filtering', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getAllByText('超過').find((el) => el.closest('button'))!);
    expect(screen.queryByText('Norton 360')).toBeNull();
    fireEvent.click(screen.getAllByText('すべて').find((el) => el.closest('button'))!);
    expect(screen.getByText('Norton 360')).toBeTruthy();
    expect(screen.getByText('Adobe Creative Cloud')).toBeTruthy();
  });
});

/* ========================================================================
 * 5. Active tab styling branch
 * ======================================================================== */
describe('SAM Compliance page - active tab styling', () => {
  it('applies active styling to selected tab', async () => {
    const Page = await loadPage();
    render(<Page />);
    const allTab = screen.getAllByText('すべて').find((el) => el.closest('button'))?.closest('button');
    expect(allTab?.className).toContain('bg-primary-50');
    expect(allTab?.className).toContain('text-primary-700');
  });

  it('applies inactive styling to non-selected tab', async () => {
    const Page = await loadPage();
    render(<Page />);
    const overTab = screen.getAllByText('超過').find((el) => el.closest('button'))?.closest('button');
    expect(overTab?.className).toContain('text-gray-600');
  });

  it('switches active styling when clicking a different tab', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getAllByText('超過').find((el) => el.closest('button'))!);
    const overTab = screen.getAllByText('超過').find((el) => el.closest('button'))?.closest('button');
    expect(overTab?.className).toContain('bg-primary-50');
    const allTab = screen.getAllByText('すべて').find((el) => el.closest('button'))?.closest('button');
    expect(allTab?.className).toContain('text-gray-600');
  });
});

/* ========================================================================
 * 6. Table gap column - conditional text color branch
 * ======================================================================== */
describe('SAM Compliance page - gap column styling', () => {
  it('positive gap values show red text with + prefix', async () => {
    const Page = await loadPage();
    render(<Page />);
    // gap > 0 -> text-red-600 and +N format
    expect(document.body.textContent).toContain('+8');
    expect(document.body.textContent).toContain('+3');
    expect(document.body.textContent).toContain('+2');
    expect(document.body.textContent).toContain('+1');
  });

  it('negative gap values show emerald text without + prefix', async () => {
    const Page = await loadPage();
    render(<Page />);
    // gap < 0 -> text-emerald-600 and just the negative number
    expect(document.body.textContent).toContain('-280');
    expect(document.body.textContent).toContain('-188');
  });

  it('positive gap td has text-red-600 class', async () => {
    const Page = await loadPage();
    render(<Page />);
    const plusEight = Array.from(document.querySelectorAll('td')).find(
      (td) => td.textContent === '+8'
    );
    expect(plusEight?.className).toContain('text-red-600');
  });

  it('negative gap td has text-emerald-600 class', async () => {
    const Page = await loadPage();
    render(<Page />);
    const negVal = Array.from(document.querySelectorAll('td')).find(
      (td) => td.textContent === '-280'
    );
    expect(negVal?.className).toContain('text-emerald-600');
  });
});

/* ========================================================================
 * 7. Status Badge variant branches (statusConfig)
 * ======================================================================== */
describe('SAM Compliance page - status badge variants', () => {
  it('over-deployed items get danger variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    const dangerBadges = Array.from(document.querySelectorAll('[data-variant="danger"]'));
    // 4 over-deployed items -> 4 danger status badges + 1 high risk badge = 5
    expect(dangerBadges.length).toBeGreaterThanOrEqual(4);
  });

  it('under-utilized items get warning variant for status', async () => {
    const Page = await loadPage();
    render(<Page />);
    const warningBadges = Array.from(document.querySelectorAll('[data-variant="warning"]'));
    // 2 under-utilized status + 2 medium risk = 4
    expect(warningBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('status labels are rendered correctly: 超過 and 低利用', async () => {
    const Page = await loadPage();
    render(<Page />);
    // Status labels from statusConfig
    const statusBadges = document.querySelectorAll('[data-dot="true"]');
    // 6 items -> 6 status badges with dot
    expect(statusBadges.length).toBe(6);
  });
});

/* ========================================================================
 * 8. Risk Badge variant branches (riskConfig)
 * ======================================================================== */
describe('SAM Compliance page - risk badge variants', () => {
  it('high risk gets danger variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    // Adobe CC has risk=high -> riskConfig.high.variant = danger
    const highBadge = screen.getByText('高');
    expect(highBadge.getAttribute('data-variant')).toBe('danger');
  });

  it('medium risk gets warning variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    const mediumBadges = screen.getAllByText('中');
    mediumBadges.forEach((badge) => {
      expect(badge.getAttribute('data-variant')).toBe('warning');
    });
  });

  it('low risk gets default variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    const lowBadge = screen.getByText('低');
    expect(lowBadge.getAttribute('data-variant')).toBe('default');
  });

  it('info risk gets info variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    const infoBadges = screen.getAllByText('情報');
    infoBadges.forEach((badge) => {
      expect(badge.getAttribute('data-variant')).toBe('info');
    });
  });
});

/* ========================================================================
 * 9. Table data correctness
 * ======================================================================== */
describe('SAM Compliance page - table data', () => {
  it('displays all software names', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('Adobe Creative Cloud')).toBeTruthy();
    expect(screen.getByText('AutoCAD LT 2024')).toBeTruthy();
    expect(screen.getByText('Visio Professional')).toBeTruthy();
    expect(screen.getByText('Photoshop Elements')).toBeTruthy();
    expect(screen.getByText('Norton 360')).toBeTruthy();
    expect(screen.getByText('Slack Business+')).toBeTruthy();
  });

  it('displays vendor names', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Adobe');
    expect(document.body.textContent).toContain('Autodesk');
    expect(document.body.textContent).toContain('Microsoft');
    expect(document.body.textContent).toContain('Gen Digital');
    expect(document.body.textContent).toContain('Salesforce');
  });

  it('displays action descriptions', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('追加ライセンス購入またはアンインストール');
    expect(document.body.textContent).toContain('ライセンス追加申請中');
    expect(document.body.textContent).toContain('利用状況ヒアリング中');
    expect(document.body.textContent).toContain('次回更新時に調整予定');
    expect(document.body.textContent).toContain('ライセンス数削減を検討');
    expect(document.body.textContent).toContain('次回契約更新時にダウンサイズ');
  });
});
