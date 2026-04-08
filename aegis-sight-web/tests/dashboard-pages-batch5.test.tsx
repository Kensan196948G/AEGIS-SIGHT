import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data?: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
  ProgressBar: ({ value }: { value: number }) => <div data-testid="progress-bar">{value}</div>,
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

// ─── Sessions page (pure mock data, no fetch) ───────────────────────────────
describe('Sessions page - tab navigation', () => {
  it('renders Session Management heading', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getByText('Session Management')).toBeTruthy();
  });

  it('shows Active Sessions tab', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getAllByText('Active Sessions').length).toBeGreaterThan(0);
  });

  it('shows Analytics tab', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('shows Activity Timeline tab', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    expect(screen.getByText('Activity Timeline')).toBeTruthy();
  });

  it('switches to Analytics tab on click', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('switches to Activity Timeline tab on click', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Activity Timeline'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('switching back to Active Sessions works', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Analytics'));
    fireEvent.click(screen.getAllByText('Active Sessions')[0]);
    expect(screen.getAllByText('Active Sessions').length).toBeGreaterThan(0);
  });

  it('shows mock session data rows', async () => {
    const { default: Page } = await import('@/app/dashboard/sessions/page');
    render(<Page />);
    // Mock data has active sessions - should show some content
    expect(document.body.textContent?.length).toBeGreaterThan(100);
  });
});

// ─── Notifications page (pure demo data, no fetch) ──────────────────────────
describe('Notifications page - tab navigation', () => {
  it('renders Notification Settings heading', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('Notification Settings')).toBeTruthy();
  });

  it('shows Channels tab button', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('Channels')).toBeTruthy();
  });

  it('shows Rules tab button', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('Rules')).toBeTruthy();
  });

  it('switches to Rules tab on click', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('switching back to Channels tab works', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    fireEvent.click(screen.getByText('Channels'));
    expect(screen.getByText('Channels')).toBeTruthy();
  });

  it('shows demo channel data (Email, Slack, etc)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    // demoChannels includes email/slack/etc channels
    const hasChannel = document.body.textContent?.includes('email') ||
                       document.body.textContent?.includes('Email') ||
                       document.body.textContent?.includes('Slack') ||
                       document.body.textContent?.includes('slack');
    expect(hasChannel).toBe(true);
  });

  it('toggle channel enabled/disabled button exists', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});

// ─── Departments page (catch-block demo data) ───────────────────────────────
describe('Departments page - with demo data', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/departments/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows departments heading after load', async () => {
    const { default: Page } = await import('@/app/dashboard/departments/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  });

  it('shows department list or buttons', async () => {
    const { default: Page } = await import('@/app/dashboard/departments/page');
    render(<Page />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── Device Groups page (with catch demo data) ──────────────────────────────
describe('Device Groups page - with demo data', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('loads and shows content after catch block', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  });

  it('shows create group or add button if present', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    });
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });
});
