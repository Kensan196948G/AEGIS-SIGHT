import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// License ID controlled per test
let mockParamsId = '1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => `/dashboard/sam/licenses/${mockParamsId}/aliases`,
  useParams:  () => ({ id: mockParamsId }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/ui/modal', () => ({
  Modal: ({
    children,
    isOpen,
    title,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    title?: string;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        {title && <div data-testid="modal-title">{title}</div>}
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    isOpen,
    onConfirm,
    onCancel,
    title,
    confirmLabel,
    cancelLabel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span data-testid="confirm-title">{title}</span>
        <button data-testid="confirm-ok" onClick={onConfirm}>{confirmLabel ?? '確認'}</button>
        <button data-testid="confirm-cancel" onClick={onCancel}>{cancelLabel ?? 'キャンセル'}</button>
      </div>
    ) : null,
}));

beforeEach(() => {
  mockParamsId = '1';
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// ─── 1. Basic render ──────────────────────────────────────────────────────────

describe('SKU Aliases page - basic render (license id=1)', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows "SKU エイリアス管理" heading', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('SKU エイリアス管理')).toBeTruthy());
  });

  it('shows license name and vendor in subtitle', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Microsoft 365 E3');
    expect(document.body.textContent).toContain('Microsoft');
  });

  it('shows "エイリアスを追加" button', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(screen.getByText('エイリアスを追加')).toBeTruthy();
  });

  it('shows back navigation button', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(screen.getByLabelText('戻る')).toBeTruthy();
  });
});

// ─── 2. Not-found state ───────────────────────────────────────────────────────

describe('SKU Aliases page - unknown license id', () => {
  beforeEach(() => { mockParamsId = '999'; });

  it('shows 404 message for unknown id', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('見つかりません');
  });

  it('still shows a back button when not found', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(screen.getByText('← 戻る')).toBeTruthy();
  });
});

// ─── 3. Alias list (license 1 has 3 aliases) ─────────────────────────────────

describe('SKU Aliases page - alias list', () => {
  it('displays ENTERPRISEPACK alias', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('ENTERPRISEPACK');
  });

  it('displays SPE_E3 alias', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('SPE_E3');
  });

  it('displays MICROSOFT_365_E3 alias', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('MICROSOFT_365_E3');
  });

  it('shows "3 件登録済み" badge', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('3');
  });
});

// ─── 4. Empty alias list (license 2 has no aliases) ──────────────────────────

describe('SKU Aliases page - empty state (license id=2)', () => {
  beforeEach(() => { mockParamsId = '2'; });

  it('shows empty state message', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('SKU エイリアスが未登録です');
  });

  it('shows license name for license 2', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('Adobe Creative Cloud');
  });
});

// ─── 5. Add modal ─────────────────────────────────────────────────────────────

describe('SKU Aliases page - add alias', () => {
  it('opens add modal on button click', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    await waitFor(() => expect(screen.getByTestId('modal')).toBeTruthy());
  });

  it('add modal title is "SKU エイリアスを追加"', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    await waitFor(() => expect(screen.getByTestId('modal-title').textContent).toBe('SKU エイリアスを追加'));
  });

  it('adds a new alias via "追加" button', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    const input = await waitFor(() => screen.getByPlaceholderText('例: ENTERPRISEPACK'));
    fireEvent.change(input, { target: { value: 'NEW_SKU_001' } });
    fireEvent.click(screen.getByText('追加'));
    await waitFor(() => expect(document.body.textContent).toContain('NEW_SKU_001'));
  });

  it('shows error when submitting empty SKU', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    await waitFor(() => screen.getByText('追加'));
    fireEvent.click(screen.getByText('追加'));
    await waitFor(() => expect(document.body.textContent).toContain('SKU Part Number を入力してください'));
  });

  it('shows duplicate error when adding existing SKU', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    const input = await waitFor(() => screen.getByPlaceholderText('例: ENTERPRISEPACK'));
    fireEvent.change(input, { target: { value: 'ENTERPRISEPACK' } });
    fireEvent.click(screen.getByText('追加'));
    await waitFor(() => expect(document.body.textContent).toContain('重複'));
  });

  it('closes add modal on キャンセル click', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    await waitFor(() => screen.getByTestId('modal'));
    fireEvent.click(screen.getByText('キャンセル'));
    await waitFor(() => expect(screen.queryByTestId('modal')).toBeNull());
  });
});

// ─── 6. Edit modal ────────────────────────────────────────────────────────────

describe('SKU Aliases page - edit alias', () => {
  it('opens edit modal on edit button click', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const editBtns = screen.getAllByLabelText('編集');
    fireEvent.click(editBtns[0]);
    await waitFor(() => expect(screen.getByTestId('modal-title').textContent).toBe('SKU エイリアスを編集'));
  });

  it('edit modal is pre-filled with existing SKU', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const editBtns = screen.getAllByLabelText('編集');
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('例: ENTERPRISEPACK') as HTMLInputElement;
      expect(input.value).toBe('ENTERPRISEPACK');
    });
  });

  it('saves updated SKU', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const editBtns = screen.getAllByLabelText('編集');
    fireEvent.click(editBtns[0]);
    const input = await waitFor(() => screen.getByPlaceholderText('例: ENTERPRISEPACK') as HTMLInputElement);
    fireEvent.change(input, { target: { value: 'UPDATED_SKU' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => expect(document.body.textContent).toContain('UPDATED_SKU'));
  });
});

// ─── 7. Delete confirm ────────────────────────────────────────────────────────

describe('SKU Aliases page - delete alias', () => {
  it('opens confirm dialog on delete button click', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const deleteBtns = screen.getAllByLabelText('削除');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toBeTruthy());
  });

  it('confirm dialog title is "SKU エイリアスを削除"', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const deleteBtns = screen.getAllByLabelText('削除');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => expect(screen.getByTestId('confirm-title').textContent).toBe('SKU エイリアスを削除'));
  });

  it('removes alias on confirm', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const beforeCount = screen.getAllByLabelText('削除').length;
    fireEvent.click(screen.getAllByLabelText('削除')[0]);
    await waitFor(() => screen.getByTestId('confirm-dialog'));
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(screen.getAllByLabelText('削除').length).toBe(beforeCount - 1));
  });

  it('cancels delete and keeps alias', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    const beforeCount = screen.getAllByLabelText('削除').length;
    fireEvent.click(screen.getAllByLabelText('削除')[0]);
    await waitFor(() => screen.getByTestId('confirm-dialog'));
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(screen.getAllByLabelText('削除').length).toBe(beforeCount);
  });
});
