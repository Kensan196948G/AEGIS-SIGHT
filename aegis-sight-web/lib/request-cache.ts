/**
 * ETag-aware request cache with automatic If-None-Match handling.
 *
 * Stores up to `maxEntries` responses keyed by URL. When a cached entry
 * has an ETag, subsequent fetches include `If-None-Match` so the server
 * can return 304 Not Modified and the client reuses the cached body.
 */

const DEFAULT_MAX_ENTRIES = 100;

interface CacheEntry {
  etag: string;
  body: unknown;
  timestamp: number;
}

export class RequestCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /**
   * Fetch a URL with ETag-based caching.
   *
   * If a previous response for this URL included an ETag header, the
   * request automatically includes `If-None-Match`. On a 304 response
   * the cached body is returned without re-parsing.
   */
  async fetch<T = unknown>(
    url: string,
    init: RequestInit = {}
  ): Promise<T> {
    const cached = this.cache.get(url);
    const headers = new Headers(init.headers);

    if (cached?.etag) {
      headers.set('If-None-Match', cached.etag);
    }

    const response = await globalThis.fetch(url, { ...init, headers });

    // Server confirmed nothing changed -- return cached body
    if (response.status === 304 && cached) {
      cached.timestamp = Date.now();
      return cached.body as T;
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json();
    const etag = response.headers.get('etag');

    if (etag) {
      this._set(url, { etag, body, timestamp: Date.now() });
    }

    return body as T;
  }

  /** Remove a specific URL from the cache. */
  invalidate(url: string): void {
    this.cache.delete(url);
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear();
  }

  /** Current number of cached entries. */
  get size(): number {
    return this.cache.size;
  }

  // -- internal --------------------------------------------------------------

  private _set(url: string, entry: CacheEntry): void {
    // Evict oldest entries when at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(url)) {
      this._evictOldest();
    }
    this.cache.set(url, entry);
  }

  private _evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/** Singleton cache instance for general use. */
export const requestCache = new RequestCache();
