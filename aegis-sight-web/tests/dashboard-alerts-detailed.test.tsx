import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label, color }: { label?: string; color?: string }) => (
    <div data-testid="donut-chart" data-color={color}>
      {label}
    </div>
  ),
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">
      {data?.map((d) => (
        <span key={d.label}>{d.label}</span>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    dot,
  }: {
    children: React.ReactNode;
    variant?: string;
    dot?: boolean;
  }) => (
    <span data-variant={variant} data-dot={dot}>
      {children}
    </span>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function renderAlerts() {
  // Dynamic import so mocks apply before module loads
  const { default: Page } = await import('@/app/dashboard/alerts/page');
  return render(<Page />);
}

// Helper to get all select elements (severity, category, status in order)
function getSelects() {
  const selects = document.querySelectorAll('select');
  return {
    severity: selects[0] as HTMLSelectElement,
    category: selects[1] as HTMLSelectElement,
    status: selects[2] as HTMLSelectElement,
  };
}

// Helper to get table body rows
function getTableRows() {
  const table = document.querySelector('table');
  if (!table) return [];
  const tbody = table.querySelector('tbody');
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('tr'));
}

// =========================================================
// 1. Basic rendering
// =========================================================
describe('Alerts page - basic rendering', () => {
  it('renders without crashing', async () => {
    await renderAlerts();
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('displays page heading "アラート管理"', async () => {
    await renderAlerts();
    expect(screen.getByText('アラート管理')).toBeTruthy();
  });

  it('displays page subtitle', async () => {
    await renderAlerts();
    expect(screen.getByText('システムアラートの一覧と管理')).toBeTruthy();
  });

  it('renders all 7 demo alerts by default', async () => {
    await renderAlerts();
    const rows = getTableRows();
    // 7 data rows, no empty-state row
    expect(rows.length).toBe(7);
  });

  it('renders three filter selects', async () => {
    await renderAlerts();
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBe(3);
  });
});

// =========================================================
// 2. Stats cards
// =========================================================
describe('Alerts page - stats cards', () => {
  it('displays total count 47', async () => {
    await renderAlerts();
    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('合計')).toBeTruthy();
  });

  it('displays critical count 8', async () => {
    await renderAlerts();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('重大')).toBeTruthy();
  });

  it('displays warning count 21', async () => {
    await renderAlerts();
    expect(screen.getByText('21')).toBeTruthy();
  });

  it('displays info count 18', async () => {
    await renderAlerts();
    expect(screen.getByText('18')).toBeTruthy();
  });

  it('displays unacknowledged count 15', async () => {
    await renderAlerts();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('未確認')).toBeTruthy();
  });

  it('displays unresolved count 32', async () => {
    await renderAlerts();
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText('未解決')).toBeTruthy();
  });
});

// =========================================================
// 3. Charts - resolveRate color branch
// =========================================================
describe('Alerts page - resolve rate chart', () => {
  it('renders DonutChart with resolve rate label', async () => {
    await renderAlerts();
    const donut = screen.getByTestId('donut-chart');
    // resolvedCount = 47 - 32 = 15, rate = round(15/47*100) = 32
    expect(donut.textContent).toContain('32%');
  });

  it('uses red color (#ef4444) when resolveRate < 60', async () => {
    await renderAlerts();
    const donut = screen.getByTestId('donut-chart');
    // 32% < 60 → red
    expect(donut.getAttribute('data-color')).toBe('#ef4444');
  });

  it('renders BarChart with severity labels', async () => {
    await renderAlerts();
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.textContent).toContain('重大');
    expect(barChart.textContent).toContain('警告');
    expect(barChart.textContent).toContain('情報');
  });
});

// =========================================================
// 4. getAlertStatus branches (via status badges)
// =========================================================
describe('Alerts page - getAlertStatus branches', () => {
  it('shows "未対応" for alerts with !resolved_at && !is_acknowledged (open)', async () => {
    await renderAlerts();
    // Alerts id=1,3,6 are open: not acknowledged, not resolved
    const badges = screen.getAllByText('未対応');
    expect(badges.length).toBe(3);
  });

  it('shows "確認済" for alerts with is_acknowledged && !resolved_at (acknowledged)', async () => {
    await renderAlerts();
    // Alerts id=2,4 are acknowledged but not resolved
    const badges = screen.getAllByText('確認済');
    expect(badges.length).toBe(2);
  });

  it('shows "解決済" for alerts with resolved_at truthy (resolved)', async () => {
    await renderAlerts();
    // Alerts id=5,7 have resolved_at set
    const badges = screen.getAllByText('解決済');
    expect(badges.length).toBe(2);
  });
});

