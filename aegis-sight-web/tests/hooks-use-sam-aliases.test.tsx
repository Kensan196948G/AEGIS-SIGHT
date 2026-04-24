import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { SamLicense, SamSkuAlias } from '@/lib/types';

const mockFetchSamLicense     = vi.fn();
const mockFetchSamLicenseAliases = vi.fn();
const mockCreateSamAlias      = vi.fn();
const mockUpdateSamAlias      = vi.fn();
const mockDeleteSamAlias      = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchSamLicense:         (...args: unknown[]) => mockFetchSamLicense(...args),
  fetchSamLicenseAliases:  (...args: unknown[]) => mockFetchSamLicenseAliases(...args),
  createSamAlias:          (...args: unknown[]) => mockCreateSamAlias(...args),
  updateSamAlias:          (...args: unknown[]) => mockUpdateSamAlias(...args),
  deleteSamAlias:          (...args: unknown[]) => mockDeleteSamAlias(...args),
}));

const MOCK_LICENSE: SamLicense = {
  id: '1', software_name: 'Microsoft 365 E3', vendor: 'Microsoft',
  license_type: 'subscription', license_key: null,
  purchased_count: 500, installed_count: 487, m365_assigned: 0,
  cost_per_unit: 2750, currency: 'JPY',
  purchase_date: null, expiry_date: null,
  vendor_contract_id: null, notes: null,
  created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
};

const MOCK_ALIAS: SamSkuAlias = {
  id: 'a1', software_license_id: '1', sku_part_number: 'ENTERPRISEPACK',
  created_at: '2026-03-25T00:00:00Z', updated_at: '2026-03-25T00:00:00Z',
};

beforeEach(() => {
  mockFetchSamLicense.mockResolvedValue(MOCK_LICENSE);
  mockFetchSamLicenseAliases.mockResolvedValue([MOCK_ALIAS]);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('useSamAliases hook', () => {
  it('starts with loading=true', async () => {
    mockFetchSamLicense.mockReturnValue(new Promise(() => {}));
    mockFetchSamLicenseAliases.mockReturnValue(new Promise(() => {}));
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.license).toBeNull();
    expect(result.current.aliases).toEqual([]);
  });

  it('loads license and aliases on mount', async () => {
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.license).toEqual(MOCK_LICENSE);
    expect(result.current.aliases).toEqual([MOCK_ALIAS]);
    expect(result.current.error).toBeNull();
    expect(mockFetchSamLicense).toHaveBeenCalledWith('1');
    expect(mockFetchSamLicenseAliases).toHaveBeenCalledWith('1');
  });

  it('sets error message from Error instance on failure', async () => {
    mockFetchSamLicense.mockRejectedValue(new Error('401 Unauthorized'));
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('401 Unauthorized');
  });

  it('sets generic error message for non-Error rejection', async () => {
    mockFetchSamLicense.mockRejectedValue('unknown');
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('データの取得に失敗しました');
  });

  it('addAlias appends new alias to list', async () => {
    const NEW_ALIAS: SamSkuAlias = { id: 'a2', software_license_id: '1', sku_part_number: 'SPE_E3', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' };
    mockCreateSamAlias.mockResolvedValue(NEW_ALIAS);
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.addAlias('SPE_E3'); });
    expect(mockCreateSamAlias).toHaveBeenCalledWith('1', 'SPE_E3');
    expect(result.current.aliases).toEqual([MOCK_ALIAS, NEW_ALIAS]);
  });

  it('editAlias updates alias in list', async () => {
    const UPDATED: SamSkuAlias = { ...MOCK_ALIAS, sku_part_number: 'NEW_SKU' };
    mockUpdateSamAlias.mockResolvedValue(UPDATED);
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.editAlias('a1', 'NEW_SKU'); });
    expect(mockUpdateSamAlias).toHaveBeenCalledWith('a1', 'NEW_SKU');
    expect(result.current.aliases[0].sku_part_number).toBe('NEW_SKU');
  });

  it('removeAlias removes alias from list', async () => {
    mockDeleteSamAlias.mockResolvedValue(undefined);
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.removeAlias('a1'); });
    expect(mockDeleteSamAlias).toHaveBeenCalledWith('a1');
    expect(result.current.aliases).toEqual([]);
  });

  it('editAlias leaves unrelated aliases unchanged', async () => {
    const ALIAS2: SamSkuAlias = { id: 'a2', software_license_id: '1', sku_part_number: 'SPE_E3', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' };
    mockFetchSamLicenseAliases.mockResolvedValue([MOCK_ALIAS, ALIAS2]);
    const UPDATED: SamSkuAlias = { ...MOCK_ALIAS, sku_part_number: 'NEW_SKU' };
    mockUpdateSamAlias.mockResolvedValue(UPDATED);
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.editAlias('a1', 'NEW_SKU'); });
    // a1 updated, a2 unchanged
    expect(result.current.aliases.find(a => a.id === 'a1')?.sku_part_number).toBe('NEW_SKU');
    expect(result.current.aliases.find(a => a.id === 'a2')?.sku_part_number).toBe('SPE_E3');
  });

  it('refetch reloads license and aliases', async () => {
    const { useSamAliases } = await import('@/lib/hooks/use-sam-aliases');
    const { result } = renderHook(() => useSamAliases('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchSamLicense).toHaveBeenCalledTimes(1);
    await act(async () => { result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchSamLicense).toHaveBeenCalledTimes(2);
  });
});
