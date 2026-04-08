import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/lib/use-websocket';

// Minimal WebSocket mock
class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection open
    setTimeout(() => this.onopen?.(), 0);
  }

  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  });

  // Test helpers
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(event: Event) {
    this.onerror?.(event);
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

let lastWs: MockWebSocket;

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        lastWs = this;
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts in connecting status', () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    expect(result.current.status).toBe('connecting');
  });

  it('becomes connected after open event', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    await act(async () => { vi.runAllTimers(); });
    expect(result.current.status).toBe('connected');
  });

  it('receives message as lastMessage', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    await act(async () => { vi.runAllTimers(); });

    act(() => { lastWs.simulateMessage({ type: 'update', value: 42 }); });
    expect(result.current.lastMessage).toEqual({ type: 'update', value: 42 });
  });

  it('calls onMessage callback with parsed data', async () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket('ws://test', { onMessage }));
    await act(async () => { vi.runAllTimers(); });

    act(() => { lastWs.simulateMessage({ hello: 'world' }); });
    expect(onMessage).toHaveBeenCalledWith({ hello: 'world' });
  });

  it('calls onError callback on error event', async () => {
    const onError = vi.fn();
    renderHook(() => useWebSocket('ws://test', { onError }));
    await act(async () => { vi.runAllTimers(); });

    const errorEvent = new Event('error');
    act(() => { lastWs.simulateError(errorEvent); });
    expect(onError).toHaveBeenCalledWith(errorEvent);
  });

  it('send() sends JSON stringified data', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    await act(async () => { vi.runAllTimers(); });

    act(() => { result.current.send({ action: 'ping' }); });
    expect(lastWs.send).toHaveBeenCalledWith(JSON.stringify({ action: 'ping' }));
  });

  it('disconnect() closes the socket and sets status to disconnected', async () => {
    const { result } = renderHook(() =>
      useWebSocket('ws://test', { reconnect: false })
    );
    await act(async () => { vi.runAllTimers(); });

    act(() => { result.current.disconnect(); });
    expect(result.current.status).toBe('disconnected');
  });

  it('reconnects after close when reconnect=true', async () => {
    const WsSpy = vi.stubGlobal('WebSocket', class extends MockWebSocket {
      constructor(url: string) { super(url); lastWs = this; }
    });
    const { result } = renderHook(() =>
      useWebSocket('ws://test', { reconnect: true, maxRetries: 3 })
    );
    await act(async () => { vi.runAllTimers(); });
    expect(result.current.status).toBe('connected');

    // Simulate disconnect
    act(() => { lastWs.simulateClose(); });
    expect(result.current.status).toBe('disconnected');

    // Advance past reconnect delay (min 1s)
    await act(async () => { vi.advanceTimersByTime(1100); });
    await act(async () => { vi.runAllTimers(); });
    // Should have reconnected
    expect(result.current.status).toBe('connected');

    return WsSpy;
  });

  it('handles non-JSON message data', async () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket('ws://test', { onMessage }));
    await act(async () => { vi.runAllTimers(); });

    act(() => { lastWs.onmessage?.({ data: 'plain text' }); });
    expect(result => result).toBeDefined();
    expect(onMessage).toHaveBeenCalledWith('plain text');
  });

  it('send() does nothing when readyState is not OPEN', async () => {
    const { result } = renderHook(() => useWebSocket('ws://test'));
    await act(async () => { vi.runAllTimers(); });

    // Set readyState to CLOSED so the send guard fails
    lastWs.readyState = MockWebSocket.CLOSED;

    act(() => { result.current.send({ action: 'test' }); });
    // send should NOT have been called since readyState !== OPEN
    expect(lastWs.send).not.toHaveBeenCalled();
  });

  it('disconnect() clears pending reconnect timeout and prevents reconnection', async () => {
    const { result } = renderHook(() =>
      useWebSocket('ws://test', { reconnect: true, maxRetries: 3 })
    );
    await act(async () => { vi.runAllTimers(); });
    expect(result.current.status).toBe('connected');

    // Simulate server-side close to trigger reconnect timer
    act(() => { lastWs.simulateClose(); });
    expect(result.current.status).toBe('disconnected');

    // Immediately call disconnect() which should clear the reconnect timeout
    act(() => { result.current.disconnect(); });
    expect(result.current.status).toBe('disconnected');

    // Advance past reconnect delay — should NOT reconnect because disconnect cleared timeout
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(result.current.status).toBe('disconnected');
  });
});
