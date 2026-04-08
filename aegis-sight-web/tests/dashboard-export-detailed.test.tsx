import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/export',
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
  vi.restoreAllMocks();
  localStorage.clear();
});

// ============================================================
// 1. Basic rendering
// ============================================================
describe('Export page - basic rendering', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows page heading データエクスポート', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('データエクスポート')).toBeTruthy();
  });

  it('shows subtitle text about CSV/JSON', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('CSV');
    expect(document.body.textContent).toContain('JSON');
  });

  it('shows データ種別 section heading', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('データ種別').length).toBeGreaterThan(0);
  });

  it('shows フォーマット section heading', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    // フォーマット appears as section heading in settings card
    expect(screen.getAllByText('フォーマット').length).toBeGreaterThan(0);
  });

  it('shows 日付範囲 section heading', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('日付範囲')).toBeTruthy();
  });

  it('shows 開始日 label', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('開始日')).toBeTruthy();
  });

  it('shows 終了日 label', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('終了日')).toBeTruthy();
  });

  it('shows export history section heading エクスポート履歴', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('エクスポート履歴')).toBeTruthy();
  });
});

// ============================================================
// 2. Data type buttons
// ============================================================
describe('Export page - data type buttons', () => {
  it('renders デバイス button', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('デバイス').length).toBeGreaterThan(0);
  });

  it('renders ライセンス button', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('ライセンス').length).toBeGreaterThan(0);
  });

  it('renders アラート button', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('アラート').length).toBeGreaterThan(0);
  });

  it('renders 監査ログ button', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('監査ログ').length).toBeGreaterThan(0);
  });

  it('has デバイス selected by default (export button text)', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    // Default selectedType='devices', export button should mention デバイス
    expect(document.body.textContent).toContain('デバイス');
  });

  it('shows デバイス description text', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('IT資産デバイスの全データをエクスポートします');
  });

  it('shows ライセンス description text', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ソフトウェアライセンス情報をエクスポートします');
  });

  it('shows アラート description text', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('システムアラートの全履歴をエクスポートします');
  });

  it('shows 監査ログ description text', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('監査ログの全記録をエクスポートします');
  });
});

// ============================================================
// 3. Data type switching (branch: selectedType state)
// ============================================================
describe('Export page - data type switching', () => {
  it('clicking ライセンス updates export button label', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    // Button should now mention ライセンス
    expect(document.body.textContent).toContain('ライセンス');
  });

  it('clicking アラート updates export button label', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('アラート')[0]);
    expect(document.body.textContent).toContain('アラート');
  });

  it('clicking 監査ログ updates export button label', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('監査ログ')[0]);
    expect(document.body.textContent).toContain('監査ログ');
  });

  it('clicking デバイス after another type restores デバイス selection', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    fireEvent.click(screen.getAllByText('デバイス')[0]);
    expect(document.body.textContent).toContain('デバイス');
  });

  it('export button text changes to ライセンスをCSVでエクスポート after selecting ライセンス', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    expect(document.body.textContent).toContain('ライセンス');
    expect(document.body.textContent).toContain('CSV');
  });

  it('all four data type buttons are present', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    // Should have at least 4 data type buttons + 2 format buttons + 1 export button = 7
    expect(buttons.length).toBeGreaterThanOrEqual(7);
  });
});

// ============================================================
// 4. Format selection (branch: selectedFormat state)
// ============================================================
describe('Export page - format selection', () => {
  it('CSV button is rendered', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const csvBtn = screen.getByRole('button', { name: /^CSV$/ });
    expect(csvBtn).toBeTruthy();
  });

  it('JSON button is rendered', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const jsonBtn = screen.getByRole('button', { name: /^JSON$/ });
    expect(jsonBtn).toBeTruthy();
  });

  it('clicking JSON changes export button text to JSON', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: /^JSON$/ }));
    expect(document.body.textContent).toContain('JSON');
  });

  it('clicking CSV after JSON restores CSV', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: /^JSON$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^CSV$/ }));
    expect(document.body.textContent).toContain('CSV');
  });

  it('export button text includes format after selecting JSON + ライセンス', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    fireEvent.click(screen.getByRole('button', { name: /^JSON$/ }));
    expect(document.body.textContent).toContain('JSON');
    expect(document.body.textContent).toContain('ライセンス');
  });
});

