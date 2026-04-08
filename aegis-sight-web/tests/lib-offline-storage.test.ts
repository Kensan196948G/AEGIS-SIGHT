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

  // --- Branch coverage: onupgradeneeded when store doesn't exist ---
  it('openDB creates object store when it does not exist', async () => {
    const dbWithoutStore = makeDB();
    // Override contains to return false so the if-branch creates the store
    let createObjectStoreCalled = false;
    dbWithoutStore.objectStoreNames = {
      contains: () => false,
    };
    (dbWithoutStore as any).createObjectStore = (name: string, opts: any) => {
      createObjectStoreCalled = true;
      expect(name).toBe('offline-operations');
      expect(opts).toEqual({ keyPath: 'id', autoIncrement: true });
    };

    vi.stubGlobal('indexedDB', {
      open: vi.fn().mockImplementation(() => {
        const req = {
          result: dbWithoutStore,
          error: null,
          onupgradeneeded: null as any,
        };
        return new Proxy(req, {
          set(target, prop, value) {
            (target as Record<string | symbol, unknown>)[prop as string] = value;
            if (prop === 'onupgradeneeded' && typeof value === 'function') {
              // Fire onupgradeneeded with a mock event
              queueMicrotask(() => value({ target: { result: dbWithoutStore } } as any));
            }
            if (prop === 'onsuccess' && typeof value === 'function') {
              queueMicrotask(value as () => void);
            }
            return true;
          },
        });
      }),
    });
    vi.resetModules();

    const { getOfflineOperations } = await import('@/lib/offline-storage');
    await getOfflineOperations();
    expect(createObjectStoreCalled).toBe(true);
  });

  // --- Branch coverage: openDB request.onerror ---
  it('openDB rejects when request.onerror fires', async () => {
    const mockError = new DOMException('OpenDB failed');
    vi.stubGlobal('indexedDB', {
      open: vi.fn().mockImplementation(() => {
        const req = {
          result: null,
          error: mockError,
        };
        return new Proxy(req, {
          set(target, prop, value) {
            (target as Record<string | symbol, unknown>)[prop as string] = value;
            if (prop === 'onerror' && typeof value === 'function') {
              queueMicrotask(value as () => void);
            }
            // Do NOT fire onsuccess
            return true;
          },
        });
      }),
    });
    vi.resetModules();

    const { saveOfflineOperation } = await import('@/lib/offline-storage');
    await expect(
      saveOfflineOperation({ url: '/test', method: 'GET', headers: {}, body: null })
    ).rejects.toThrow('OpenDB failed');
  });

  // --- Branch coverage: tx.onerror on saveOfflineOperation ---
  it('saveOfflineOperation rejects when tx.onerror fires', async () => {
    const txError = new DOMException('Transaction write failed');
    const errorDB = {
      transaction() {
        let _onerror: null | (() => void) = null;
        return {
          oncomplete: null,
          get onerror() { return _onerror; },
          set onerror(fn: null | (() => void)) {
            _onerror = fn;
            if (fn) queueMicrotask(fn);
          },
          error: txError,
          objectStore() {
            return {
              add() { return { result: 1 }; },
            };
          },
        };
      },
      objectStoreNames: { contains: () => true },
    };
    vi.stubGlobal('indexedDB', {
      open: vi.fn().mockImplementation(() => {
        const req = { result: errorDB, error: null };
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
    });
    vi.resetModules();

    const { saveOfflineOperation } = await import('@/lib/offline-storage');
    await expect(
      saveOfflineOperation({ url: '/test', method: 'POST', headers: {}, body: null })
    ).rejects.toThrow('Transaction write failed');
  });

  // --- Branch coverage: request.onerror on getOfflineOperations ---
  it('getOfflineOperations rejects when request.onerror fires', async () => {
    const reqError = new DOMException('GetAll failed');
    const errorDB = {
      transaction() {
        return {
          oncomplete: null,
          onerror: null,
          objectStore() {
            return {
              getAll() {
                const req = { result: null, onsuccess: null as any, onerror: null as any, error: reqError };
                return new Proxy(req, {
                  set(target, prop, value) {
                    (target as Record<string | symbol, unknown>)[prop as string] = value;
                    if (prop === 'onerror' && typeof value === 'function') {
                      queueMicrotask(value as () => void);
                    }
                    // Do NOT fire onsuccess
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
    vi.stubGlobal('indexedDB', {
      open: vi.fn().mockImplementation(() => {
        const req = { result: errorDB, error: null };
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
    });
    vi.resetModules();

    const { getOfflineOperations } = await import('@/lib/offline-storage');
    await expect(getOfflineOperations()).rejects.toThrow('GetAll failed');
  });

  // --- Branch coverage: tx.onerror on clearOfflineOperations ---
  it('clearOfflineOperations rejects when tx.onerror fires', async () => {
    const txError = new DOMException('Clear tx failed');
    const errorDB = {
      transaction() {
        let _onerror: null | (() => void) = null;
        return {
          oncomplete: null,
          get onerror() { return _onerror; },
          set onerror(fn: null | (() => void)) {
            _onerror = fn;
            if (fn) queueMicrotask(fn);
          },
          error: txError,
          objectStore() {
            return { clear() { return { result: undefined }; } };
          },
        };
      },
      objectStoreNames: { contains: () => true },
    };
    vi.stubGlobal('indexedDB', {
      open: vi.fn().mockImplementation(() => {
        const req = { result: errorDB, error: null };
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
    });
    vi.resetModules();

    const { clearOfflineOperations } = await import('@/lib/offline-storage');
    await expect(clearOfflineOperations()).rejects.toThrow('Clear tx failed');
  });

  // --- Branch coverage: request.onerror on getOfflineOperationCount ---
  it('getOfflineOperationCount rejects when request.onerror fires', async () => {
    const reqError = new DOMException('Count failed');
    const errorDB = {
      transaction() {
        return {
          oncomplete: null,
          onerror: null,
          objectStore() {
            return {
              count() {
                const req = { result: 0, onsuccess: null as any, onerror: null as any, error: reqError };
                return new Proxy(req, {
                  set(target, prop, value) {
                    (target as Record<string | symbol, unknown>)[prop as string] = value;
                    if (prop === 'onerror' && typeof value === 'function') {
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
    vi.stubGlobal('indexedDB', {
      open: vi.fn().mockImplementation(() => {
        const req = { result: errorDB, error: null };
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
    });
    vi.resetModules();

    const { getOfflineOperationCount } = await import('@/lib/offline-storage');
    await expect(getOfflineOperationCount()).rejects.toThrow('Count failed');
  });

  // --- Branch coverage: requestSync with serviceWorker available ---
  it('requestSync registers sync when serviceWorker and SyncManager are available', async () => {
    const registerFn = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      sync: { register: registerFn },
    };

    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: {
        ready: Promise.resolve(mockRegistration),
      },
    });
    // SyncManager must exist in window for the condition to be true
    vi.stubGlobal('SyncManager', class SyncManager {});
    vi.resetModules();

    const { requestSync } = await import('@/lib/offline-storage');
    await requestSync();

    expect(registerFn).toHaveBeenCalledWith('sync-offline-operations');
  });
});
