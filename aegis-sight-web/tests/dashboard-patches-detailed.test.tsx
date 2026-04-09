import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getComplianceDonutColor, getComplianceStatusClass, getComplianceBarClass } from '@/app/dashboard/patches/page';

// --- Mocks ---

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label, color }: { label?: string; color?: string }) => (
    <div data-testid="donut-chart" data-color={color}>{label}</div>
  ),
  ProgressBar: ({ value, color }: { value?: number; color?: string }) => (
    <div data-testid="progress-bar" data-value={value} data-color={color} />
  ),
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function renderPage() {
  const { default: PatchesPage } = await import('@/app/dashboard/patches/page');
  return render(<PatchesPage />);
}

// ==========================================================================
// ページ基本レンダリング
// ==========================================================================
describe('PatchesPage - basic rendering', () => {
  it('renders the page heading', async () => {
    await renderPage();
    expect(screen.getByText('パッチ管理')).toBeTruthy();
  });

  it('renders the page description', async () => {
    await renderPage();
    expect(screen.getByText('Windows Update適用状況、脆弱性追跡、コンプライアンスの統合ビュー')).toBeTruthy();
  });

  it('renders the scan button', async () => {
    await renderPage();
    expect(screen.getByText('スキャン実行')).toBeTruthy();
  });

  it('renders section headings', async () => {
    await renderPage();
    expect(screen.getByText('未適用パッチ一覧')).toBeTruthy();
    expect(screen.getByText('CVE 脆弱性一覧')).toBeTruthy();
    expect(screen.getByText('デバイス別パッチ状態')).toBeTruthy();
    expect(screen.getByText('重要度別 未適用パッチ比率')).toBeTruthy();
  });
});

// ==========================================================================
// コンプライアンスサマリー
// ==========================================================================
describe('PatchesPage - compliance summary', () => {
  it('displays the compliance rate as 86.1%', async () => {
    await renderPage();
    expect(screen.getAllByText('86.1%').length).toBeGreaterThanOrEqual(1);
  });

  it('displays device counts in the overview', async () => {
    await renderPage();
    expect(screen.getByText('適用状況（1105 / 1284 台）')).toBeTruthy();
  });

  it('displays total missing updates count', async () => {
    await renderPage();
    expect(screen.getByText('未適用パッチ総数: 47 件')).toBeTruthy();
  });

  it('displays missing counts by severity', async () => {
    await renderPage();
    expect(screen.getAllByText('12 件').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('34 件').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('18 件').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('7 件').length).toBeGreaterThanOrEqual(1);
  });

  it('displays compliance card with device fraction', async () => {
    await renderPage();
    expect(screen.getByText('1105 / 1284台')).toBeTruthy();
  });

  it('displays Critical/Important/Moderate card labels', async () => {
    await renderPage();
    expect(screen.getByText('Critical 未適用')).toBeTruthy();
    expect(screen.getByText('Important 未適用')).toBeTruthy();
    expect(screen.getByText('Moderate 未適用')).toBeTruthy();
  });
});

// ==========================================================================
// DonutChart カラーブランチ (complianceRate = 86.1 → amber)
// ==========================================================================
describe('PatchesPage - DonutChart color branch', () => {
  it('renders DonutChart with amber color for complianceRate 86.1 (>= 70, < 90)', async () => {
    await renderPage();
    const donut = screen.getByTestId('donut-chart');
    expect(donut.getAttribute('data-color')).toBe('#f59e0b');
  });

  it('renders DonutChart with the compliance rate label', async () => {
    await renderPage();
    const donut = screen.getByTestId('donut-chart');
    expect(donut.textContent).toBe('86.1%');
  });
});

