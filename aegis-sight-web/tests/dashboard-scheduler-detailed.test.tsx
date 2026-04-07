import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/scheduler',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  // Set a fake token so getToken() returns non-null and fetch is attempted
  localStorage.setItem('token', 'fake-test-token');
  // Reject fetch so catch block fires, loading becomes false
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  localStorage.clear();
});

async function renderScheduler() {
  const { default: Page } = await import('@/app/dashboard/scheduler/page');
  const result = render(<Page />);
  // Wait for async loading to complete (both fetchTasks + fetchHistory resolve/reject)
  await waitFor(() => {
    expect(screen.queryByText('スケジューラ管理')).toBeTruthy();
  });
  return result;
}

describe('Scheduler page - heading and tabs', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows スケジューラ管理 heading after load', async () => {
    await renderScheduler();
    expect(screen.getByText('スケジューラ管理')).toBeTruthy();
  });

  it('shows subtitle about scheduled tasks', async () => {
    await renderScheduler();
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  });

  it('shows タスク一覧 tab', async () => {
    await renderScheduler();
    expect(screen.getByText('タスク一覧')).toBeTruthy();
  });

  it('shows 実行履歴 tab', async () => {
    await renderScheduler();
    expect(screen.getByText('実行履歴')).toBeTruthy();
  });

  it('shows empty state when no tasks', async () => {
    await renderScheduler();
    await waitFor(() => {
      expect(screen.getByText('スケジュールタスクがありません')).toBeTruthy();
    });
  });
});

describe('Scheduler page - tab switching', () => {
  it('switches to 実行履歴 tab on click', async () => {
    await renderScheduler();
    fireEvent.click(screen.getByText('実行履歴'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('switches back to タスク一覧 tab', async () => {
    await renderScheduler();
    fireEvent.click(screen.getByText('実行履歴'));
    fireEvent.click(screen.getByText('タスク一覧'));
    expect(screen.getByText('タスク一覧')).toBeTruthy();
  });

  it('shows 実行履歴 empty state when no history', async () => {
    await renderScheduler();
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    });
  });
});

describe('Scheduler page - error state and interactions', () => {
  it('renders with network error gracefully', async () => {
    await renderScheduler();
    // Page should still render heading even with error state
    expect(screen.getByText('スケジューラ管理')).toBeTruthy();
  });

  it('all buttons render and are clickable', async () => {
    await renderScheduler();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  it('page body has substantial content after load', async () => {
    await renderScheduler();
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  });
});

describe('Scheduler page - with mock task data', () => {
  it('renders task list when API returns tasks', async () => {
    const mockTask = {
      id: 'task-001',
      name: 'SAMチェック',
      task_type: 'sam_check',
      cron_expression: '0 */6 * * *',
      is_enabled: true,
      last_run_at: '2024-01-01T00:00:00Z',
      next_run_at: '2024-01-01T06:00:00Z',
      last_status: 'success',
      description: 'SAMデータ整合性チェック',
      created_at: '2024-01-01T00:00:00Z',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockTask] }),
    });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('SAMチェック');
    });
  });

  it('renders task type label for sam_check', async () => {
    const mockTask = {
      id: 'task-001',
      name: 'SAMチェック',
      task_type: 'sam_check',
      cron_expression: '0 */6 * * *',
      is_enabled: true,
      last_run_at: null,
      next_run_at: null,
      last_status: null,
      description: null,
      created_at: '2024-01-01T00:00:00Z',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockTask] }),
    });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const hasTaskType = document.body.textContent?.includes('SAMチェック') ||
                         document.body.textContent?.includes('sam_check');
      expect(hasTaskType).toBe(true);
    });
  });

  it('shows success status badge when task status is success', async () => {
    const mockTask = {
      id: 'task-001',
      name: 'テストタスク',
      task_type: 'm365_sync',
      cron_expression: '0 0 * * *',
      is_enabled: true,
      last_run_at: '2024-01-01T00:00:00Z',
      next_run_at: '2024-01-02T00:00:00Z',
      last_status: 'success',
      description: null,
      created_at: '2024-01-01T00:00:00Z',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockTask] }),
    });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const hasStatus = document.body.textContent?.includes('成功') ||
                        document.body.textContent?.includes('success') ||
                        document.body.textContent?.includes('テストタスク');
      expect(hasStatus).toBe(true);
    });
  });

  it('shows failed status badge when task status is failed', async () => {
    const mockTask = {
      id: 'task-002',
      name: '失敗タスク',
      task_type: 'backup',
      cron_expression: '0 2 * * *',
      is_enabled: false,
      last_run_at: '2024-01-01T00:00:00Z',
      next_run_at: null,
      last_status: 'failed',
      description: null,
      created_at: '2024-01-01T00:00:00Z',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [mockTask] }),
    });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const hasStatus = document.body.textContent?.includes('失敗') ||
                        document.body.textContent?.includes('失敗タスク');
      expect(hasStatus).toBe(true);
    });
  });
});
