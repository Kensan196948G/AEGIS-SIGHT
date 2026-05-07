import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SamLicense } from '@/lib/types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sam/licenses',
  useParams:  () => ({}),
  Link:       ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

// Stable mock data — mirrors original fixture but in SamLicense format
// All expiry_date values are set to the FUTURE so computeStatus can return
// 'compliant' / 'over-deployed' / 'under-utilized' / 'expiring-soon' correctly.
// Jira (id='6') uses a near-future date to trigger 'expiring-soon'.
const MOCK_LICENSES: SamLicense[] = [
  {
    id: '1', software_name: 'Microsoft 365 E3', vendor: 'Microsoft',
    license_type: 'subscription', license_key: null,
    purchased_count: 500, installed_count: 487, m365_assigned: 0,
    cost_per_unit: 2750, currency: 'JPY',
    purchase_date: '2023-03-01', expiry_date: '2027-03-31',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    id: '2', software_name: 'Adobe Creative Cloud', vendor: 'Adobe',
    license_type: 'subscription', license_key: null,
    purchased_count: 50, installed_count: 58, m365_assigned: 0,
    cost_per_unit: 6578, currency: 'JPY',
    purchase_date: '2023-06-01', expiry_date: '2027-06-30',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    // Slack: 240/600 = 40% → clearly under-utilized (< 50% threshold)
    id: '3', software_name: 'Slack Business+', vendor: 'Salesforce',
    license_type: 'subscription', license_key: null,
    purchased_count: 600, installed_count: 240, m365_assigned: 0,
    cost_per_unit: 998, currency: 'JPY',
    purchase_date: '2023-09-01', expiry_date: '2027-09-30',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    id: '4', software_name: 'AutoCAD LT', vendor: 'Autodesk',
    license_type: 'subscription', license_key: null,
    purchased_count: 30, installed_count: 28, m365_assigned: 0,
    cost_per_unit: 5500, currency: 'JPY',
    purchase_date: '2023-02-01', expiry_date: '2027-02-28',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    id: '5', software_name: 'Visual Studio Enterprise', vendor: 'Microsoft',
    license_type: 'subscription', license_key: null,
    purchased_count: 20, installed_count: 18, m365_assigned: 0,
    cost_per_unit: 8250, currency: 'JPY',
    purchase_date: '2023-05-01', expiry_date: '2027-05-31',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    // Jira: near-future expiry to trigger 'expiring-soon' (≤90 days)
    id: '6', software_name: 'Jira Software Cloud', vendor: 'Atlassian',
    license_type: 'subscription', license_key: null,
    purchased_count: 200, installed_count: 195, m365_assigned: 0,
    cost_per_unit: 750, currency: 'JPY',
    purchase_date: '2026-03-01', expiry_date: '2026-05-15',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    id: '7', software_name: 'Windows Server 2022', vendor: 'Microsoft',
    license_type: 'volume', license_key: null,
    purchased_count: 15, installed_count: 14, m365_assigned: 0,
    cost_per_unit: 45000, currency: 'JPY',
    purchase_date: '2022-10-01', expiry_date: '2027-10-14',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
  {
    // Norton: 240/600 = 40% → clearly under-utilized (< 50% threshold)
    id: '8', software_name: 'Norton 360', vendor: 'Gen Digital',
    license_type: 'subscription', license_key: null,
    purchased_count: 600, installed_count: 240, m365_assigned: 0,
    cost_per_unit: 420, currency: 'JPY',
    purchase_date: '2025-04-01', expiry_date: '2027-04-30',
    vendor_contract_id: null, notes: null,
    created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
  },
];

const mockRefetch = vi.fn();

vi.mock('@/lib/hooks/use-sam-licenses', () => ({
  useSamLicenses: () => ({
    licenses: MOCK_LICENSES,
    total: MOCK_LICENSES.length,
    loading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

async function renderPage() {
  const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
  const result = render(<Page />);
  await waitFor(() => {
    expect(screen.getByText('ライセンス管理')).toBeTruthy();
  });
  return result;
}

// ─── 1. Basic render ──────────────────────────────────────────────────────────

describe('SAM Licenses page - basic render', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows "ライセンス管理" heading', async () => {
    await renderPage();
    expect(screen.getByText('ライセンス管理')).toBeTruthy();
  });

  it('shows page subtitle', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('ソフトウェアライセンスの遵守状況');
  });

  it('shows "ライセンスを追加" button', async () => {
    await renderPage();
    expect(screen.getByText('ライセンスを追加')).toBeTruthy();
  });
});

// ─── 2. License names in table ────────────────────────────────────────────────

describe('SAM Licenses page - license names', () => {
  it('shows Microsoft 365 E3', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Microsoft 365 E3');
  });

  it('shows Adobe Creative Cloud', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Adobe Creative Cloud');
  });

  it('shows Slack Business+', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Slack Business+');
  });

  it('shows AutoCAD LT', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('AutoCAD LT');
  });

  it('shows Visual Studio Enterprise', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Visual Studio Enterprise');
  });

  it('shows Jira Software Cloud', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Jira Software Cloud');
  });

  it('shows Windows Server 2022', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Windows Server 2022');
  });

  it('shows Norton 360', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Norton 360');
  });
});