// ==========================================================================
// コンプライアンスカード スタイリング (complianceRate = 86.1 → amber)
// ==========================================================================
describe('PatchesPage - compliance card styling branches', () => {
  it('compliance badge uses amber class for rate 86.1 (>= 70, < 90)', async () => {
    const { container } = await renderPage();
    const badge = container.querySelector('.bg-amber-100');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('1105 / 1284台');
  });

  it('progress bar uses amber-500 class for rate 86.1', async () => {
    const { container } = await renderPage();
    const bar = container.querySelector('.bg-amber-500.h-full');
    expect(bar).toBeTruthy();
  });

  it('does not use emerald (>= 90) or red (< 70) for compliance badge', async () => {
    const { container } = await renderPage();
    const badges = container.querySelectorAll('.bg-emerald-100.text-emerald-800');
    const complianceBadgeTexts = Array.from(badges).map((b) => b.textContent);
    expect(complianceBadgeTexts).not.toContain('1105 / 1284台');
  });
});

// ==========================================================================
// 未適用パッチテーブル
// ==========================================================================
describe('PatchesPage - missing patches table', () => {
  it('renders all KB numbers', async () => {
    await renderPage();
    expect(screen.getByText('KB5034763')).toBeTruthy();
    expect(screen.getByText('KB5034765')).toBeTruthy();
    expect(screen.getByText('KB5034441')).toBeTruthy();
    expect(screen.getByText('KB5034275')).toBeTruthy();
    expect(screen.getByText('KB5033375')).toBeTruthy();
    expect(screen.getByText('KB5032288')).toBeTruthy();
  });

  it('renders severity badges for patches with correct text', async () => {
    await renderPage();
    const allBadges = screen.getAllByText(/^(critical|important|moderate|low)$/);
    // 6 patch severity badges + vulnerability severity badges (high, medium, low, critical)
    expect(allBadges.length).toBeGreaterThanOrEqual(6);
  });

  it('renders patch severity "critical" badge with correct class', async () => {
    const { container } = await renderPage();
    const criticalBadges = container.querySelectorAll('.bg-red-100.text-red-800');
    expect(criticalBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders patch severity "important" badge with correct class', async () => {
    const { container } = await renderPage();
    const importantBadges = container.querySelectorAll('.bg-orange-100.text-orange-800');
    expect(importantBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders patch severity "moderate" badge with correct class', async () => {
    const { container } = await renderPage();
    const modBadges = container.querySelectorAll('.bg-yellow-100.text-yellow-800');
    expect(modBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders patch severity "low" badge with correct class', async () => {
    const { container } = await renderPage();
    const lowBadges = container.querySelectorAll('.bg-blue-100.text-blue-800');
    expect(lowBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders release dates', async () => {
    await renderPage();
    expect(screen.getAllByText('2024-02-13').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2024-01-09').length).toBeGreaterThanOrEqual(1);
  });

  it('renders missing counts', async () => {
    await renderPage();
    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('132')).toBeTruthy();
    expect(screen.getByText('89')).toBeTruthy();
    expect(screen.getByText('56')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
  });
});

// ==========================================================================
// CVE 脆弱性テーブル
// ==========================================================================
describe('PatchesPage - vulnerabilities table', () => {
  it('renders all CVE IDs', async () => {
    await renderPage();
    expect(screen.getByText('CVE-2024-21338')).toBeTruthy();
    expect(screen.getByText('CVE-2024-21412')).toBeTruthy();
    expect(screen.getByText('CVE-2024-21351')).toBeTruthy();
    expect(screen.getByText('CVE-2024-20677')).toBeTruthy();
    expect(screen.getByText('CVE-2024-20674')).toBeTruthy();
    expect(screen.getByText('CVE-2024-20683')).toBeTruthy();
  });

  it('renders severity badges for vulnerabilities (critical, high, medium, low)', async () => {
    await renderPage();
    const highBadges = screen.getAllByText('high');
    expect(highBadges.length).toBe(2);
    const medBadges = screen.getAllByText('medium');
    expect(medBadges.length).toBe(1);
  });

  it('renders CVSS scores', async () => {
    await renderPage();
    expect(screen.getByText('9.8')).toBeTruthy();
    expect(screen.getByText('9.1')).toBeTruthy();
    expect(screen.getByText('7.6')).toBeTruthy();
    expect(screen.getByText('7.3')).toBeTruthy();
    expect(screen.getByText('5.4')).toBeTruthy();
    expect(screen.getByText('3.2')).toBeTruthy();
  });
});

// ==========================================================================
// resolved / unresolved バッジ
// ==========================================================================
describe('PatchesPage - resolved/unresolved badges', () => {
  it('renders unresolved badges with danger variant', async () => {
    await renderPage();
    const unresolved = screen.getAllByText('未解決');
    expect(unresolved.length).toBe(3);
    unresolved.forEach((el) => {
      expect(el.getAttribute('data-variant')).toBe('danger');
    });
  });

  it('renders resolved badges with success variant', async () => {
    await renderPage();
    const resolved = screen.getAllByText('解決済');
    expect(resolved.length).toBe(3);
    resolved.forEach((el) => {
      expect(el.getAttribute('data-variant')).toBe('success');
    });
  });
});

// ==========================================================================
// CVSS バーカラーブランチ
// ==========================================================================
describe('PatchesPage - cvssBarColor branches', () => {
  it('score >= 9.0 renders bg-red-500 bar (CVE-2024-21338 cvss=9.8)', async () => {
    const { container } = await renderPage();
    const redBars = container.querySelectorAll('.bg-red-500.h-full.rounded-full');
    expect(redBars.length).toBeGreaterThanOrEqual(2);
  });

  it('score >= 7.0 and < 9.0 renders bg-orange-500 bar (CVE-2024-21351 cvss=7.6)', async () => {
    const { container } = await renderPage();
    const orangeBars = container.querySelectorAll('.bg-orange-500.h-full.rounded-full');
    expect(orangeBars.length).toBeGreaterThanOrEqual(2);
  });

  it('score >= 4.0 and < 7.0 renders bg-yellow-500 bar (CVE-2024-20674 cvss=5.4)', async () => {
    const { container } = await renderPage();
    const yellowBars = container.querySelectorAll('.bg-yellow-500.h-full.rounded-full');
    expect(yellowBars.length).toBeGreaterThanOrEqual(1);
  });

  it('score < 4.0 renders bg-blue-500 bar (CVE-2024-20683 cvss=3.2)', async () => {
    const { container } = await renderPage();
    const blueBars = container.querySelectorAll('.bg-blue-500.h-full.rounded-full');
    expect(blueBars.length).toBeGreaterThanOrEqual(1);
  });
});

// ==========================================================================
// デバイスヒートマップ
// ==========================================================================
describe('PatchesPage - device heatmap', () => {
  it('renders all device hostnames', async () => {
    await renderPage();
    expect(screen.getByText('PC-SALES-001')).toBeTruthy();
    expect(screen.getByText('PC-SALES-042')).toBeTruthy();
    expect(screen.getByText('PC-HR-015')).toBeTruthy();
    expect(screen.getByText('SRV-APP-01')).toBeTruthy();
    expect(screen.getByText('SRV-APP-02')).toBeTruthy();
    expect(screen.getByText('PC-DEV-003')).toBeTruthy();
    expect(screen.getByText('PC-FIN-007')).toBeTruthy();
    expect(screen.getByText('SRV-DB-01')).toBeTruthy();
    expect(screen.getByText('PC-MKT-012')).toBeTruthy();
    expect(screen.getByText('PC-ENG-022')).toBeTruthy();
  });

  it('shows Critical counts only for devices with critical > 0', async () => {
    await renderPage();
    const criticalLabels = screen.getAllByText(/^Critical: \d+$/);
    // Devices with critical > 0: PC-SALES-042(2), SRV-APP-01(1), SRV-APP-02(3), SRV-DB-01(1), PC-ENG-022(2)
    expect(criticalLabels.length).toBe(5);
  });

  it('shows Important counts only for devices with important > 0', async () => {
    await renderPage();
    const importantLabels = screen.getAllByText(/^Important: \d+$/);
    // PC-SALES-001(1), PC-SALES-042(3), SRV-APP-02(2), PC-FIN-007(2), SRV-DB-01(1), PC-ENG-022(1)
    expect(importantLabels.length).toBe(6);
  });

  it('shows Moderate counts only for devices with moderate > 0', async () => {
    await renderPage();
    const modLabels = screen.getAllByText(/^Moderate: \d+$/);
    // PC-SALES-042(1), PC-HR-015(2), SRV-APP-02(1), PC-FIN-007(1), PC-MKT-012(1), PC-ENG-022(2)
    expect(modLabels.length).toBe(6);
  });

  it('shows "全て適用済" only for PC-DEV-003 (all zeros)', async () => {
    await renderPage();
    const allPatched = screen.getAllByText('全て適用済');
    expect(allPatched.length).toBe(1);
  });

  it('heatmap status bar uses correct color for critical devices', async () => {
    const { container } = await renderPage();
    const redBars = container.querySelectorAll('.bg-red-500.absolute');
    // 3 critical devices: PC-SALES-042, SRV-APP-02, PC-ENG-022
    expect(redBars.length).toBe(3);
  });

  it('heatmap status bar uses correct color for warning devices', async () => {
    const { container } = await renderPage();
    const amberBars = container.querySelectorAll('.bg-amber-500.absolute');
    // 3 warning devices: SRV-APP-01, PC-FIN-007, SRV-DB-01
    expect(amberBars.length).toBe(3);
  });

  it('heatmap status bar uses correct color for good devices', async () => {
    const { container } = await renderPage();
    const greenBars = container.querySelectorAll('.bg-emerald-500.absolute');
    // 4 good devices: PC-SALES-001, PC-HR-015, PC-DEV-003, PC-MKT-012
    expect(greenBars.length).toBe(4);
  });

  it('renders heatmap legend items', async () => {
    await renderPage();
    expect(screen.getByText('適用済')).toBeTruthy();
    expect(screen.getByText('一部未適用')).toBeTruthy();
    expect(screen.getByText('Critical未適用あり')).toBeTruthy();
  });
});

// ==========================================================================
// ProgressBar レンダリング
// ==========================================================================
describe('PatchesPage - ProgressBar rendering', () => {
  it('renders 4 progress bars for severity breakdown', async () => {
    await renderPage();
    const bars = screen.getAllByTestId('progress-bar');
    expect(bars.length).toBe(4);
  });

  it('progress bar labels show severity categories', async () => {
    await renderPage();
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Important').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Moderate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1);
  });
});

// ==========================================================================
// Exported compliance utility functions — covers all 3 arms of each ternary
// complianceSummary.complianceRate = 86.1 always hits >= 70 arm in component
// ==========================================================================
describe('PatchesPage - getComplianceDonutColor branches', () => {
  it('rate >= 90 → green (#10b981)', () => {
    expect(getComplianceDonutColor(95)).toBe('#10b981');
    expect(getComplianceDonutColor(90)).toBe('#10b981');
  });

  it('rate >= 70 but < 90 → amber (#f59e0b)', () => {
    expect(getComplianceDonutColor(86.1)).toBe('#f59e0b');
    expect(getComplianceDonutColor(70)).toBe('#f59e0b');
  });

  it('rate < 70 → red (#ef4444)', () => {
    expect(getComplianceDonutColor(65)).toBe('#ef4444');
    expect(getComplianceDonutColor(0)).toBe('#ef4444');
  });
});

describe('PatchesPage - getComplianceStatusClass branches', () => {
  it('rate >= 90 → emerald class', () => {
    expect(getComplianceStatusClass(92)).toContain('emerald');
  });

  it('rate >= 70 but < 90 → amber class', () => {
    expect(getComplianceStatusClass(86.1)).toContain('amber');
  });

  it('rate < 70 → red class', () => {
    expect(getComplianceStatusClass(60)).toContain('red');
  });
});

describe('PatchesPage - getComplianceBarClass branches', () => {
  it('rate >= 90 → bg-emerald-500', () => {
    expect(getComplianceBarClass(91)).toBe('bg-emerald-500');
  });

  it('rate >= 70 but < 90 → bg-amber-500', () => {
    expect(getComplianceBarClass(86.1)).toBe('bg-amber-500');
  });

  it('rate < 70 → bg-red-500', () => {
    expect(getComplianceBarClass(50)).toBe('bg-red-500');
  });
});
