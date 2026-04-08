import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiHealth, HealthDetail } from '@/lib/use-api-health';

const mockHealth: HealthDetail = {
  status: 'healthy',
  version: '1.0.0',
  checks: {
    database: { status: 'ok' },
    cache: { status: 'ok' },
  },
};

const degradedHealth: HealthDetail = {
  status: 'degraded',
  version: '1.0.0',
  checks: {
    database: { status: 'ok' },
    cache: { status: 'error', error: 'timeout' },
  },
};

function makeFetchResponse(data: HealthDetail, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('useApiHealth', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockReturnValue(makeFetchResponse(mockHealth));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts with isLoading=true', () => {
    const { result } = renderHook(() => useApiHealth());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns health data after fetch', async () => {
    const { result } = renderHook(() => useApiHealth());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.health).toEqual(mockHealth);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({ ok: false, status: 500, json: vi.fn() } as unknown as Response)
    );
    const { result } = renderHook(() => useApiHealth());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.error).toContain('500');
    expect(result.current.health).toBeNull();
  });

  it('sets error on network exception', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useApiHealth());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.error).toBe('Network error');
  });

  it('polls every 30 seconds', async () => {
    renderHook(() => useApiHealth());
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('calls onStatusChange when overall status changes', async () => {
    const onStatusChange = vi.fn();
    fetchMock
      .mockReturnValueOnce(makeFetchResponse(mockHealth))
      .mockReturnValueOnce(makeFetchResponse(degradedHealth));

    const { result } = renderHook(() => useApiHealth(onStatusChange));
    await act(async () => { await Promise.resolve(); });

    // Trigger second poll
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(onStatusChange).toHaveBeenCalledWith(degradedHealth, mockHealth);
  });

  it('does not call onStatusChange when status unchanged', async () => {
    const onStatusChange = vi.fn();
    fetchMock
      .mockReturnValueOnce(makeFetchResponse(mockHealth))
      .mockReturnValueOnce(makeFetchResponse(mockHealth));

    renderHook(() => useApiHealth(onStatusChange));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('refetch function triggers a new fetch', async () => {
    const { result } = renderHook(() => useApiHealth());
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.refetch(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