// =========================================================
// 5. Status badge variant branches
// =========================================================
describe('Alerts page - status badge variants', () => {
  it('uses "danger" variant for open status', async () => {
    await renderAlerts();
    const openBadges = screen.getAllByText('未対応');
    openBadges.forEach((badge) => {
      expect(badge.getAttribute('data-variant')).toBe('danger');
    });
  });

  it('uses "info" variant for acknowledged status', async () => {
    await renderAlerts();
    const ackBadges = screen.getAllByText('確認済');
    ackBadges.forEach((badge) => {
      expect(badge.getAttribute('data-variant')).toBe('info');
    });
  });

  it('uses "success" variant for resolved status', async () => {
    await renderAlerts();
    const resolvedBadges = screen.getAllByText('解決済');
    resolvedBadges.forEach((badge) => {
      expect(badge.getAttribute('data-variant')).toBe('success');
    });
  });
});

// =========================================================
// 6. Severity badge variants
// =========================================================
describe('Alerts page - severity badge variants', () => {
  it('uses "danger" variant with dot for critical alerts', async () => {
    await renderAlerts();
    // severityLabel critical = '重大', but also appears in stats.
    // Filter to badges with data-dot attribute
    const allBadges = document.querySelectorAll('[data-variant="danger"][data-dot="true"]');
    // id=1,2 are critical → 2 critical severity badges with dot
    expect(allBadges.length).toBe(2);
  });

  it('uses "warning" variant with dot for warning alerts', async () => {
    await renderAlerts();
    const warningBadges = document.querySelectorAll('[data-variant="warning"][data-dot="true"]');
    // id=3,4,6 are warning → 3 badges
    expect(warningBadges.length).toBe(3);
  });

  it('uses "info" variant with dot for info alerts', async () => {
    await renderAlerts();
    const infoBadges = document.querySelectorAll('[data-variant="info"][data-dot="true"]');
    // id=5,7 are info → 2 badges
    expect(infoBadges.length).toBe(2);
  });
});

// =========================================================
// 7. Conditional button rendering
// =========================================================
describe('Alerts page - conditional buttons', () => {
  it('renders 確認 button only for unacknowledged alerts', async () => {
    await renderAlerts();
    const confirmButtons = screen.getAllByText('確認', { selector: 'button' });
    // Unacknowledged: id=1,3,6 → 3 buttons
    expect(confirmButtons.length).toBe(3);
  });

  it('renders 解決 button only for unresolved alerts', async () => {
    await renderAlerts();
    const resolveButtons = screen.getAllByText('解決', { selector: 'button' });
    // Unresolved (resolved_at === null): id=1,2,3,4,6 → 5 buttons
    expect(resolveButtons.length).toBe(5);
  });

  it('does NOT render 確認 button for acknowledged alerts', async () => {
    await renderAlerts();
    // Acknowledged alerts (id=2,4,5,7) should NOT have 確認 button
    // Total 確認 buttons should be exactly 3 (verified above)
    const confirmButtons = screen.getAllByText('確認', { selector: 'button' });
    expect(confirmButtons.length).toBe(3);
  });

  it('does NOT render 解決 button for resolved alerts', async () => {
    await renderAlerts();
    // Resolved alerts (id=5,7) should NOT have 解決 button
    // Total 解決 buttons should be exactly 5 (verified above)
    const resolveButtons = screen.getAllByText('解決', { selector: 'button' });
    expect(resolveButtons.length).toBe(5);
  });
});

// =========================================================
// 8. Severity filter
// =========================================================
describe('Alerts page - severity filter', () => {
  it('filters to critical only', async () => {
    await renderAlerts();
    const { severity } = getSelects();
    fireEvent.change(severity, { target: { value: 'critical' } });
    const rows = getTableRows();
    // id=1,2 are critical
    expect(rows.length).toBe(2);
  });

  it('filters to warning only', async () => {
    await renderAlerts();
    const { severity } = getSelects();
    fireEvent.change(severity, { target: { value: 'warning' } });
    const rows = getTableRows();
    // id=3,4,6 are warning
    expect(rows.length).toBe(3);
  });

  it('filters to info only', async () => {
    await renderAlerts();
    const { severity } = getSelects();
    fireEvent.change(severity, { target: { value: 'info' } });
    const rows = getTableRows();
    // id=5,7 are info
    expect(rows.length).toBe(2);
  });

  it('resets to all when "all" selected', async () => {
    await renderAlerts();
    const { severity } = getSelects();
    fireEvent.change(severity, { target: { value: 'critical' } });
    expect(getTableRows().length).toBe(2);
    fireEvent.change(severity, { target: { value: 'all' } });
    expect(getTableRows().length).toBe(7);
  });
});