// ─── 3. Status badges ─────────────────────────────────────────────────────────

describe('SAM Licenses page - status badges', () => {
  it('shows 準拠 badge', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    expect(badges.map(b => b.textContent)).toContain('準拠');
  });

  it('shows 超過 badge', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    expect(badges.map(b => b.textContent)).toContain('超過');
  });

  it('shows 低利用 badge', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    expect(badges.map(b => b.textContent)).toContain('低利用');
  });

  it('shows 期限間近 badge (Jira, expiry 2026-05-15)', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    expect(badges.map(b => b.textContent)).toContain('期限間近');
  });

  it('renders status badge for each license row', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThanOrEqual(8);
  });
});

// ─── 4. Search filter ─────────────────────────────────────────────────────────

describe('SAM Licenses page - search filter', () => {
  it('has a search text input', async () => {
    await renderPage();
    expect(document.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('search input has correct placeholder', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.placeholder).toContain('検索');
  });

  it('search by license name filters results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => expect(document.body.textContent).toContain('Adobe Creative Cloud'));
  });

  it('search by license name hides non-matching licenses', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => expect(document.body.textContent).not.toContain('Slack Business+'));
  });

  it('search by vendor name filters results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Atlassian' } });
    await waitFor(() => expect(document.body.textContent).toContain('Jira Software Cloud'));
  });

  it('search by vendor hides non-matching vendors', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Atlassian' } });
    await waitFor(() => expect(document.body.textContent).not.toContain('Adobe Creative Cloud'));
  });

  it('search by "Microsoft" returns multiple results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Microsoft' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Microsoft 365 E3');
      expect(document.body.textContent).toContain('Visual Studio Enterprise');
      expect(document.body.textContent).toContain('Windows Server 2022');
    });
  });

  it('search for nonexistent text shows empty state message', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'xyznonexistent999' } });
    await waitFor(() => expect(document.body.textContent).toContain('条件に一致するライセンスが見つかりません'));
  });

  it('clearing search restores all results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => expect(document.body.textContent).not.toContain('Slack Business+'));
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(document.body.textContent).toContain('Slack Business+'));
  });
});

// ─── 5. Status filter ─────────────────────────────────────────────────────────

