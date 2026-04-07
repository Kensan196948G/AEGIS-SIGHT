import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared in-memory store for all IDB operations within a test
let memStore: Map<number, Record<string, unknown>>;
let autoId: number;

/**
 * Creates an IDB mock where data operations are synchronous and
 * callbacks are fired via queueMicrotask.
 *
 * Key insight: offline-storage.ts resolves on tx.oncomplete only —
 * it does NOT set onsuccess on individual store requests.
 * So we fire oncomplete immediately when it is set (via queueMicrotask).
 */
function makeDB() {
  return {
    transaction(_storeName: string, _mode: string) {
      let _oncomplete: null | (() => void) = null;
      return {
        get oncomplete() { return _oncomplete; },
        set oncomplete(fn: null | (() => void)) {
          _oncomplete = fn;
          if (fn) queueMicrotask(fn); // resolve as soon as handler is registered
        },
        onerror: null,
        objectStore(_name: string) {
          return {
            add(record: Record<string, unknown>) {
              // Execute synchronously so data is in memStore before oncomplete fires
              const id = autoId++;
              memStore.set(id, { ...record, id });
              return { result: id };
            },
            getAll() {
              const result = Array.from(memStore.values());
              const req = { result, onsuccess: null as null | (() => void) };
              // onsuccess setter fires immediately
              return new Proxy(req, {
                set(target, prop, value) {
                  (target as Record<string | symbol, unknown>)[prop as string] = value;
                  if (prop === 'onsuccess' && typeof value === 'function') {
                    queueMicrotask(value as () => void);
                  }
                  return true;
                },
              });
            },
            count() {
              const size = memStore.size;
              const req = { result: size, onsuccess: null as null | (() => void) };
              return new Proxy(req, {
                set(target, prop, value) {
                  (target as Record<string | symbol, unknown>)[prop as string] = value;
                  if (prop === 'onsuccess' && typeof value === 'function') {
                    queueMicrotask(value as () => void);
                  }
                  return true;
                },
              });
            },
            clear() {
              memStore.clear();
              const req = { result: undefined, onsuccess: null as null | (() => void) };
              return new Proxy(req, {
                set(target, prop, value) {
                  (target as Record<string | symbol, unknown>)[prop as string] = value;
                  if (prop === 'onsuccess' && typeof value === 'function') {
                    queueMicrotask(value as () => void);
                  }
                  return true;
                },
              });
            },
          };
        },
      };
    },
    objectStoreNames: { contains: () => true },
  };
}

function createIDBMock() {
  const db = makeDB();
  return {
    open: vi.fn().mockImplementation(() => {
      // Fire onsuccess when it's set via a setter
      const req = {
        result: db,
        error: null,
        _handlers: {} as Record<string, (() => void) | null>,
        onupgradeneeded: null,
      };
      return new Proxy(req, {
        set(target, prop, value) {
          (target as Record<string | symbol, unknown>)[prop as string] = value;
          if (prop === 'onsuccess' && typeof value === 'function') {
            queueMicrotask(value as () => void);
          }
          return true;
        },
      });
    }),
  };
}

describe('offline-storage', () => {
  beforeEach(() => {
    memStore = new Map();
    autoId = 1;
    vi.stubGlobal('indexedDB', createIDBMock());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveOfflineOperation stores an operation', async () => {
    const { saveOfflineOperation, getOfflineOperations } = await import('@/lib/offline-storage');

    await saveOfflineOperation({
      url: '/api/v1/devices',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Device A' }),
    });

    const ops = await getOfflineOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].url).toBe('/api/v1/devices');
    expect(ops[0].method).toBe('POST');
    expect(ops[0].timestamp).toBeTypeOf('number');
  });

  it('getOfflineOperations returns empty array when no operations', async () => {
    const { getOfflineOperations } = await import('@/lib/offline-storage');
    const ops = await getOfflineOperations();
    expect(ops).toEqual([]);
  });

  it('getOfflineOperationCount returns count', async () => {
    const { saveOfflineOperation, getOfflineOperationCount } = await import('@/lib/offline-storage');

    await saveOfflineOperation({ url: '/api/v1/a', method: 'PUT', headers: {}, body: null });
    await saveOfflineOperation({ url: '/api/v1/b', method: 'DELETE', headers: {}, body: null });

    const count = await getOfflineOperationCount();
    expect(count).toBe(2);
  });

  it('clearOfflineOperations removes all operations', async () => {
    const { saveOfflineOperation, clearOfflineOperations, getOfflineOperations } =
      await import('@/lib/offline-storage');

    await saveOfflineOperation({ url: '/api/v1/item', method: 'POST', headers: {}, body: null });
    await clearOfflineOperations();

    const ops = await getOfflineOperations();
    expect(ops).toHaveLength(0);
  });

  it('requestSync does nothing when serviceWorker unavailable', async () => {
    const { requestSync } = await import('@/lib/offline-storage');
    // jsdom does not have serviceWorker
    await expect(requestSync()).resolves.toBeUndefined();
  });
});
