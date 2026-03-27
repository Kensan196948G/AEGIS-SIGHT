// AEGIS-SIGHT Service Worker v2 - Complete PWA Implementation
const CACHE_VERSION = 'v2';
const CACHE_NAME = `aegis-sight-${CACHE_VERSION}`;
const API_CACHE_NAME = `aegis-sight-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

// App Shell - pre-cache on install
const APP_SHELL = [
  '/',
  '/dashboard',
  '/offline.html',
  '/manifest.json',
];

// API cache TTL configuration (seconds)
const API_CACHE_CONFIG = {
  '/api/v1/assets': 120,
  '/api/v1/sam/licenses': 300,
  '/api/v1/dashboard/stats': 60,
};

// IndexedDB for offline operations
const DB_NAME = 'aegis-sight-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline-operations';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveOfflineOperation(operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({
      ...operation,
      timestamp: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOfflineOperations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineOperations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
// Install Event - Pre-cache App Shell
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ============================================================
// Activate Event - Clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('aegis-sight-') &&
              name !== CACHE_NAME &&
              name !== API_CACHE_NAME
            );
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// Fetch Event
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle non-GET requests - save to IndexedDB when offline
  if (event.request.method !== 'GET') {
    event.respondWith(handleMutationRequest(event.request));
    return;
  }

  // API requests - Network First with TTL cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request, url));
    return;
  }

  // Static assets & navigation - Network First with cache fallback
  event.respondWith(handleStaticRequest(event.request));
});

// Handle non-GET requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Offline: save the operation for later sync
    const body = await request.clone().text();
    await saveOfflineOperation({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
    });

    return new Response(
      JSON.stringify({
        offline: true,
        message: 'Operation saved for offline sync',
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle API requests with Network First + TTL cache
async function handleApiRequest(request, url) {
  const cacheTTL = getApiCacheTTL(url.pathname);

  // Try network first
  try {
    const response = await fetch(request);

    if (response.ok && cacheTTL > 0) {
      const responseClone = response.clone();
      const cache = await caches.open(API_CACHE_NAME);
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache-time', Date.now().toString());
      const cachedResponse = new Response(await responseClone.blob(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers,
      });
      await cache.put(request, cachedResponse);
    }

    return response;
  } catch (error) {
    // Network failed - try cache
    if (cacheTTL > 0) {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        const cacheTime = parseInt(
          cachedResponse.headers.get('sw-cache-time') || '0',
          10
        );
        const age = (Date.now() - cacheTime) / 1000;

        // Return cached even if expired when offline
        if (age < cacheTTL * 10) {
          return cachedResponse;
        }
      }
    }

    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Get TTL for an API path
function getApiCacheTTL(pathname) {
  for (const [path, ttl] of Object.entries(API_CACHE_CONFIG)) {
    if (pathname.startsWith(path)) {
      return ttl;
    }
  }
  return 0;
}

// Handle static / navigation requests
async function handleStaticRequest(request) {
  try {
    const response = await fetch(request);

    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Navigation fallback to offline page
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match(OFFLINE_URL);
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ============================================================
// Background Sync - Replay offline operations
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-operations') {
    event.waitUntil(replayOfflineOperations());
  }
});

async function replayOfflineOperations() {
  const operations = await getOfflineOperations();

  for (const op of operations) {
    try {
      await fetch(op.url, {
        method: op.method,
        headers: op.headers,
        body: op.body || undefined,
      });
    } catch (error) {
      // Still offline, registration will retry
      console.warn('[SW] Sync failed for operation:', op.url);
      return;
    }
  }

  // All operations replayed successfully
  await clearOfflineOperations();

  // Notify clients that sync is complete
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      count: operations.length,
    });
  });
}

// ============================================================
// Push Notification
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'aegis-notification',
    data: {
      url: data.url || '/dashboard',
    },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'AEGIS-SIGHT',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ============================================================
// Cache Size Management
// ============================================================
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  let totalSize = 0;
  const entries = [];

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.clone().blob();
      entries.push({ request, size: blob.size });
      totalSize += blob.size;
    }
  }

  // Remove oldest entries until under limit
  if (totalSize > maxSize) {
    for (const entry of entries) {
      await cache.delete(entry.request);
      totalSize -= entry.size;
      if (totalSize <= maxSize) break;
    }
  }
}

// Periodic cache trimming via message
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TRIM_CACHE') {
    trimCache(CACHE_NAME, MAX_CACHE_SIZE);
    trimCache(API_CACHE_NAME, MAX_CACHE_SIZE);
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
