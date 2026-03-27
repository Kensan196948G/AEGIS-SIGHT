'use client';

import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/lib/use-online-status';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isOnline);
  }, [isOnline]);

  // Listen for sync complete messages from service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        setPendingCount(0);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Update pending operations count
  useEffect(() => {
    if (!isOnline) {
      updatePendingCount();
      const interval = setInterval(updatePendingCount, 3000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  async function updatePendingCount() {
    try {
      const { getOfflineOperations } = await import('@/lib/offline-storage');
      const ops = await getOfflineOperations();
      setPendingCount(ops.length);
    } catch {
      // IndexedDB not available
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <span>
        オフラインモード
        {pendingCount > 0 && (
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            同期待ち: {pendingCount}件
          </span>
        )}
      </span>
    </div>
  );
}
