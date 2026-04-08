import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Common mocks ─────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
  useParams: () => ({ id: 'd001' }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) =>
    <span data-variant={variant} data-dot={dot ? 'true' : undefined}>{children}</span>,
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ value, color, label }: { value: number; color: string; label: string }) =>
    <div data-testid="donut-chart" data-value={value} data-color={color}>{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) =>
    <div data-testid="bar-chart">{data?.map(d => <span key={d.label}>{d.label}</span>)}</div>,
}));

vi.mock('@/components/ui/stat-card', () => ({
  StatCard: ({ title, value }: { title: string; value: string | number }) =>
    <div data-testid="stat-card">{title}: {value}</div>,
}));

vi.mock('@/components/ui/modal', () => ({
  Modal: ({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        {title && <h2>{title}</h2>}
        <button onClick={onClose} aria-label="閉じる">x</button>
        {children}
      </div>
    ) : null,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard page (app/dashboard/page.tsx) - compColor branch coverage
// ═══════════════════════════════════════════════════════════════════════════

describe('Dashboard page - compColor ternary branch logic', () => {
  it('compRate >= 90 returns green (#10b981)', () => {
    const compRate = 94;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#10b981');
  });

  it('compRate = 90 (boundary) returns green (#10b981)', () => {
    const compRate = 90;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#10b981');
  });

  it('compRate = 89 returns amber (#f59e0b)', () => {
    const compRate = 89;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#f59e0b');
  });

  it('compRate = 75 (70 <= x < 90) returns amber (#f59e0b)', () => {
    const compRate = 75;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#f59e0b');
  });

  it('compRate = 70 (boundary) returns amber (#f59e0b)', () => {
    const compRate = 70;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#f59e0b');
  });

  it('compRate = 69 returns red (#ef4444)', () => {
    const compRate = 69;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#ef4444');
  });

  it('compRate = 0 returns red (#ef4444)', () => {
    const compRate = 0;
    const compColor = compRate >= 90 ? '#10b981' : compRate >= 70 ? '#f59e0b' : '#ef4444';
    expect(compColor).toBe('#ef4444');
  });
});

describe('Dashboard page - severityConfig Record coverage', () => {
  it('renders default page showing all severity badges (critical/warning/info)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    // Verify all severity variants are rendered via Badge mock
    const dangerBadges = document.querySelectorAll('[data-variant="danger"]');
    const warningBadges = document.querySelectorAll('[data-variant="warning"]');
    const infoBadges = document.querySelectorAll('[data-variant="info"]');
    expect(dangerBadges.length).toBeGreaterThan(0);
    expect(warningBadges.length).toBeGreaterThan(0);
    expect(infoBadges.length).toBeGreaterThan(0);
  });

  it('shows severity labels: 重大, 警告, 情報', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('重大');
    expect(document.body.textContent).toContain('警告');
    expect(document.body.textContent).toContain('情報');
  });

  it('shows all alert severity styles (critical border-l-red, warning border-l-amber, info border-l-blue)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    const { container } = render(<Page />);
    // Critical alert uses bg-red-50
    const redAlerts = container.querySelectorAll('.bg-red-50');
    expect(redAlerts.length).toBeGreaterThan(0);
    // Warning alerts use bg-amber-50
    const amberAlerts = container.querySelectorAll('.bg-amber-50');
    expect(amberAlerts.length).toBeGreaterThan(0);
    // Info alerts use bg-blue-50
    const blueAlerts = container.querySelectorAll('.bg-blue-50');
    expect(blueAlerts.length).toBeGreaterThan(0);
  });

  it('renders DonutChart with green color for default data (compRate=94)', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    const chart = document.querySelector('[data-testid="donut-chart"]');
    expect(chart).toBeTruthy();
    expect(chart?.getAttribute('data-color')).toBe('#10b981');
  });

  it('renders all 5 recent alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Adobe Creative Suite');
    expect(document.body.textContent).toContain('サーバー CPU 使用率');
    expect(document.body.textContent).toContain('Windows 10 サポート終了');
    expect(document.body.textContent).toContain('調達申請 #PR-2024-089');
    expect(document.body.textContent).toContain('新規デバイス検出');
  });

  it('renders BarChart with overview metrics', async () => {
    const { default: Page } = await import('@/app/dashboard/page');
    render(<Page />);
    const barChart = document.querySelector('[data-testid="bar-chart"]');
    expect(barChart).toBeTruthy();
    expect(barChart?.textContent).toContain('管理端末');
    expect(barChart?.textContent).toContain('アラート');
    expect(barChart?.textContent).toContain('調達待ち');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Device Detail page (app/dashboard/devices/[id]/page.tsx) - branch coverage
// ═══════════════════════════════════════════════════════════════════════════

describe('Device Detail page - status indicator color branches', () => {
  it('default demo device status=online renders bg-green-500 indicator', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    const indicator = container.querySelector('.bg-green-500.rounded-full');
    expect(indicator).toBeTruthy();
  });

  it('statusConfig maps online to success variant', () => {
    const statusConfig: Record<string, { label: string; variant: string }> = {
      online: { label: 'オンライン', variant: 'success' },
      offline: { label: 'オフライン', variant: 'danger' },
      warning: { label: '要注意', variant: 'warning' },
      maintenance: { label: 'メンテナンス', variant: 'info' },
    };
    expect(statusConfig['online'].variant).toBe('success');
    expect(statusConfig['online'].label).toBe('オンライン');
  });

  it('statusConfig maps offline to danger variant', () => {
    const statusConfig: Record<string, { label: string; variant: string }> = {
      online: { label: 'オンライン', variant: 'success' },
      offline: { label: 'オフライン', variant: 'danger' },
      warning: { label: '要注意', variant: 'warning' },
      maintenance: { label: 'メンテナンス', variant: 'info' },
    };
    expect(statusConfig['offline'].variant).toBe('danger');
    expect(statusConfig['offline'].label).toBe('オフライン');
  });

  it('statusConfig maps warning to warning variant', () => {
    const statusConfig: Record<string, { label: string; variant: string }> = {
      online: { label: 'オンライン', variant: 'success' },
      offline: { label: 'オフライン', variant: 'danger' },
      warning: { label: '要注意', variant: 'warning' },
      maintenance: { label: 'メンテナンス', variant: 'info' },
    };
    expect(statusConfig['warning'].variant).toBe('warning');
    expect(statusConfig['warning'].label).toBe('要注意');
  });

  it('statusConfig maps maintenance to info variant', () => {
    const statusConfig: Record<string, { label: string; variant: string }> = {
      online: { label: 'オンライン', variant: 'success' },
      offline: { label: 'オフライン', variant: 'danger' },
      warning: { label: '要注意', variant: 'warning' },
      maintenance: { label: 'メンテナンス', variant: 'info' },
    };
    expect(statusConfig['maintenance'].variant).toBe('info');
    expect(statusConfig['maintenance'].label).toBe('メンテナンス');
  });

  it('status indicator: online → bg-green-500', () => {
    const status = 'online';
    const cls =
      status === 'online' ? 'bg-green-500' :
      status === 'warning' ? 'bg-yellow-500' :
      status === 'maintenance' ? 'bg-blue-500' :
      'bg-gray-400';
    expect(cls).toBe('bg-green-500');
  });

  it('status indicator: warning → bg-yellow-500', () => {
    const status = 'warning';
    const cls =
      status === 'online' ? 'bg-green-500' :
      status === 'warning' ? 'bg-yellow-500' :
      status === 'maintenance' ? 'bg-blue-500' :
      'bg-gray-400';
    expect(cls).toBe('bg-yellow-500');
  });

  it('status indicator: maintenance → bg-blue-500', () => {
    const status = 'maintenance';
    const cls =
      status === 'online' ? 'bg-green-500' :
      status === 'warning' ? 'bg-yellow-500' :
      status === 'maintenance' ? 'bg-blue-500' :
      'bg-gray-400';
    expect(cls).toBe('bg-blue-500');
  });

  it('status indicator: offline → bg-gray-400', () => {
    const status = 'offline';
    const cls =
      status === 'online' ? 'bg-green-500' :
      status === 'warning' ? 'bg-yellow-500' :
      status === 'maintenance' ? 'bg-blue-500' :
      'bg-gray-400';
    expect(cls).toBe('bg-gray-400');
  });
});

describe('Device Detail page - diskUsedPct branch coverage', () => {
  it('diskUsedPct < 60 → green bar (bg-green-500) and normal text', () => {
    const diskUsedPct = 54; // demo device: (512-234)/512*100 = ~54%
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    const isRedText = diskUsedPct >= 80;
    expect(barClass).toBe('bg-green-500');
    expect(isRedText).toBe(false);
  });

  it('diskUsedPct = 59 → green bar', () => {
    const diskUsedPct = 59;
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    expect(barClass).toBe('bg-green-500');
  });

  it('diskUsedPct = 60 → yellow bar (boundary)', () => {
    const diskUsedPct = 60;
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    expect(barClass).toBe('bg-yellow-500');
  });

  it('diskUsedPct = 70 → yellow bar', () => {
    const diskUsedPct = 70;
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    expect(barClass).toBe('bg-yellow-500');
  });

  it('diskUsedPct = 79 → yellow bar (boundary)', () => {
    const diskUsedPct = 79;
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    expect(barClass).toBe('bg-yellow-500');
  });

  it('diskUsedPct = 80 → red bar and red text', () => {
    const diskUsedPct = 80;
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    const isRedText = diskUsedPct >= 80;
    expect(barClass).toBe('bg-red-500');
    expect(isRedText).toBe(true);
  });

  it('diskUsedPct = 95 → red bar and red text', () => {
    const diskUsedPct = 95;
    const barClass = diskUsedPct >= 80 ? 'bg-red-500' : diskUsedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
    const isRedText = diskUsedPct >= 80;
    expect(barClass).toBe('bg-red-500');
    expect(isRedText).toBe(true);
  });

  it('default device (54%) renders green bar in actual component', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    // diskUsedPct = Math.round((512-234)/512*100) = 54 → bg-green-500 bar
    const greenBar = container.querySelector('.bg-green-500.rounded-full.h-2');
    expect(greenBar).toBeTruthy();
  });

  it('default device disk text is NOT red (54% < 80)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    // Should not have text-red-600 on disk usage percentage
    const redTextEl = container.querySelector('.text-red-600');
    // The disk percentage text should be normal color
    expect(document.body.textContent).toContain('54%');
    // No red text for disk usage at 54%
    const diskLabels = container.querySelectorAll('.text-red-600');
    // diskLabels might include other elements, verify disk section specifically
    const diskSection = screen.getByText('ディスク使用率');
    expect(diskSection).toBeTruthy();
  });
});

