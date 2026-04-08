import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sam/reports',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ value, color, label }: { value?: number; color?: string; label?: string }) => (
    <div data-testid="donut-chart" data-value={value} data-color={color}>{label}</div>
  ),
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
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
  const mod = await import('@/app/dashboard/sam/reports/page');
  return mod.default;
}

/* ========================================================================
 * 1. Basic rendering
 * ======================================================================== */
describe('SAM Reports page - basic rendering', () => {
  it('renders without crashing', async () => {
    const Page = await loadPage();
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows page heading SAMレポート', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('SAMレポート')).toBeTruthy();
  });

  it('shows page subtitle about J-SOX reports', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('J-SOXレポートおよびライセンス管理レポートの生成・出力');
  });
});

/* ========================================================================
 * 2. Report list rendering
 * ======================================================================== */
describe('SAM Reports page - report list', () => {
  it('renders all 5 report type buttons', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('J-SOXレポート')).toBeTruthy();
    expect(screen.getByText('ライセンスサマリー')).toBeTruthy();
    expect(screen.getByText('コスト最適化レポート')).toBeTruthy();
    expect(screen.getByText('監査証跡レポート')).toBeTruthy();
    expect(screen.getByText('ベンダー別サマリー')).toBeTruthy();
  });

  it('renders category badges for each report', async () => {
    const Page = await loadPage();
    render(<Page />);
    // コンプライアンス(1), SAM(3), 監査(1)
    const badges = document.querySelectorAll('[data-variant="info"]');
    expect(badges.length).toBeGreaterThanOrEqual(5);
  });

  it('displays format information for reports', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('PDF / Excel');
    expect(document.body.textContent).toContain('Excel');
    expect(document.body.textContent).toContain('PDF');
  });

  it('displays lastGenerated dates', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('最終生成: 2024-03-01');
    expect(document.body.textContent).toContain('最終生成: 2024-03-15');
  });
});

/* ========================================================================
 * 3. Default selected report (jsox) - conditional rendering branch
 * ======================================================================== */
describe('SAM Reports page - J-SOX report preview (default)', () => {
  it('shows J-SOX header by default since selectedReport=jsox', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('J-SOXレポート - IT全般統制（SAM）')).toBeTruthy();
  });

  it('shows period text for J-SOX report', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('対象期間: 2024年4月 - 2025年3月（令和6年度）');
  });

  it('renders DonutChart with compliance rate', async () => {
    const Page = await loadPage();
    render(<Page />);
    const donut = screen.getByTestId('donut-chart');
    expect(donut).toBeTruthy();
  });

  it('shows summary statistics: 5 controls, 342 licenses', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('5');
    expect(document.body.textContent).toContain('342');
    expect(document.body.textContent).toContain('4件適合 / 1件条件付');
    expect(document.body.textContent).toContain('8ベンダー');
  });

  it('shows 統制評価結果 table heading', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('統制評価結果')).toBeTruthy();
  });

  it('renders all 5 J-SOX control rows', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('C-01')).toBeTruthy();
    expect(screen.getByText('C-02')).toBeTruthy();
    expect(screen.getByText('C-03')).toBeTruthy();
    expect(screen.getByText('C-04')).toBeTruthy();
    expect(screen.getByText('C-05')).toBeTruthy();
  });

  it('renders BarChart for vendor license data', async () => {
    const Page = await loadPage();
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart).toBeTruthy();
    expect(barChart.textContent).toContain('Microsoft');
    expect(barChart.textContent).toContain('Adobe');
    expect(barChart.textContent).toContain('Salesforce');
  });

  it('shows ベンダー別ライセンス数 heading', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('ベンダー別ライセンス数')).toBeTruthy();
  });
});

/* ========================================================================
 * 4. Badge variant branches for J-SOX controls
 * ======================================================================== */
describe('SAM Reports page - Badge variant branches', () => {
  it('renders status=有効 controls with success variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    // 4 controls have status=有効 -> success variant
    const successBadges = document.querySelectorAll('[data-variant="success"]');
    // At least 4 success status + 4 適合 result = 8
    expect(successBadges.length).toBeGreaterThanOrEqual(8);
  });

  it('renders status=要改善 with warning variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    // C-03 has status=要改善 -> warning variant
    const warningBadges = document.querySelectorAll('[data-variant="warning"]');
    // 1 status warning + 1 result warning = 2
    expect(warningBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders result=適合 with success variant and result=条件付適合 with warning variant', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText('条件付適合')).toBeTruthy();
    // 条件付適合 should have warning variant
    const badge = screen.getByText('条件付適合');
    expect(badge.getAttribute('data-variant')).toBe('warning');
  });

  it('renders dot attribute on status badges', async () => {
    const Page = await loadPage();
    render(<Page />);
    const dotBadges = document.querySelectorAll('[data-dot="true"]');
    // 5 status badges should have dot
    expect(dotBadges.length).toBe(5);
  });
});

/* ========================================================================
 * 5. Report selection switching - selectedReport branch
 * ======================================================================== */
