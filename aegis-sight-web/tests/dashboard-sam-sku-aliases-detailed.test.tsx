import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SamLicense, SamSkuAlias } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sam/licenses/1/aliases',
  useParams:  () => ({ id: '1' }),
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
    loading?: boolean;
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span data-testid="confirm-title">{title}</span>
        <button data-testid="confirm-ok" onClick={onConfirm}>{confirmLabel ?? '確認'}</button>
        <button data-testid="confirm-cancel" onClick={onCancel}>{cancelLabel ?? 'キャンセル'}</button>
      </div>
    ) : null,
}));

// Mock hook with controllable state
const mockAddAlias    = vi.fn();
const mockEditAlias   = vi.fn();
const mockRemoveAlias = vi.fn();
const mockRefetch     = vi.fn();

const MOCK_LICENSE: SamLicense = {
  id: '1', software_name: 'Microsoft 365 E3', vendor: 'Microsoft',
  license_type: 'subscription', license_key: null,
  purchased_count: 500, installed_count: 487, m365_assigned: 0,
  cost_per_unit: 2750, currency: 'JPY',
  purchase_date: null, expiry_date: null,
  vendor_contract_id: null, notes: null,
  created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
};

const INITIAL_ALIASES: SamSkuAlias[] = [
  { id: 'a1', software_license_id: '1', sku_part_number: 'ENTERPRISEPACK',   created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z' },
  { id: 'a2', software_license_id: '1', sku_part_number: 'SPE_E3',           created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { id: 'a3', software_license_id: '1', sku_part_number: 'MICROSOFT_365_E3', created_at: '2026-04-10T00:00:00Z', updated_at: '2026-04-10T00:00:00Z' },
];

let currentAliases = [...INITIAL_ALIASES];

function buildMockHook() {
  mockAddAlias.mockImplementation(async (sku: string) => {
    const newAlias: SamSkuAlias = {
      id: `new-${Date.now()}`, software_license_id: '1',
      sku_part_number: sku,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    currentAliases = [...currentAliases, newAlias];
  });
  mockEditAlias.mockImplementation(async (aliasId: string, sku: string) => {
    currentAliases = currentAliases.map(a =>
      a.id === aliasId ? { ...a, sku_part_number: sku } : a
    );
  });
  mockRemoveAlias.mockImplementation(async (aliasId: string) => {
    currentAliases = currentAliases.filter(a => a.id !== aliasId);
  });
}

vi.mock('@/lib/hooks/use-sam-aliases', () => ({
  useSamAliases: (_id: string) => ({
    license: MOCK_LICENSE,
    aliases: currentAliases,
    loading: false,
    error:   null,
    addAlias:    mockAddAlias,
    editAlias:   mockEditAlias,
    removeAlias: mockRemoveAlias,
    refetch:     mockRefetch,
  }),
}));

beforeEach(() => {
  currentAliases = [...INITIAL_ALIASES];
  buildMockHook();
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

// ─── 2. Alias list ────────────────────────────────────────────────────────────

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

  it('shows "3 件登録済み" count', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    expect(document.body.textContent).toContain('3');
  });
});

// ─── 3. Add modal ─────────────────────────────────────────────────────────────

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

  it('calls addAlias with entered SKU on submit', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getByText('エイリアスを追加'));
    const input = await waitFor(() => screen.getByPlaceholderText('例: ENTERPRISEPACK'));
    fireEvent.change(input, { target: { value: 'NEW_SKU_001' } });
    fireEvent.click(screen.getByText('追加'));
    await waitFor(() => expect(mockAddAlias).toHaveBeenCalledWith('NEW_SKU_001'));
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

// ─── 4. Edit modal ────────────────────────────────────────────────────────────

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
    fireEvent.click(screen.getAllByLabelText('編集')[0]);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('例: ENTERPRISEPACK') as HTMLInputElement;
      expect(input.value).toBe('ENTERPRISEPACK');
    });
  });

  it('calls editAlias with updated SKU on save', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getAllByLabelText('編集')[0]);
    const input = await waitFor(() => screen.getByPlaceholderText('例: ENTERPRISEPACK') as HTMLInputElement);
    fireEvent.change(input, { target: { value: 'UPDATED_SKU' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => expect(mockEditAlias).toHaveBeenCalledWith('a1', 'UPDATED_SKU'));
  });
});

// ─── 5. Delete confirm ────────────────────────────────────────────────────────

describe('SKU Aliases page - delete alias', () => {
  it('opens confirm dialog on delete button click', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getAllByLabelText('削除')[0]);
    await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toBeTruthy());
  });

  it('confirm dialog title is "SKU エイリアスを削除"', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getAllByLabelText('削除')[0]);
    await waitFor(() => expect(screen.getByTestId('confirm-title').textContent).toBe('SKU エイリアスを削除'));
  });

  it('calls removeAlias on confirm', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getAllByLabelText('削除')[0]);
    await waitFor(() => screen.getByTestId('confirm-dialog'));
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(mockRemoveAlias).toHaveBeenCalledWith('a1'));
  });

  it('cancels delete without calling removeAlias', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/[id]/aliases/page');
    render(<Page />);
    fireEvent.click(screen.getAllByLabelText('削除')[0]);
    await waitFor(() => screen.getByTestId('confirm-dialog'));
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(mockRemoveAlias).not.toHaveBeenCalled();
  });
});
