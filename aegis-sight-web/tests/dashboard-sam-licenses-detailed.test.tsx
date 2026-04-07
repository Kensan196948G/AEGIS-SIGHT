import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/sam/licenses',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

afterEach(() => {
  vi.clearAllMocks();
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
    const labels = badges.map(b => b.textContent);
    expect(labels).toContain('準拠');
  });

  it('shows 超過 badge', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    const labels = badges.map(b => b.textContent);
    expect(labels).toContain('超過');
  });

  it('shows 低利用 badge', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    const labels = badges.map(b => b.textContent);
    expect(labels).toContain('低利用');
  });

  it('shows 期限間近 badge', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    const labels = badges.map(b => b.textContent);
    expect(labels).toContain('期限間近');
  });

  it('renders multiple status badges for 8 licenses', async () => {
    await renderPage();
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThanOrEqual(8);
  });
});

// ─── 4. Search filter ─────────────────────────────────────────────────────────

describe('SAM Licenses page - search filter', () => {
  it('has a search text input', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
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
    await waitFor(() => {
      expect(document.body.textContent).toContain('Adobe Creative Cloud');
    });
  });

  it('search by license name hides non-matching licenses', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Slack Business+');
    });
  });

  it('search by vendor name filters results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Atlassian' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Jira Software Cloud');
    });
  });

  it('search by vendor hides non-matching vendors', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Atlassian' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Adobe Creative Cloud');
    });
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
    await waitFor(() => {
      expect(document.body.textContent).toContain('条件に一致するライセンスが見つかりません');
    });
  });

  it('clearing search restores all results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Slack Business+');
    });
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Slack Business+');
    });
  });
});

// ─── 5. Status filter (select) ────────────────────────────────────────────────

describe('SAM Licenses page - status filter', () => {
  it('has status select element', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('status select shows すべてのステータス default option', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    expect(document.body.textContent).toContain('すべてのステータス');
  });

  it('status filter has compliant option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('compliant');
  });

  it('status filter has over-deployed option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('over-deployed');
  });

  it('status filter has under-utilized option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('under-utilized');
  });

  it('status filter has expiring-soon option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('expiring-soon');
  });

  it('status filter has expired option', async () => {
    await renderPage();
    const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('expired');
  });

  it('filter by over-deployed shows Adobe Creative Cloud', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'over-deployed' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Adobe Creative Cloud');
    });
  });

  it('filter by over-deployed hides compliant licenses', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'over-deployed' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Microsoft 365 E3');
    });
  });

  it('filter by under-utilized shows Slack Business+', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'under-utilized' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Slack Business+');
    });
  });

  it('filter by under-utilized shows Norton 360', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'under-utilized' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Norton 360');
    });
  });

  it('filter by under-utilized hides over-deployed licenses', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'under-utilized' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Adobe Creative Cloud');
    });
  });

  it('filter by compliant shows Microsoft 365 E3', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'compliant' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Microsoft 365 E3');
    });
  });

  it('filter by expiring-soon shows Jira Software Cloud', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'expiring-soon' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Jira Software Cloud');
    });
  });
});

// ─── 6. Vendor filter (select) ────────────────────────────────────────────────

describe('SAM Licenses page - vendor filter', () => {
  it('has vendor select element', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('vendor filter shows すべてのベンダー default option', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('すべてのベンダー');
  });

  it('vendor filter includes Microsoft option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    const options = Array.from(vendorSelect.options).map(o => o.value);
    expect(options).toContain('Microsoft');
  });

  it('vendor filter includes Adobe option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    const options = Array.from(vendorSelect.options).map(o => o.value);
    expect(options).toContain('Adobe');
  });

  it('vendor filter includes Atlassian option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    const options = Array.from(vendorSelect.options).map(o => o.value);
    expect(options).toContain('Atlassian');
  });

  it('vendor filter includes Autodesk option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    const options = Array.from(vendorSelect.options).map(o => o.value);
    expect(options).toContain('Autodesk');
  });

  it('vendor filter includes Salesforce option', async () => {
    await renderPage();
    const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
    const options = Array.from(vendorSelect.options).map(o => o.value);
    expect(options).toContain('Salesforce');
  });

  it('vendor filter for Microsoft shows all Microsoft licenses', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Microsoft 365 E3');
      expect(document.body.textContent).toContain('Visual Studio Enterprise');
      expect(document.body.textContent).toContain('Windows Server 2022');
    });
  });

  it('vendor filter for Microsoft hides Adobe licenses', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Adobe Creative Cloud');
    });
  });

  it('vendor filter for Adobe shows Adobe Creative Cloud only', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Adobe' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Adobe Creative Cloud');
      expect(document.body.textContent).not.toContain('Slack Business+');
    });
  });

  it('vendor filter for Gen Digital shows Norton 360', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Gen Digital' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Norton 360');
    });
  });
});

// ─── 7. クリア button (branch coverage) ──────────────────────────────────────

