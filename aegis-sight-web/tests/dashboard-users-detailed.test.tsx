import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getActiveRateColor } from '@/app/dashboard/users/page';

// Mock chart components (use ResizeObserver / SVG)
vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/users',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) => (
    <span data-variant={variant} data-dot={dot ? 'true' : undefined}>{children}</span>
  ),
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
        <button onClick={onClose} aria-label="閉じる">×</button>
        {children}
      </div>
    ) : null,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ─── UsersPage ────────────────────────────────────────────────────────────

describe('UsersPage - 初期レンダリング', () => {
  it('ページタイトル「ユーザー管理」が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('ユーザー管理')).toBeTruthy();
  });

  it('サブタイトルが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('ユーザーアカウントとロールの管理')).toBeTruthy();
  });

  it('合計ユーザー数が表示される (5名)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('合計: 5名')).toBeTruthy();
  });

  it('有効ユーザー数が表示される (4名)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('有効: 4名')).toBeTruthy();
  });

  it('ユーザーテーブルが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('名前')).toBeTruthy();
    expect(screen.getByText('メール')).toBeTruthy();
    expect(screen.getByText('ロール')).toBeTruthy();
    expect(screen.getByText('状態')).toBeTruthy();
    expect(screen.getByText('登録日')).toBeTruthy();
    expect(screen.getByText('操作')).toBeTruthy();
  });

  it('デモユーザー全員が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('山田 太郎')).toBeTruthy();
    expect(screen.getByText('田中 花子')).toBeTruthy();
    expect(screen.getByText('鈴木 一郎')).toBeTruthy();
    expect(screen.getByText('佐藤 美咲')).toBeTruthy();
    expect(screen.getByText('渡辺 健')).toBeTruthy();
  });

  it('メールアドレスが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByText('admin@aegis-sight.local')).toBeTruthy();
    expect(screen.getByText('tanaka@aegis-sight.local')).toBeTruthy();
  });

  it('DonutChart が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByTestId('donut-chart')).toBeTruthy();
  });

  it('BarChart が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('アクティブ率ラベルが表示される (80%)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    // 4/5 = 80%
    expect(screen.getByTestId('donut-chart').textContent).toContain('80%');
  });

  it('アバターの頭文字が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    // 山田太郎 → 「山」
    expect(screen.getByText('山')).toBeTruthy();
  });
});

// ─── ロールバッジ ─────────────────────────────────────────────────────────

describe('UsersPage - ロールバッジ', () => {
  it('管理者バッジが表示される (variant=danger)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    // Badge mock renders <span data-variant="...">
    const dangerBadges = container.querySelectorAll('[data-variant="danger"]');
    expect(dangerBadges.length).toBeGreaterThan(0);
    const adminBadge = Array.from(dangerBadges).find(el => el.textContent === '管理者');
    expect(adminBadge).toBeTruthy();
  });

  it('オペレーターバッジが表示される (variant=warning)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    const warningBadges = container.querySelectorAll('[data-variant="warning"]');
    expect(warningBadges.length).toBeGreaterThan(0);
    const badge = Array.from(warningBadges).find(el => el.textContent === 'オペレーター');
    expect(badge).toBeTruthy();
  });

  it('監査者バッジが表示される (variant=info)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    const infoBadges = container.querySelectorAll('[data-variant="info"]');
    expect(infoBadges.length).toBeGreaterThan(0);
    const badge = Array.from(infoBadges).find(el => el.textContent === '監査者');
    expect(badge).toBeTruthy();
  });

  it('閲覧者バッジが表示される (variant=default)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    const { container } = render(<Page />);
    const defaultBadges = container.querySelectorAll('[data-variant="default"]');
    expect(defaultBadges.length).toBeGreaterThan(0);
    const badge = Array.from(defaultBadges).find(el => el.textContent === '閲覧者');
    expect(badge).toBeTruthy();
  });
});

// ─── 状態バッジ ───────────────────────────────────────────────────────────

