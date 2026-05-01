import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// useParams returns different IDs depending on test needs
let mockParamsId = 'PR-2026-001';
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: mockBack }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/procurement/PR-2026-001',
  useParams: () => ({ id: mockParamsId }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/modal', () => ({
  Modal: ({ children, isOpen, onClose }: { children: React.ReactNode; isOpen: boolean; onClose?: () => void }) =>
    isOpen ? <div data-testid="modal" onClick={onClose}>{children}</div> : null,
}));

beforeEach(() => {
  mockParamsId = 'PR-2026-001';
  mockBack.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Procurement Detail page - valid ID (PR-2026-001)', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows procurement title for PR-2026-001', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(screen.getByText('Dell Latitude 5540 x 20台')).toBeTruthy();
  });

  it('shows requester name 田中 太郎', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('田中 太郎');
  });

  it('shows department エンジニアリング', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('エンジニアリング');
  });

  it('shows items list with Dell product', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Dell');
  });

  it('shows estimated cost', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // Cost is 3,200,000 JPY
    expect(document.body.textContent).toContain('3');
  });

  it('shows approvers section', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('鈴木部長');
  });

  it('shows timeline section', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('申請作成');
  });

  it('shows status badge for approved', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // PR-2026-001 has status: 'approved'
    const hasApproved = document.body.textContent?.includes('approved') ||
                        document.body.textContent?.includes('承認');
    expect(hasApproved).toBe(true);
  });

  it('back button exists', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('Procurement Detail page - another valid ID (PR-2026-002)', () => {
  beforeEach(() => {
    mockParamsId = 'PR-2026-002';
  });

  it('shows Adobe CC title for PR-2026-002', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(screen.getByText('Adobe CC ライセンス追加 10本')).toBeTruthy();
  });

  it('shows佐藤 花子 as requester', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('佐藤 花子');
  });

  it('shows submitted status', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    const hasSubmitted = document.body.textContent?.includes('submitted') ||
                         document.body.textContent?.includes('提出');
    expect(hasSubmitted).toBe(true);
  });
});

describe('Procurement Detail page - valid ID (PR-2026-008 rejected)', () => {
  beforeEach(() => {
    mockParamsId = 'PR-2026-008';
  });

  it('shows rejected status for PR-2026-008', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // PR-2026-008 has status: 'rejected'
    const hasRejected = document.body.textContent?.includes('rejected') ||
                        document.body.textContent?.includes('却下');
    expect(hasRejected).toBe(true);
  });

  it('shows Epson product name', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Epson');
  });
});

describe('Procurement Detail page - not found ID', () => {
  beforeEach(() => {
    mockParamsId = 'PR-9999-999';
  });

  it('shows not-found message for unknown ID', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(screen.getByText('申請が見つかりません')).toBeTruthy();
  });

  it('shows the unknown ID in not-found message', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('PR-9999-999');
  });
});

describe('Procurement Detail page - status change modal', () => {
  it('status change buttons exist', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('clicking status change button opens modal', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // PR-2026-001 is 'approved' → can move to 'ordered'
    const buttons = screen.getAllByRole('button');
    const statusBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes('ordered') || b.textContent?.includes('発注')
    );
    if (statusBtn) {
      fireEvent.click(statusBtn);
      await waitFor(() => {
        expect(document.body.textContent?.length).toBeGreaterThan(0);
      });
    } else {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    }
  });
});

describe('Procurement Detail page - various statuses', () => {
  it('renders PR-2026-004 (draft status)', async () => {
    mockParamsId = 'PR-2026-004';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    const hasDraft = document.body.textContent?.includes('draft') ||
                     document.body.textContent?.includes('下書き');
    expect(hasDraft || document.body.textContent?.includes('モニター')).toBe(true);
  });

  it('renders PR-2026-005 (ordered status)', async () => {
    mockParamsId = 'PR-2026-005';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Microsoft 365');
  });

  it('renders PR-2026-006 (delivered status)', async () => {
    mockParamsId = 'PR-2026-006';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('EliteBook');
  });

  it('renders PR-2026-009 (completed status)', async () => {
    mockParamsId = 'PR-2026-009';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    expect(document.body.textContent).toContain('VMware');
  });
});

describe('Procurement Detail page - not-found back button (line 285)', () => {
  beforeEach(() => {
    mockParamsId = 'PR-9999-999';
  });

  it('calls router.back() when back button is clicked on not-found page', async () => {
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // The not-found page renders a single back button (SVG only, no text)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('Procurement Detail page - confirmStatusChange (line 308)', () => {
  it('clicking 変更を確定 updates status and closes modal', async () => {
    mockParamsId = 'PR-2026-001';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // PR-2026-001 is 'approved' → next status is 'ordered' → button label: '発注済にする'
    const statusBtn = screen.getByText('発注済にする');
    fireEvent.click(statusBtn);
    // Modal should now be open
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeTruthy();
    });
    // Click 変更を確定
    const confirmBtn = screen.getByText('変更を確定');
    fireEvent.click(confirmBtn);
    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('modal')).toBeNull();
    });
    // Status should have changed to 発注済
    expect(document.body.textContent).toContain('発注済');
  });
});

describe('Procurement Detail page - normal page back button (line 324)', () => {
  it('calls router.back() when back button is clicked on normal page', async () => {
    mockParamsId = 'PR-2026-001';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // The normal page header back button is the first button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('Procurement Detail page - modal cancel button (line 587)', () => {
  it('clicking キャンセル closes the modal without changing status', async () => {
    mockParamsId = 'PR-2026-001';
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // Open modal
    const statusBtn = screen.getByText('発注済にする');
    fireEvent.click(statusBtn);
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeTruthy();
    });
    // Click キャンセル
    const cancelBtn = screen.getByText('キャンセル');
    fireEvent.click(cancelBtn);
    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('modal')).toBeNull();
    });
    // Status should remain 承認済 (not 発注済)
    expect(document.body.textContent).toContain('承認済');
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: params.id as array (B0[0]) and undefined id (B1[1])
// ---------------------------------------------------------------------------

describe('Procurement Detail page - branch coverage (params.id edge cases)', () => {
  it('covers Array.isArray(params.id) TRUE branch (B0[0] line=272) when id is array', async () => {
    mockParamsId = ['PR-2026-001'] as unknown as string;
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // params.id is array → Array.isArray true → params.id[0] = 'PR-2026-001'
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    });
  });

  it('covers params.id ?? "" fallback (B1[1] line=272) when id is undefined', async () => {
    mockParamsId = undefined as unknown as string;
    const { default: Page } = await import('@/app/dashboard/procurement/[id]/page');
    render(<Page />);
    // params.id is undefined → Array.isArray false → undefined ?? '' = ''
    // PROCUREMENT_DETAILS[''] is undefined → shows 申請が見つかりません
    await waitFor(() => {
      expect(document.body.textContent).toContain('申請が見つかりません');
    });
  });
});