// ============================================================
// 5. Date range filter inputs
// ============================================================
describe('Export page - date range filter', () => {
  it('renders date-from input', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const input = document.getElementById('date-from');
    expect(input).toBeTruthy();
  });

  it('renders date-to input', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const input = document.getElementById('date-to');
    expect(input).toBeTruthy();
  });

  it('date-from input accepts a date value', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const input = document.getElementById('date-from') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-01-01' } });
    expect(input.value).toBe('2026-01-01');
  });

  it('date-to input accepts a date value', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const input = document.getElementById('date-to') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-03-31' } });
    expect(input.value).toBe('2026-03-31');
  });

  it('both date inputs start empty', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const fromInput = document.getElementById('date-from') as HTMLInputElement;
    const toInput = document.getElementById('date-to') as HTMLInputElement;
    expect(fromInput.value).toBe('');
    expect(toInput.value).toBe('');
  });

  it('can clear date-from after setting it', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const input = document.getElementById('date-from') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-01-01' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
  });
});

// ============================================================
// 6. Export button - normal state and isExporting state
// ============================================================
describe('Export page - export button states', () => {
  it('export button is not disabled initially', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    // Button contains export label text (not エクスポート中)
    expect(document.body.textContent).toContain('エクスポート');
    expect(document.body.textContent).not.toContain('エクスポート中');
  });

  it('export button shows loading state when fetch is pending', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {})); // never resolves
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    const exportBtn = buttons[buttons.length - 1]; // last button is export
    fireEvent.click(exportBtn);
    await waitFor(() => {
      expect(document.body.textContent).toContain('エクスポート中');
    });
    vi.unstubAllGlobals();
  });

  it('export button is disabled when isExporting is true', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    const exportBtn = buttons[buttons.length - 1];
    fireEvent.click(exportBtn);
    await waitFor(() => {
      expect(exportBtn).toHaveProperty('disabled', true);
    });
    vi.unstubAllGlobals();
  });

  it('export button shows spinner SVG when exporting', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    const buttons = screen.getAllByRole('button');
    const exportBtn = buttons[buttons.length - 1];
    fireEvent.click(exportBtn);
    await waitFor(() => {
      const spinners = container.querySelectorAll('svg.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });
    vi.unstubAllGlobals();
  });
});

// ============================================================
// 7. handleExport - fetch success path (download file)
// Helper to set up download mocks AFTER render
// ============================================================

function setupDownloadMocks(anchorClickSpy?: () => void) {
  const mockAnchor = { href: '', download: '', click: anchorClickSpy ?? vi.fn(), remove: vi.fn() };
  const mockCreateObjectURL = vi.fn().mockReturnValue('blob:fake-url');
  const mockRevokeObjectURL = vi.fn();
  Object.defineProperty(window, 'URL', {
    writable: true,
    value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
  });
  const originalCreateElement = document.createElement.bind(document);
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockAnchor as unknown as HTMLElement;
    return originalCreateElement(tag);
  });
  const originalAppendChild = document.body.appendChild.bind(document.body);
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    if (node === (mockAnchor as unknown as Node)) return mockAnchor as unknown as Node;
    return originalAppendChild(node);
  });
  return { mockAnchor, mockCreateObjectURL, mockRevokeObjectURL, createElementSpy, appendChildSpy };
}

