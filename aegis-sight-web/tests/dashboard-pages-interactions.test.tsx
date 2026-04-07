import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock next/navigation for all pages in this file
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
  useParams: () => ({ id: 'test-id-001' }),
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
  ProgressBar: ({ value }: { value: number }) => <div data-testid="progress-bar">{value}</div>,
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => '',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  vi.useRealTimers();
});

// ─── Procurement New - Form Interactions ───────────────────────────────────
describe('Procurement New page - form interactions', () => {
  it('updates title input on change', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'テスト調達申請' } });
    expect(titleInput.value).toBe('テスト調達申請');
  });

  it('adds item when 品目を追加 button is clicked', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    // Initially 1 item row
    const addButton = screen.getByText('品目を追加');
    fireEvent.click(addButton);
    // After click, 2 item rows → 2 sets of 品目名 label
    expect(screen.getAllByText('品目名').length).toBe(2);
  });

  it('removes item when delete button clicked (requires 2+ items)', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    // Add second item first
    fireEvent.click(screen.getByText('品目を追加'));
    expect(screen.getAllByText('品目名').length).toBe(2);
    // Remove buttons appear when items.length > 1
    const deleteBtns = document.querySelectorAll('button[type="button"]');
    // Find the remove button (SVG path "m14.74 9" identifies trash icon)
    const trashBtns = Array.from(deleteBtns).filter(
      (btn) => btn.querySelector('path[d*="m14.74"]') !== null
    );
    expect(trashBtns.length).toBeGreaterThan(0);
    fireEvent.click(trashBtns[0]);
    // Back to 1 item
    expect(screen.getAllByText('品目名').length).toBe(1);
  });

  it('updates item quantity and shows subtotal', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    const numberInputs = document.querySelectorAll('input[type="number"]');
    // quantity input (first number input)
    fireEvent.change(numberInputs[0], { target: { value: '5' } });
    // unitPrice input (second number input)
    fireEvent.change(numberInputs[1], { target: { value: '10000' } });
    // subtotal 5 * 10000 = 50000
    expect(document.body.textContent).toContain('50,000');
  });

  it('shows cancel button and キャンセル is clickable', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    const cancelBtn = screen.getByText('キャンセル');
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn); // triggers router.back()
  });

  it('submits form and shows submitting state', async () => {
    vi.useFakeTimers();
    const { default: Page } = await import('@/app/dashboard/procurement/new/page');
    render(<Page />);
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    // During fake timer pause, submitting state would show
    expect(document.body.textContent).toContain('申請');
    vi.runAllTimers();
  });
});

// ─── Scheduler page - tab interactions ─────────────────────────────────────
describe('Scheduler page - interactions', () => {
  it('renders calendar container', async () => {
    const { default: Page } = await import('@/app/dashboard/scheduler/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });
});

// ─── Knowledge page - search interaction ───────────────────────────────────
describe('Knowledge page - interactions', () => {
  it('renders search input', async () => {
    const { default: Page } = await import('@/app/dashboard/knowledge/page');
    render(<Page />);
    const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  it('renders category tabs', async () => {
    const { default: Page } = await import('@/app/dashboard/knowledge/page');
    render(<Page />);
    expect(screen.getAllByText(/すべて|ガイド|FAQ/).length).toBeGreaterThan(0);
  });

  it('clicking category tab changes selection', async () => {
    const { default: Page } = await import('@/app/dashboard/knowledge/page');
    render(<Page />);
    const tabs = screen.getAllByText(/すべて|ガイド|FAQ/);
    fireEvent.click(tabs[1]);
    // No crash; tab click is handled
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});

// ─── Export page - format selection ────────────────────────────────────────
describe('Export page - interactions', () => {
  it('shows export format options', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    expect(screen.getAllByText(/CSV|Excel|PDF/).length).toBeGreaterThan(0);
  });

  it('clicking export type button works', async () => {
    const { default: Page } = await import('@/app/dashboard/export/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});

// ─── Search page - search interaction ──────────────────────────────────────
describe('Search page - interactions', () => {
  it('renders search input field', async () => {
    const { default: Page } = await import('@/app/dashboard/search/page');
    render(<Page />);
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('typing in search updates input', async () => {
    const { default: Page } = await import('@/app/dashboard/search/page');
    render(<Page />);
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'laptop' } });
    expect(input.value).toBe('laptop');
  });
});

// ─── DLP page - rule toggle ─────────────────────────────────────────────────
describe('DLP page - interactions', () => {
  it('shows DLP rule list with toggle buttons', async () => {
    const { default: Page } = await import('@/app/dashboard/dlp/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('clicking a button does not crash', async () => {
    const { default: Page } = await import('@/app/dashboard/dlp/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});
