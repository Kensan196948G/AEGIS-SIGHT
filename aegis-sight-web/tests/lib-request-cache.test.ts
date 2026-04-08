import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestCache, requestCache } from '@/lib/request-cache';

function makeResponse(
  body: unknown,
  options: { status?: number; etag?: string; statusText?: string } = {}
) {
  const { status = 200, etag, statusText = 'OK' } = options;
  const headers = new Headers();
  if (etag) headers.set('etag', etag);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('RequestCache', () => {
  let cache: RequestCache;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cache = new RequestCache();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('fetches and returns body for a fresh request', async () => {
    fetchMock.mockResolvedValue(makeResponse({ items: [1, 2, 3] }));
    const result = await cache.fetch('/api/items');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('does not add If-None-Match for uncached URL', async () => {
    fetchMock.mockResolvedValue(makeResponse({}));
    await cache.fetch('/api/fresh');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has('If-None-Match')).toBe(false);
  });

  it('stores ETag and sends If-None-Match on second request', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ data: 'v1' }, { etag: '"abc123"' }))
      .mockResolvedValueOnce(makeResponse({ data: 'v2' }));

    await cache.fetch('/api/data');
    await cache.fetch('/api/data');

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('If-None-Match')).toBe('"abc123"');
  });

  it('returns cached body on 304 response', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ data: 'original' }, { etag: '"v1"' }))
      .mockResolvedValueOnce(makeResponse(null, { status: 304, etag: '"v1"' }));

    const first = await cache.fetch<{ data: string }>('/api/stable');
    const second = await cache.fetch<{ data: string }>('/api/stable');

    expect(first).toEqual({ data: 'original' });
    expect(second).toEqual({ data: 'original' });
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValue(makeResponse(null, { status: 500, statusText: 'Server Error' }));
    await expect(cache.fetch('/api/broken')).rejects.toThrow('Request failed: 500 Server Error');
  });

  it('invalidate removes specific URL', async () => {
    fetchMock.mockResolvedValue(makeResponse({ v: 1 }, { etag: '"e1"' }));
    await cache.fetch('/api/item');
    expect(cache.size).toBe(1);

    cache.invalidate('/api/item');
    expect(cache.size).toBe(0);
  });

  it('clear removes all entries', async () => {
    fetchMock.mockResolvedValue(makeResponse({ v: 1 }, { etag: '"e"' }));
    await cache.fetch('/api/a');
    await cache.fetch('/api/b');
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('evicts oldest entry when maxEntries reached', async () => {
    const small = new RequestCache(2);
    fetchMock.mockResolvedValue(makeResponse({}, { etag: '"x"' }));

    await small.fetch('/api/1');
    await small.fetch('/api/2');
    expect(small.size).toBe(2);

    // Adding third should evict one
    await small.fetch('/api/3');
    expect(small.size).toBe(2);
  });

  it('does not cache responses without ETag', async () => {
    fetchMock.mockResolvedValue(makeResponse({ v: 1 })); // no etag
    await cache.fetch('/api/no-etag');
    expect(cache.size).toBe(0);
  });

  it('singleton requestCache is exported', () => {
    expect(requestCache).toBeInstanceOf(RequestCache);
  });
});
