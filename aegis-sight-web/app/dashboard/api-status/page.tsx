'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface HealthCheck {
  status: string;
  latency_ms?: number;
  error?: string;
  workers?: number;
  free_gb?: number;
  total_gb?: number;
  used_percent?: number;
}

interface HealthDetail {
  status: string;
  version: string;
  checks: Record<string, HealthCheck>;
}

interface EndpointStatus {
  name: string;
  url: string;
  status: 'ok' | 'error' | 'loading';
  latency_ms: number | null;
  statusCode: number | null;
}

const ENDPOINTS_TO_CHECK: { name: string; url: string }[] = [
  { name: 'Health', url: '/health' },
  { name: 'Health Detail', url: '/health/detail' },
  { name: 'Health Ready', url: '/health/ready' },
  { name: 'Version', url: '/api/v1/version' },
  { name: 'OpenAPI Schema', url: '/openapi.json' },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    unavailable: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    loading: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || colors.unknown}`}
    >
      {status}
    </span>
  );
}

export default function ApiStatusPage() {
  const [healthDetail, setHealthDetail] = useState<HealthDetail | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>(
    ENDPOINTS_TO_CHECK.map((e) => ({
      ...e,
      status: 'loading' as const,
      latency_ms: null,
      statusCode: null,
    }))
  );
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    // Fetch health detail
    try {
      const res = await fetch(`${API_BASE}/health/detail`);
      if (res.ok) {
        setHealthDetail(await res.json());
      }
    } catch {
      setHealthDetail(null);
    }

    // Check each endpoint
    const results = await Promise.all(
      ENDPOINTS_TO_CHECK.map(async (ep) => {
        const start = performance.now();
        try {
          const res = await fetch(`${API_BASE}${ep.url}`);
          const latency = Math.round(performance.now() - start);
          return {
            ...ep,
            status: res.ok ? ('ok' as const) : ('error' as const),
            latency_ms: latency,
            statusCode: res.status,
          };
        } catch {
          return {
            ...ep,
            status: 'error' as const,
            latency_ms: null,
            statusCode: null,
          };
        }
      })
    );

    setEndpoints(results);
    setLastRefreshed(new Date().toLocaleTimeString('ja-JP'));
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    // Schedule initial fetch asynchronously to avoid synchronous setState in effect body
    const initialTimeout = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 30000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [refresh]);

  const checks = healthDetail?.checks || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            API接続状態
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            APIヘルスチェックとエンドポイント応答状況
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              最終更新: {lastRefreshed}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isRefreshing ? '更新中...' : '更新'}
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="aegis-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              全体ステータス
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              API: {API_BASE}
            </p>
          </div>
          {healthDetail && <StatusBadge status={healthDetail.status} />}
        </div>
      </div>

      {/* Subsystem Health */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          サブシステム
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Database */}
          <div className="aegis-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Database
              </h3>
              <StatusBadge status={checks.database?.status || 'unknown'} />
            </div>
            {checks.database?.latency_ms != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                応答時間: {checks.database.latency_ms}ms
              </p>
            )}
            {checks.database?.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {checks.database.error}
              </p>
            )}
          </div>

          {/* Redis */}
          <div className="aegis-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Redis
              </h3>
              <StatusBadge status={checks.redis?.status || 'unknown'} />
            </div>
            {checks.redis?.latency_ms != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                応答時間: {checks.redis.latency_ms}ms
              </p>
            )}
            {checks.redis?.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {checks.redis.error}
              </p>
            )}
          </div>

          {/* Celery */}
          <div className="aegis-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Celery
              </h3>
              <StatusBadge status={checks.celery?.status || 'unknown'} />
            </div>
            {checks.celery?.workers != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ワーカー数: {checks.celery.workers}
              </p>
            )}
            {checks.celery?.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {checks.celery.error}
              </p>
            )}
          </div>

          {/* Disk */}
          <div className="aegis-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Disk
              </h3>
              <StatusBadge status={checks.disk?.status || 'unknown'} />
            </div>
            {checks.disk?.used_percent != null && (
              <>
                <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${
                      checks.disk.used_percent > 90
                        ? 'bg-red-500'
                        : checks.disk.used_percent > 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${checks.disk.used_percent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {checks.disk.free_gb}GB 空き / {checks.disk.total_gb}GB (
                  {checks.disk.used_percent}% 使用)
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Endpoint Response Times */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          エンドポイント応答時間
        </h2>
        <div className="aegis-card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-aegis-border">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  エンドポイント
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ステータス
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  応答時間
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {endpoints.map((ep) => (
                <tr key={ep.url}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {ep.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                    {ep.url}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={ep.status} />
                    {ep.statusCode && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {ep.statusCode}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {ep.latency_ms != null ? `${ep.latency_ms}ms` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