// =========================================================
// 9. Category filter
// =========================================================
describe('Alerts page - category filter', () => {
  it('filters to security only', async () => {
    await renderAlerts();
    const { category } = getSelects();
    fireEvent.change(category, { target: { value: 'security' } });
    // id=1 (security), id=5 (security)
    expect(getTableRows().length).toBe(2);
  });

  it('filters to license only', async () => {
    await renderAlerts();
    const { category } = getSelects();
    fireEvent.change(category, { target: { value: 'license' } });
    // id=3 (license), id=7 (license)
    expect(getTableRows().length).toBe(2);
  });

  it('filters to hardware only', async () => {
    await renderAlerts();
    const { category } = getSelects();
    fireEvent.change(category, { target: { value: 'hardware' } });
    // id=2 (hardware), id=6 (hardware)
    expect(getTableRows().length).toBe(2);
  });

  it('filters to network only', async () => {
    await renderAlerts();
    const { category } = getSelects();
    fireEvent.change(category, { target: { value: 'network' } });
    // id=4 (network)
    expect(getTableRows().length).toBe(1);
  });
});

// =========================================================
// 10. Status filter
// =========================================================
describe('Alerts page - status filter', () => {
  it('filters to open only', async () => {
    await renderAlerts();
    const { status } = getSelects();
    fireEvent.change(status, { target: { value: 'open' } });
    // open: id=1,3,6
    expect(getTableRows().length).toBe(3);
  });

  it('filters to acknowledged only', async () => {
    await renderAlerts();
    const { status } = getSelects();
    fireEvent.change(status, { target: { value: 'acknowledged' } });
    // acknowledged: id=2,4
    expect(getTableRows().length).toBe(2);
  });

  it('filters to resolved only', async () => {
    await renderAlerts();
    const { status } = getSelects();
    fireEvent.change(status, { target: { value: 'resolved' } });
    // resolved: id=5,7
    expect(getTableRows().length).toBe(2);
  });
});

// =========================================================
// 11. Combined filters & empty state
// =========================================================
describe('Alerts page - combined filters', () => {
  it('combines severity + category filter', async () => {
    await renderAlerts();
    const { severity, category } = getSelects();
    fireEvent.change(severity, { target: { value: 'critical' } });
    fireEvent.change(category, { target: { value: 'security' } });
    // critical + security: only id=1
    expect(getTableRows().length).toBe(1);
  });

  it('combines all three filters', async () => {
    await renderAlerts();
    const { severity, category, status } = getSelects();
    fireEvent.change(severity, { target: { value: 'warning' } });
    fireEvent.change(category, { target: { value: 'network' } });
    fireEvent.change(status, { target: { value: 'acknowledged' } });
    // warning + network + acknowledged: id=4
    expect(getTableRows().length).toBe(1);
  });

  it('shows empty state message when no alerts match', async () => {
    await renderAlerts();
    const { severity, category } = getSelects();
    // critical + network → no match (no critical network alert)
    fireEvent.change(severity, { target: { value: 'critical' } });
    fireEvent.change(category, { target: { value: 'network' } });
    expect(screen.getByText('該当するアラートはありません')).toBeTruthy();
  });

  it('empty state row has colSpan 6', async () => {
    await renderAlerts();
    const { severity, category } = getSelects();
    fireEvent.change(severity, { target: { value: 'critical' } });
    fireEvent.change(category, { target: { value: 'network' } });
    const td = screen.getByText('該当するアラートはありません').closest('td');
    expect(td?.getAttribute('colspan')).toBe('6');
  });
});

// =========================================================
// 12. Alert content verification
// =========================================================
describe('Alerts page - alert content', () => {
  it('displays alert titles', async () => {
    await renderAlerts();
    expect(screen.getByText('不正アクセス試行を検出')).toBeTruthy();
    expect(screen.getByText('ディスク使用率が95%を超過')).toBeTruthy();
    expect(screen.getByText('Adobe CCライセンス残数不足')).toBeTruthy();
  });

  it('displays alert messages', async () => {
    await renderAlerts();
    expect(
      screen.getByText('外部IPからの複数回ログイン失敗が検出されました。')
    ).toBeTruthy();
  });

  it('displays category labels in table', async () => {
    await renderAlerts();
    expect(screen.getByText('セキュリティ')).toBeTruthy();
    expect(screen.getByText('ライセンス')).toBeTruthy();
    expect(screen.getByText('ハードウェア')).toBeTruthy();
    expect(screen.getByText('ネットワーク')).toBeTruthy();
  });

  it('displays table headers', async () => {
    await renderAlerts();
    expect(screen.getByText('重要度')).toBeTruthy();
    expect(screen.getByText('カテゴリ')).toBeTruthy();
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.getByText('状態')).toBeTruthy();
    expect(screen.getByText('作成日時')).toBeTruthy();
    expect(screen.getByText('操作')).toBeTruthy();
  });
});