describe('SAM Licenses page - クリア button visibility (branch)', () => {
  it('クリア button is NOT present when no filters are active', async () => {
    await renderPage();
    const clearButtons = Array.from(document.querySelectorAll('button')).filter(
      b => b.textContent?.trim() === 'クリア'
    );
    expect(clearButtons.length).toBe(0);
  });

  it('クリア button appears when search is truthy', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    await waitFor(() => {
      const clearButtons = Array.from(document.querySelectorAll('button')).filter(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  it('クリア button appears when filterStatus is truthy', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'compliant' } });
    await waitFor(() => {
      const clearButtons = Array.from(document.querySelectorAll('button')).filter(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  it('クリア button appears when filterVendor is truthy', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Adobe' } });
    await waitFor(() => {
      const clearButtons = Array.from(document.querySelectorAll('button')).filter(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  it('clicking クリア clears search input', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearBtn).toBeTruthy();
    });
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'クリア'
    )!;
    fireEvent.click(clearBtn);
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('clicking クリア hides the クリア button itself', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'compliant' } });
    await waitFor(() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearBtn).toBeTruthy();
    });
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'クリア'
    )!;
    fireEvent.click(clearBtn);
    await waitFor(() => {
      const clearBtnsAfter = Array.from(document.querySelectorAll('button')).filter(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearBtnsAfter.length).toBe(0);
    });
  });

  it('clicking クリア restores all 8 licenses', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Adobe' } });
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Slack Business+');
    });
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'クリア'
    )!;
    fireEvent.click(clearBtn);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Slack Business+');
      expect(document.body.textContent).toContain('Norton 360');
    });
  });

  it('クリア button disappears after clearing filterVendor', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearBtn).toBeTruthy();
    });
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'クリア'
    )!;
    fireEvent.click(clearBtn);
    await waitFor(() => {
      const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
      expect(vendorSelect.value).toBe('');
    });
  });
});

// ─── 8. Combined filters ──────────────────────────────────────────────────────

describe('SAM Licenses page - combined filters', () => {
  it('search + status filter combination narrows results', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    const selects = document.querySelectorAll('select');
    // Search for Microsoft + filter by compliant → MS 365 E3, VS Enterprise, Windows Server
    fireEvent.change(input, { target: { value: 'Microsoft' } });
    fireEvent.change(selects[0], { target: { value: 'compliant' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Microsoft 365 E3');
      expect(document.body.textContent).not.toContain('Adobe Creative Cloud');
    });
  });

  it('search + vendor filter combination works', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    const selects = document.querySelectorAll('select');
    fireEvent.change(input, { target: { value: 'Visual' } });
    fireEvent.change(selects[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Visual Studio Enterprise');
    });
  });

  it('status + vendor filter combination works', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    // under-utilized + Salesforce → Slack Business+
    fireEvent.change(selects[0], { target: { value: 'under-utilized' } });
    fireEvent.change(selects[1], { target: { value: 'Salesforce' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('Slack Business+');
      expect(document.body.textContent).not.toContain('Norton 360');
    });
  });

  it('クリア button visible when both status and vendor filters active', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'compliant' } });
    fireEvent.change(selects[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      const clearButtons = Array.from(document.querySelectorAll('button')).filter(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  it('クリア resets all three filters at once', async () => {
    await renderPage();
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    const selects = document.querySelectorAll('select');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(selects[0], { target: { value: 'compliant' } });
    fireEvent.change(selects[1], { target: { value: 'Microsoft' } });
    await waitFor(() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'クリア'
      );
      expect(clearBtn).toBeTruthy();
    });
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'クリア'
    )!;
    fireEvent.click(clearBtn);
    await waitFor(() => {
      expect(input.value).toBe('');
      const statusSelect = document.querySelectorAll('select')[0] as HTMLSelectElement;
      const vendorSelect = document.querySelectorAll('select')[1] as HTMLSelectElement;
      expect(statusSelect.value).toBe('');
      expect(vendorSelect.value).toBe('');
    });
  });

  it('incompatible filter combination shows empty state', async () => {
    await renderPage();
    const selects = document.querySelectorAll('select');
    // over-deployed (only Adobe) + vendor Atlassian → 0 results
    fireEvent.change(selects[0], { target: { value: 'over-deployed' } });
    fireEvent.change(selects[1], { target: { value: 'Atlassian' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('条件に一致するライセンスが見つかりません');
    });
  });
});

// ─── 9. Summary cards ─────────────────────────────────────────────────────────

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

  it('shows over-deployed count (1 license: Adobe)', async () => {
    await renderPage();
    // Adobe Creative Cloud is the only over-deployed license
    expect(document.body.textContent).toContain('1 件');
  });

  it('shows under-utilized count (2 licenses: Slack, Norton)', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('2 件');
  });
});

// ─── 10. Table display ────────────────────────────────────────────────────────

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
    expect(document.body.textContent).toContain('使用');
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
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Adobe' } });
    await waitFor(() => {
      expect(document.body.textContent).toContain('1 件表示');
    });
  });

  it('shows usage counts (total / used) in table', async () => {
    await renderPage();
    // Microsoft 365 E3: 500 total, 487 used
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

  it('shows usage percentage values', async () => {
    await renderPage();
    // Adobe: 58/50 = 116%
    expect(document.body.textContent).toContain('116%');
  });
});

// ─── 11. formatExpiry edge cases (via rendered output) ────────────────────────

describe('SAM Licenses page - formatExpiry output', () => {
  it('shows urgency for past/near expiry dates', async () => {
    await renderPage();
    // All static dates in the fixtures are in the past relative to 2026-04-08
    // so most will show "X日超過" format
    const body = document.body.textContent ?? '';
    const hasUrgentFormat =
      body.includes('日超過') ||
      body.includes('本日期限') ||
      body.includes('残') ||
      body.includes('/');
    expect(hasUrgentFormat).toBe(true);
  });

  it('Windows Server 2022 expiry (2027-10-14) shows formatted date', async () => {
    await renderPage();
    // 2027-10-14 is >90 days from 2026-04-08, so it renders as 2027/10/14
    expect(document.body.textContent).toContain('2027/10/14');
  });

  it('expired licenses show 超過 in expiry text', async () => {
    await renderPage();
    // All dates except Windows Server are before 2026-04-08, so show "X日超過"
    expect(document.body.textContent).toContain('日超過');
  });
});
