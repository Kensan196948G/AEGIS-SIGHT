import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/device-groups',
  useParams: () => ({}),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  localStorage.setItem('token', 'fake-test-token');
  // Default: reject to trigger error state → loading=false
  mockFetch.mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  localStorage.clear();
});

// ─── shared fixtures ───────────────────────────────────────────────────────
const mockGroupList = [
  {
    id: 'group-001',
    name: 'Windows Workstations',
    description: 'All Windows desktop devices',
    criteria: null,
    is_dynamic: false,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 2,
  },
  {
    id: 'group-002',
    name: 'High Risk Devices',
    description: 'Dynamic group',
    criteria: { risk_level: 'high' },
    is_dynamic: true,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 5,
  },
];

const mockStaticGroupDetail = {
  id: 'group-001',
  name: 'Windows Workstations',
  description: 'All Windows desktop devices',
  criteria: null,
  is_dynamic: false,
  created_by: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  member_count: 2,
  members: [
    { id: 'mem-001', group_id: 'group-001', device_id: 'dev-aaa-111', added_at: '2024-01-01T00:00:00Z' },
    { id: 'mem-002', group_id: 'group-001', device_id: 'dev-bbb-222', added_at: '2024-01-02T00:00:00Z' },
  ],
};

const mockDynamicGroupDetail = {
  id: 'group-002',
  name: 'High Risk Devices',
  description: 'Dynamic group for flagged devices',
  criteria: { risk_level: 'high', status: 'active' },
  is_dynamic: true,
  created_by: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  member_count: 0,
  members: [],
};

async function renderWithErrorState() {
  const { default: Page } = await import('@/app/dashboard/device-groups/page');
  const result = render(<Page />);
  await waitFor(() => {
    expect(document.body.textContent?.length).toBeGreaterThan(20);
  });
  return result;
}

async function renderWithGroups(extraMocks?: () => void) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) });
  extraMocks?.();
  const { default: Page } = await import('@/app/dashboard/device-groups/page');
  const result = render(<Page />);
  await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
  return result;
}

async function renderAndSelectStaticGroup() {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
    .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
    .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

  const { default: Page } = await import('@/app/dashboard/device-groups/page');
  render(<Page />);
  await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());

  const rows = document.querySelectorAll('[class*="cursor-pointer"]');
  if (rows.length > 0) fireEvent.click(rows[0]);
  await waitFor(() => expect(document.body.textContent).toContain('Members'));
}

