import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock chart components (use ResizeObserver / SVG)
vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/devices',
  useParams: () => ({}),
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

// ─── DevicesPage ──────────────────────────────────────────────────────────

describe('DevicesPage - 初期レンダリング', () => {
  it('ページタイトル「デバイス管理」が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('デバイス管理')).toBeTruthy();
  });

  it('CSVエクスポートボタンが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('CSVエクスポート')).toBeTruthy();
  });

  it('デバイスを追加ボタンが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('デバイスを追加')).toBeTruthy();
  });

  it('デモデバイスの行が表示される (PC-TANAKA-001)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
  });

  it('全デバイスが初期状態で表示される (10台)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    // 10 rows: verified by checking a few hostnames
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.getByText('SRV-DB-001')).toBeTruthy();
    expect(screen.getByText('PC-KIMURA-006')).toBeTruthy();
  });

  it('DonutChartが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByTestId('donut-chart')).toBeTruthy();
  });

  it('BarChartが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('オンライン率ラベルが表示される (86%)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    // 1102/1284 = ~85.8% → 86%
    expect(screen.getByTestId('donut-chart').textContent).toContain('86%');
  });

  it('統計カード - 合計台数が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    // "1,284" appears in the stats card and also in the pagination text
    expect(screen.getAllByText('1,284').length).toBeGreaterThan(0);
  });

  it('統計カード - オンライン台数が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('1,102')).toBeTruthy();
  });

  it('統計カード - オフライン台数が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('128')).toBeTruthy();
  });

  it('統計カード - 要注意台数が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('54')).toBeTruthy();
  });

  it('検索入力欄が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByPlaceholderText('ホスト名・IPアドレスで検索...')).toBeTruthy();
  });

  it('OS フィルターセレクトが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByDisplayValue('すべてのOS')).toBeTruthy();
  });

  it('ステータスフィルターセレクトが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByDisplayValue('すべてのステータス')).toBeTruthy();
  });

  it('部門フィルターセレクトが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByDisplayValue('すべての部門')).toBeTruthy();
  });
});

// ─── ステータスバッジ ─────────────────────────────────────────────────────

describe('DevicesPage - ステータスバッジ', () => {
  it('オンラインバッジが表示される (variant=success)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const successBadges = screen.getAllByText('オンライン');
    expect(successBadges.length).toBeGreaterThan(0);
  });

  it('オフラインバッジが表示される (variant=danger)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const offlineBadges = screen.getAllByText('オフライン');
    expect(offlineBadges.length).toBeGreaterThan(0);
  });

  it('要注意バッジが表示される (variant=warning)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const warningBadges = screen.getAllByText('要注意');
    expect(warningBadges.length).toBeGreaterThan(0);
  });

  it('メンテナンスバッジが表示される (variant=info)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const maintenanceBadges = screen.getAllByText('メンテナンス');
    expect(maintenanceBadges.length).toBeGreaterThan(0);
  });
});

// ─── テーブルヘッダー ─────────────────────────────────────────────────────

describe('DevicesPage - テーブルヘッダー', () => {
  it('ホスト名カラムヘッダーが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('ホスト名')).toBeTruthy();
  });

  it('OS カラムヘッダーが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('OS')).toBeTruthy();
  });

  it('IPアドレスカラムヘッダーが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('IPアドレス')).toBeTruthy();
  });

  it('ステータスカラムヘッダーが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('ステータス')).toBeTruthy();
  });
});

// ─── 検索フィルター ───────────────────────────────────────────────────────