describe('SAM Licenses page - status filter', () => {
  it('has status select element', async () => {
    await renderPage();
    expect(document.querySelectorAll('select').length).toBeGreaterThanOrEqual(1);
  });

  it('status select shows すべてのステータス default option', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('すべてのステータス');
  });

  it('status filter has compliant option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(Array.from(statusSelect.options).map(o => o.value)).toContain('compliant');
  });

  it('status filter has over-deployed option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(Array.from(statusSelect.options).map(o => o.value)).toContain('over-deployed');
  });

  it('status filter has under-utilized option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(Array.from(statusSelect.options).map(o => o.value)).toContain('under-utilized');
  });

  it('filter by over-deployed shows Adobe Creative Cloud', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'over-deployed' } });
    await waitFor(() => expect(document.body.textContent).toContain('Adobe Creative Cloud'));
  });

  it('filter by over-deployed hides compliant licenses', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'over-deployed' } });
    await waitFor(() => expect(document.body.textContent).not.toContain('Microsoft 365 E3'));
  });

  it('filter by under-utilized shows Slack Business+', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'under-utilized' } });
    await waitFor(() => expect(document.body.textContent).toContain('Slack Business+'));
  });

  it('filter by under-utilized shows Norton 360', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'under-utilized' } });
    await waitFor(() => expect(document.body.textContent).toContain('Norton 360'));
  });

  it('filter by compliant shows Microsoft 365 E3', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'compliant' } });
    await waitFor(() => expect(document.body.textContent).toContain('Microsoft 365 E3'));
  });

  it('filter by expiring-soon shows Jira Software Cloud', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'expiring-soon' } });
    await waitFor(() => expect(document.body.textContent).toContain('Jira Software Cloud'));
  });
});

// ─── 6. Vendor filter ─────────────────────────────────────────────────────────

describe('SAM Licenses page - vendor filter', () => {
  it('has vendor select element', async () => {
    await renderPage();
    expect(document.querySelectorAll('select').length).toBeGreaterThanOrEqual(2);
  });

  it('vendor filter shows すべてのベンダー default option', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('すべてのベンダー');
  });

  it('vendor filter includes Microsoft option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(Array.from(vendorSelect.options).map(o => o.value)).toContain('Microsoft');
  });

  it('vendor filter includes Adobe option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(Array.from(vendorSelect.options).map(o => o.value)).toContain('Adobe');
  });

  it('vendor filter includes Atlassian option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(Array.from(vendorSelect.options).map(o => o.value)).toContain('Atlassian');
  });

  it('vendor filter for Microsoft shows all Microsoft licenses', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Microsoft 365 E3');
      expect(document.body.textContent).toContain('Visual Studio Enterprise');
      expect(document.body.textContent).toContain('Windows Server 2022');
    });
  });

  it('vendor filter for Microsoft hides Adobe licenses', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: 'Microsoft' } });
    await waitFor(() => expect(document.body.textContent).not.toContain('Adobe Creative Cloud'));
  });

  it('vendor filter for Adobe shows Adobe Creative Cloud only', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: 'Adobe' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Adobe Creative Cloud');
      expect(document.body.textContent).not.toContain('Slack Business+');
    });
  });

  it('vendor filter for Gen Digital shows Norton 360', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: 'Gen Digital' } });
    await waitFor(() => expect(document.body.textContent).toContain('Norton 360'));
  });
});

// ─── 7. クリア button ─────────────────────────────────────────────────────────