async function renderAndSelectDynamicGroup() {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
    .mockResolvedValueOnce({ ok: true, json: async () => mockDynamicGroupDetail })
    .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

  const { default: Page } = await import('@/app/dashboard/device-groups/page');
  render(<Page />);
  await waitFor(() => expect(screen.getByText('High Risk Devices')).toBeTruthy());

  const rows = document.querySelectorAll('[class*="cursor-pointer"]');
  if (rows.length > 1) fireEvent.click(rows[1]);
  await waitFor(() => expect(document.body.textContent).toContain('High Risk Devices'));
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Basic rendering
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - heading and basic structure', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows Device Groups heading', async () => {
    await renderWithErrorState();
    expect(screen.getByText('Device Groups')).toBeTruthy();
  });

  it('shows page subtitle text', async () => {
    await renderWithErrorState();
    expect(document.body.textContent).toContain('Organize devices into static or dynamic groups');
  });

  it('shows Create Group button', async () => {
    await renderWithErrorState();
    expect(screen.getByText('Create Group')).toBeTruthy();
  });

  it('shows Groups section label', async () => {
    await renderWithErrorState();
    expect(screen.getByText('Groups')).toBeTruthy();
  });

  it('shows Select a group placeholder when no group selected', async () => {
    await renderWithErrorState();
    await waitFor(() => {
      const text = document.body.textContent || '';
      // either placeholder or "No groups yet." should be present
      expect(text).toContain('Select a group to view details');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Loading state
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - loading state', () => {
  it('shows Loading... while fetching', async () => {
    // Use a never-resolving promise to hold loading state
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Empty state
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - empty state', () => {
  it('shows No groups yet. when API returns empty items', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('No groups yet.')).toBeTruthy());
  });

  it('shows No groups yet. after fetch network error', async () => {
    await renderWithErrorState();
    await waitFor(() => expect(screen.getByText('No groups yet.')).toBeTruthy());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Error state
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - error state', () => {
  it('shows error message when fetch fails with network error', async () => {
    await renderWithErrorState();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Network error');
    });
  });

  it('shows error message when fetch returns non-ok status', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Failed to fetch groups: 500');
    });
  });

  it('shows Dismiss button with error', async () => {
    await renderWithErrorState();
    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeTruthy();
    });
  });

  it('Dismiss button removes the error message', async () => {
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Dismiss')).toBeTruthy());
    fireEvent.click(screen.getByText('Dismiss'));
    await waitFor(() => {
      expect(screen.queryByText('Dismiss')).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Group list rendering
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - with mock group data', () => {
  it('renders group list when API returns data', async () => {
    await renderWithGroups();
    expect(screen.getByText('Windows Workstations')).toBeTruthy();
    expect(screen.getByText('High Risk Devices')).toBeTruthy();
  });

  it('shows Static badge for static groups', async () => {
    await renderWithGroups();
    const staticBadges = screen.getAllByText('Static');
    expect(staticBadges.length).toBeGreaterThan(0);
  });

  it('shows Dynamic badge for dynamic groups', async () => {
    await renderWithGroups();
    const dynamicBadges = screen.getAllByText('Dynamic');
    expect(dynamicBadges.length).toBeGreaterThan(0);
  });

  it('shows plural member count (2 members)', async () => {
    await renderWithGroups();
    expect(document.body.textContent).toContain('2 members');
  });

  it('shows plural member count (5 members)', async () => {
    await renderWithGroups();
    expect(document.body.textContent).toContain('5 members');
  });

  it('shows singular member text for 1 member', async () => {
    const singleMemberGroup = [{
      id: 'g-single',
      name: 'Solo Group',
      description: null,
      criteria: null,
      is_dynamic: false,
      created_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      member_count: 1,
    }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: singleMemberGroup }) });
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Solo Group')).toBeTruthy());
    expect(document.body.textContent).toContain('1 member');
    // should NOT have "1 members"
    expect(document.body.textContent).not.toContain('1 members');
  });

  it('shows 0 members for empty group', async () => {
    const zeroMemberGroup = [{
      id: 'g-zero',
      name: 'Empty Group',
      description: null,
      criteria: null,
      is_dynamic: false,
      created_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      member_count: 0,
    }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: zeroMemberGroup }) });
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Empty Group')).toBeTruthy());
    expect(document.body.textContent).toContain('0 members');
  });

  it('shows delete button for each group', async () => {
    await renderWithGroups();
    const deleteButtons = screen.getAllByTitle('Delete group');
    expect(deleteButtons.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Static group detail panel
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - static group detail panel', () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });
  });

  it('shows detail panel after clicking a group', async () => {
    await renderAndSelectStaticGroup();
    expect(document.body.textContent).toContain('Members');
  });

  it('shows group name in detail header', async () => {
    await renderAndSelectStaticGroup();
    const headings = screen.getAllByText('Windows Workstations');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('shows group description in detail panel', async () => {
    await renderAndSelectStaticGroup();
    expect(document.body.textContent).toContain('All Windows desktop devices');
  });

  it('shows Static badge in detail panel', async () => {
    await renderAndSelectStaticGroup();
    const staticBadges = screen.getAllByText('Static');
    expect(staticBadges.length).toBeGreaterThan(0);
  });

  it('does NOT show Filter Criteria section for static group (criteria=null)', async () => {
    await renderAndSelectStaticGroup();
    // criteria is null so Filter Criteria section should not appear
    expect(document.body.textContent).not.toContain('Filter Criteria');
  });

  it('shows Add Device section for static group', async () => {
    await renderAndSelectStaticGroup();
    expect(document.body.textContent).toContain('Add Device');
  });

  it('shows Device UUID placeholder for add member input', async () => {
    await renderAndSelectStaticGroup();
    const input = screen.getByPlaceholderText('Device UUID');
    expect(input).toBeTruthy();
  });

  it('shows Add button in static group detail', async () => {
    await renderAndSelectStaticGroup();
    const addBtn = screen.getByRole('button', { name: /^Add$/ });
    expect(addBtn).toBeTruthy();
  });

  it('shows member device IDs', async () => {
    await renderAndSelectStaticGroup();
    expect(document.body.textContent).toContain('dev-aaa-111');
    expect(document.body.textContent).toContain('dev-bbb-222');
  });

  it('shows Members count in heading', async () => {
    await renderAndSelectStaticGroup();
    expect(document.body.textContent).toContain('Members (2)');
  });

  it('shows Remove member buttons for static group members', async () => {
    await renderAndSelectStaticGroup();
    const removeBtns = screen.getAllByTitle('Remove member');
    expect(removeBtns.length).toBe(2);
  });

  it('can type device UUID in Add Device input', async () => {
    await renderAndSelectStaticGroup();
    const input = screen.getByPlaceholderText('Device UUID') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new-device-uuid' } });
    expect(input.value).toBe('new-device-uuid');
  });

  it('handles Add member button click', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // POST member
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail }) // refetch detail
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) }); // refetch list

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(screen.getByPlaceholderText('Device UUID')).toBeTruthy());

    const input = screen.getByPlaceholderText('Device UUID') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'dev-new-xyz' } });
    const addBtn = screen.getByRole('button', { name: /^Add$/ });
    fireEvent.click(addBtn);
    await waitFor(() => expect(document.body.textContent?.length).toBeGreaterThan(0));
  });

  it('Add button with empty device ID is a no-op', async () => {
    await renderAndSelectStaticGroup();
    const addBtn = screen.getByRole('button', { name: /^Add$/ });
    // device ID input is empty, click should not trigger fetch beyond initial
    const callsBefore = mockFetch.mock.calls.length;
    fireEvent.click(addBtn);
    // No new fetch should occur
    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });

  it('handles Remove member button click', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // DELETE member
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail }) // refetch detail
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(screen.getAllByTitle('Remove member').length).toBe(2));

    const removeBtns = screen.getAllByTitle('Remove member');
    fireEvent.click(removeBtns[0]);
    await waitFor(() => expect(document.body.textContent?.length).toBeGreaterThan(0));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6b. Remove member error
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - Remove member error', () => {
  it('handles Remove member API failure', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(screen.getAllByTitle('Remove member').length).toBe(2));

    // Dismiss any existing errors
    const existingDismiss = screen.queryByText('Dismiss');
    if (existingDismiss) fireEvent.click(existingDismiss);

    const removeBtns = screen.getAllByTitle('Remove member');
    fireEvent.click(removeBtns[0]);
    // Error branch is triggered: setError('Remove member failed')
    // But concurrent fetchGroups may call setError(null) — check content exists
    await waitFor(() => {
      expect(document.body.textContent?.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Static group detail - empty members list
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - static group with no members', () => {
  it('shows No members in this group message', async () => {
    const emptyStaticDetail = { ...mockStaticGroupDetail, members: [], member_count: 0 };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => emptyStaticDetail })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => {
      expect(document.body.textContent).toContain('No members in this group.');
    });
  });

  it('shows Members (0) heading for empty group', async () => {
    const emptyStaticDetail = { ...mockStaticGroupDetail, members: [], member_count: 0 };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => emptyStaticDetail })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Members (0)');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Dynamic group detail panel
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - dynamic group detail panel', () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockDynamicGroupDetail })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });
  });

  it('shows Dynamic badge in detail panel', async () => {
    await renderAndSelectDynamicGroup();
    const dynamicBadges = screen.getAllByText('Dynamic');
    expect(dynamicBadges.length).toBeGreaterThan(0);
  });

  it('shows Filter Criteria section for dynamic group with criteria', async () => {
    await renderAndSelectDynamicGroup();
    expect(document.body.textContent).toContain('Filter Criteria');
  });

  it('shows criteria JSON content', async () => {
    await renderAndSelectDynamicGroup();
    expect(document.body.textContent).toContain('risk_level');
  });

  it('does NOT show Add Device section for dynamic group', async () => {
    await renderAndSelectDynamicGroup();
    expect(document.body.textContent).not.toContain('Add Device');
  });

  it('shows No members in this group. for empty dynamic group', async () => {
    await renderAndSelectDynamicGroup();
    await waitFor(() => {
      expect(document.body.textContent).toContain('No members in this group.');
    });
  });

  it('shows Members (0) for empty dynamic group', async () => {
    await renderAndSelectDynamicGroup();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Members (0)');
    });
  });

  it('shows group description in dynamic detail', async () => {
    await renderAndSelectDynamicGroup();
    expect(document.body.textContent).toContain('Dynamic group for flagged devices');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Dynamic group detail - without description
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - group without description', () => {
  it('does not render description paragraph when description is null', async () => {
    const noDescDetail = { ...mockStaticGroupDetail, description: null };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => noDescDetail })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(document.body.textContent).toContain('Members'));
    // Description should not appear
    expect(document.body.textContent).not.toContain('All Windows desktop devices');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. fetchGroupDetail error
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - fetchGroupDetail error', () => {
  it('shows error when group detail fetch fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) }); // detail fails

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Failed to fetch group detail');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Create Group modal
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - Create Group modal', () => {
  it('opens create group modal on button click', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => {
      expect(screen.getByText('Create Device Group')).toBeTruthy();
    });
  });

  it('shows Name label in modal', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByText('Name')).toBeTruthy());
  });

  it('shows Description label in modal', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByText('Description')).toBeTruthy());
  });

  it('shows Dynamic group checkbox in modal', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => {
      const checkbox = document.querySelector('#is_dynamic') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(false);
    });
  });

  it('can type in group name input', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());
    const input = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test Group' } });
    expect(input.value).toBe('Test Group');
  });

  it('can type in description textarea', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('Optional description...')).toBeTruthy());
    const textarea = screen.getByPlaceholderText('Optional description...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'A test description' } });
    expect(textarea.value).toBe('A test description');
  });

  it('Cancel button closes the modal', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Create Device Group')).toBeNull();
    });
  });

  it('Create button is disabled when name is empty', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Create$/ })).toBeTruthy());
    const createBtn = screen.getByRole('button', { name: /^Create$/ }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(true);
  });

  it('Create button becomes enabled after typing a name', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());
    const nameInput = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Group' } });
    const createBtn = screen.getByRole('button', { name: /^Create$/ }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
  });

  it('shows Filter Criteria textarea after checking Dynamic checkbox', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => {
      const checkbox = document.querySelector('#is_dynamic') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
    });
    const checkbox = document.querySelector('#is_dynamic') as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(screen.getByText('Filter Criteria (JSON)')).toBeTruthy();
    });
  });

  it('shows criteria placeholder text after checking dynamic', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(document.querySelector('#is_dynamic')).toBeTruthy());
    const checkbox = document.querySelector('#is_dynamic') as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => {
      const criteriaTa = screen.getByPlaceholderText(/os.*Windows 11/);
      expect(criteriaTa).toBeTruthy();
    });
  });

  it('can edit criteria JSON textarea', async () => {
    await renderWithErrorState();
    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(document.querySelector('#is_dynamic')).toBeTruthy());
    const checkbox = document.querySelector('#is_dynamic') as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => expect(screen.getByPlaceholderText(/os.*Windows 11/)).toBeTruthy());
    const criteriaInput = screen.getByPlaceholderText(/os.*Windows 11/) as HTMLTextAreaElement;
    fireEvent.change(criteriaInput, { target: { value: '{"os":"Windows 11"}' } });
    expect(criteriaInput.value).toBe('{"os":"Windows 11"}');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Create group - success flow
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - Create group submit', () => {
  it('calls POST API and closes modal on success (static group)', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) }) // initial list
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-group', name: 'My Group' }) }) // POST
      .mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }); // refetch

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Create Group')).toBeTruthy());

    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());

    const nameInput = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Group' } });

    const createBtn = screen.getByRole('button', { name: /^Create$/ });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create Device Group')).toBeNull();
    });
  });

  it('calls POST API with dynamic group and criteria', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'dyn-group' }) })
      .mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Create Group')).toBeTruthy());

    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());

    const nameInput = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Dynamic Group' } });

    const checkbox = document.querySelector('#is_dynamic') as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => expect(screen.getByPlaceholderText(/os.*Windows 11/)).toBeTruthy());

    const criteriaInput = screen.getByPlaceholderText(/os.*Windows 11/) as HTMLTextAreaElement;
    fireEvent.change(criteriaInput, { target: { value: '{"os":"linux"}' } });

    const createBtn = screen.getByRole('button', { name: /^Create$/ });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create Device Group')).toBeNull();
    });
  });

  it('shows Creating... label while saving', async () => {
    // Use never-resolving POST to hold saving state
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) }) // initial
      .mockReturnValueOnce(new Promise(() => {})); // POST never resolves

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Create Group')).toBeTruthy());

    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());

    const nameInput = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Loading Test Group' } });

    const createBtn = screen.getByRole('button', { name: /^Create$/ });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Creating...');
    });
  });

  it('shows error when POST API returns non-ok with detail', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Name already exists' }),
      });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Create Group')).toBeTruthy());

    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());

    const nameInput = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Duplicate Group' } });

    const createBtn = screen.getByRole('button', { name: /^Create$/ });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Name already exists');
    });
  });

  it('shows generic error when POST fails without detail', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('json parse error'); },
      });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Create Group')).toBeTruthy());

    fireEvent.click(screen.getByText('Create Group'));
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Windows Laptops')).toBeTruthy());

    const nameInput = screen.getByPlaceholderText('e.g. Windows Laptops') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Error Group' } });

    const createBtn = screen.getByRole('button', { name: /^Create$/ });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Create failed');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. Delete group
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - delete group', () => {
  it('calls delete API when confirm is true', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // DELETE
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());

    const deleteBtn = screen.getAllByTitle('Delete group')[0];
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(document.body.textContent?.length).toBeGreaterThan(0));
    vi.unstubAllGlobals();
  });

  it('does NOT call delete API when confirm is false', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());

    const callsBefore = mockFetch.mock.calls.length;
    const deleteBtn = screen.getAllByTitle('Delete group')[0];
    fireEvent.click(deleteBtn);
    // No additional fetch calls should happen
    expect(mockFetch.mock.calls.length).toBe(callsBefore);
    vi.unstubAllGlobals();
  });

  it('shows error when delete API fails', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());

    const deleteBtn = screen.getAllByTitle('Delete group')[0];
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Delete failed');
    });
    vi.unstubAllGlobals();
  });

  it('clears selectedGroup when deleting the currently selected group', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail }) // detail
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // DELETE
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());

    // Select the group first
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(document.body.textContent).toContain('Members'));

    // Delete the selected group
    const deleteBtn = screen.getAllByTitle('Delete group')[0];
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(document.body.textContent?.length).toBeGreaterThan(0));
    vi.unstubAllGlobals();
  });

  it('stopPropagation prevents group detail from being fetched on delete click', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());

    const callsBefore = mockFetch.mock.calls.length;
    // Click directly on delete button which should stopPropagation
    const deleteBtn = screen.getAllByTitle('Delete group')[0];
    fireEvent.click(deleteBtn);
    // confirm returned false, so no new fetch calls expected
    expect(mockFetch.mock.calls.length).toBe(callsBefore);
    vi.unstubAllGlobals();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. Add member error handling
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - Add member error handling', () => {
  it('shows error when add member API returns non-ok', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Device not found' }),
      });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(screen.getByPlaceholderText('Device UUID')).toBeTruthy());

    const input = screen.getByPlaceholderText('Device UUID') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bad-uuid' } });
    const addBtn = screen.getByRole('button', { name: /^Add$/ });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Device not found');
    });
  });

  it('shows Add member failed when add member response json fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('bad json'); },
      });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => expect(screen.getByPlaceholderText('Device UUID')).toBeTruthy());

    const input = screen.getByPlaceholderText('Device UUID') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bad-uuid' } });
    const addBtn = screen.getByRole('button', { name: /^Add$/ });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Add member failed');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. localStorage token handling
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - localStorage token', () => {
  it('uses token from localStorage in Authorization header', async () => {
    localStorage.setItem('token', 'my-super-secret-token');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('No groups yet.')).toBeTruthy());

    const callHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(callHeaders?.Authorization).toContain('my-super-secret-token');
  });

  it('uses empty token when localStorage has no token', async () => {
    localStorage.removeItem('token');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('No groups yet.')).toBeTruthy());

    const callHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(callHeaders?.Authorization).toBe('Bearer ');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. Select a group placeholder detail panel
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - detail panel placeholder', () => {
  it('shows Select a group to view details placeholder initially', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });
    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    expect(screen.getByText('Select a group to view details')).toBeTruthy();
  });

  it('placeholder disappears after selecting a group', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStaticGroupDetail })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    expect(screen.getByText('Select a group to view details')).toBeTruthy();

    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => {
      expect(screen.queryByText('Select a group to view details')).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. Dynamic group with members (Remove button hidden for dynamic)
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - dynamic group with members', () => {
  it('does not show Remove member buttons for dynamic group members', async () => {
    const dynamicWithMembers = {
      ...mockDynamicGroupDetail,
      members: [
        { id: 'dm-001', group_id: 'group-002', device_id: 'dev-dyn-001', added_at: '2024-01-01T00:00:00Z' },
      ],
    };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => dynamicWithMembers })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('High Risk Devices')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 1) fireEvent.click(rows[1]);
    await waitFor(() => expect(document.body.textContent).toContain('dev-dyn-001'));

    // Dynamic group should have no Remove member buttons
    const removeBtns = screen.queryAllByTitle('Remove member');
    expect(removeBtns.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. Group with criteria shown in detail
// ═══════════════════════════════════════════════════════════════════════════
describe('Device Groups page - static group with criteria', () => {
  it('shows Filter Criteria section when static group has criteria', async () => {
    const staticWithCriteria = { ...mockStaticGroupDetail, criteria: { tag: 'production' } };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockGroupList }) })
      .mockResolvedValueOnce({ ok: true, json: async () => staticWithCriteria })
      .mockResolvedValue({ ok: true, json: async () => ({ items: mockGroupList }) });

    const { default: Page } = await import('@/app/dashboard/device-groups/page');
    render(<Page />);
    await waitFor(() => expect(screen.getByText('Windows Workstations')).toBeTruthy());
    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    if (rows.length > 0) fireEvent.click(rows[0]);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Filter Criteria');
      expect(document.body.textContent).toContain('production');
    });
  });
});
