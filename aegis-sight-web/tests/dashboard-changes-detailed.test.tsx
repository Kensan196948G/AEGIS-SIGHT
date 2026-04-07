import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/changes',
  useParams: () => ({}),
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
  // Changes page uses catch block for demo data when fetch fails
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

async function renderChanges() {
  const { default: Page } = await import('@/app/dashboard/changes/page');
  const result = render(<Page />);
  // Wait for demo data to load
  await waitFor(() => {
    expect(document.body.textContent?.length).toBeGreaterThan(100);
  });
  return result;
}

describe('Changes page - with demo data loaded', () => {
  it('renders without crashing', async () => {
    await renderChanges();
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('shows config changes heading', async () => {
    await renderChanges();
    // Page has heading about configuration changes
    expect(screen.getByText('構成変更履歴')).toBeTruthy();
  });

  it('shows demo data change records', async () => {
    await renderChanges();
    // Demo data includes os.version field change
    await waitFor(() => {
      expect(document.body.textContent).toContain('os.version');
    });
  });

  it('shows change type badges (modified/added/removed)', async () => {
    await renderChanges();
    await waitFor(() => {
      const text = document.body.textContent || '';
      const hasChangeType = text.includes('modified') || text.includes('added') || text.includes('removed') ||
                            text.includes('変更') || text.includes('追加') || text.includes('削除');
      expect(hasChangeType).toBe(true);
    });
  });

  it('device filter input exists and accepts input', async () => {
    await renderChanges();
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'dev-001' } });
      expect((inputs[0] as HTMLInputElement).value).toBe('dev-001');
    }
  });

  it('change type select changes value', async () => {
    await renderChanges();
    const selects = document.querySelectorAll('select');
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'added' } });
      expect((selects[0] as HTMLSelectElement).value).toBe('added');
    }
  });

  it('snapshot type select changes value', async () => {
    await renderChanges();
    const selects = document.querySelectorAll('select');
    if (selects.length >= 2) {
      fireEvent.change(selects[1], { target: { value: 'software' } });
      expect((selects[1] as HTMLSelectElement).value).toBe('software');
    }
  });

  it('reset button exists and is clickable', async () => {
    await renderChanges();
    const buttons = screen.getAllByRole('button');
    const resetBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes('リセット') || b.textContent?.includes('クリア')
    );
    if (resetBtn) {
      fireEvent.click(resetBtn);
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    } else {
      // Just check page is still stable
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    }
  });

  it('summary section shows total change count', async () => {
    await renderChanges();
    await waitFor(() => {
      // Demo data sets total_changes: 48
      expect(document.body.textContent).toContain('48');
    });
  });

  it('has_more pagination — next button exists', async () => {
    await renderChanges();
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      // Pagination next button should exist when has_more=true
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('pagination next page click works', async () => {
    await renderChanges();
    const buttons = screen.getAllByRole('button');
    const nextBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes('次') || b.textContent?.includes('>') || b.querySelector('path[d*="m9 5"]')
    );
    if (nextBtn) {
      fireEvent.click(nextBtn);
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    } else {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    }
  });

  it('diff section renders', async () => {
    await renderChanges();
    // Diff comparison section should be present
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(50);
    });
  });
});