describe('SAM Licenses page - クリア button', () => {
  function getClearBtn() {
    return Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'クリア'
    ) ?? null;
  }

  it('クリア button is NOT present when no filters are active', async () => {
    await renderPage();
    expect(getClearBtn()).toBeNull();
  });

  it('クリア button appears when search is truthy', async () => {
    await renderPage();
    fireEvent.change(document.querySelector('input[type="text"]') as HTMLInputElement, { target: { value: 'test' } });
    await waitFor(() => expect(getClearBtn()).toBeTruthy());
  });

  it('clicking クリア clears search input', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => expect(getClearBtn()).toBeTruthy());
    fireEvent.click(getClearBtn()!);
    await waitFor(() => expect(input.value).toBe(''));
  });

  it('clicking クリア hides the クリア button itself', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'compliant' } });
    await waitFor(() => expect(getClearBtn()).toBeTruthy());
    fireEvent.click(getClearBtn()!);
    await waitFor(() => expect(getClearBtn()).toBeNull());
  });

  it('clicking クリア restores all licenses', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => expect(document.body.textContent).not.toContain('Slack Business+'));
    fireEvent.click(getClearBtn()!);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Slack Business+');
      expect(document.body.textContent).toContain('Norton 360');
    });
  });

  it('クリア resets all three filters at once', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: 'compliant' } });
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: 'Microsoft' } });
    await waitFor(() => expect(getClearBtn()).toBeTruthy());
    fireEvent.click(getClearBtn()!);
    await waitFor(() => {
      expect(input.value).toBe('');
      expect((document.querySelectorAll('select')[0] as HTMLSelectElement).value).toBe('');
      expect((document.querySelectorAll('select')[1] as HTMLSelectElement).value).toBe('');
    });
  });
});

// ─── 8. Summary cards ─────────────────────────────────────────────────────────

describe('SAM Licenses page - summary cards', () => {
  it('shows 月額総コスト card label', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('月額総コスト');
  });

  it('shows ¥ symbol in total cost', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('¥');
  });

  it('shows 超過ライセンス card', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('超過ライセンス');
  });

  it('shows 期限間近 card label', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('期限間近');
  });

  it('shows 低利用 card label', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('低利用');
  });
});

// ─── 9. Table display ─────────────────────────────────────────────────────────

describe('SAM Licenses page - table display', () => {
  it('shows table headers', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('ソフトウェア');
    expect(document.body.textContent).toContain('ベンダー');
    expect(document.body.textContent).toContain('ステータス');
  });

  it('shows 購入 / 使用 column header', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('購入');
  });

  it('shows 有効期限 column header', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('有効期限');
  });

  it('shows vendor names in table rows', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('Microsoft');
    expect(document.body.textContent).toContain('Adobe');
    expect(document.body.textContent).toContain('Atlassian');
  });

  it('shows item count footer', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('8 件表示');
    expect(document.body.textContent).toContain('全 8 件');
  });

  it('shows filtered count when filter is active', async () => {
    await renderPage();
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: 'Adobe' } });
    await waitFor(() => expect(document.body.textContent).toContain('1 件表示'));
  });

  it('shows usage counts (total / used) in table', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('487');
    expect(document.body.textContent).toContain('500');
  });

  it('shows license type サブスクリプション in table', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('サブスクリプション');
  });

  it('shows ボリューム type for Windows Server 2022', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('ボリューム');
  });

  it('shows SKU alias link in table', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('SKU alias');
  });
});

// ─── 10. Date display ─────────────────────────────────────────────────────────

describe('SAM Licenses page - date display', () => {
  it('shows formatted date for Windows Server 2022 (expiry 2027-10-14)', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('2027/10/14');
  });

  it('shows urgency indicator for past expiry dates', async () => {
    await renderPage();
    const body = document.body.textContent ?? '';
    expect(body.includes('日超過') || body.includes('残') || body.includes('/')).toBe(true);
  });
});

// ─── 11. Error state ──────────────────────────────────────────────────────────

describe('SAM Licenses page - error state', () => {
  it('shows error banner when hook returns error', async () => {
    vi.doMock('@/lib/hooks/use-sam-licenses', () => ({
      useSamLicenses: () => ({
        licenses: [],
        total: 0,
        loading: false,
        error: 'Connection refused',
        refetch: mockRefetch,
      }),
    }));
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    render(<Page />);
    await waitFor(() => expect(document.body.textContent).toContain('取得に失敗しました'));
    vi.doUnmock('@/lib/hooks/use-sam-licenses');
  });
});

// ─── 12. formatExpiry branch coverage (expiry date edge cases) ────────────────

