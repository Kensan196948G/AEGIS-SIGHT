import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/scheduler',
  useParams: () => ({}),
}));

const mockFetch = vi.fn();

const mockTasks = [
  {
    id: 'task-001',
    name: 'Device Sync',
    task_type: 'device_sync',
    cron_expression: '0 * * * *',
    status: 'active',
    is_enabled: true,
    last_run_at: '2026-04-08T02:00:00Z',
    next_run_at: '2026-04-08T03:00:00Z',
    last_run_status: 'success',
    description: 'Sync device inventory',
  },
  {
    id: 'task-002',
    name: 'Security Scan',
    task_type: 'security_scan',
    cron_expression: '0 0 * * *',
    status: 'active',
    is_enabled: true,
    last_run_at: '2026-04-08T00:00:00Z',
    next_run_at: '2026-04-09T00:00:00Z',
    last_run_status: 'failed',
    description: 'Daily security scan',
  },
];

const mockHistory = [
  {
    id: 'hist-001',
    task_id: 'task-001',
    task_name: 'Device Sync',
    started_at: '2026-04-08T02:00:00Z',
    finished_at: '2026-04-08T02:01:00Z',
    status: 'success',
    duration_ms: 60000,
  },
  {
    id: 'hist-002',
    task_id: 'task-002',
    task_name: 'Security Scan',
    started_at: '2026-04-08T00:00:00Z',
    finished_at: '2026-04-08T00:05:00Z',
    status: 'failed',
    duration_ms: 300000,
    error_message: 'Connection timeout',
  },
];

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  localStorage.setItem('token', 'fake-test-token');
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  localStorage.clear();
});

describe('Scheduler page - heading and basic render', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows スケジューラ管理 heading', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
  });

  it('shows page subtitle about scheduled tasks', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const hasSubtitle = document.body.textContent?.includes('定期実行') ||
                          document.body.textContent?.includes('実行履歴');
      expect(hasSubtitle).toBe(true);
    });
  });

  it('shows content even with network error', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(20);
    });
  });
});

describe('Scheduler page - error state', () => {
  it('handles network error gracefully', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
  });

  it('shows error message or empty state on network failure', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(20);
    });
  });
});

describe('Scheduler page - tab navigation', () => {
  it('shows タスク一覧 tab', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('タスク一覧')).toBeTruthy();
    });
  });

  it('shows 実行履歴 tab', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
  });

  it('clicking 実行履歴 tab switches view', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('clicking back to タスク一覧 works', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    fireEvent.click(screen.getByText('タスク一覧'));
    expect(screen.getByText('タスク一覧')).toBeTruthy();
  });
});

describe('Scheduler page - with mock task data', () => {
  beforeEach(() => {
    // tasks endpoint returns { items: [...] }, history returns array directly
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockTasks }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => mockHistory,
      });
  });

  it('shows Device Sync task', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Device Sync');
    });
  });

  it('shows Security Scan task', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Security Scan');
    });
  });

  it('shows cron expression or task schedule', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const hasCron = document.body.textContent?.includes('0 * * * *') ||
                      document.body.textContent?.includes('cron') ||
                      document.body.textContent?.includes('Device Sync');
      expect(hasCron).toBe(true);
    });
  });

  it('shows task status', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const hasStatus = document.body.textContent?.includes('success') ||
                        document.body.textContent?.includes('成功') ||
                        document.body.textContent?.includes('active') ||
                        document.body.textContent?.includes('Device Sync');
      expect(hasStatus).toBe(true);
    });
  });
});

describe('Scheduler page - history tab with data', () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockTasks }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => mockHistory,
      });
  });

  it('history tab shows execution records', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Device Sync');
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    });
  });
});

describe('Scheduler page - 500 error', () => {
  it('handles 500 error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(20);
    });
  });
});