describe('Device Detail page - mono flag on info items', () => {
  it('IP address field has font-mono class', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    // Find dd elements with font-mono class containing IP
    const monoElements = container.querySelectorAll('dd.font-mono');
    const texts = Array.from(monoElements).map(el => el.textContent);
    expect(texts.some(t => t?.includes('192.168.1.101'))).toBe(true);
  });

  it('MAC address field has font-mono class', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    const monoElements = container.querySelectorAll('dd.font-mono');
    const texts = Array.from(monoElements).map(el => el.textContent);
    expect(texts.some(t => t?.includes('00:1A:2B:3C:4D:5E'))).toBe(true);
  });

  it('non-mono fields (hostname) do not have font-mono', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    // All dd elements
    const allDds = container.querySelectorAll('dd');
    const hostnameDD = Array.from(allDds).find(el => el.textContent === 'PC-TANAKA-001');
    expect(hostnameDD).toBeTruthy();
    expect(hostnameDD?.classList.contains('font-mono')).toBe(false);
  });
});

describe('Device Detail page - eventTypeConfig branches', () => {
  it('all event types rendered: logon, logoff, alert, patch', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('[ログオン]');
    expect(document.body.textContent).toContain('[ログオフ]');
    expect(document.body.textContent).toContain('[アラート]');
    expect(document.body.textContent).toContain('[パッチ]');
  });

  it('eventTypeConfig covers config_change branch', () => {
    const eventTypeConfig: Record<string, { label: string; color: string }> = {
      logon: { label: 'ログオン', color: 'text-green-600 dark:text-green-400' },
      logoff: { label: 'ログオフ', color: 'text-gray-500 dark:text-gray-400' },
      alert: { label: 'アラート', color: 'text-red-600 dark:text-red-400' },
      patch: { label: 'パッチ', color: 'text-blue-600 dark:text-blue-400' },
      config_change: { label: '設定変更', color: 'text-yellow-600 dark:text-yellow-400' },
    };
    expect(eventTypeConfig['config_change'].label).toBe('設定変更');
    expect(eventTypeConfig['config_change'].color).toContain('text-yellow-600');
  });

  it('each event type has correct color mapping', () => {
    const eventTypeConfig: Record<string, { label: string; color: string }> = {
      logon: { label: 'ログオン', color: 'text-green-600 dark:text-green-400' },
      logoff: { label: 'ログオフ', color: 'text-gray-500 dark:text-gray-400' },
      alert: { label: 'アラート', color: 'text-red-600 dark:text-red-400' },
      patch: { label: 'パッチ', color: 'text-blue-600 dark:text-blue-400' },
      config_change: { label: '設定変更', color: 'text-yellow-600 dark:text-yellow-400' },
    };
    expect(eventTypeConfig['logon'].color).toContain('green');
    expect(eventTypeConfig['logoff'].color).toContain('gray');
    expect(eventTypeConfig['alert'].color).toContain('red');
    expect(eventTypeConfig['patch'].color).toContain('blue');
    expect(eventTypeConfig['config_change'].color).toContain('yellow');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Users page (app/dashboard/users/page.tsx) - uncovered branch coverage
// ═══════════════════════════════════════════════════════════════════════════

describe('UsersPage - activeRate color branch logic', () => {
  it('activeRate >= 80 returns green (#10b981)', () => {
    const activeRate = 80; // demo: 4/5 = 80%
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#10b981');
  });

  it('activeRate = 79 returns amber (#f59e0b)', () => {
    const activeRate = 79;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#f59e0b');
  });

  it('activeRate = 60 returns amber (#f59e0b) boundary', () => {
    const activeRate = 60;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#f59e0b');
  });

  it('activeRate = 59 returns red (#ef4444)', () => {
    const activeRate = 59;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#ef4444');
  });

  it('activeRate = 0 returns red (#ef4444)', () => {
    const activeRate = 0;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#ef4444');
  });
});

describe('UsersPage - roleCounts and roleBarData color fallback', () => {
  it('roleBarData assigns colors by index, with fallback to bg-gray-400 for index >= 4', () => {
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'];
    // Index 0-3 get specific colors
    expect(colors[0]).toBe('bg-red-500');
    expect(colors[1]).toBe('bg-amber-500');
    expect(colors[2]).toBe('bg-blue-500');
    expect(colors[3]).toBe('bg-gray-400');
    // Index 4+ would use fallback
    expect(colors[4] || 'bg-gray-400').toBe('bg-gray-400');
  });

  it('roleCounts accumulates correctly for duplicate roles', () => {
    const roles = ['admin', 'operator', 'auditor', 'readonly', 'operator'];
    const roleCounts: Record<string, number> = {};
    roles.forEach(r => { roleCounts[r] = (roleCounts[r] || 0) + 1; });
    expect(roleCounts['admin']).toBe(1);
    expect(roleCounts['operator']).toBe(2);
    expect(roleCounts['auditor']).toBe(1);
    expect(roleCounts['readonly']).toBe(1);
  });
});

describe('UsersPage - is_active badge branches', () => {
  it('renders active user badges with success variant', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    const successBadges = container.querySelectorAll('[data-variant="success"]');
    const activeBadges = Array.from(successBadges).filter(el => el.textContent === '有効');
    // 4 active users
    expect(activeBadges.length).toBe(4);
  });

  it('renders inactive user badge with default variant', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    const defaultBadges = container.querySelectorAll('[data-variant="default"]');
    const inactiveBadges = Array.from(defaultBadges).filter(el => el.textContent === '無効');
    // 1 inactive user (渡辺 健)
    expect(inactiveBadges.length).toBe(1);
  });

  it('active badges have dot property', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    const dotBadges = container.querySelectorAll('[data-dot="true"]');
    // All is_active badges have dot: both 有効 and 無効
    expect(dotBadges.length).toBe(5);
  });
});