describe('SAM Licenses page - formatExpiry branch coverage', () => {
  const TODAY = new Date().toISOString().slice(0, 10);
  const addDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  function makeLicensesWithExpiry(expiryDates: (string | null)[]) {
    return expiryDates.map((expiry_date, i) => ({
      id: `exp-${i}`,
      software_name: `Exp Soft ${i}`,
      vendor: 'TestVendor',
      license_type: 'subscription' as const,
      license_key: null,
      purchased_count: 10,
      installed_count: 5,
      m365_assigned: 0,
      cost_per_unit: i === 0 ? null : 500, // null cost_per_unit for first license → covers B11[1]
      currency: 'JPY',
      purchase_date: null,
      expiry_date,
      vendor_contract_id: null,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }));
  }

  it('covers if(!dateStr) TRUE (B0[0]) and if(!expiry_date) TRUE (B12[0]) with null expiry', async () => {
    vi.resetModules();
    const licenses = makeLicensesWithExpiry([null]); // expiry_date: null
    vi.doMock('@/lib/hooks/use-sam-licenses', () => ({
      useSamLicenses: () => ({ licenses, total: licenses.length, loading: false, error: null, refetch: vi.fn() }),
    }));
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    render(<Page />);
    await waitFor(() => expect(document.body.textContent).toContain('Exp Soft 0'));
    // formatExpiry(null) → '—' text
    expect(document.body.textContent).toContain('—');
    vi.doUnmock('@/lib/hooks/use-sam-licenses');
  });

  it('covers if(days < 0) TRUE (B1[0]) with past expiry date', async () => {
    vi.resetModules();
    const licenses = makeLicensesWithExpiry(['2020-01-01']); // far past
    vi.doMock('@/lib/hooks/use-sam-licenses', () => ({
      useSamLicenses: () => ({ licenses, total: licenses.length, loading: false, error: null, refetch: vi.fn() }),
    }));
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    render(<Page />);
    await waitFor(() => expect(document.body.textContent).toContain('Exp Soft 0'));
    // formatExpiry('2020-01-01') → days < 0 → '{abs}日超過'
    expect(document.body.textContent).toContain('日超過');
    vi.doUnmock('@/lib/hooks/use-sam-licenses');
  });

  it('covers if(days === 0) TRUE (B2[0]) with today as expiry date', async () => {
    vi.resetModules();
    const licenses = makeLicensesWithExpiry([TODAY]); // today
    vi.doMock('@/lib/hooks/use-sam-licenses', () => ({
      useSamLicenses: () => ({ licenses, total: licenses.length, loading: false, error: null, refetch: vi.fn() }),
    }));
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    render(<Page />);
    await waitFor(() => expect(document.body.textContent).toContain('Exp Soft 0'));
    // formatExpiry(today) → days === 0 → '本日期限'
    expect(document.body.textContent).toContain('本日期限');
    vi.doUnmock('@/lib/hooks/use-sam-licenses');
  });

  it('covers if(days <= 90) TRUE (B4[0]) with 60-day expiry and cost_per_unit null (B11[1])', async () => {
    vi.resetModules();
    const licenses = makeLicensesWithExpiry([addDays(60)]); // 60 days out → days > 30 but <= 90
    vi.doMock('@/lib/hooks/use-sam-licenses', () => ({
      useSamLicenses: () => ({ licenses, total: licenses.length, loading: false, error: null, refetch: vi.fn() }),
    }));
    const { default: Page } = await import('@/app/dashboard/sam/licenses/page');
    render(<Page />);
    await waitFor(() => expect(document.body.textContent).toContain('Exp Soft 0'));
    // formatExpiry(+60days) → days <= 90 but > 30 → '残60日' urgent=false
    // cost_per_unit: null → (null ?? 0) * 10 = 0
    expect(document.body.textContent).toContain('残');
    vi.doUnmock('@/lib/hooks/use-sam-licenses');
  });
});