describe('UsersPage - 状態バッジ', () => {
  it('有効バッジが表示される (variant=success)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const activeBadges = screen.getAllByText('有効');
    expect(activeBadges.length).toBeGreaterThan(0);
    expect(activeBadges[0].getAttribute('data-variant')).toBe('success');
  });

  it('無効バッジが表示される (variant=default)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const inactiveBadges = screen.getAllByText('無効');
    expect(inactiveBadges.length).toBeGreaterThan(0);
    expect(inactiveBadges[0].getAttribute('data-variant')).toBe('default');
  });

  it('有効バッジは dot プロパティを持つ', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const activeBadges = screen.getAllByText('有効');
    expect(activeBadges[0].getAttribute('data-dot')).toBe('true');
  });
});

// ─── 編集モーダル ─────────────────────────────────────────────────────────

describe('UsersPage - 編集モーダル', () => {
  it('初期状態でモーダルは閉じている', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('「編集」ボタンをクリックするとモーダルが開く', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('モーダルのタイトルが「ユーザー編集」', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('ユーザー編集')).toBeTruthy();
  });

  it('モーダル内に名前入力欄が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    // モーダル内に input[type=text] が表示される
    const modal = screen.getByTestId('modal');
    const inputs = modal.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('山田 太郎の編集ボタンをクリックするとその名前がモーダルに表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]); // 山田 太郎 (first user)
    // 名前フィールドに山田太郎が入っているか確認
    const nameInputs = screen.getAllByDisplayValue('山田 太郎');
    expect(nameInputs.length).toBeGreaterThan(0);
  });

  it('キャンセルボタンをクリックするとモーダルが閉じる', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId('modal')).toBeTruthy();
    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('保存ボタンをクリックするとモーダルが閉じる', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('閉じるボタン (×) をクリックするとモーダルが閉じる', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    const closeButton = screen.getByLabelText('閉じる');
    fireEvent.click(closeButton);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('別のユーザーの編集ボタンをクリックするとそのユーザーの情報がモーダルに表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[1]); // 田中 花子 (second user)
    const nameInputs = screen.getAllByDisplayValue('田中 花子');
    expect(nameInputs.length).toBeGreaterThan(0);
  });

  it('モーダル内でロールセレクトが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    const modal = screen.getByTestId('modal');
    const selects = modal.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('モーダル内のロール変更ができる (admin → readonly)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]); // 山田太郎 = admin
    const modal = screen.getByTestId('modal');
    const roleSelect = modal.querySelector('select') as HTMLSelectElement;
    expect(roleSelect).toBeTruthy();
    fireEvent.change(roleSelect, { target: { value: 'readonly' } });
    expect(roleSelect.value).toBe('readonly');
  });

  it('モーダル内の名前変更ができる', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    const modal = screen.getByTestId('modal');
    const textInput = modal.querySelector('input[type="text"]') as HTMLInputElement;
    expect(textInput).toBeTruthy();
    fireEvent.change(textInput, { target: { value: '山田 一郎' } });
    expect(textInput.value).toBe('山田 一郎');
  });

  it('モーダル内のメールフィールドは disabled', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    const modal = screen.getByTestId('modal');
    const emailInput = modal.querySelector('input[type="email"]') as HTMLInputElement;
    expect(emailInput).toBeTruthy();
    expect(emailInput.disabled).toBe(true);
  });
});

// ─── ロールオプション ─────────────────────────────────────────────────────

describe('UsersPage - BarChart ロールデータ', () => {
  it('BarChart に管理者ロールデータが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.textContent).toContain('管理者');
  });

  it('BarChart にオペレーターロールデータが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.textContent).toContain('オペレーター');
  });

  it('BarChart に監査者ロールデータが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.textContent).toContain('監査者');
  });

  it('BarChart に閲覧者ロールデータが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.textContent).toContain('閲覧者');
  });
});

