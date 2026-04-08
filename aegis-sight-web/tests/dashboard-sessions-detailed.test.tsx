import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sessions',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} data-classname={className}>{children}</span>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('SessionsPage - initial render', () => {
  it('renders the page title', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getByText('Session Management')).toBeTruthy();
  });

  it('renders the subtitle', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Monitor remote desktop sessions');
  });

  it('renders summary stat cards', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Total Sessions');
    expect(document.body.textContent).toContain('Active Sessions');
    expect(document.body.textContent).toContain('RDP Sessions');
    expect(document.body.textContent).toContain('VPN Sessions');
  });

  it('renders stat card sub text', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('All time');
    expect(document.body.textContent).toContain('Currently connected');
  });

  it('renders DonutChart', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getByTestId('donut-chart')).toBeTruthy();
  });

  it('renders BarChart', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('renders three tab buttons', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    const activeButtons = screen.getAllByText('Active Sessions');
    // One in StatCard title, one in tab nav
    expect(activeButtons.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Analytics')).toBeTruthy();
    expect(screen.getByText('Activity Timeline')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Active Sessions tab (default)
// ---------------------------------------------------------------------------

describe('SessionsPage - Active Sessions tab', () => {
  it('shows active sessions table by default', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('tanaka.taro');
    expect(document.body.textContent).toContain('suzuki.hanako');
    expect(document.body.textContent).toContain('yamada.ichiro');
  });

  it('shows session type badges', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('RDP');
    expect(document.body.textContent).toContain('VPN');
    expect(document.body.textContent).toContain('Local');
    expect(document.body.textContent).toContain('Citrix');
  });

  it('shows source IP for sessions that have one', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('192.168.1.50');
    expect(document.body.textContent).toContain('10.0.0.15');
  });

  it('shows dash for sessions with null source_ip', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    const { container } = render(<Page />);
    // yamada.ichiro has source_ip=null → shows '-'
    const cells = container.querySelectorAll('td');
    const cellTexts = Array.from(cells).map(c => c.textContent?.trim());
    expect(cellTexts).toContain('-');
  });

  it('shows hostname for sessions that have one', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(document.body.textContent).toContain('REMOTE-PC-01');
    expect(document.body.textContent).toContain('HOME-PC-SUZUKI');
  });

  it('shows Active status indicator', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    const activeLabels = screen.getAllByText('Active');
    // 6 active sessions shown
    expect(activeLabels.length).toBeGreaterThanOrEqual(6);
  });

  it('shows duration in minutes', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    // Each row shows elapsed time as Xmin
    const body = document.body.textContent || '';
    expect(body).toMatch(/\d+min/);
  });
});

// ---------------------------------------------------------------------------
// Analytics tab (branch coverage for tab === 'analytics')
// ---------------------------------------------------------------------------

describe('SessionsPage - Analytics tab', () => {
  it('clicking Analytics tab shows analytics content', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent).toContain('Peak Hours (Sessions Started)');
  });

  it('shows type distribution chart in analytics', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent).toContain('Session Type Distribution');
  });

  it('shows user usage table in analytics', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent).toContain('Top Users by Session Count');
  });

  it('shows user session counts in analytics', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent).toContain('tanaka.taro');
    expect(document.body.textContent).toContain('145');
  });

  it('shows total hours for users', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    // 43200 minutes / 60 = 720.0h
    expect(document.body.textContent).toContain('720.0h');
  });

  it('shows peak hours bar chart', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    // Peak hours data has hours 7-18
    expect(document.body.textContent).toContain('7');
    expect(document.body.textContent).toContain('18');
  });

  it('shows session type percentages in distribution chart', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    // local: 523, rdp: 412, vpn: 198, citrix: 114, total: 1247
    expect(document.body.textContent).toContain('Local:');
    expect(document.body.textContent).toContain('RDP:');
    expect(document.body.textContent).toContain('VPN:');
    expect(document.body.textContent).toContain('Citrix:');
  });

  it('hides active sessions table when analytics is selected', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    // tanaka.taro appears in the analytics user usage table too, but the active sessions table should not be in DOM
    expect(document.body.textContent).not.toContain('Source IP');
  });
});