describe('DevicesPage - 検索フィルター', () => {
  it('ホスト名でフィルターすると該当デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const searchInput = screen.getByPlaceholderText('ホスト名・IPアドレスで検索...');
    fireEvent.change(searchInput, { target: { value: 'PC-TANAKA' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.queryByText('PC-SATO-002')).toBeNull();
  });

  it('IPアドレスでフィルターすると該当デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const searchInput = screen.getByPlaceholderText('ホスト名・IPアドレスで検索...');
    fireEvent.change(searchInput, { target: { value: '192.168.1.101' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.queryByText('SRV-WEB-001')).toBeNull();
  });

  it('マッチしない検索文字列を入力すると「条件に一致するデバイスがありません」が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const searchInput = screen.getByPlaceholderText('ホスト名・IPアドレスで検索...');
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT-DEVICE-XYZ' } });
    expect(screen.getByText('条件に一致するデバイスがありません')).toBeTruthy();
  });

  it('検索をクリアすると全件表示に戻る', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const searchInput = screen.getByPlaceholderText('ホスト名・IPアドレスで検索...');
    fireEvent.change(searchInput, { target: { value: 'TANAKA' } });
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.getByText('PC-SATO-002')).toBeTruthy();
  });

  it('大文字・小文字を区別せず検索できる', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const searchInput = screen.getByPlaceholderText('ホスト名・IPアドレスで検索...');
    fireEvent.change(searchInput, { target: { value: 'pc-tanaka' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
  });
});

// ─── OS フィルター ────────────────────────────────────────────────────────

describe('DevicesPage - OS フィルター', () => {
  it('Windows フィルターを選択すると Windows デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const osSelect = screen.getByDisplayValue('すべてのOS');
    fireEvent.change(osSelect, { target: { value: 'Windows' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.queryByText('MAC-YAMADA-001')).toBeNull();
    expect(screen.queryByText('SRV-WEB-001')).toBeNull();
  });

  it('macOS フィルターを選択すると macOS デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const osSelect = screen.getByDisplayValue('すべてのOS');
    fireEvent.change(osSelect, { target: { value: 'macOS' } });
    expect(screen.getByText('MAC-YAMADA-001')).toBeTruthy();
    expect(screen.queryByText('PC-TANAKA-001')).toBeNull();
  });

  it('Linux フィルターを選択すると Linux デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const osSelect = screen.getByDisplayValue('すべてのOS');
    fireEvent.change(osSelect, { target: { value: 'Linux' } });
    expect(screen.getByText('SRV-WEB-001')).toBeTruthy();
    expect(screen.getByText('SRV-DB-001')).toBeTruthy();
    expect(screen.queryByText('PC-TANAKA-001')).toBeNull();
  });

  it('Other フィルターを選択すると「条件に一致するデバイスがありません」が表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const osSelect = screen.getByDisplayValue('すべてのOS');
    fireEvent.change(osSelect, { target: { value: 'Other' } });
    expect(screen.getByText('条件に一致するデバイスがありません')).toBeTruthy();
  });

  it('OS フィルターを all に戻すと全件表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const osSelect = screen.getByDisplayValue('すべてのOS');
    fireEvent.change(osSelect, { target: { value: 'Windows' } });
    fireEvent.change(osSelect, { target: { value: 'all' } });
    expect(screen.getByText('MAC-YAMADA-001')).toBeTruthy();
    expect(screen.getByText('SRV-WEB-001')).toBeTruthy();
  });
});

// ─── ステータスフィルター ─────────────────────────────────────────────────

describe('DevicesPage - ステータスフィルター', () => {
  it('online フィルターを選択するとオンラインデバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(statusSelect, { target: { value: 'online' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.queryByText('PC-SUZUKI-003')).toBeNull(); // offline
    expect(screen.queryByText('PC-ITO-004')).toBeNull(); // warning
    expect(screen.queryByText('SRV-DB-001')).toBeNull(); // maintenance
  });

  it('offline フィルターを選択するとオフラインデバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(statusSelect, { target: { value: 'offline' } });
    expect(screen.getByText('PC-SUZUKI-003')).toBeTruthy();
    expect(screen.getByText('PC-KIMURA-006')).toBeTruthy();
    expect(screen.queryByText('PC-TANAKA-001')).toBeNull();
  });

  it('warning フィルターを選択すると要注意デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(statusSelect, { target: { value: 'warning' } });
    expect(screen.getByText('PC-ITO-004')).toBeTruthy();
    expect(screen.getByText('MAC-KOBAYASHI-002')).toBeTruthy();
    expect(screen.queryByText('PC-TANAKA-001')).toBeNull();
  });

  it('maintenance フィルターを選択するとメンテナンスデバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(statusSelect, { target: { value: 'maintenance' } });
    expect(screen.getByText('SRV-DB-001')).toBeTruthy();
    expect(screen.queryByText('PC-TANAKA-001')).toBeNull();
  });
});

// ─── 部門フィルター ───────────────────────────────────────────────────────