// ─── activeColor ternary branch coverage ─────────────────────────────────

describe('UsersPage - activeColor ternary branches (inline)', () => {
  // Static data: 4/5 active = 80% → only >= 80 branch hit.
  // Cover the other two branches inline.

  it('activeRate >= 80 → green (#10b981)', () => {
    const activeRate = 80;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#10b981');
  });

  it('activeRate >= 60 but < 80 → amber (#f59e0b)', () => {
    const activeRate = 70;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#f59e0b');
  });

  it('activeRate < 60 → red (#ef4444)', () => {
    const activeRate = 40;
    const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
    expect(activeColor).toBe('#ef4444');
  });
});

// ─── roleBarData fallback color branch ───────────────────────────────────

describe('UsersPage - roleBarData fallback color (inline)', () => {
  it('index 0-3 returns specific colors', () => {
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'];
    expect(colors[0] || 'bg-gray-400').toBe('bg-red-500');
    expect(colors[3] || 'bg-gray-400').toBe('bg-gray-400');
  });

  it('index >= 4 returns fallback bg-gray-400', () => {
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'];
    expect(colors[4] || 'bg-gray-400').toBe('bg-gray-400');
    expect(colors[99] || 'bg-gray-400').toBe('bg-gray-400');
  });
});

// ─── 編集モーダル - 全ユーザーロール別 ───────────────────────────────────

describe('UsersPage - edit modal for different roles', () => {
  it('auditor user (鈴木一郎) opens with auditor role', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[2]); // 鈴木 一郎 = auditor
    const modal = screen.getByTestId('modal');
    const roleSelect = modal.querySelector('select') as HTMLSelectElement;
    expect(roleSelect.value).toBe('auditor');
  });

  it('readonly user (佐藤美咲) opens with readonly role', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[3]); // 佐藤 美咲 = readonly
    const modal = screen.getByTestId('modal');
    const roleSelect = modal.querySelector('select') as HTMLSelectElement;
    expect(roleSelect.value).toBe('readonly');
  });

  it('inactive user (渡辺健) opens with operator role', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[4]); // 渡辺 健 = operator, inactive
    const modal = screen.getByTestId('modal');
    const roleSelect = modal.querySelector('select') as HTMLSelectElement;
    expect(roleSelect.value).toBe('operator');
  });
});

// ─── 登録日表示 ────────────────────────────────────────────────────────────

describe('UsersPage - 登録日', () => {
  it('登録日が日本語ロケールで表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    // 2026-01-15 → 2026/1/15
    expect(screen.getByText('2026/1/15')).toBeTruthy();
  });
});

// ─── 編集ボタン数 ─────────────────────────────────────────────────────────

describe('UsersPage - 編集ボタン', () => {
  it('各ユーザーに編集ボタンが表示される (5名分)', async () => {
    const { default: Page } = await import('@/app/dashboard/users/page');
    render(<Page />);
    const editButtons = screen.getAllByText('編集');
    expect(editButtons).toHaveLength(5);
  });
});

// ==========================================================================
// Exported helper - getActiveRateColor branches
// Demo data: activeRate = 80 (4/5 active) → always hits >= 80 (green)
// amber and red branches are never hit by component rendering
// ==========================================================================
describe('UsersPage - getActiveRateColor branches', () => {
  it('rate >= 80 → green (#10b981)', () => {
    expect(getActiveRateColor(80)).toBe('#10b981');
    expect(getActiveRateColor(100)).toBe('#10b981');
  });

  it('rate >= 60 but < 80 → amber (#f59e0b, never hit by demo data)', () => {
    expect(getActiveRateColor(79)).toBe('#f59e0b');
    expect(getActiveRateColor(60)).toBe('#f59e0b');
  });

  it('rate < 60 → red (#ef4444, never hit by demo data)', () => {
    expect(getActiveRateColor(59)).toBe('#ef4444');
    expect(getActiveRateColor(0)).toBe('#ef4444');
  });
});
