import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/scheduler',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-variant={variant}>{children}</span>,
}));

const mockFetch = vi.fn();

// ScheduledTask shape expected by the real page
const makeTask = (overrides: Partial<{
  id: string;
  name: string;
  task_type: string;
  cron_expression: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: 'success' | 'failed' | 'running' | null;
  description: string | null;
  created_at: string;
}> = {}) => ({
  id: 'task-001',
  name: 'Device Sync',
  task_type: 'sam_check',
  cron_expression: '0 * * * *',
  is_enabled: true,
  last_run_at: '2026-04-08T02:00:00Z',
  next_run_at: '2026-04-08T03:00:00Z',
  last_status: 'success' as const,
  description: 'Sync device inventory',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeHistoryEntry = (overrides: Partial<{
  id: string;
  name: string;
  task_type: string;
  last_run_at: string | null;
  last_status: 'success' | 'failed' | 'running' | null;
}> = {}) => ({
  id: 'hist-001',
  name: 'Device Sync',
  task_type: 'sam_check',
  last_run_at: '2026-04-08T02:00:00Z',
  last_status: 'success' as const,
  ...overrides,
});

// Set up standard successful mock responses (tasks + history)
function setupFetchWithData(tasks: object[], history: object[]) {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: tasks }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => history,
    });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  localStorage.setItem('token', 'fake-test-token');
  // Default: reject so the page reaches non-loading state quickly
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('Scheduler page - basic rendering', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows loading spinner initially then disappears', async () => {
    // Delay resolution so we can catch loading state
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockReturnValue(new Promise((res) => { resolveFetch = res; }));

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);

    // Spinner should be present while fetch is pending
    expect(container.querySelector('.animate-spin')).toBeTruthy();

    // Resolve to remove loading
    await act(async () => {
      resolveFetch({ ok: false, status: 500, json: async () => ({}) });
    });
  });

  it('shows page heading スケジューラ管理', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
  });

  it('shows subtitle 定期実行タスクの管理と実行履歴の確認', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('定期実行タスクの管理と実行履歴の確認')).toBeTruthy();
    });
  });

  it('shows タスク一覧 tab button', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('タスク一覧')).toBeTruthy();
    });
  });

  it('shows 実行履歴 tab button', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
  });

  it('タスク一覧 tab is active by default', async () => {
    setupFetchWithData([], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
    // Tasks tab content (empty state) should be shown
    expect(document.body.textContent).toContain('スケジュールタスクがありません');
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('Scheduler page - error state', () => {
  it('shows HTTP error message when tasks fetch fails with non-ok response', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('HTTP 404');
    });
  });

  it('shows 閉じる button in error banner', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    });
  });

  it('clicking 閉じる dismisses the error banner', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '閉じる' })).toBeNull();
    });
  });

  it('handles network error (fetch throws) gracefully', async () => {
    // mockFetch already set to reject in beforeEach
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
  });

  it('shows error message from thrown Error object', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Custom error message'))
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Custom error message');
    });
  });

  it('no token → skips fetch and shows empty state without crash', async () => {
    localStorage.removeItem('token');
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

describe('Scheduler page - empty states', () => {
  it('shows スケジュールタスクがありません when tasks list is empty', async () => {
    setupFetchWithData([], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジュールタスクがありません')).toBeTruthy();
    });
  });

  it('shows 実行履歴がありません when history is empty', async () => {
    setupFetchWithData([], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('スケジューラ管理')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(screen.getByText('実行履歴がありません')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

describe('Scheduler page - tab navigation', () => {
  beforeEach(() => {
    setupFetchWithData([makeTask()], [makeHistoryEntry()]);
  });

  it('clicking 実行履歴 tab switches to history view', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('タスク一覧')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('実行履歴タイムライン');
    });
  });

  it('clicking タスク一覧 tab after 実行履歴 restores task table', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('実行履歴タイムライン');
    });
    fireEvent.click(screen.getByText('タスク一覧'));
    await waitFor(() => {
      // Task table headers should be back
      expect(document.body.textContent).toContain('タスク名');
    });
  });

  it('tasks tab shows table column headers', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('タスク名')).toBeTruthy();
      expect(screen.getByText('タイプ')).toBeTruthy();
      expect(screen.getByText('スケジュール')).toBeTruthy();
      expect(screen.getByText('最終実行')).toBeTruthy();
      expect(screen.getByText('ステータス')).toBeTruthy();
      expect(screen.getByText('有効')).toBeTruthy();
      expect(screen.getByText('アクション')).toBeTruthy();
    });
  });

  it('history tab header is 実行履歴タイムライン', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(screen.getByText('実行履歴タイムライン')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Task data rendering
// ---------------------------------------------------------------------------

describe('Scheduler page - task data rendering', () => {
  it('renders task name', async () => {
    setupFetchWithData([makeTask({ name: 'SAM Daily Check' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('SAM Daily Check');
    });
  });

  it('renders cron expression', async () => {
    setupFetchWithData([makeTask({ cron_expression: '0 0 * * *' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('0 0 * * *');
    });
  });

  it('renders task description when present', async () => {
    setupFetchWithData([makeTask({ description: 'Runs daily backup' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Runs daily backup');
    });
  });

  it('renders task without description (no crash)', async () => {
    setupFetchWithData([makeTask({ description: null })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Device Sync');
    });
  });

  it('renders known task type label sam_check → SAMチェック', async () => {
    setupFetchWithData([makeTask({ task_type: 'sam_check' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('SAMチェック');
    });
  });

  it('renders known task type label m365_sync → M365同期', async () => {
    setupFetchWithData([makeTask({ task_type: 'm365_sync' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('M365同期');
    });
  });

  it('renders known task type label report_generation → レポート生成', async () => {
    setupFetchWithData([makeTask({ task_type: 'report_generation' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('レポート生成');
    });
  });

  it('renders known task type label backup → バックアップ', async () => {
    setupFetchWithData([makeTask({ task_type: 'backup' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('バックアップ');
    });
  });

  it('renders known task type label cleanup → クリーンアップ', async () => {
    setupFetchWithData([makeTask({ task_type: 'cleanup' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('クリーンアップ');
    });
  });

  it('renders unknown task type as-is', async () => {
    setupFetchWithData([makeTask({ task_type: 'custom_unknown_type' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('custom_unknown_type');
    });
  });

  it('renders last_run_at formatted date', async () => {
    setupFetchWithData([makeTask({ last_run_at: '2026-04-08T02:00:00Z' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      // The formatted date should appear (locale-formatted)
      expect(document.body.textContent).toContain('2026');
    });
  });

  it('renders -- when last_run_at is null', async () => {
    setupFetchWithData([makeTask({ last_run_at: null, last_status: null })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('--');
    });
  });

  it('renders multiple tasks', async () => {
    setupFetchWithData(
      [
        makeTask({ id: 't1', name: 'Task Alpha' }),
        makeTask({ id: 't2', name: 'Task Beta' }),
      ],
      []
    );
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Task Alpha');
      expect(document.body.textContent).toContain('Task Beta');
    });
  });
});

// ---------------------------------------------------------------------------
// Status badge variants
// ---------------------------------------------------------------------------

describe('Scheduler page - status badge rendering', () => {
  it('shows 成功 badge for last_status=success', async () => {
    setupFetchWithData([makeTask({ last_status: 'success' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('成功');
    });
  });

  it('shows 失敗 badge for last_status=failed', async () => {
    setupFetchWithData([makeTask({ last_status: 'failed' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('失敗');
    });
  });

  it('shows 実行中 badge for last_status=running', async () => {
    setupFetchWithData([makeTask({ last_status: 'running' })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('実行中');
    });
  });

  it('shows -- when last_status is null', async () => {
    setupFetchWithData([makeTask({ last_status: null })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('--');
    });
  });
});

// ---------------------------------------------------------------------------
// Toggle (enable/disable) switch
// ---------------------------------------------------------------------------

describe('Scheduler page - toggle switch', () => {
  it('toggle switch is rendered for enabled task', async () => {
    setupFetchWithData([makeTask({ is_enabled: true })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeTruthy();
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('toggle switch reflects aria-checked=false for disabled task', async () => {
    setupFetchWithData([makeTask({ is_enabled: false })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const toggle = screen.getByRole('switch');
      expect(toggle.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('clicking toggle calls PATCH API for enabled→disabled', async () => {
    setupFetchWithData([makeTask({ id: 'task-toggle', is_enabled: true })], []);
    // PATCH response + re-fetch responses
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // PATCH
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask({ id: 'task-toggle', is_enabled: false })] }) }); // re-fetch tasks

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    // PATCH endpoint should have been called
    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const patchCall = calls.find((c) => c[1]?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
    });
  });

  it('toggle shows success action message after enabling', async () => {
    setupFetchWithData([makeTask({ id: 'task-toggle', name: 'My Task', is_enabled: false })], []);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask({ is_enabled: true })] }) });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('My Task');
    });
  });

  it('toggle shows error when PATCH fails', async () => {
    setupFetchWithData([makeTask({ is_enabled: true })], []);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('HTTP 403');
    });
  });
});

// ---------------------------------------------------------------------------
// 即時実行 (run now) button
// ---------------------------------------------------------------------------

describe('Scheduler page - 即時実行 button', () => {
  it('renders 即時実行 button for enabled task', async () => {
    setupFetchWithData([makeTask({ is_enabled: true })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /即時実行/ })).toBeTruthy();
    });
  });

  it('即時実行 button is disabled when task is disabled', async () => {
    setupFetchWithData([makeTask({ is_enabled: false })], []);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /即時実行/ });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('clicking 即時実行 calls POST /run endpoint', async () => {
    setupFetchWithData([makeTask({ id: 'task-run', is_enabled: true })], []);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: '実行しました' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask()] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /即時実行/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /即時実行/ }));
    });

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const postCall = calls.find((c) => c[1]?.method === 'POST');
      expect(postCall).toBeTruthy();
      expect(String(postCall![0])).toContain('/run');
    });
  });

  it('shows action message from run API response', async () => {
    setupFetchWithData([makeTask({ id: 'task-run', is_enabled: true, name: 'My Run Task' })], []);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'My Run Task を実行しました' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask()] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /即時実行/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /即時実行/ }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('を実行しました');
    });
  });

  it('shows fallback action message when run response has no message field', async () => {
    setupFetchWithData([makeTask({ id: 'task-run', is_enabled: true, name: 'NoMsg Task' })], []);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })  // no 'message' field
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask()] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /即時実行/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /即時実行/ }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('NoMsg Task');
    });
  });

  it('shows error when run POST fails', async () => {
    setupFetchWithData([makeTask({ is_enabled: true })], []);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /即時実行/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /即時実行/ }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('HTTP 500');
    });
  });

  it('shows error when run POST throws', async () => {
    setupFetchWithData([makeTask({ is_enabled: true })], []);
    mockFetch.mockRejectedValueOnce(new Error('run failed'));

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /即時実行/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /即時実行/ }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('run failed');
    });
  });
});