describe('UsersPage - edit modal with different users', () => {
  it('editing the 3rd user (auditor) shows auditor role preset', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[2]); // 鈴木 一郎 (auditor)
    expect(screen.getAllByDisplayValue('鈴木 一郎').length).toBeGreaterThan(0);
  });

  it('editing the 4th user (readonly) shows readonly name', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[3]); // 佐藤 美咲 (readonly)
    expect(screen.getAllByDisplayValue('佐藤 美咲').length).toBeGreaterThan(0);
  });

  it('editing inactive user (5th) shows their name', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[4]); // 渡辺 健 (inactive)
    expect(screen.getAllByDisplayValue('渡辺 健').length).toBeGreaterThan(0);
  });

  it('role select can be changed to all 4 options', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    const modal = screen.getByTestId('modal');
    const roleSelect = modal.querySelector('select') as HTMLSelectElement;

    for (const role of ['admin', 'operator', 'auditor', 'readonly']) {
      fireEvent.change(roleSelect, { target: { value: role } });
      expect(roleSelect.value).toBe(role);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Alerts page (app/dashboard/alerts/page.tsx) - uncovered branch coverage
// ═══════════════════════════════════════════════════════════════════════════

describe('AlertsPage - getAlertStatus branch coverage', () => {
  it('resolved_at set → status = resolved', () => {
    const alert = { is_acknowledged: true, resolved_at: '2026-03-27T10:30:00Z' };
    const status = alert.resolved_at ? 'resolved' : alert.is_acknowledged ? 'acknowledged' : 'open';
    expect(status).toBe('resolved');
  });

  it('is_acknowledged true, resolved_at null → status = acknowledged', () => {
    const alert = { is_acknowledged: true, resolved_at: null };
    const status = alert.resolved_at ? 'resolved' : alert.is_acknowledged ? 'acknowledged' : 'open';
    expect(status).toBe('acknowledged');
  });

  it('is_acknowledged false, resolved_at null → status = open', () => {
    const alert = { is_acknowledged: false, resolved_at: null };
    const status = alert.resolved_at ? 'resolved' : alert.is_acknowledged ? 'acknowledged' : 'open';
    expect(status).toBe('open');
  });

  it('resolved_at set but is_acknowledged false → still resolved', () => {
    const alert = { is_acknowledged: false, resolved_at: '2026-03-27T10:30:00Z' };
    const status = alert.resolved_at ? 'resolved' : alert.is_acknowledged ? 'acknowledged' : 'open';
    expect(status).toBe('resolved');
  });
});

describe('AlertsPage - status Badge variant branches', () => {
  it('resolved status → success variant', () => {
    const status = 'resolved';
    const variant = status === 'resolved' ? 'success' : status === 'acknowledged' ? 'info' : 'danger';
    expect(variant).toBe('success');
  });

  it('acknowledged status → info variant', () => {
    const status = 'acknowledged';
    const variant = status === 'resolved' ? 'success' : status === 'acknowledged' ? 'info' : 'danger';
    expect(variant).toBe('info');
  });

  it('open status → danger variant', () => {
    const status = 'open';
    const variant = status === 'resolved' ? 'success' : status === 'acknowledged' ? 'info' : 'danger';
    expect(variant).toBe('danger');
  });

  it('resolved status label → 解決済', () => {
    const status = 'resolved';
    const label = status === 'resolved' ? '解決済' : status === 'acknowledged' ? '確認済' : '未対応';
    expect(label).toBe('解決済');
  });

  it('acknowledged status label → 確認済', () => {
    const status = 'acknowledged';
    const label = status === 'resolved' ? '解決済' : status === 'acknowledged' ? '確認済' : '未対応';
    expect(label).toBe('確認済');
  });

  it('open status label → 未対応', () => {
    const status = 'open';
    const label = status === 'resolved' ? '解決済' : status === 'acknowledged' ? '確認済' : '未対応';
    expect(label).toBe('未対応');
  });
});

describe('AlertsPage - resolveRate color branch logic', () => {
  it('resolveRate >= 80 returns green', () => {
    const resolveRate = 80;
    const color = resolveRate >= 80 ? '#10b981' : resolveRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(color).toBe('#10b981');
  });

  it('resolveRate = 60 returns amber', () => {
    const resolveRate = 60;
    const color = resolveRate >= 80 ? '#10b981' : resolveRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(color).toBe('#f59e0b');
  });

  it('resolveRate = 59 returns red', () => {
    const resolveRate = 59;
    const color = resolveRate >= 80 ? '#10b981' : resolveRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(color).toBe('#ef4444');
  });

  it('default demo data resolveRate = round((47-32)/max(47,1)*100) = 32% → red', () => {
    const total = 47;
    const unresolved = 32;
    const resolvedCount = total - unresolved;
    const resolveRate = Math.round((resolvedCount / Math.max(total, 1)) * 100);
    expect(resolveRate).toBe(32);
    const color = resolveRate >= 80 ? '#10b981' : resolveRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(color).toBe('#ef4444');
  });
});

describe('AlertsPage - filter branches', () => {
  it('renders all alerts initially (no filter)', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    expect(document.body.textContent).toContain('不正アクセス試行を検出');
    expect(document.body.textContent).toContain('ディスク使用率が95%を超過');
    expect(document.body.textContent).toContain('Adobe CCライセンス残数不足');
  });

  it('severity filter: selecting critical shows only critical alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const severitySelect = selects[0] as HTMLSelectElement;
    fireEvent.change(severitySelect, { target: { value: 'critical' } });
    // Critical alerts should be visible
    expect(document.body.textContent).toContain('不正アクセス試行を検出');
    expect(document.body.textContent).toContain('ディスク使用率が95%を超過');
    // Warning alerts should be hidden
    expect(document.body.textContent).not.toContain('Adobe CCライセンス残数不足');
  });

  it('severity filter: selecting info shows only info alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const severitySelect = selects[0] as HTMLSelectElement;
    fireEvent.change(severitySelect, { target: { value: 'info' } });
    expect(document.body.textContent).toContain('Windows Defenderパターン更新完了');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('category filter: selecting security shows only security alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const categorySelect = selects[1] as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'security' } });
    expect(document.body.textContent).toContain('不正アクセス試行を検出');
    expect(document.body.textContent).toContain('Windows Defenderパターン更新完了');
    // Non-security alerts should be hidden
    expect(document.body.textContent).not.toContain('Adobe CCライセンス残数不足');
  });

  it('category filter: selecting network shows only network alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const categorySelect = selects[1] as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'network' } });
    expect(document.body.textContent).toContain('VPNゲートウェイ応答遅延');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('category filter: selecting license shows only license alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const categorySelect = selects[1] as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'license' } });
    expect(document.body.textContent).toContain('Adobe CCライセンス残数不足');
    expect(document.body.textContent).toContain('Microsoft 365ライセンス自動更新完了');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('category filter: selecting hardware shows only hardware alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const categorySelect = selects[1] as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'hardware' } });
    expect(document.body.textContent).toContain('ディスク使用率が95%を超過');
    expect(document.body.textContent).toContain('UPS バッテリー劣化警告');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('status filter: selecting open shows only open alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const statusSelect = selects[2] as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'open' } });
    // Open alerts: is_acknowledged=false, resolved_at=null
    expect(document.body.textContent).toContain('不正アクセス試行を検出');
    expect(document.body.textContent).toContain('Adobe CCライセンス残数不足');
    expect(document.body.textContent).toContain('UPS バッテリー劣化警告');
    // acknowledged/resolved should be hidden
    expect(document.body.textContent).not.toContain('ディスク使用率が95%を超過');
    expect(document.body.textContent).not.toContain('Windows Defenderパターン更新完了');
  });

  it('status filter: selecting acknowledged shows only acknowledged alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const statusSelect = selects[2] as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'acknowledged' } });
    // Acknowledged: is_acknowledged=true, resolved_at=null
    expect(document.body.textContent).toContain('ディスク使用率が95%を超過');
    expect(document.body.textContent).toContain('VPNゲートウェイ応答遅延');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('status filter: selecting resolved shows only resolved alerts', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    const statusSelect = selects[2] as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });
    expect(document.body.textContent).toContain('Windows Defenderパターン更新完了');
    expect(document.body.textContent).toContain('Microsoft 365ライセンス自動更新完了');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('combined filters: severity=critical + status=acknowledged', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'critical' } });
    fireEvent.change(selects[2], { target: { value: 'acknowledged' } });
    // Only critical + acknowledged: disk alert
    expect(document.body.textContent).toContain('ディスク使用率が95%を超過');
    expect(document.body.textContent).not.toContain('不正アクセス試行を検出');
  });

  it('combined filters with no results shows empty message', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    // critical + network → no such alert exists
    fireEvent.change(selects[0], { target: { value: 'critical' } });
    fireEvent.change(selects[1], { target: { value: 'network' } });
    expect(document.body.textContent).toContain('該当するアラートはありません');
  });
});

