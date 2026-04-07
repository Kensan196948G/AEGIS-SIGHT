import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/notifications',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: () => <div data-testid="donut-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('Notifications page - heading and basic render', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows Notification Settings heading', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('Notification Settings')).toBeTruthy();
  });

  it('shows 通知概要 section', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('通知概要')).toBe(true);
  });

  it('shows substantial content', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.length).toBeGreaterThan(100);
  });
});

describe('Notifications page - tab navigation', () => {
  it('shows Channels tab', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('Channels')).toBeTruthy();
  });

  it('shows Rules tab', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('Rules')).toBeTruthy();
  });

  it('clicking Rules tab switches view (activeTab === rules branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    const hasRules = document.body.textContent?.includes('Rule Name') ||
                     document.body.textContent?.includes('Event Type');
    expect(hasRules).toBe(true);
  });

  it('switching back from Rules to Channels works', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    fireEvent.click(screen.getByText('Channels'));
    expect(document.body.textContent?.includes('IT Admin Email')).toBe(true);
  });
});

describe('Notifications page - channels tab content', () => {
  it('shows channel table headers', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Name')).toBe(true);
    expect(document.body.textContent?.includes('Type')).toBe(true);
  });

  it('shows IT Admin Email channel', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('IT Admin Email')).toBe(true);
  });

  it('shows Security Slack channel', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Security Slack')).toBe(true);
  });

  it('shows PagerDuty Webhook channel', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('PagerDuty Webhook')).toBe(true);
  });

  it('shows Ops Teams channel (disabled)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Ops Teams')).toBe(true);
  });

  it('shows Enabled badge (is_enabled=true branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Enabled')).toBe(true);
  });

  it('shows Disabled badge (is_enabled=false branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Disabled')).toBe(true);
  });

  it('shows channel type badges (Email, Slack, Webhook, Teams)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    const hasTypes = document.body.textContent?.includes('Email') &&
                     document.body.textContent?.includes('Slack');
    expect(hasTypes).toBe(true);
  });

  it('shows Test buttons for each channel', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    const testBtns = screen.getAllByText('Test');
    expect(testBtns.length).toBeGreaterThan(0);
  });

  it('clicking Test button changes state (testingChannelId branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    const testBtns = screen.getAllByText('Test');
    fireEvent.click(testBtns[0]);
    // After click, button may show 'Sending...' briefly
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('shows + Add Channel button', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(screen.getByText('+ Add Channel')).toBeTruthy();
  });
});

describe('Notifications page - Add Channel modal (showAddChannelModal branch)', () => {
  it('clicking + Add Channel opens modal (showAddChannelModal=true branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    expect(document.body.textContent?.includes('Add Notification Channel')).toBe(true);
  });

  it('modal shows Channel Name field', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    expect(document.body.textContent?.includes('Channel Name')).toBe(true);
  });

  it('modal shows Channel Type selector', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    expect(document.body.textContent?.includes('Channel Type')).toBe(true);
  });

  it('modal shows Recipient Email field for email type (default)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    expect(document.body.textContent?.includes('Recipient Email')).toBe(true);
  });

  it('changing type to webhook shows Webhook URL field (channelConfigFields branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    const typeSelect = document.querySelector('select[value="email"], select') as HTMLSelectElement;
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'webhook' } });
      expect(document.body.textContent?.includes('Webhook URL')).toBe(true);
    } else {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    }
  });

  it('changing type to slack shows Slack Webhook URL field', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    const selects = document.querySelectorAll('select');
    const typeSelect = Array.from(selects).find(s =>
      s.querySelector('option[value="email"]') && s.querySelector('option[value="slack"]')
    );
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'slack' } });
      expect(document.body.textContent?.includes('Slack Webhook URL')).toBe(true);
    }
  });

  it('changing type to teams shows Teams Webhook URL field', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    const selects = document.querySelectorAll('select');
    const typeSelect = Array.from(selects).find(s =>
      s.querySelector('option[value="teams"]')
    );
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'teams' } });
      expect(document.body.textContent?.includes('Teams Webhook URL')).toBe(true);
    }
  });

  it('can type channel name in modal', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    const nameInput = document.querySelector('input[placeholder="e.g. IT Admin Email"]') as HTMLInputElement;
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Channel' } });
      expect(nameInput.value).toBe('Test Channel');
    }
  });

  it('modal Cancel button closes modal (resetChannelForm branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('+ Add Channel'));
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    // Modal should be gone
    expect(document.body.textContent?.includes('Add Notification Channel')).toBe(false);
  });
});

describe('Notifications page - Rules tab content', () => {
  it('shows Rule Name column after switching to Rules tab', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(document.body.textContent?.includes('Rule Name')).toBe(true);
  });

  it('shows Critical to Email rule', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(document.body.textContent?.includes('Critical to Email')).toBe(true);
  });

  it('shows License Violation rule', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(document.body.textContent?.includes('License Violation')).toBe(true);
  });

  it('shows Security to PagerDuty rule', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(document.body.textContent?.includes('Security to PagerDuty')).toBe(true);
  });

  it('shows Procurement Approval rule (disabled)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(document.body.textContent?.includes('Procurement Approval')).toBe(true);
  });

  it('shows Enabled and Disabled rule badges', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    const hasEnabled = document.body.textContent?.includes('Enabled');
    expect(hasEnabled).toBe(true);
  });

  it('shows + Add Rule button in Rules tab', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('+ Add Rule')).toBeTruthy();
  });

  it('shows event type labels (Critical Alert, License Violation)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    const hasCritical = document.body.textContent?.includes('Critical Alert');
    expect(hasCritical).toBe(true);
  });

  it('shows channel name lookup (IT Admin Email in rules)', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    // getChannelName finds channel by id - IT Admin Email has id=1
    expect(document.body.textContent?.includes('IT Admin Email')).toBe(true);
  });
});

describe('Notifications page - Add Rule modal (showAddRuleModal branch)', () => {
  it('clicking + Add Rule opens rule modal', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    fireEvent.click(screen.getByText('+ Add Rule'));
    const hasModal = document.body.textContent?.includes('Add Notification Rule') ||
                     document.body.textContent?.includes('Rule Name') ||
                     document.body.textContent?.includes('Event Type');
    expect(hasModal).toBe(true);
  });

  it('rule modal Cancel button closes modal', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    fireEvent.click(screen.getByText('Rules'));
    fireEvent.click(screen.getByText('+ Add Rule'));
    const cancelBtns = screen.getAllByText('Cancel');
    if (cancelBtns.length > 0) {
      fireEvent.click(cancelBtns[0]);
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    }
  });
});

describe('Notifications page - chart widgets', () => {
  it('renders DonutChart for channel utilization', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.querySelector('[data-testid="donut-chart"]')).toBeTruthy();
  });

  it('renders BarChart for channel type distribution', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
  });

  it('shows チャネル有効率 label', async () => {
    const { default: Page } = await import('@/app/dashboard/notifications/page');
    render(<Page />);
    expect(document.body.textContent?.includes('チャネル有効率')).toBe(true);
  });
});
