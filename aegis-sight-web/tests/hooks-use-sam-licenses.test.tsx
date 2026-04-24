import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { SamLicense, PaginatedResponse } from '@/lib/types';

const mockFetchSamLicenses = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchSamLicenses: (...args: unknown[]) => mockFetchSamLicenses(...args),
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

const MOCK_RESPONSE: PaginatedResponse<SamLicense> = {
  items: [MOCK_LICENSE],
  total: 1,
  skip: 0,
  limit: 200,
};

beforeEach(() => {
  mockFetchSamLicenses.mockResolvedValue(MOCK_RESPONSE);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('useSamLicenses hook', () => {
  it('starts with loading=true', async () => {
    mockFetchSamLicenses.mockReturnValue(new Promise(() => {})); // never resolves
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    const { result } = renderHook(() => useSamLicenses());
    expect(result.current.loading).toBe(true);
    expect(result.current.licenses).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('resolves licenses on success', async () => {
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    const { result } = renderHook(() => useSamLicenses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.licenses).toEqual([MOCK_LICENSE]);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('calls fetchSamLicenses with default params', async () => {
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    renderHook(() => useSamLicenses());
    await waitFor(() => expect(mockFetchSamLicenses).toHaveBeenCalled());
    expect(mockFetchSamLicenses).toHaveBeenCalledWith(0, 200, undefined);
  });

  it('passes vendor filter to fetchSamLicenses', async () => {
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    renderHook(() => useSamLicenses('Microsoft'));
    await waitFor(() => expect(mockFetchSamLicenses).toHaveBeenCalled());
    expect(mockFetchSamLicenses).toHaveBeenCalledWith(0, 200, 'Microsoft');
  });

  it('sets error on API failure', async () => {
    mockFetchSamLicenses.mockRejectedValue(new Error('Network Error'));
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    const { result } = renderHook(() => useSamLicenses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network Error');
    expect(result.current.licenses).toEqual([]);
  });

  it('sets generic error message for non-Error rejection', async () => {
    mockFetchSamLicenses.mockRejectedValue('some string error');
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    const { result } = renderHook(() => useSamLicenses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('ライセンス一覧の取得に失敗しました');
  });

  it('refetch re-triggers data load', async () => {
    const { useSamLicenses } = await import('@/lib/hooks/use-sam-licenses');
    const { result } = renderHook(() => useSamLicenses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchSamLicenses).toHaveBeenCalledTimes(1);
    await act(async () => { result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetchSamLicenses).toHaveBeenCalledTimes(2);
  });
});