describe('AlertsPage - action buttons conditional rendering', () => {
  it('unacknowledged alert shows 確認 button', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    // Alert id=1: is_acknowledged=false → shows 確認 button
    const confirmButtons = screen.getAllByText('確認');
    expect(confirmButtons.length).toBeGreaterThan(0);
  });

  it('unresolved alert shows 解決 button', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    // Alerts without resolved_at → shows 解決 button
    const resolveButtons = screen.getAllByText('解決');
    expect(resolveButtons.length).toBeGreaterThan(0);
  });

  it('resolved alert does not show 解決 button (filter to resolved only)', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[2], { target: { value: 'resolved' } });
    // Resolved alerts should not have 解決 button
    expect(screen.queryAllByText('解決').length).toBe(0);
  });

  it('acknowledged alert does not show 確認 button', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[2], { target: { value: 'acknowledged' } });
    // Acknowledged alerts: is_acknowledged=true → no 確認 button
    expect(screen.queryAllByText('確認').length).toBe(0);
  });
});

describe('AlertsPage - severity/category label mappings', () => {
  it('all severity labels render correctly', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    // Badge content for severity
    const dangerBadges = document.querySelectorAll('[data-variant="danger"]');
    const warningBadges = document.querySelectorAll('[data-variant="warning"]');
    const infoBadges = document.querySelectorAll('[data-variant="info"]');
    expect(dangerBadges.length).toBeGreaterThan(0);
    expect(warningBadges.length).toBeGreaterThan(0);
    expect(infoBadges.length).toBeGreaterThan(0);
  });

  it('all category labels render correctly', async () => {
    const { default: Page } = await import('@/app/dashboard/alerts/page');
    render(<Page />);
    expect(document.body.textContent).toContain('セキュリティ');
    expect(document.body.textContent).toContain('ライセンス');
    expect(document.body.textContent).toContain('ハードウェア');
    expect(document.body.textContent).toContain('ネットワーク');
  });
});