describe('SAM Reports page - report selection switching', () => {
  it('clicking a non-jsox report shows the generic preview panel', async () => {
    const Page = await loadPage();
    render(<Page />);
    // Click on ライセンスサマリー
    fireEvent.click(screen.getByText('ライセンスサマリー'));
    // J-SOX specific content should disappear
    expect(screen.queryByText('J-SOXレポート - IT全般統制（SAM）')).toBeNull();
    // Generic preview should appear with report name
    expect(screen.getAllByText('ライセンスサマリー').length).toBeGreaterThanOrEqual(1);
    expect(document.body.textContent).toContain('レポートを生成するには「出力」ボタンをクリックしてください');
  });

  it('clicking コスト最適化レポート shows its name in the preview', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getByText('コスト最適化レポート'));
    expect(document.body.textContent).toContain('レポートを生成するには「出力」ボタンをクリックしてください');
  });

  it('clicking 監査証跡レポート shows generic preview with generate button', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getByText('監査証跡レポート'));
    expect(screen.getByText('レポートを生成')).toBeTruthy();
  });

  it('clicking back to J-SOX restores the detailed preview', async () => {
    const Page = await loadPage();
    render(<Page />);
    // Switch away
    fireEvent.click(screen.getByText('ライセンスサマリー'));
    expect(screen.queryByText('J-SOXレポート - IT全般統制（SAM）')).toBeNull();
    // Switch back
    fireEvent.click(screen.getByText('J-SOXレポート'));
    expect(screen.getByText('J-SOXレポート - IT全般統制（SAM）')).toBeTruthy();
  });
});

/* ========================================================================
 * 6. Selected report styling branch
 * ======================================================================== */
describe('SAM Reports page - selected report button styling', () => {
  it('applies active styling to the selected report button', async () => {
    const Page = await loadPage();
    render(<Page />);
    // The J-SOX button (first) should have the primary border class
    const jsoxButton = screen.getByText('J-SOXレポート').closest('button');
    expect(jsoxButton?.className).toContain('border-primary-500');
  });

  it('applies inactive styling to non-selected report buttons', async () => {
    const Page = await loadPage();
    render(<Page />);
    const otherButton = screen.getByText('ライセンスサマリー').closest('button');
    expect(otherButton?.className).toContain('border-gray-200');
  });

  it('switches styling when selecting a different report', async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.click(screen.getByText('ライセンスサマリー'));
    const summaryButtons = screen.getAllByText('ライセンスサマリー');
    const summaryButton = summaryButtons.find((el) => el.closest('button'))?.closest('button');
    expect(summaryButton?.className).toContain('border-primary-500');
    const jsoxButton = screen.getAllByText('J-SOXレポート').find((el) => el.closest('button'))?.closest('button');
    expect(jsoxButton?.className).toContain('border-gray-200');
  });

  it('selected report heading gets primary text color', async () => {
    const Page = await loadPage();
    render(<Page />);
    // Default: jsox selected -> h3 has text-primary-700
    const h3s = screen.getAllByText('J-SOXレポート');
    const h3 = h3s.find((el) => el.className?.includes('text-primary-700')) || h3s[0];
    expect(h3.className).toContain('text-primary-700');
  });

  it('non-selected report heading gets gray text color', async () => {
    const Page = await loadPage();
    render(<Page />);
    const h3s = screen.getAllByText('ライセンスサマリー');
    const h3 = h3s.find((el) => el.className?.includes('text-gray-900')) || h3s[0];
    expect(h3.className).toContain('text-gray-900');
  });
});

/* ========================================================================
 * 7. Generate button - generating state branch
 * ======================================================================== */
describe('SAM Reports page - generate button and loading state', () => {
  it('shows PDF出力 text when not generating', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('PDF出力');
  });

  it('shows 生成中... text when generating', async () => {
    vi.useFakeTimers();
    const Page = await loadPage();
    render(<Page />);
    const pdfButton = screen.getByText('PDF出力').closest('button');
    expect(pdfButton).toBeTruthy();
    act(() => { fireEvent.click(pdfButton!); });
    expect(document.body.textContent).toContain('生成中...');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(document.body.textContent).toContain('PDF出力');
    vi.useRealTimers();
  });

  it('generate button on generic preview triggers generating state', async () => {
    vi.useFakeTimers();
    const Page = await loadPage();
    render(<Page />);
    // Switch to a non-jsox report
    fireEvent.click(screen.getByText('ベンダー別サマリー'));
    const generateBtn = screen.getByText('レポートを生成');
    act(() => { fireEvent.click(generateBtn); });
    // The button should show disabled state
    expect(generateBtn.closest('button')?.disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(generateBtn.closest('button')?.disabled).toBe(false);
    vi.useRealTimers();
  });
});

/* ========================================================================
 * 8. J-SOX control detail text
 * ======================================================================== */
describe('SAM Reports page - control details', () => {
  it('renders detail text for each control', async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(document.body.textContent).toContain('定期棚卸を四半期実施。差異率 0.8%');
    expect(document.body.textContent).toContain('申請-承認ワークフロー稼働中');
    expect(document.body.textContent).toContain('一部超過の是正が遅延（Adobe CC）');
    expect(document.body.textContent).toContain('返却手順書に基づき実施');
    expect(document.body.textContent).toContain('月次レビュー会議を開催');
  });
});
