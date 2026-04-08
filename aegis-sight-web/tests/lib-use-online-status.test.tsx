import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../lib/use-online-status';

describe('useOnlineStatus', () => {
  let listeners: Record<string, Set<() => void>>;

  beforeEach(() => {
    listeners = { online: new Set(), offline: new Set() };
    vi.spyOn(window, 'addEventListener').mockImplementation((type, cb) => {
      listeners[type]?.add(cb as () => void);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, cb) => {
      listeners[type]?.delete(cb as () => void);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when navigator.onLine is true', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('updates to false when offline event fires', () => {
    let onlineState = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onlineState);

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      onlineState = false;
      listeners['offline'].forEach((cb) => cb());
    });

    expect(result.current).toBe(false);
  });

  it('updates to true when online event fires', () => {
    let onlineState = false;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onlineState);

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      onlineState = true;
      listeners['online'].forEach((cb) => cb());
    });

    expect(result.current).toBe(true);
  });

  it('subscribes to online and offline events on mount', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderHook(() => useOnlineStatus());
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