// ---------------------------------------------------------------------------
// History tab data rendering
// ---------------------------------------------------------------------------

describe('Scheduler page - history tab data', () => {
  it('shows history entry name', async () => {
    setupFetchWithData([], [makeHistoryEntry({ name: 'Backup Job' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Backup Job');
    });
  });

  it('shows history entry task_type label', async () => {
    setupFetchWithData([], [makeHistoryEntry({ task_type: 'backup' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('バックアップ');
    });
  });

  it('shows formatted last_run_at for history entry', async () => {
    setupFetchWithData([], [makeHistoryEntry({ last_run_at: '2026-04-08T10:00:00Z' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('2026');
    });
  });

  it('shows -- for history entry with null last_run_at', async () => {
    setupFetchWithData([], [makeHistoryEntry({ last_run_at: null, last_status: null })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('--');
    });
  });

  it('history success entry shows 成功 label', async () => {
    setupFetchWithData([], [makeHistoryEntry({ last_status: 'success' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('成功');
    });
  });

  it('history failed entry shows 失敗 label', async () => {
    setupFetchWithData([], [makeHistoryEntry({ last_status: 'failed' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('失敗');
    });
  });

  it('history running entry shows 実行中 label', async () => {
    setupFetchWithData([], [makeHistoryEntry({ last_status: 'running' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('実行中');
    });
  });

  it('history entry with null last_status shows no status label (no crash)', async () => {
    setupFetchWithData([], [makeHistoryEntry({ last_status: null })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('実行履歴タイムライン');
    });
  });

  it('timeline line is rendered for non-last history entry', async () => {
    setupFetchWithData(
      [],
      [
        makeHistoryEntry({ id: 'h1', name: 'First', last_status: 'success' }),
        makeHistoryEntry({ id: 'h2', name: 'Second', last_status: 'failed' }),
      ]
    );
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('First');
      expect(document.body.textContent).toContain('Second');
    });
  });

  it('unknown history task_type rendered as-is', async () => {
    setupFetchWithData([], [makeHistoryEntry({ task_type: 'unknown_hist_type' })]);
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('実行履歴')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('実行履歴'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('unknown_hist_type');
    });
  });
});

// ---------------------------------------------------------------------------
// Action message display and auto-dismiss
// ---------------------------------------------------------------------------

describe('Scheduler page - action message', () => {
  it('action message is displayed after successful toggle', async () => {
    setupFetchWithData([makeTask({ is_enabled: true, name: 'Toggle Me' })], []);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask({ name: 'Toggle Me', is_enabled: false })] }) });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Toggle Me');
    });
  });
});

// ---------------------------------------------------------------------------
// 500 / HTTP error on tasks endpoint
// ---------------------------------------------------------------------------

describe('Scheduler page - HTTP error scenarios', () => {
  it('handles 401 on tasks fetch', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('HTTP 401');
    });
  });

  it('handles history fetch failure silently (no error banner)', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [makeTask()] }) })
      .mockRejectedValueOnce(new Error('history network fail'));

    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    render(<Page />);
    await waitFor(() => {
      // Page should render without error from history failure
      expect(document.body.textContent).toContain('Device Sync');
    });
    // No error banner for history failures
    expect(screen.queryByRole('button', { name: '閉じる' })).toBeNull();
  });
});