describe('DevicesPage - 部門フィルター', () => {
  it('エンジニアリング部門でフィルターすると該当デバイスだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const deptSelect = screen.getByDisplayValue('すべての部門');
    fireEvent.change(deptSelect, { target: { value: 'エンジニアリング' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.getByText('MAC-KOBAYASHI-002')).toBeTruthy();
    expect(screen.queryByText('PC-SATO-002')).toBeNull(); // 営業
  });

  it('インフラ部門でフィルターするとサーバーだけが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const deptSelect = screen.getByDisplayValue('すべての部門');
    fireEvent.change(deptSelect, { target: { value: 'インフラ' } });
    expect(screen.getByText('SRV-WEB-001')).toBeTruthy();
    expect(screen.getByText('SRV-DB-001')).toBeTruthy();
    expect(screen.queryByText('PC-TANAKA-001')).toBeNull();
  });
});

// ─── 複合フィルター ───────────────────────────────────────────────────────

describe('DevicesPage - 複合フィルター', () => {
  it('OS=Linux かつ status=online でフィルターすると SRV-WEB-001 のみが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const osSelect = screen.getByDisplayValue('すべてのOS');
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(osSelect, { target: { value: 'Linux' } });
    fireEvent.change(statusSelect, { target: { value: 'online' } });
    expect(screen.getByText('SRV-WEB-001')).toBeTruthy();
    expect(screen.queryByText('SRV-DB-001')).toBeNull(); // maintenance
  });

  it('検索＋OSフィルターを組み合わせると絞り込まれる', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const searchInput = screen.getByPlaceholderText('ホスト名・IPアドレスで検索...');
    const osSelect = screen.getByDisplayValue('すべてのOS');
    fireEvent.change(osSelect, { target: { value: 'Windows' } });
    fireEvent.change(searchInput, { target: { value: 'TANAKA' } });
    expect(screen.getByText('PC-TANAKA-001')).toBeTruthy();
    expect(screen.queryByText('PC-SATO-002')).toBeNull();
    expect(screen.queryByText('MAC-YAMADA-001')).toBeNull();
  });
});

// ─── リンク ───────────────────────────────────────────────────────────────

describe('DevicesPage - リンク', () => {
  it('ホスト名が詳細ページへのリンクになっている', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const link = screen.getByText('PC-TANAKA-001').closest('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toContain('/dashboard/devices/d001');
  });

  it('SRV-DB-001 の詳細リンクが正しい', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const link = screen.getByText('SRV-DB-001').closest('a');
    expect(link?.getAttribute('href')).toContain('/dashboard/devices/d008');
  });
});

// ─── ページネーション ─────────────────────────────────────────────────────

describe('DevicesPage - ページネーション', () => {
  it('「前へ」ボタンは初期状態で disabled', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const prevButton = screen.getByText('前へ');
    expect(prevButton).toBeTruthy();
    expect((prevButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('「次へ」ボタンが表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText('次へ')).toBeTruthy();
  });

  it('フィルター適用中の件数表示が出る', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    expect(screen.getByText(/フィルター適用中/)).toBeTruthy();
  });

  it('フィルター後の件数が正しく表示される', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    render(<Page />);
    const statusSelect = screen.getByDisplayValue('すべてのステータス');
    fireEvent.change(statusSelect, { target: { value: 'maintenance' } });
    // maintenance device is just SRV-DB-001 → 1件表示
    const pagination = screen.getByText(/フィルター適用中/);
    expect(pagination.textContent).toContain('1');
  });
});

// ─── StatusIndicator dot color ─────────────────────────────────────────────

describe('DevicesPage - ステータスインジケータードット', () => {
  it('オンラインデバイスは bg-green-500 クラスのドットを持つ', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    const { container } = render(<Page />);
    const greenDots = container.querySelectorAll('.bg-green-500');
    expect(greenDots.length).toBeGreaterThan(0);
  });

  it('要注意デバイスは bg-yellow-500 クラスのドットを持つ', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    const { container } = render(<Page />);
    const yellowDots = container.querySelectorAll('.bg-yellow-500');
    expect(yellowDots.length).toBeGreaterThan(0);
  });

  it('メンテナンスデバイスは bg-blue-500 クラスのドットを持つ', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    const { container } = render(<Page />);
    const blueDots = container.querySelectorAll('.bg-blue-500');
    expect(blueDots.length).toBeGreaterThan(0);
  });

  it('オフラインデバイスは bg-gray-400 クラスのドットを持つ', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/page');
    const { container } = render(<Page />);
    const grayDots = container.querySelectorAll('.bg-gray-400');
    expect(grayDots.length).toBeGreaterThan(0);
  });
});
