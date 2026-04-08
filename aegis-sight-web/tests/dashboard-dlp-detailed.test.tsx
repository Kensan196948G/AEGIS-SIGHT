import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} data-classname={className}>{children}</span>
  ),
}));

afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

async function renderPage() {
  const { default: DLPPage } = await import('@/app/dashboard/dlp/page');
  return render(<DLPPage />);
}

async function switchToEvents() {
  await renderPage();
  const matches = screen.getAllByText(/DLPイベント/);
  const eventsButton = matches.find((el) => el.closest('button'))?.closest('button')!;
  fireEvent.click(eventsButton);
}

// ---------------------------------------------------------------------------
// 1. Basic Rendering & Header
// ---------------------------------------------------------------------------

describe('DLP page - basic rendering', () => {
  it('renders page title, subtitle, and action buttons', async () => {
    await renderPage();
    expect(screen.getByText('DLP (情報漏洩防止)')).toBeDefined();
    expect(screen.getByText('ファイル操作監視ルールの管理、DLPイベントの追跡')).toBeDefined();
    expect(screen.getByText('エクスポート')).toBeDefined();
    expect(screen.getByText('ルール作成')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Summary Cards & Charts
// ---------------------------------------------------------------------------

describe('DLP page - summary and charts', () => {
  it('renders all summary stat cards (totalEvents=6, blocked=2, alerted=4, critical)', async () => {
    await renderPage();
    expect(screen.getByText('総イベント数')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
    expect(screen.getAllByText('ブロック').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2')).toBeDefined();
    // "アラート" label in summary (not action badge)
    expect(screen.getByText('4')).toBeDefined();
  });

  it('renders severity breakdown card with all 4 severity levels via severityBadge map', async () => {
    await renderPage();
    expect(screen.getByText('重要度別')).toBeDefined();
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1);
  });

  it('renders donut chart with computed blockRate (33%)', async () => {
    await renderPage();
    const donut = screen.getByTestId('donut-chart');
    // blockRate = Math.round((2 / 6) * 100) = 33
    expect(donut.textContent).toBe('33%');
    expect(screen.getByText('ブロック率')).toBeDefined();
    expect(screen.getByText(/全 6 イベント中 2 件ブロック/)).toBeDefined();
  });

  it('renders bar chart with severity data labels', async () => {
    await renderPage();
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart.textContent).toContain('Critical');
    expect(barChart.textContent).toContain('High');
    expect(barChart.textContent).toContain('Medium');
    expect(barChart.textContent).toContain('Low');
    expect(screen.getByText('重要度別イベント数')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Tab Switching (useState activeTab branch)
// ---------------------------------------------------------------------------

describe('DLP page - tab switching', () => {
  it('shows rules tab as default (activeTab === "rules" branch)', async () => {
    await renderPage();
    expect(screen.getByText('DLPルール一覧')).toBeDefined();
    expect(screen.queryByText('DLPイベント一覧')).toBeNull();
  });

  it('shows blocked badge on events tab when mockSummary.blocked > 0', async () => {
    await renderPage();
    const matches = screen.getAllByText(/DLPイベント/);
    const eventsTab = matches.find((el) => el.closest('button'))?.closest('button');
    expect(eventsTab?.textContent).toContain('2');
  });

  it('switches to events tab and hides rules (activeTab === "events" branch)', async () => {
    await renderPage();
    const matches = screen.getAllByText(/DLPイベント/);
    const eventsButton = matches.find((el) => el.closest('button'))?.closest('button')!;
    fireEvent.click(eventsButton);
    expect(screen.getByText('DLPイベント一覧')).toBeDefined();
    expect(screen.queryByText('DLPルール一覧')).toBeNull();
  });

  it('switches back to rules tab', async () => {
    await renderPage();
    const matches = screen.getAllByText(/DLPイベント/);
    const eventsButton = matches.find((el) => el.closest('button'))?.closest('button')!;
    fireEvent.click(eventsButton);
    const rulesMatches = screen.getAllByText(/DLPルール/);
    const rulesButton = rulesMatches.find((el) => el.closest('button'))?.closest('button')!;
    fireEvent.click(rulesButton);
    expect(screen.getByText('DLPルール一覧')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Rules Table - ruleTypeBadge, actionBadge, severityBadge, is_enabled
// ---------------------------------------------------------------------------

describe('DLP page - rules table branches', () => {
  it('renders all 5 rule names', async () => {
    await renderPage();
    expect(screen.getByText('実行ファイル検出')).toBeDefined();
    expect(screen.getByText('個人情報キーワード検出')).toBeDefined();
    expect(screen.getByText('大容量ファイル転送検出')).toBeDefined();
    expect(screen.getByText('USB パス検出')).toBeDefined();
    expect(screen.getByText('クラウドストレージ監視（無効）')).toBeDefined();
  });

  it('renders rule descriptions (conditional: description !== null branch)', async () => {
    await renderPage();
    // All 5 rules have non-null descriptions
    expect(screen.getByText(/USBや外部メディアへの実行ファイル/)).toBeDefined();
    expect(screen.getByText(/ファイル名やパスに個人情報関連/)).toBeDefined();
    expect(screen.getByText(/100MBを超えるファイル/)).toBeDefined();
    expect(screen.getByText(/USBドライブパスへのファイル操作/)).toBeDefined();
    expect(screen.getByText(/OneDrive\/Dropbox同期フォルダ/)).toBeDefined();
  });

  it('renders all 4 ruleTypeBadge entries: file_extension, content_keyword, size_limit, path_pattern', async () => {
    await renderPage();
    expect(screen.getByText('ファイル拡張子')).toBeDefined();
    expect(screen.getByText('キーワード')).toBeDefined();
    expect(screen.getByText('サイズ制限')).toBeDefined();
    expect(screen.getAllByText('パスパターン').length).toBe(2); // rules 4 & 5
  });

  it('renders actionBadge for rules: alert (3x), block (1x), log (1x)', async () => {
    await renderPage();
    // "アラート" from actionBadge[alert].label (3 rules + summary card)
    expect(screen.getAllByText('アラート').length).toBeGreaterThanOrEqual(3);
    // block action in rules
    const blockBadges = screen.getAllByText('ブロック');
    expect(blockBadges.length).toBeGreaterThanOrEqual(1);
    // log action in rules
    expect(screen.getByText('ログ')).toBeDefined();
  });

  it('renders severityBadge in rules for all 4 levels', async () => {
    await renderPage();
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1);
  });

  it('renders is_enabled=true branch (4 enabled) and is_enabled=false branch (1 disabled)', async () => {
    await renderPage();
    const enabledBadges = screen.getAllByText('有効');
    expect(enabledBadges.length).toBe(4);
    const disabledBadges = screen.getAllByText('無効');
    expect(disabledBadges.length).toBe(1);
  });

  it('renders pattern code and edit/delete buttons for each rule', async () => {
    await renderPage();
    expect(screen.getByText('.exe,.msi,.bat,.cmd,.ps1')).toBeDefined();
    expect(screen.getByText('104857600')).toBeDefined();
    expect(screen.getAllByText('編集').length).toBe(5);
    expect(screen.getAllByText('削除').length).toBe(5);
  });

  it('renders rules table headers', async () => {
    await renderPage();
    expect(screen.getByText('ルール名')).toBeDefined();
    expect(screen.getByText('種別')).toBeDefined();
    expect(screen.getByText('パターン')).toBeDefined();
    expect(screen.getByText('状態')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Events Table - actionTaken badges, formatDate, formatFileSize
// ---------------------------------------------------------------------------

describe('DLP page - events table branches', () => {
  it('renders events table title and subtitle', async () => {
    await switchToEvents();
    expect(screen.getByText('DLPイベント一覧')).toBeDefined();
    expect(screen.getByText('検出されたファイル操作違反イベント')).toBeDefined();
  });

  it('renders all 6 event user names', async () => {
    await switchToEvents();
    expect(screen.getByText('tanaka.taro')).toBeDefined();
    expect(screen.getByText('suzuki.hanako')).toBeDefined();
    expect(screen.getByText('yamada.ichiro')).toBeDefined();
    expect(screen.getByText('sato.yuki')).toBeDefined();
    expect(screen.getByText('kobayashi.mei')).toBeDefined();
    expect(screen.getByText('watanabe.ken')).toBeDefined();
  });

  it('renders file names and paths for events', async () => {
    await switchToEvents();
    expect(screen.getByText('個人情報一覧.xlsx')).toBeDefined();
    expect(screen.getByText('installer.exe')).toBeDefined();
    expect(screen.getByText('database_dump.sql')).toBeDefined();
    expect(screen.getByText('quarterly_report.docx')).toBeDefined();
  });

  it('renders actionBadge for actionTaken: blocked (2x) and alerted (4x)', async () => {
    await switchToEvents();
    expect(screen.getAllByText('ブロック済').length).toBe(2);
    expect(screen.getAllByText('アラート済').length).toBe(4);
  });

  it('renders severity badges in events: critical (2), high (3), medium (1)', async () => {
    await switchToEvents();
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1);
  });

  it('renders formatFileSize with KB and MB ranges', async () => {
    await switchToEvents();
    // 512000 => 500.0 KB (KB branch)
    expect(screen.getByText('500.0 KB')).toBeDefined();
    // 2048000 => ~2.0 MB, 52428800 => 50.0 MB, etc. (MB branch)
    expect(screen.getByText('2.0 MB')).toBeDefined();
    expect(screen.getByText('50.0 MB')).toBeDefined();
    expect(screen.getByText('500.0 MB')).toBeDefined();
    expect(screen.getByText('1.0 MB')).toBeDefined();
    expect(screen.getByText('15.0 MB')).toBeDefined();
  });

  it('renders formatted dates via formatDate helper (ja-JP locale)', async () => {
    await switchToEvents();
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.textContent).toContain('2026');
  });

  it('renders event rule names in events table', async () => {
    await switchToEvents();
    expect(screen.getAllByText('個人情報キーワード検出').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('実行ファイル検出').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('大容量ファイル転送検出')).toBeDefined();
    expect(screen.getByText('USB パス検出')).toBeDefined();
  });

  it('renders events table headers', async () => {
    await switchToEvents();
    expect(screen.getByText('検出日時')).toBeDefined();
    expect(screen.getByText('ユーザー')).toBeDefined();
    expect(screen.getByText('ファイル')).toBeDefined();
    expect(screen.getByText('サイズ')).toBeDefined();
    expect(screen.getByText('ルール')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Create Rule Modal (showCreateModal useState, newRule state, pattern hints)
// ---------------------------------------------------------------------------

describe('DLP page - create rule modal', () => {
  it('does not show modal by default (showCreateModal=false)', async () => {
    await renderPage();
    expect(screen.queryByText('新規DLPルール作成')).toBeNull();
  });

  it('opens modal when clicking ルール作成 (showCreateModal=true)', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));
    expect(screen.getByText('新規DLPルール作成')).toBeDefined();
    expect(screen.getByPlaceholderText('例: 実行ファイル検出')).toBeDefined();
  });

  it('shows pattern hint for file_extension by default, then switches for each rule_type', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));
    // Default: file_extension hint
    expect(screen.getByText('カンマ区切りの拡張子 (例: .exe,.msi)')).toBeDefined();

    const ruleTypeSelect = screen.getByDisplayValue('file_extension');

    // path_pattern hint
    fireEvent.change(ruleTypeSelect, { target: { value: 'path_pattern' } });
    expect(screen.getByText(/glob\/正規表現パターン/)).toBeDefined();

    // content_keyword hint
    fireEvent.change(ruleTypeSelect, { target: { value: 'content_keyword' } });
    expect(screen.getByText('カンマ区切りのキーワード')).toBeDefined();

    // size_limit hint
    fireEvent.change(ruleTypeSelect, { target: { value: 'size_limit' } });
    expect(screen.getByText(/最大サイズ.*バイト/)).toBeDefined();
  });

  it('closes modal via cancel button', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));
    fireEvent.click(screen.getByText('キャンセル'));
    expect(screen.queryByText('新規DLPルール作成')).toBeNull();
  });

  it('closes modal via close (X) button', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));
    const closeButton = screen.getByText('新規DLPルール作成').closest('div')!.querySelector('button')!;
    fireEvent.click(closeButton);
    expect(screen.queryByText('新規DLPルール作成')).toBeNull();
  });

  it('closes modal via submit (作成) button', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));
    fireEvent.click(screen.getByText('作成'));
    expect(screen.queryByText('新規DLPルール作成')).toBeNull();
  });

  it('updates all newRule state fields via form inputs', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));

    // name input
    const nameInput = screen.getByPlaceholderText('例: 実行ファイル検出') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'テストルール' } });
    expect(nameInput.value).toBe('テストルール');

    // description textarea
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'テスト説明' } });
    expect(textarea.value).toBe('テスト説明');

    // action select
    const actionSelect = screen.getByDisplayValue('alert') as HTMLSelectElement;
    fireEvent.change(actionSelect, { target: { value: 'block' } });
    expect(actionSelect.value).toBe('block');

    // severity select
    const severitySelect = screen.getByDisplayValue('medium') as HTMLSelectElement;
    fireEvent.change(severitySelect, { target: { value: 'critical' } });
    expect(severitySelect.value).toBe('critical');

    // pattern input
    const patternInput = screen.getByPlaceholderText('例: .exe,.msi,.bat') as HTMLInputElement;
    fireEvent.change(patternInput, { target: { value: '.zip,.rar' } });
    expect(patternInput.value).toBe('.zip,.rar');

    // is_enabled checkbox
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('modal has correct number of select options (action=3, severity=4, ruleType=4)', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('ルール作成'));
    const actionSelect = screen.getByDisplayValue('alert') as HTMLSelectElement;
    expect(actionSelect.options.length).toBe(3);
    const severitySelect = screen.getByDisplayValue('medium') as HTMLSelectElement;
    expect(severitySelect.options.length).toBe(4);
    const ruleTypeSelect = screen.getByDisplayValue('file_extension') as HTMLSelectElement;
    expect(ruleTypeSelect.options.length).toBe(4);
  });
});