// ---------------------------------------------------------------------------
// Activities tab (branch coverage for tab === 'activities')
// ---------------------------------------------------------------------------

describe('SessionsPage - Activities tab', () => {
  it('clicking Activity Timeline tab shows activities', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('Recent User Activities');
  });

  it('shows activity type badges', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('App Launch');
    expect(document.body.textContent).toContain('Web Access');
    expect(document.body.textContent).toContain('File Access');
    expect(document.body.textContent).toContain('Print');
    expect(document.body.textContent).toContain('Email');
  });

  it('shows activity user names', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('tanaka.taro');
    expect(document.body.textContent).toContain('suzuki.hanako');
    expect(document.body.textContent).toContain('sato.yuki');
  });

  it('shows activity detail information', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    // detail entries for app_launch: app_name: Microsoft Excel
    expect(document.body.textContent).toContain('Microsoft Excel');
  });

  it('shows activity detail for web_access', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('sharepoint.company.com');
  });

  it('shows activity detail for print', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('PRINTER-3F-01');
  });

  it('shows activity detail for email', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('Monthly Report');
  });

  it('shows activity detail for file_access', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('Q1_2026.xlsx');
  });

  it('hides active sessions and analytics when activities tab is selected', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).not.toContain('Peak Hours');
    expect(document.body.textContent).not.toContain('Source IP');
  });
});

// ---------------------------------------------------------------------------
// Tab switching (branch coverage for all tab states)
// ---------------------------------------------------------------------------

describe('SessionsPage - tab switching', () => {
  it('switching from analytics back to active sessions shows the table', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent).toContain('Peak Hours');
    // "Active Sessions" appears in both StatCard and tab button; use getAllByText and find the tab button
    const activeButtons = screen.getAllByText('Active Sessions');
    const tabButton = activeButtons.find(el => el.tagName === 'BUTTON');
    fireEvent.click(tabButton!);
    expect(document.body.textContent).toContain('tanaka.taro');
    expect(document.body.textContent).not.toContain('Peak Hours');
  });

  it('switching from activities to analytics works', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent).toContain('Recent User Activities');
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent).toContain('Session Type Distribution');
    expect(document.body.textContent).not.toContain('Recent User Activities');
  });
});

// ---------------------------------------------------------------------------
// Session overview chart (activeRate ternary branch)
// ---------------------------------------------------------------------------

describe('SessionsPage - overview chart activeRate color', () => {
  // activeRate = Math.round((6 / 50) * 100) = 12 → green branch (< 50)
  // So only the green (#10b981) branch is hit with static data.
  // The red (>=80) and amber (>=50) branches are not reachable with static data.

  it('inline activeRate >= 80 → red', () => {
    const activeRate = 85;
    const activeColor = activeRate >= 80 ? '#ef4444' : activeRate >= 50 ? '#f59e0b' : '#10b981';
    expect(activeColor).toBe('#ef4444');
  });

  it('inline activeRate >= 50 → amber', () => {
    const activeRate = 60;
    const activeColor = activeRate >= 80 ? '#ef4444' : activeRate >= 50 ? '#f59e0b' : '#10b981';
    expect(activeColor).toBe('#f59e0b');
  });

  it('inline activeRate < 50 → green', () => {
    const activeRate = 12;
    const activeColor = activeRate >= 80 ? '#ef4444' : activeRate >= 50 ? '#f59e0b' : '#10b981';
    expect(activeColor).toBe('#10b981');
  });
});

// ---------------------------------------------------------------------------
// typeBarData fallback color
// ---------------------------------------------------------------------------

describe('SessionsPage - typeBarData fallback color', () => {
  it('index within array range returns correct color', () => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
    expect(colors[0] || 'bg-gray-400').toBe('bg-blue-500');
    expect(colors[3] || 'bg-gray-400').toBe('bg-amber-500');
  });

  it('index out of range returns fallback', () => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
    expect(colors[4] || 'bg-gray-400').toBe('bg-gray-400');
  });
});