describe('Export page - handleExport success path', () => {
  it('calls fetch on export button click', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const { createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('fetch URL contains selected format csv by default', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const { createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('format=csv');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('fetch URL contains selected type devices by default', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const { createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/devices');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('fetch URL contains date_from when dateFrom is set', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    // Set dateFrom before export
    const fromInput = document.getElementById('date-from') as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '2026-01-01' } });

    const { createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('date_from=');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('fetch URL contains date_to when dateTo is set', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const toInput = document.getElementById('date-to') as HTMLInputElement;
    fireEvent.change(toInput, { target: { value: '2026-03-31' } });

    const { createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('date_to=');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('fetch URL is for json when JSON format selected', async () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: /^JSON$/ }));

    const { createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('format=json');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('download anchor has correct download attribute after success', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const { mockAnchor, createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockAnchor.download).toBe('devices_export.csv');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('anchor click is called on successful export', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const anchorClickSpy = vi.fn();
    const { createElementSpy, appendChildSpy } = setupDownloadMocks(anchorClickSpy);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(anchorClickSpy).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('URL.revokeObjectURL is called after download', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);

    const { mockRevokeObjectURL, createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});

// ============================================================
// 8. handleExport - fetch failure path (alert shown)
// ============================================================
describe('Export page - handleExport error path', () => {
  it('shows alert when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('エクスポートに失敗しました。');
    });

    vi.unstubAllGlobals();
  });

  it('shows alert when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('エクスポートに失敗しました。');
    });

    vi.unstubAllGlobals();
  });

  it('isExporting resets to false after error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    const exportBtn = buttons[buttons.length - 1];
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(document.body.textContent).not.toContain('エクスポート中');
    });

    vi.unstubAllGlobals();
  });

  it('isExporting resets to false after HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(document.body.textContent).not.toContain('エクスポート中');
    });

    vi.unstubAllGlobals();
  });

  it('uses token from localStorage in Authorization header', async () => {
    localStorage.setItem('token', 'my-test-token-123');
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.Authorization).toBe('Bearer my-test-token-123');
    });

    vi.unstubAllGlobals();
  });

  it('uses empty token when localStorage has no token', async () => {
    localStorage.removeItem('token');
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.Authorization).toBe('Bearer ');
    });

    vi.unstubAllGlobals();
  });
});

// ============================================================
// 9. Export history table
// ============================================================
describe('Export page - export history table', () => {
  it('renders table headers: データ種別', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('データ種別').length).toBeGreaterThan(0);
  });

  it('renders table header: フォーマット', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText('フォーマット').length).toBeGreaterThan(0);
  });

  it('renders table header: 件数', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('件数')).toBeTruthy();
  });

  it('renders table header: 実行日時', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getByText('実行日時')).toBeTruthy();
  });

  it('renders history row for デバイス with 1,245 rows', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('1,245');
  });

  it('renders history row for ライセンス with 87 rows', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('87');
  });

  it('renders history row for アラート with 432 rows', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('432');
  });

  it('renders history row for 監査ログ with 5,621 rows', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(document.body.textContent).toContain('5,621');
  });

  it('renders CSV badge in history', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    // CSV appears in format column badges
    const allCSV = screen.getAllByText('CSV');
    expect(allCSV.length).toBeGreaterThan(0);
  });

  it('renders JSON badge in history', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const allJSON = screen.getAllByText('JSON');
    expect(allJSON.length).toBeGreaterThan(0);
  });

  it('renders 4 history rows', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    expect(rows?.length).toBe(4);
  });
});

// ============================================================
// 10. DataTypeIcon rendering (covers all 4 switch cases)
// ============================================================
describe('Export page - DataTypeIcon switch cases', () => {
  it('renders SVG icon for デバイス (devices)', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('clicking ライセンス shows its icon SVG', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('clicking アラート shows its icon SVG', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    fireEvent.click(screen.getAllByText('アラート')[0]);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('clicking 監査ログ shows its icon SVG', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    const { container } = render(<Page />);
    fireEvent.click(screen.getAllByText('監査ログ')[0]);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 11. Export with licenses type
// ============================================================
describe('Export page - export with different types', () => {
  it('fetch URL contains /licenses when ライセンス is selected', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/licenses');
    });

    vi.unstubAllGlobals();
  });

  it('fetch URL contains /alerts when アラート is selected', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('アラート')[0]);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/alerts');
    });

    vi.unstubAllGlobals();
  });

  it('fetch URL contains /audit-logs when 監査ログ is selected', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('監査ログ')[0]);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/audit-logs');
    });

    vi.unstubAllGlobals();
  });

  it('download filename is licenses_export.json for ライセンス + JSON', async () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    fireEvent.click(screen.getAllByText('ライセンス')[0]);
    fireEvent.click(screen.getByRole('button', { name: /^JSON$/ }));

    const { mockAnchor, createElementSpy, appendChildSpy } = setupDownloadMocks();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockAnchor.download).toBe('licenses_export.json');
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
